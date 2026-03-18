# Azure Container Apps Deployment Notes

## Target Topology
- `frontend`: public ingress
- `backend`: public ingress
- `ai-service`: internal ingress only
- `postgres`, `redis`, `ollama`: private dependencies

## Origin Matrix
| Client | Example Origin | Notes |
| --- | --- | --- |
| Local web | `http://localhost:3001` | Allowed during development. |
| Local mobile | `http://localhost:8081` | Allowed during development. |
| Azure frontend | `https://frontend.<region>.azurecontainerapps.io` | Set as `FRONTEND_URL` and include in `CORS_ALLOWED_ORIGINS`. |
| Optional custom domain | `https://app.example.com` | Add to `CORS_ALLOWED_ORIGINS`. |

## Required Backend Settings
- `FRONTEND_URL`
- `BACKEND_PUBLIC_URL`
- `CORS_ALLOWED_ORIGINS`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `OTP_PEPPER`
- `AI_SERVICE_URL`
- `AI_SERVICE_SHARED_SECRET`
- `COOKIE_DOMAIN` if you use a shared custom parent domain

## Cookie Behavior
- When frontend and backend are on different origins in production, the backend now uses `SameSite=None` and `Secure=true`.
- If frontend and backend share the same site, the backend keeps `SameSite=Lax`.
- Configure `BACKEND_PUBLIC_URL` correctly or cookie behavior will be wrong.

## AI-Service Security
- The AI service should not be publicly exposed.
- Backend forwards an `X-Internal-Service-Token` header.
- AI service validates the shared secret before accepting proxied or internal indexing requests.

## Readiness And Startup
- Backend readiness endpoint: `/api/health/ready`
- Backend liveness endpoint: `/api/health/live`
- AI readiness endpoint: `/ready`
- AI liveness endpoint: `/live`
- Backend container no longer seeds automatically unless `RUN_DB_SEED=true`.

## AI Degraded Mode
- Set `AI_DEGRADED_ALLOWED=true` when you want backend readiness to tolerate AI service reachability without active Ollama.
- This is useful for first-pass Azure deployment if Ollama hosting is deferred.
- In degraded mode, AI endpoints can still return fallbacks, but readiness will surface the degraded state.

## Validation Checklist
- Backend env points to public frontend origin, not localhost.
- Backend public URL matches the actual deployed backend origin.
- AI service URL points to the internal Container Apps address.
- Shared secret matches on backend and AI service.
- Postgres and Redis are reachable from backend and AI service.
- Upload volume/path works for both backend and AI extraction.
- Secrets are stored in Azure secrets, not committed env files.
