# Nexora Security Hardening Roadmap

## Summary

Deliver security as three independent OpenSpec changes:

1. **P0 — Secure account activation and recovery**
2. **P1 — Quarantined upload security and human moderation**
3. **P1/P2 — Cloudflare-based production security umbrella**

Each wave must pass its own migration, compatibility, security, and rollback gates before the next begins. Application-level staff MFA/passkeys remain a separate future change.

## Wave 1 — Secure Account Activation and Recovery

- Replace email-based password setting with a cryptographically random, single-use activation grant.
- Store only the grant's SHA-256 hash in a new `activation_grants` table with `userId`, originating OTP ID, expiration, consumption, and audit timestamps.
- OTP verification shall atomically consume the OTP and issue a grant valid for 10 minutes. The account remains `PENDING` until the grant is consumed.
- Grant consumption shall atomically set the password, mark the account `ACTIVE` and verified, consume all activation grants, and revoke any existing sessions.
- Never place the grant in a URL, query parameter, log, analytics event, or persistent client storage. Web keeps it in component memory; mobile passes it through in-memory navigation state.
- Change `POST /api/auth/set-activation-password` from `{email,newPassword}` to `{activationGrant,newPassword}`. Invalid, expired, consumed, and unknown grants return the same generic error.
- Keep the secure `{email,code,newPassword}` initial-password endpoint temporarily supported but deprecated; remove the unsafe email-only behavior completely.
- Make forgot-password responses identical for existing and unknown accounts and remove email addresses from warning logs.
- Make `AppThrottlerGuard` use Express's trusted `req.ip` result only; never parse `x-forwarded-for` directly. Validate `TRUST_PROXY_HOPS` and reject invalid production configuration.
- Update web, mobile, API types, Swagger, and recovery tests together.

### Public contract changes

- `POST /api/otp/verify` returns:

  ```json
  {
    "data": {
      "activationGrant": "opaque-single-use-token",
      "expiresAt": "2026-07-14T12:00:00.000Z"
    }
  }
  ```

- `POST /api/auth/set-activation-password` accepts:

  ```json
  {
    "activationGrant": "opaque-single-use-token",
    "newPassword": "new-strong-password"
  }
  ```

- Authentication telemetry records issued, consumed, expired, replayed, and rejected grants without recording secrets or raw email addresses.

## Wave 2 — Upload Quarantine and Moderation

### Shared security pipeline

- Inventory every upload route and route it through one backend-owned upload-security service.
- Uploads initially enter a private `quarantine/` storage prefix. Signed uploads may target only quarantine and require a finalize call before scanning.
- Validate extension allowlists, magic bytes, detected MIME, filename length, file size, archive expansion, document page count, and decoded image dimensions. Never trust client MIME.
- Explicitly reject SVG and other active-content image formats.
- Scan originals through a version-pinned ClamAV sidecar. Production fails closed when scanning is unavailable; local development may explicitly disable ClamAV without breaking core Compose.
- Decode and re-encode JPEG, PNG, and WebP using `sharp`; remove EXIF, GPS, comments, profiles, animation, and unexpected metadata. GIF is rejected in v1 rather than preserving active or animated behavior.
- Compute original SHA-256, sanitized SHA-256, and PDQ perceptual hashes. Use the pinned Meta PDQ reference implementation and verify it against published test vectors before rollout. TMK is deferred until video uploads are supported.
- Keep only hashes in the prohibited-content list. Do not maintain a collection of prohibited source images.
- Gate existing indexing, attachment, avatar, and publication workflows on `scanStatus=clean`; BullMQ retries scanner failures five times with bounded exponential backoff and never publishes on exhaustion.
- Serve released files through authenticated handlers or short-lived signed URLs using server-detected MIME, generated filenames, `X-Content-Type-Options: nosniff`, restrictive CSP, and safe `Content-Disposition`.

This follows OWASP's current guidance to validate actual content, keep uploads outside the webroot, apply size limits, and use antivirus or content disarm and reconstruction where appropriate: [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

### Data model

- Add `upload_security_records`, keyed by `uploadedFileId`, with uploader, context, detected MIME, hashes, scanner versions, scan status, moderation status, rejection code, and timestamps.
- Add append-only `media_moderation_decisions` with reviewer, decision, reason code, notes, and timestamp.
- Add `user_security_capabilities` with the `media_safety_review` capability. Assign and revoke it through an audited operator command; do not add a fourth global role in v1.
- Use these states:

  - Scan: `quarantined`, `scanning`, `clean`, `rejected`, `scan_error`
  - Moderation: `not_required`, `pending`, `approved`, `rejected`, `restricted_escalation`, `withdrawn`

### Moderation behavior

- Clean teacher and admin documents and media release automatically after technical checks.
- Clean student avatars and discussion images remain private until approved.
- Class teachers review ordinary media for their own classes only.
- Avatars and escalated cases require the selected admin safety capability.
- Pending discussion comments may publish with an “image awaiting review” placeholder; attachment bytes and thumbnails remain unavailable to ordinary readers.
- Existing avatars remain active until the replacement is approved.
- Hash matches or reviewer escalation bypass the normal teacher queue, suppress previews, and notify only safety-authorized personnel.
- Students can view status and withdraw pending media but cannot access quarantine URLs.
- Reviewers receive immediate notification; pending items escalate after one school day.
- Ordinary rejected media uses a seven-day appeal window, then deletes its bytes while retaining hashes and audit metadata for one year.
- Suspected illegal material is never automatically deleted, copied into a reviewer gallery, or exposed to teachers. It enters a restricted hold governed by a DPO and legal-approved handling and reporting procedure.

### Public contract changes

- Existing upload endpoints return HTTP `202 Accepted` with:

  ```json
  {
    "fileId": "uuid",
    "scanStatus": "quarantined",
    "moderationStatus": "pending",
    "statusUrl": "/api/uploads/uuid/status"
  }
  ```

- Add:

  - `GET /api/uploads/:fileId/status`
  - `DELETE /api/uploads/:fileId` for uploader withdrawal
  - `GET /api/moderation/queue?scope=assigned|safety`
  - `POST /api/moderation/:fileId/decisions`

- Update web with teacher and safety queues.
- Update web and mobile upload surfaces with pending, approved, rejected, withdrawn, and delayed-scan states.

## Wave 3 — Production Security Umbrella

### Edge and origin isolation

- Use three production hostnames: `lms.<domain>`, `admin.<domain>`, and `ops.<domain>`.
- Deploy `cloudflared` through a production Compose overlay. Remove public host-port bindings from frontend, backend, database, Redis, and observability services.
- Permit no inbound application ports at the host firewall; the tunnel is outbound-only. Cloudflare documents that Tunnel can publish origins without opening inbound ports: [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/).
- Protect admin and operations hostnames with Cloudflare Access, named school identities, Philippine country policy, short sessions, and identity-provider MFA.
- Keep application RBAC authoritative; Cloudflare Access is an additional boundary.
- Apply Cloudflare managed WAF and DDoS protections.
- Apply managed challenges to non-PH traffic reaching login, OTP, password recovery, and upload routes. Do not blanket-block the main student hostname.
- Start edge rules in log or challenge mode for seven days in staging, then enforce after checking false positives.
- Use these initial edge limits:

  - Login: 20 requests per minute per IP
  - OTP verification, resend, and recovery: 10 requests per 5 minutes per IP
  - Upload initiation and finalization: 30 requests per 5 minutes per IP
  - General API: 300 requests per minute per IP

- Preserve stricter application-level account and email throttles. Cloudflare's guidance supports rate limiting for account takeover and resource exhaustion: [Cloudflare rate-limiting guidance](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/).
- Treat country and ASN as risk signals, not proof of identity. Alert on successful non-PH teacher or student authentication for later investigation.

### Host, container, and operational controls

- Run production containers as non-root with dropped capabilities, `no-new-privileges`, read-only filesystems where supported, bounded CPU and memory, health checks, and writable `tmpfs` only where required.
- Keep Grafana and other operational surfaces behind `ops.<domain>` and Cloudflare Access; expose no observability ports publicly.
- Store deployment secrets outside Git with least-privilege production credentials and documented rotation procedures.
- Use separate database roles for migrations and runtime access.
- Generate SBOMs and run dependency, container, infrastructure-as-code, and secret scans in CI; pin production images by digest.
- Encrypt daily database and approved-object backups, retain 30 daily and 12 monthly recovery points, exclude ordinary quarantine files, and run quarterly restore drills.
- Alert on authentication anomalies, activation-grant replay, scanner outages, moderation SLA breaches, queue depth, WAF spikes, Access denials, backup failures, and unusual country or ASN changes.
- Create incident-response runbooks for account takeover, upload malware, suspected prohibited content, credential leakage, data breach, and DDoS.
- Complete a Privacy Impact Assessment and designate the DPO and security response team before production. Current NPC guidance requires accountable privacy personnel and an incident-management policy: [NPC DPO guidance](https://privacy.gov.ph/appointing-a-data-protection-officer/) and [NPC breach guidance](https://privacy.gov.ph/pips-and-pics/breach-reporting/).

## Test and Release Gates

### Wave 1

- Prove an email address alone can no longer change any password.
- Test grant expiry, hash-only storage, replay, concurrent double consumption, tampering, account binding, generic errors, and transaction rollback.
- Verify forgot-password enumeration is closed.
- Verify forged `x-forwarded-for` cannot alter the throttle identity.
- Run backend unit and integration tests and complete web and mobile activation journeys.

### Wave 2

- Test spoofed MIME, SVG, polyglots, malformed images, decompression bombs, oversized dimensions, EXIF GPS stripping, EICAR, safe raster images, PDFs, and scanner outages.
- Verify quarantine bytes cannot be fetched through guessed paths, direct storage URLs, or attachment handlers.
- Verify queue restarts and duplicate jobs are idempotent.
- Verify students, unrelated teachers, and ordinary admins cannot access restricted cases.
- Verify teachers can review only their classes and safety reviewers can access only the restricted workflow.
- Test local and S3 or R2-compatible storage.
- Prove downstream indexing and publishing cannot run before a clean scan.
- Run a privacy review with synthetic fixtures only; never place real illegal material in tests or source control.

### Wave 3

- Validate production Compose renders with no public application or observability ports.
- Confirm direct-origin connections fail while all intended tunnel routes work.
- Test Access allow and deny behavior, country policy, session expiry, WAF challenges, rate limits, WebSockets, uploads, and API health.
- Run an authorized staging load and DDoS simulation through Cloudflare, not against the origin.
- Complete a full backup restoration into a disposable environment.
- Perform an external vulnerability scan and focused penetration test before launch.

## Rollout Order and Acceptance

1. If any environment becomes externally reachable before Wave 1 lands, immediately block the unsafe activation endpoint at the proxy.
2. Implement and deploy Wave 1 atomically across backend, web, and mobile.
3. Implement Wave 2 behind `UPLOAD_SECURITY_ENABLED`; backfill existing files as `legacy_unscanned` and prevent new publication until scanned. Enable first for avatars and discussions, then migrate remaining upload paths.
4. Implement Wave 3 in staging, observe for seven days, conduct recovery and security exercises, then promote the same production configuration.
5. Production launch is blocked until P0 passes, upload access controls pass, the origin is non-public, backups restore successfully, and the DPO approves the moderation retention and escalation procedure.

## Assumptions

- Nexora is not currently deployed publicly, so no backward compatibility is required for the unsafe activation request body.
- Cloudflare is the production reference edge; application contracts remain portable.
- Previously unseen NSFW content cannot be reliably auto-detected without AI or a known hash. Human approval is therefore mandatory for student media.
- The internal hash list contains hashes only and is not represented as an official CSAEM database.
- Staff application MFA and passkeys are the next security change after these three waves, not part of this roadmap.
- Legal-hold and reporting procedures must be approved by qualified Philippine counsel and the school DPO against [RA 11930](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/95572); this engineering plan is not legal advice.
