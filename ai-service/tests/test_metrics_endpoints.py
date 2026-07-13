import unittest

import httpx

from app.main import app


@app.get("/metrics-test-raises")
async def metrics_test_raises() -> None:
    raise RuntimeError("boom")


class MetricsEndpointTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app, raise_app_exceptions=False),
            base_url="http://test",
        )

    async def asyncTearDown(self) -> None:
        await self.client.aclose()

    async def test_metrics_endpoint_returns_prometheus_text(self) -> None:
        response = await self.client.get("/metrics")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/plain", response.headers["content-type"])
        self.assertIn("python_info", response.text)

    async def test_metrics_endpoint_exposes_http_request_counter(self) -> None:
        await self.client.get("/live")
        response = await self.client.get("/metrics")
        self.assertEqual(response.status_code, 200)
        self.assertIn(
            'nexora_ai_http_requests_total{method="GET",path="/live",status="200"}',
            response.text,
        )

    async def test_metrics_middleware_skips_internal_observability_paths(self) -> None:
        await self.client.get("/openapi.json")
        await self.client.get("/metrics")
        metrics = (await self.client.get("/metrics")).text
        self.assertNotIn('path="/openapi.json"', metrics)
        self.assertNotIn('path="/metrics"', metrics)

    async def test_metrics_middleware_records_failed_requests(self) -> None:
        response = await self.client.get("/metrics-test-raises")
        self.assertEqual(response.status_code, 500)

        metrics = (await self.client.get("/metrics")).text
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
