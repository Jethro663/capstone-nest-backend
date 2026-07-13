import os
import unittest
from unittest.mock import patch

from scripts import run_tests


class RunTestsScriptTests(unittest.TestCase):
    def test_configure_test_environment_defaults_runtime_without_overriding(self) -> None:
        configure = getattr(run_tests, "configure_test_environment", None)
        self.assertIsNotNone(configure)

        with patch.dict(os.environ, {}, clear=True):
            configure()
            self.assertEqual(os.environ["AI_RUNTIME_MODE"], "test")

        with patch.dict(os.environ, {"AI_RUNTIME_MODE": "ci"}, clear=True):
            configure()
            self.assertEqual(os.environ["AI_RUNTIME_MODE"], "ci")


if __name__ == "__main__":
    unittest.main()
