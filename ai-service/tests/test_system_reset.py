import asyncio
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
import anyio
from fastapi import FastAPI, Request

from app import backend_uploads
from app.async_utils import run_in_managed_thread
from app import system_reset
from sqlalchemy import create_engine, text


class MemoryStore:
    def __init__(self):
        self.state = system_reset.ResetState(active=False, epoch=0)
        self.acks = []
        self.leased = False
        self.registered = False
        self.fail = False
        self.durable_busy = 0

    async def register(self):
        self.registered = True

    async def read_state(self):
        if self.fail:
            raise OSError("database unavailable")
        return self.state

    async def heartbeat(self, epoch, inflight=0):
        self.acks.append(epoch)
        self.durable_busy = inflight

    async def admit(self, expected_epoch):
        state = await self.read_state()
        if not state.active and state.epoch == expected_epoch:
            self.durable_busy = 1
        return state

    async def mark_idle(self):
        if self.fail:
            raise OSError("database unavailable")
        self.durable_busy = 0

    async def acquire(self):
        self.leased = True
        return True

    async def release(self):
        self.leased = False

    async def close(self):
        self.leased = False

    async def retire(self, cleanup):
        await cleanup()
        self.acks.append(self.state.epoch)
        self.durable_busy = 0
        return self.state.epoch


class ResetMaintenanceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.cache = Path(self.directory.name) / "cache"
        self.cache.mkdir()
        self.store = MemoryStore()
        self.guard = system_reset.ResetMaintenance(self.store, self.cleanup)

    async def asyncTearDown(self):
        await self.guard.stop()
        self.directory.cleanup()

    async def cleanup(self):
        await backend_uploads.clear_backend_upload_cache(self.cache)

    async def test_startup_clears_stale_bytes_before_acknowledging(self):
        (self.cache / "stale.pdf").write_bytes(b"old source")
        await self.guard.synchronize()
        self.assertTrue(self.store.registered)
        self.assertEqual([], list(self.cache.iterdir()))
        self.assertEqual([0], self.store.acks)
        async with self.guard.request():
            self.assertTrue(self.store.leased)
            self.assertEqual(1, self.store.durable_busy)
        self.assertFalse(self.store.leased)
        self.assertEqual(0, self.store.durable_busy)

    async def test_active_epoch_denies_content_but_preserves_health_and_proxy_headers(self):
        app = FastAPI()
        app.add_middleware(system_reset.ResetMaintenanceMiddleware, maintenance=self.guard)

        @app.get("/live")
        async def live():
            return {"success": True}

        @app.get("/content")
        async def content(request: Request):
            return {"success": True, "data": request.headers.get("X-Internal-Service-Token")}

        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            await self.guard.synchronize()
            normal = await client.get("/content", headers={"X-Internal-Service-Token": "proxy-secret"})
            self.assertEqual(200, normal.status_code)
            self.assertEqual("proxy-secret", normal.json()["data"])
            self.store.state = system_reset.ResetState(active=True, epoch=1)
            response = await client.get("/content")
            self.assertEqual(503, response.status_code)
            self.assertFalse(response.json()["success"])
            self.assertIn("Retry-After", response.headers)
            self.assertEqual(200, (await client.get("/live")).status_code)
            self.assertFalse(self.store.leased)

    async def test_inflight_cancelled_writer_finishes_before_cleanup_and_ack(self):
        await self.guard.synchronize()
        entered = threading.Event()
        release = threading.Event()

        def writer():
            entered.set()
            release.wait(3)
            (self.cache / "late.pdf").write_bytes(b"old bytes")

        async def request():
            async with self.guard.request():
                await run_in_managed_thread(writer)

        task = asyncio.create_task(request())
        while not entered.is_set():
            await asyncio.sleep(0.001)
        task.cancel()
        self.store.state = system_reset.ResetState(active=True, epoch=1)
        # A cancelled await must keep its request lease until its actual thread exits.
        await self.guard.synchronize()
        self.assertNotIn(1, self.store.acks)
        self.assertTrue(self.store.leased)
        self.assertFalse(task.done())
        release.set()
        with self.assertRaises(asyncio.CancelledError):
            await task
        await self.guard.synchronize()
        self.assertEqual(1, self.store.acks[-1])
        self.assertFalse(self.store.leased)
        self.assertEqual([], list(self.cache.iterdir()))

    async def test_idle_epoch_cleanup_and_failure_remain_closed_until_retry(self):
        await self.guard.synchronize()
        self.store.state = system_reset.ResetState(active=True, epoch=1)
        (self.cache / "old.pdf").write_bytes(b"old bytes")
        with patch.object(self.guard, "cleanup", side_effect=OSError("permission denied")):
            with self.assertRaises(OSError):
                await self.guard.synchronize()
        self.assertNotIn(1, self.store.acks)
        self.store.state = system_reset.ResetState(active=False, epoch=1)
        with self.assertRaises(system_reset.MaintenanceUnavailable):
            async with self.guard.request():
                self.fail("must not admit before cleanup")
        await self.guard.synchronize()
        self.assertEqual([], list(self.cache.iterdir()))
        async with self.guard.request():
            pass

    async def test_control_failure_is_closed_and_restart_always_clears_cache(self):
        await self.guard.synchronize()
        self.store.fail = True
        with self.assertRaises(system_reset.MaintenanceUnavailable):
            async with self.guard.request():
                self.fail("must fail closed")
        self.store.fail = False
        (self.cache / "restart.pdf").write_bytes(b"old")
        restarted = system_reset.ResetMaintenance(self.store, self.cleanup)
        await restarted.synchronize()
        self.assertEqual([], list(self.cache.iterdir()))
        await restarted.stop()

    async def test_admitted_epoch_is_applied_again_after_each_session_commit(self):
        from app.database import ResetAwareSession

        engine = create_engine("sqlite://")
        applied = []
        from sqlalchemy import event

        @event.listens_for(engine, "connect")
        def setup(connection, _record):
            connection.create_function("set_config", 3, lambda name, value, local: applied.append((name, value, local)) or value)

        await self.guard.synchronize()
        with ResetAwareSession(engine) as session:
            async with self.guard.request():
                self.assertEqual(0, system_reset.request_reset_epoch.get())
                session.execute(text("SELECT 1"))
                session.commit()
                session.execute(text("SELECT 1"))
                session.commit()
            self.assertIsNone(system_reset.request_reset_epoch.get())
            session.execute(text("SELECT 1"))
        self.assertEqual([("nexora.reset_epoch", "0", 1)] * 2, applied)
        engine.dispose()

    async def test_main_installs_reset_admission_and_lifecycle(self):
        from app import main

        self.assertTrue(any(m.cls is system_reset.ResetMaintenanceMiddleware for m in main.app.user_middleware))
        self.assertIn(main.start_reset_maintenance, main.app.router.on_startup)
        self.assertIn(main.stop_reset_maintenance, main.app.router.on_shutdown)

    async def test_connection_loss_during_request_requires_drain_and_same_epoch_cleanup(self):
        await self.guard.synchronize()
        async with self.guard.request():
            self.store.fail = True
            with self.assertRaises(OSError):
                await self.guard.synchronize()
            self.assertEqual(1, self.store.durable_busy)
            self.store.fail = False
            await self.guard.synchronize()
            self.assertEqual(-1, self.store.acks[-1])
            (self.cache / "partition.pdf").write_bytes(b"old")
            with self.assertRaises(system_reset.MaintenanceUnavailable):
                async with self.guard.request():
                    self.fail("must not reopen while old work remains")
        await self.guard.synchronize()
        self.assertEqual([], list(self.cache.iterdir()))
        self.assertEqual(0, self.store.acks[-1])
        self.assertEqual(0, self.store.durable_busy)

    async def test_real_materialization_cancelled_twice_cannot_repopulate_acknowledged_cache(self):
        await self.guard.synchronize()
        entered = threading.Event()
        release = threading.Event()
        write_bytes = Path.write_bytes

        def slow_write(path, content):
            entered.set()
            release.wait(3)
            return write_bytes(path, content)

        async def handler():
            async with self.guard.request():
                return await backend_uploads.materialize_backend_upload("s3://test-reset/source.pdf")

        async def fetched(request):
            return httpx.Response(200, content=b"source bytes")

        async with httpx.AsyncClient(transport=httpx.MockTransport(fetched)) as client:
            with (
                patch.object(backend_uploads, "backend_upload_cache_dir", return_value=self.cache),
                patch.object(backend_uploads, "_get_upload_client", return_value=client),
                patch.object(backend_uploads.settings, "backend_internal_url", "http://backend"),
                patch.object(Path, "write_bytes", slow_write),
            ):
                request = asyncio.create_task(handler())
                while not entered.is_set():
                    await asyncio.sleep(0.001)
                request.cancel()
                await asyncio.sleep(0)
                request.cancel()
                self.store.state = system_reset.ResetState(active=True, epoch=1)
                await self.guard.synchronize()
                self.assertNotIn(1, self.store.acks)
                self.assertFalse(request.done())
                release.set()
                with self.assertRaises(asyncio.CancelledError):
                    await request
        await self.guard.synchronize()
        self.assertEqual([], list(self.cache.iterdir()))
        self.assertEqual(1, self.store.acks[-1])

    async def test_observer_shutdown_retains_epoch_ack_and_closes_admission(self):
        await self.guard.start()
        self.store.state = system_reset.ResetState(active=True, epoch=1)
        self.guard.wake.set()
        async with asyncio.timeout(2):
            while 1 not in self.store.acks:
                await asyncio.sleep(0.001)
        await self.guard.stop()
        self.assertIsNone(self.guard.observer)
        self.assertEqual(1, self.store.acks[-1])
        with self.assertRaises(system_reset.MaintenanceUnavailable):
            async with self.guard.request():
                self.fail("shutdown must remain closed")

    async def test_cleanup_refuses_symlink_and_keeps_target_bytes(self):
        target = Path(self.directory.name) / "unrelated"
        target.mkdir()
        (target / "retained").write_bytes(b"keep")
        link = Path(self.directory.name) / "cache-link"
        link.symlink_to(target, target_is_directory=True)
        with self.assertRaises(RuntimeError):
            await backend_uploads.clear_backend_upload_cache(link)
        self.assertEqual(b"keep", (target / "retained").read_bytes())

    async def test_anyio_cancel_scope_does_not_starve_drain_or_lose_request_exit(self):
        await self.guard.synchronize()
        entered = threading.Event()
        release = threading.Event()

        def writer():
            entered.set()
            release.wait(2)
            (self.cache / "anyio.pdf").write_bytes(b"late")

        scope_ready = asyncio.Event()
        scope_holder = []

        async def request():
            with anyio.CancelScope() as scope:
                scope_holder.append(scope)
                scope_ready.set()
                async with self.guard.request():
                    await run_in_managed_thread(writer)

        task = asyncio.create_task(request())
        await scope_ready.wait()
        while not entered.is_set():
            await asyncio.sleep(0.001)
        scope_holder[0].cancel()
        self.store.state = system_reset.ResetState(active=True, epoch=1)
        await self.guard.synchronize()
        self.assertNotIn(1, self.store.acks)
        release.set()
        await asyncio.wait_for(task, timeout=3)
        await self.guard.synchronize()
        self.assertEqual(0, self.guard.inflight)
        self.assertFalse(self.store.leased)
        self.assertEqual([], list(self.cache.iterdir()))

    async def test_cancelled_attachment_readers_finish_before_request_releases_lease(self):
        from app import media_utils, ollama_client

        await self.guard.synchronize()
        for module, read in (
            (media_utils, lambda: media_utils.encode_file_to_base64("source.png")),
            (ollama_client, lambda: ollama_client._resolve_image_payload([{"filePath": "source.png"}])),
        ):
            with self.subTest(module=module.__name__):
                entered = threading.Event()
                release = threading.Event()

                class SlowFile:
                    def __enter__(self):
                        return self

                    def __exit__(self, *args):
                        pass

                    def read(self):
                        entered.set()
                        release.wait(2)
                        return b"image source"

                async def request():
                    async with self.guard.request():
                        await read()

                with patch.object(module, "open", return_value=SlowFile(), create=True):
                    task = asyncio.create_task(request())
                    while not entered.is_set():
                        await asyncio.sleep(0.001)
                    task.cancel()
                    for _ in range(5):
                        await asyncio.sleep(0)
                    try:
                        self.assertFalse(task.done())
                        self.assertTrue(self.store.leased)
                    finally:
                        release.set()
                        with self.assertRaises(asyncio.CancelledError):
                            await task

    async def test_failed_embedding_fanout_keeps_lease_until_sibling_finishes(self):
        from app import ollama_client

        await self.guard.synchronize()
        entered = asyncio.Event()
        release = asyncio.Event()
        finished = asyncio.Event()

        async def embed_one(client, source, **kwargs):
            if source == "fail":
                await entered.wait()
                raise ValueError("embedding failed")
            entered.set()
            try:
                await release.wait()
                return {"embedding": [1.0, 2.0]}
            finally:
                finished.set()

        async def request():
            async with self.guard.request():
                await ollama_client.embed(["fail", "slow sibling"])

        with (
            patch.object(ollama_client, "_runtime_mode", return_value="local"),
            patch.object(ollama_client, "_get_ollama_client", return_value=object()),
            patch.object(ollama_client, "_post_embedding_request", embed_one),
        ):
            task = asyncio.create_task(request())
            await entered.wait()
            for _ in range(8):
                await asyncio.sleep(0)
            try:
                self.assertFalse(task.done())
                self.assertTrue(self.store.leased)
            finally:
                release.set()
                with self.assertRaisesRegex(ValueError, "embedding failed"):
                    await task
                await finished.wait()
