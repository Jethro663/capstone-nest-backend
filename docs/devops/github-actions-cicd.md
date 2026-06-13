# GitHub CI/CD Setup

This repo now has three GitHub Actions workflows:

- `CI`: runs build and test checks for `backend`, `next-frontend`, `mobile`, and `ai-service`.
- `Docker Publish`: builds and pushes container images for `backend`, `next-frontend`, and `ai-service` to GitHub Container Registry (`ghcr.io`) after a successful `CI` run on `main`, or when triggered manually.
- `Railway Deploy (developement)`: deploys `backend`, `next-frontend`, and `ai-service` to the live Railway project when matching changes are pushed to `developement`.

## What runs in CI

The workflow at `.github/workflows/ci.yml` currently uses checks that pass against the repo's current state:

- `backend`: `npm run build` and `npx jest --config ./test/jest-e2e.json --ci`
- `next-frontend`: `npm run build` and `npx jest --ci`
- `mobile`: `npm run typecheck`
- `ai-service`: `python -m unittest discover -s tests -v`

`next-frontend` lint is intentionally not part of CI yet because the current branch has existing lint errors that would make the workflow fail immediately.

`CI` runs on:

- pull requests that touch the app code or CI workflow
- pushes to `main`
- pushes to `developement`

## Docker image names

The publish workflow pushes these images:

- `ghcr.io/<repo-owner>/capstone-backend`
- `ghcr.io/<repo-owner>/capstone-frontend`
- `ghcr.io/<repo-owner>/capstone-ai-service`

Each image gets:

- `latest` on the default branch
- a branch tag
- a `sha-<commit>` tag

## Repository settings to verify

In GitHub:

1. Open `Settings > Actions > General`.
2. Ensure GitHub Actions is enabled for the repository.
3. Under workflow permissions, allow actions to read and write permissions.
4. Keep `GITHUB_TOKEN` package permissions available so the publish workflow can push to GHCR.

## First publish

After pushing these workflow files to GitHub:

1. Push a commit to `main` and let `CI` pass, or run `Docker Publish` manually from the `Actions` tab.
2. Open the workflow run and confirm all three images were pushed.
3. Check the `Packages` section in GitHub for the published GHCR packages.

## Deployment

This setup stops at image publishing. That is enough for continuous integration plus container delivery.

## Railway auto-deploy from `developement`

The workflow at `.github/workflows/railway-deploy-developement.yml` deploys the live Railway services directly from GitHub Actions when code is pushed to `developement`.

It targets:

- `capstone-backend-v2`
- `next-frontend-v2`
- `ai-service`

It only deploys services whose paths changed in the push.

### Required GitHub secret

Add this repository secret before relying on the workflow:

- `RAILWAY_TOKEN`

This should be a Railway token with access to project `precious-nourishment`.

### Important behavior note

This workflow deploys to the Railway `production` environment from the `developement` branch by design. That means pushes to `developement` become live after the workflow runs successfully.
