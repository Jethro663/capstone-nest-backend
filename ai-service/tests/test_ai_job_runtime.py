import unittest

from app.main import _run_with_retries, _runtime_progress_for_status


class AiJobRuntimeTests(unittest.IsolatedAsyncioTestCase):
    def test_runtime_progress_accepts_numeric_runtime_values(self) -> None:
        self.assertEqual(
            _runtime_progress_for_status("processing", {"progressPercent": "85"}),
            85,
        )
        self.assertEqual(
            _runtime_progress_for_status("processing", {"progressPercent": 125}),
            100,
        )
        self.assertEqual(
            _runtime_progress_for_status("processing", {"progressPercent": -5}),
            0,
        )

    def test_runtime_progress_uses_status_defaults_when_runtime_missing(self) -> None:
        self.assertEqual(_runtime_progress_for_status("pending", None), 5)
        self.assertEqual(_runtime_progress_for_status("processing", None), 60)
        self.assertEqual(_runtime_progress_for_status("completed", None), 100)
        self.assertEqual(_runtime_progress_for_status("unknown", None), 0)

    def test_runtime_progress_falls_back_when_runtime_percent_is_non_finite(self) -> None:
        self.assertEqual(
            _runtime_progress_for_status("processing", {"progressPercent": "1e309"}),
            60,
        )
        self.assertEqual(
            _runtime_progress_for_status("pending", {"progressPercent": float("inf")}),
            5,
        )

    async def test_run_with_retries_succeeds_after_retries(self) -> None:
        attempts = {"count": 0}

        async def operation(attempt: int) -> str:
            attempts["count"] = attempt
            if attempt < 3:
                raise RuntimeError("transient")
            return "ok"

        result = await _run_with_retries(
            operation,
            max_attempts=3,
            delay_seconds=0,
        )

        self.assertEqual(result, "ok")
        self.assertEqual(attempts["count"], 3)

    async def test_run_with_retries_raises_last_error(self) -> None:
        async def operation(_attempt: int) -> str:
            raise RuntimeError("persistent")

        with self.assertRaisesRegex(RuntimeError, "persistent"):
            await _run_with_retries(operation, max_attempts=3, delay_seconds=0)


if __name__ == "__main__":
    unittest.main()
