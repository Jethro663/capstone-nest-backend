"""Real PostgreSQL contract checks; run via scripts/run-reset-postgres-tests.cjs."""
import asyncio
import os
import signal
import socket
import sys
import tempfile
import unittest
from pathlib import Path

import httpx

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.backend_uploads import clear_backend_upload_cache
from app.database import ResetAwareSession
from app.system_reset import IO_LOCK, WRITE_LOCK, PostgresResetStore, ResetMaintenance, MaintenanceUnavailable


@unittest.skipUnless(os.environ.get("AI_RESET_TEST_DATABASE_URL"), "requires dedicated reset test PostgreSQL database")
class PostgresResetTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        url = os.environ["AI_RESET_TEST_DATABASE_URL"]
        if not (make_url(url).database or "").startswith("nexora_reset_test_ai_"):
            self.fail("refusing non-test database")
        self.engine = create_async_engine(url, poolclass=NullPool)
        async with self.engine.begin() as connection:
            for sql in (
                "CREATE TABLE IF NOT EXISTS system_reset_state (id integer PRIMARY KEY, active boolean NOT NULL DEFAULT false, epoch integer NOT NULL DEFAULT 0)",
                "CREATE TABLE IF NOT EXISTS system_reset_instances (id text PRIMARY KEY, kind text NOT NULL, cache_epoch integer NOT NULL DEFAULT -1, in_flight integer NOT NULL DEFAULT 0, retired boolean NOT NULL DEFAULT false, heartbeat_at timestamptz NOT NULL DEFAULT NOW())",
                "INSERT INTO system_reset_state (id) VALUES (1) ON CONFLICT (id) DO UPDATE SET active=false, epoch=0",
                "DELETE FROM system_reset_instances",
            ):
                await connection.execute(text(sql))
        self.directory = tempfile.TemporaryDirectory()
        self.cache = Path(self.directory.name) / "cache"
        self.cache.mkdir()
        self.store = PostgresResetStore(url)
        self.guard = ResetMaintenance(self.store, lambda: clear_backend_upload_cache(self.cache))

    async def asyncTearDown(self):
        await self.guard.stop()
        await self.engine.dispose()
        self.directory.cleanup()

    async def row(self):
        async with self.engine.connect() as connection:
            return (await connection.execute(text("SELECT * FROM system_reset_instances WHERE id=:id"), {"id": self.store.instance_id})).mappings().one()

    async def test_registration_drain_lock_real_epoch_ack_and_exclusive_coordinator(self):
        (self.cache / "startup.pdf").write_bytes(b"old")
        await self.guard.synchronize()
        row = await self.row()
        self.assertEqual("ai", row["kind"])
        self.assertEqual(0, row["cache_epoch"])
        self.assertEqual([], list(self.cache.iterdir()))
        async with self.engine.connect() as coordinator:
            async with self.guard.request():
                self.assertEqual(1, (await self.row())["in_flight"])
                acquired = (await coordinator.execute(text("SELECT pg_try_advisory_lock(:key)"), {"key": IO_LOCK})).scalar_one()
                self.assertFalse(acquired)
                await coordinator.execute(text("UPDATE system_reset_state SET active=true, epoch=1 WHERE id=1"))
                await coordinator.commit()
                (self.cache / "inflight.pdf").write_bytes(b"late")
                await self.guard.synchronize()
                self.assertEqual(0, (await self.row())["cache_epoch"])
            self.assertTrue((await coordinator.execute(text("SELECT pg_try_advisory_lock(:key)"), {"key": IO_LOCK})).scalar_one())
            await self.guard.synchronize()
            self.assertEqual(1, (await self.row())["cache_epoch"])
            self.assertEqual(0, (await self.row())["in_flight"])
            self.assertEqual([], list(self.cache.iterdir()))
            with self.assertRaises(MaintenanceUnavailable):
                async with self.guard.request():
                    self.fail("coordinator owns exclusive IO")
            await coordinator.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": IO_LOCK})

    async def test_terminated_lease_requires_existing_request_drain_before_ack(self):
        await self.guard.synchronize()
        async with self.guard.request():
            self.assertEqual(1, (await self.row())["in_flight"])
            pid = (await self.store.lease.execute(text("SELECT pg_backend_pid()"))).scalar_one()
            await self.store.lease.commit()
            async with self.engine.begin() as control:
                await control.execute(text("SELECT pg_terminate_backend(:pid)"), {"pid": pid})
                await control.execute(text("UPDATE system_reset_instances SET heartbeat_at=NOW()-INTERVAL '1 minute' WHERE id=:id"), {"id": self.store.instance_id})
                required = (await control.execute(text("SELECT id FROM system_reset_instances WHERE heartbeat_at>NOW()-INTERVAL '30 seconds' OR in_flight>0"))).scalars().all()
                self.assertIn(self.store.instance_id, required)
                await control.execute(text("UPDATE system_reset_state SET active=true, epoch=1 WHERE id=1"))
            with self.assertRaises(Exception):
                await self.guard.synchronize()
            self.assertNotEqual(1, (await self.row())["cache_epoch"])
            self.assertEqual(1, (await self.row())["in_flight"])
            (self.cache / "partition.pdf").write_bytes(b"late source")
        await self.guard.synchronize()
        self.assertEqual(1, (await self.row())["cache_epoch"])
        self.assertEqual(0, (await self.row())["in_flight"])
        self.assertEqual([], list(self.cache.iterdir()))

    async def test_admission_cannot_cross_the_coordinator_claim_snapshot(self):
        await self.guard.synchronize()
        body_started = False

        async def request():
            nonlocal body_started
            async with self.guard.request():
                body_started = True

        async with self.engine.begin() as coordinator:
            await coordinator.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": WRITE_LOCK})
            task = asyncio.create_task(request())
            async with asyncio.timeout(3):
                while self.store.lease is None:
                    await asyncio.sleep(0.001)
            self.assertFalse(body_started)
            self.assertEqual(0, (await self.row())["in_flight"])
            await coordinator.execute(text("UPDATE system_reset_state SET active=true,epoch=1 WHERE id=1"))
        with self.assertRaises(MaintenanceUnavailable):
            await task
        self.assertFalse(body_started)
        self.assertEqual(0, (await self.row())["in_flight"])

    async def test_epoch_is_transaction_local_and_reapplied_after_commit(self):
        await self.guard.synchronize()
        sessions = async_sessionmaker(self.engine, sync_session_class=ResetAwareSession)
        async with sessions() as session:
            async with self.guard.request():
                self.assertEqual("0", (await session.execute(text("SELECT current_setting('nexora.reset_epoch', true)"))).scalar_one())
                await session.commit()
                self.assertEqual("0", (await session.execute(text("SELECT current_setting('nexora.reset_epoch', true)"))).scalar_one())
                await session.commit()
            self.assertIn((await session.execute(text("SELECT current_setting('nexora.reset_epoch', true)"))).scalar_one(), (None, ""))

    async def test_uvicorn_startup_cleans_before_serving_and_shuts_down_observer(self):
        async with self.engine.begin() as connection:
            await connection.execute(text("UPDATE system_reset_state SET active=true, epoch=1 WHERE id=1"))
        cache = Path(self.directory.name) / "nexora-backend-upload-cache"
        cache.mkdir()
        (cache / "stale.pdf").write_bytes(b"old source")
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
        process = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port),
            env={**os.environ, "DATABASE_URL": os.environ["AI_RESET_TEST_DATABASE_URL"], "TMPDIR": self.directory.name, "AI_SERVICE_SHARED_SECRET": "reset-proxy-test", "OLLAMA_BASE_URL": "http://127.0.0.1:1"},
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT,
        )
        try:
            async with httpx.AsyncClient(base_url=f"http://127.0.0.1:{port}", timeout=1) as client:
                async with asyncio.timeout(15):
                    while True:
                        try:
                            response = await client.get("/live")
                            if response.status_code == 200:
                                break
                        except httpx.HTTPError:
                            pass
                        await asyncio.sleep(0.1)
                self.assertEqual([], list(cache.iterdir()))
                self.assertEqual(503, (await client.post("/demo/intervention-plan", json={})).status_code)
                async with self.engine.begin() as connection:
                    epochs = (await connection.execute(text("SELECT cache_epoch FROM system_reset_instances WHERE kind='ai'"))).scalars().all()
                    self.assertEqual([1], epochs)
                    await connection.execute(text("UPDATE system_reset_state SET active=false WHERE id=1"))
                # Shared-secret dependency remains enforced after admission resumes.
                self.assertEqual(401, (await client.post("/demo/intervention-plan", json={})).status_code)
        finally:
            process.terminate()
            output, _ = await asyncio.wait_for(process.communicate(), timeout=15)
        # Uvicorn re-raises the received SIGTERM after a clean lifespan shutdown.
        self.assertIn(process.returncode, (0, -signal.SIGTERM), output.decode()[-3000:])
        self.assertIn("Application shutdown complete", output.decode())
        async with self.engine.begin() as connection:
            row = (await connection.execute(text(
                "SELECT cache_epoch, in_flight, retired FROM system_reset_instances WHERE kind='ai'"
            ))).mappings().one()
            self.assertEqual({"cache_epoch": 1, "in_flight": 0, "retired": True}, dict(row))

    async def test_graceful_retirement_before_reset_is_not_captured(self):
        await self.guard.synchronize()
        instance_id = self.store.instance_id
        await self.guard.stop()
        async with self.engine.begin() as connection:
            row = (await connection.execute(text(
                "SELECT cache_epoch, in_flight, retired FROM system_reset_instances WHERE id=:id"
            ), {"id": instance_id})).mappings().one()
            self.assertTrue(row["retired"])
            await connection.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": WRITE_LOCK})
            required = (await connection.execute(text("""
                SELECT id FROM system_reset_instances
                WHERE retired=FALSE AND (heartbeat_at>NOW()-INTERVAL '30 seconds' OR in_flight>0)
            """))).scalars().all()
            self.assertNotIn(instance_id, required)
            await connection.execute(text("UPDATE system_reset_state SET active=TRUE, epoch=1 WHERE id=1"))
