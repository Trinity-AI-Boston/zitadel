# Development and production branches

This repository uses `develop` for Cosmos One development and `main` for CSK production.

| Repository checkout | Environment | Server | Deployment branch |
| --- | --- | --- | --- |
| Cosmos One frontend and backend | Trinity development, https://dev.cosmosone.ai | ubuntu@10.100.133.65 | `develop` |
| Cosmos One frontend and backend | CSK production, https://csk.cosmosone.ai | ubuntu@10.100.129.155 | `main` |
| ZITADEL | Development, https://dev-zitadel.cosmosone.ai | ubuntu@10.100.149.46 | `develop` |
| ZITADEL | CSK production, https://csk-zitadel.cosmosone.ai | ubuntu@10.100.129.210 | `main` |

## Pull request flow

1. Create feature and normal bug-fix branches from the latest `develop`.
2. Open feature PRs with base `develop`. Set the base explicitly even if GitHub still offers `main` by default.
3. Review, validate and merge the feature PR. Deploy `develop` to the development servers and verify it there.
4. Open a release PR with head `develop` and base `main`.
5. Review and merge the release PR. Deploy `main` to the CSK production servers.
6. If an urgent fix is merged directly into production through a hotfix PR, open a separate PR from `main` into `develop` to bring that fix back into development.

Use merge commits for release PRs so production retains the reviewed development history. A completed release can leave `main` one merge commit ahead while both branches have identical files. This alone does not require a sync-back PR.

Do not push directly or force-push to `develop` or `main`. This is the team policy; repository administrators must configure GitHub protections separately where their plan supports them.

The old `csk` branch is no longer a deployment branch. Production checkouts follow `main`.

## Deployment

Deployments are manual. Preserve each server's local configuration, identity issuer, callback registrations and database. Build images from the reviewed branch contents, back up the running release and database before rollout, apply any required backend migrations, then restart the relevant application or Login UI services.

Hostnames choose the application's presentation: `dev.cosmosone.ai` uses Trinity branding and `csk.cosmosone.ai` uses CSK branding. The same source code supports both environments; environment credentials remain server-local.

The Login UI pins its trusted CSK Entra provider using the server-only
`CSK_ENTRA_PROVIDER_ID` environment variable. Development uses
`393340902027821059` (the fallback); CSK production must set
`CSK_ENTRA_PROVIDER_ID=393773493298135043` in the Login UI container's environment.
Do not change Entra metadata, callback URLs or user roles to compensate for a
provider mismatch. Provider ownership, activation and organization checks still apply.
