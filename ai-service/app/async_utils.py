from __future__ import annotations

import asyncio
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import ParamSpec, TypeVar


P = ParamSpec("P")
R = TypeVar("R")


async def run_in_managed_thread(function: Callable[P, R], *args: P.args, **kwargs: P.kwargs) -> R:
    """Run blocking work off-loop and close the worker before returning."""
    loop = asyncio.get_running_loop()
    executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="nexora-ai")
    try:
        return await loop.run_in_executor(executor, partial(function, *args, **kwargs))
    finally:
        executor.shutdown(wait=True, cancel_futures=True)
