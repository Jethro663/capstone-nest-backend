import unittest

from fastapi.testclient import TestClient

from app.main import app


@app.get("/metrics-test-raises")
async def metrics_test_raises() -> None:
    raise RuntimeError("boom")


class MetricsEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app, raise_server_exceptions=False)

    def test_metrics_endpoint_returns_prometheus_text(self) -> None:
        response = self.client.get("/metrics")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/plain", response.headers["content-type"])
        self.assertIn("python_info", response.text)

    def test_metrics_endpoint_exposes_http_request_counter(self) -> None:
        self.client.get("/ready")
        response = self.client.get("/metrics")
        self.assertEqual(response.status_code, 200)
        self.assertIn("nexora_ai_http_requests_total", response.text)

    def test_metrics_middleware_skips_internal_observability_paths(self) -> None:
        self.client.get("/ready")
        self.client.get("/metrics")
        metrics = self.client.get("/metrics").text
        self.assertNotIn('path="/ready"', metrics)
        self.assertNotIn('path="/metrics"', metrics)

    def test_metrics_middleware_records_failed_requests(self) -> None:
        response = self.client.get("/metrics-test-raises")
        self.assertEqual(response.status_code, 500)

        metrics = self.client.get("/metrics").text
        self.assertIn(
            'nexora_ai_http_requests_total{method="GET",path="/metrics-test-raises",status="500"} 1.0',
            metrics,
        )
        self.assertIn(
            'nexora_ai_http_request_duration_seconds_count{method="GET",path="/metrics-test-raises"} 1.0',
            metrics,
        )


if __name__ == "__main__":
    unittest.main()
