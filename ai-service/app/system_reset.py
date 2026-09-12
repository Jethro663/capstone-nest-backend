"""Fail-closed reset admission and replica cache acknowledgements.

The backend owns the reset state and authorization. Acknowledgements only mean
this process has drained work and removed its application cache, not forensic
erasure. Every process present when maintenance starts must acknowledge even if
its heartbeat expires. Deploy one worker per container, as in our Dockerfile.
"""
from __future__ import annotations

import asyncio
import logging
import os
import socket
import uuid
from contextlib import asynccontextmanager
from contextvars import ContextVar
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool
from starlette.responses import JSONResponse

from .async_utils import await_completion

logger = logging.getLogger(__name__)
IO_LOCK = 78766904
WRITE_LOCK = 78766903
request_reset_epoch: ContextVar[int | None] = ContextVar("request_reset_epoch", default=None)
HEALTH_PATHS = frozenset({"/live", "/ready", "/health", "/health/live", "/health/ready", "/metrics", "/openapi.json", "/docs", "/redoc"})


@dataclass(frozen=True)
class ResetState:
    active: bool
    epoch: int


class MaintenanceUnavailable(Exception):
    pass


class PostgresResetStore:
    """Separate control connections never consume the handler's session pool."""

    def __init__(self, database_url: str):
        self.instance_id = f"ai:{socket.gethostname()}:{os.getpid()}:{uuid.uuid4()}"
        self.engine = create_async_engine(
            database_url, poolclass=NullPool,
            connect_args={"timeout": 5, "command_timeout": 5},
        )
        self.lease = None

    async def register(self):
        async with self.engine.begin() as connection:
            await connection.execute(text("""
                INSERT INTO public.system_reset_instances (id, kind, cache_epoch, heartbeat_at)
                VALUES (:id, 'ai', -1, NOW()) ON CONFLICT (id) DO NOTHING
            """), {"id": self.instance_id})

    async def read_state(self):
        async with self.engine.connect() as connection:
            row = (await connection.execute(text(
                "SELECT active, epoch FROM public.system_reset_state WHERE id = 1"
            ))).mappings().one()
            return ResetState(active=row["active"], epoch=row["epoch"])

    async def admit(self, expected_epoch):
        # Caller holds the aggregate shared IO lease. Serialize this durable
        # busy marker and fresh state check against the coordinator's claim.
        async with self.engine.begin() as connection:
            await connection.execute(text("SELECT pg_advisory_xact_lock_shared(:key)"), {"key": WRITE_LOCK})
            row = (await connection.execute(text(
                "SELECT active, epoch FROM public.system_reset_state WHERE id = 1 FOR SHARE"
            ))).mappings().one()
            state = ResetState(active=row["active"], epoch=row["epoch"])
            if not state.active and state.epoch == expected_epoch:
                result = await connection.execute(text("""
                    UPDATE public.system_reset_instances SET in_flight=1, heartbeat_at=NOW()
                    WHERE id=:id
                """), {"id": self.instance_id})
                if result.rowcount != 1:
                    raise MaintenanceUnavailable("AI reset instance is not registered")
            return state

    async def mark_idle(self):
        async with self.engine.begin() as connection:
            await connection.execute(text(
                "UPDATE public.system_reset_instances SET in_flight=0 WHERE id=:id"
            ), {"id": self.instance_id})

    async def heartbeat(self, epoch, inflight):
        # Check the lease connection too: a successful heartbeat on another
        # connection does not prove that the shared drain lock is still held.
        if self.lease is not None:
            await self.lease.execute(text("SELECT 1"))
            await self.lease.commit()
        async with self.engine.begin() as connection:
            await connection.execute(text("""
                INSERT INTO public.system_reset_instances (id, kind, cache_epoch, in_flight, heartbeat_at)
                VALUES (:id, 'ai', :epoch, :inflight, NOW())
                ON CONFLICT (id) DO UPDATE
                SET cache_epoch = EXCLUDED.cache_epoch, in_flight = EXCLUDED.in_flight,
                    retired = FALSE, heartbeat_at = NOW()
            """), {"id": self.instance_id, "epoch": epoch, "inflight": inflight})

    async def retire(self, cleanup):
        # Serialize graceful retirement with reset claim. If retirement wins,
        # a later reset excludes this row. If reset wins, this transaction sees
        # the claimed epoch, clears the durable cache, and preserves its ACK.
        async with self.engine.begin() as connection:
            await connection.execute(text("SELECT pg_advisory_xact_lock_shared(:key)"), {"key": WRITE_LOCK})
            row = (await connection.execute(text(
                "SELECT epoch FROM public.system_reset_state WHERE id = 1 FOR SHARE"
            ))).mappings().one()
            await cleanup()
            result = await connection.execute(text("""
                UPDATE public.system_reset_instances
                SET cache_epoch=:epoch, in_flight=0, retired=TRUE, heartbeat_at=NOW()
                WHERE id=:id
            """), {"id": self.instance_id, "epoch": row["epoch"]})
            if result.rowcount != 1:
                raise MaintenanceUnavailable("AI reset instance is not registered")
            return row["epoch"]

    async def acquire(self):
        self.lease = await self.engine.connect()
        try:
            acquired = (await self.lease.execute(text(
                "SELECT pg_try_advisory_lock_shared(:key)"
            ), {"key": IO_LOCK})).scalar_one()
            await self.lease.commit()
            if not acquired:
                await self.release()
            return acquired
        except BaseException:
            await self.release()
            raise

    async def release(self):
        connection, self.lease = self.lease, None
        if connection is not None:
            try:
                if not connection.invalidated:
                    await connection.execute(text("SELECT pg_advisory_unlock_shared(:key)"), {"key": IO_LOCK})
                    await connection.commit()
            finally:
                await connection.close()

    async def close(self):
        await self.release()
        await self.engine.dispose()


class ResetMaintenance:
    def __init__(self, store, cleanup):
        self.store = store
        self.cleanup = cleanup
        self.epoch = -1
        self.active = True
        self.inflight = 0
        self.registered = False
        self.stopping = False
        self.closed = False
        self.lock = asyncio.Lock()
        self.observer = None
        self.wake = asyncio.Event()

    async def synchronize(self):
        async with self.lock:
            try:
                if not self.registered:
                    await self.store.register()
                    self.registered = True
                state = await self.store.read_state()
                self.active = state.active
                if self.epoch != state.epoch and not self.inflight:
                    # No shared IO lock here: the coordinator may already hold
                    # exclusive IO while waiting for drained replica ACKs.
                    await self.cleanup()
                    self.epoch = state.epoch
                await self.store.heartbeat(self.epoch, self.inflight)
            except BaseException:
                self.active = True
                self.epoch = -1
                raise

    async def start(self):
        # Failure leaves health available, while all content stays closed.
        try:
            await self.synchronize()
        except Exception:
            logger.exception("AI reset startup synchronization failed; content admission is closed")
        self.observer = asyncio.create_task(self._observe(), name="ai-reset-maintenance")

    async def _observe(self):
        while not self.stopping:
            self.wake.clear()
            try:
                await asyncio.wait_for(self.wake.wait(), timeout=1)
            except asyncio.TimeoutError:
                pass
            if not self.stopping:
                try:
                    await self.synchronize()
                except Exception:
                    logger.exception("AI reset synchronization failed; content admission is closed")

    @asynccontextmanager
    async def request(self):
        async with self.lock:
            acquired = False
            try:
                if self.stopping or not self.registered or self.epoch < 0:
                    raise MaintenanceUnavailable()
                if self.inflight == 0:
                    acquired = await self.store.acquire()
                    if not acquired:
                        raise MaintenanceUnavailable()
                state = await self.store.admit(self.epoch)
                if state.active or self.epoch != state.epoch:
                    self.active = True
                    self.wake.set()
                    raise MaintenanceUnavailable()
                self.inflight += 1
            except BaseException as error:
                if acquired:
                    await self.store.release()
                if isinstance(error, (MaintenanceUnavailable, asyncio.CancelledError)):
                    raise
                self.active = True
                self.epoch = -1
                raise MaintenanceUnavailable() from error
        token = request_reset_epoch.set(state.epoch)
        try:
            yield
        finally:
            request_reset_epoch.reset(token)
            # ASGI completion includes response streaming/background callbacks.
            # The shield is joined: cancellation never leaves an untracked exit.
            exit_task = asyncio.create_task(self._exit_request())
            await await_completion(exit_task)

    async def _exit_request(self):
        async with self.lock:
            self.inflight -= 1
            if self.inflight == 0:
                try:
                    try:
                        await self.store.mark_idle()
                    finally:
                        await self.store.release()
                except Exception:
                    self.active = True
                    self.epoch = -1
                    logger.exception("AI reset lease connection lost; cache must be revalidated")
                self.wake.set()

    async def stop(self):
        if self.closed:
            return
        self.stopping = True
        self.wake.set()
        if self.observer is not None:
            await self.observer
            self.observer = None
        # Uvicorn drains HTTP before shutdown. Preserve this invariant for other
        # lifespan owners as well; never unlock while tracked work survives.
        while self.inflight:
            await asyncio.sleep(0.01)
        try:
            if self.registered:
                self.epoch = await self.store.retire(self.cleanup)
        finally:
            # Keep a retired row: already-active operations still need its ACK.
            try:
                await self.store.close()
            finally:
                self.closed = True


class ResetMaintenanceMiddleware:
    def __init__(self, app, maintenance):
        self.app = app
        self.maintenance = maintenance

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path") in HEALTH_PATHS:
            await self.app(scope, receive, send)
            return
        try:
            async with self.maintenance.request():
                await self.app(scope, receive, send)
        except MaintenanceUnavailable:
            response = JSONResponse(
                status_code=503,
                content={"success": False, "message": "AI service is paused for system maintenance", "data": None},
                headers={"Retry-After": "5"},
            )
            await response(scope, receive, send)
