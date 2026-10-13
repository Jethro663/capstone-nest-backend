# Release evidence checklist

- [ ] Record the exact candidate commit and protected branch.
- [ ] Run backend, web, mobile, AI, migration, contract, and security gates required by the changed surfaces.
- [ ] Take and verify a durable backup before schema or official-record changes.
- [ ] Deploy stateful dependencies and backend before clients; run migrations once.
- [ ] Record provider deployment IDs and prove public live/readiness for the exact commit.
- [ ] Verify authenticated role workflows without performing unauthorized destructive actions.
- [ ] Verify APK/IPA identity, signing, size, SHA-256, policy registration, and physical-device behavior.
- [ ] Record rollback target and post-deploy observation result.
