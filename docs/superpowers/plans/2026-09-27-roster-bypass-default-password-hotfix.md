# Roster Bypass Default Password Hotfix Plan

**Objective:** Assign `Student123!` as the onboarding password for every newly created roster account when an administrator commits with immediate activation/OTP bypass, then release the change to production.

**Authorized scope:** Backend roster import, regression coverage, audit evidence, commit, push to `developement`, and configured Railway deployment. No existing-account password reset, schema change, frontend/mobile change, APK build, or production learner creation.

## Confirmed design

- `skipVerification: true` remains administrator-only and creates `ACTIVE`, email-verified accounts.
- Those newly created accounts receive the shared plaintext onboarding password `Student123!` through the existing credential email.
- Each stored password is independently bcrypt-hashed, so identical plaintext does not produce identical database hashes.
- Standard OTP imports continue to use unique generated temporary passwords.
- Audit metadata records only the non-secret credential strategy: `shared_default` or `generated_unique`.
- Existing users, including pending/suspended/archived accounts, are never modified by this hotfix.

## Security tradeoff

The existing email instructs immediately active roster users to change the temporary password, and the activation-password endpoint verifies the current password before accepting a replacement. The product does not force that change: `Student123!` remains a valid login password until the user changes it. This tradeoff is inherent in the explicitly requested shared-default behavior and is not widened to other account-creation paths.

## TDD checklist

1. Extend the roster service table test to require `Student123!` for every `admin_attested` onboarding event, unique generated passwords for `email_otp`, independently salted stored hashes, and the matching audit strategy.
2. Run the focused roster service spec and confirm it fails because bypass mode still generates random passwords.
3. Add a private roster-service constant and select it only for `skipVerification === true`; retain sequential unique generation for standard mode.
4. Derive audit `initialCredentialMode` from the applied activation mode without logging the password.
5. Run focused tests, diagnostics, backend lint/build/full unit suite, and applicable CI gates.
6. Review/stage only task-owned files, commit, fetch/recheck divergence, push `developement`, and verify exact-SHA CI, Railway backend deployment, and public liveness.
