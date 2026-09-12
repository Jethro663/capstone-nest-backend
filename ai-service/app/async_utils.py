from __future__ import annotations

import asyncio
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import ParamSpec, TypeVar

from anyio import CancelScope


P = ParamSpec("P")
R = TypeVar("R")


async def await_completion(future: asyncio.Future[R]) -> R:
    """Join owned work on cancellation, preserving AnyIO's cancellation identity."""
    try:
        return await asyncio.shield(future)
    except asyncio.CancelledError as cancelled:
        # FastAPI/Starlette cancel scopes repeatedly cancel unshielded awaits.
        # asyncio.shield alone shields the worker, but can busy-loop its caller.
        with CancelScope(shield=True):
            while not future.done():
                try:
                    await asyncio.shield(future)
                except asyncio.CancelledError:
                    pass
                except Exception:
                    break
            if not future.cancelled():
                future.exception()
        raise cancelled


async def run_in_managed_thread(function: Callable[P, R], *args: P.args, **kwargs: P.kwargs) -> R:
    """Run blocking work off-loop and close the worker before returning."""
    loop = asyncio.get_running_loop()
    executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="nexora-ai")
    try:
        future = loop.run_in_executor(executor, partial(function, *args, **kwargs))
        return await await_completion(future)
    finally:
        executor.shutdown(wait=True, cancel_futures=True)
