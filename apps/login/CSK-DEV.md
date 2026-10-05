# CSK DEV Entra login

This fork provisions CSK users from a server-validated SAML intent and completes
login without a profile form. The branch is restricted to organization
`393340147136987139` and provider `393340902027821059`. Other organizations use
the existing login flow.

## Required configuration

- Entra sends emailaddress, givenname, surname, and the groups claim. The claim
  names and four group IDs are defined in `src/lib/csk-entra.ts`.
- A user must belong to exactly one recognized Cosmos role group. Missing or
  conflicting membership denies sign-in; it never grants a default role.
- CSK enables external login and automatic provider account creation and update.
- Cosmos project `385976020320124931` grants CSK all four project roles.
- The login service account needs user creation/update, user metadata, project
  read, and user grant read/write permissions. The deployed IAM_LOGIN_CLIENT
  account was checked against ZITADEL v4.16.0.
- The `emitCskDirectory` action is attached to Complement Token / Pre Userinfo
  Creation and Pre Access Token Creation. It copies `cosmos_csk_directory`
  metadata into the signed `cosmos_directory` claim for the Cosmos client.
- Login V2 does not execute the legacy External Authentication profile/group
  actions. This login service supplies the profile and group metadata instead.

## Provisioning and access

Each valid CSK SAML callback reads claims from the IDP intent, updates or creates
the linked user, and synchronizes the user's project assignment. It invalidates
old group evidence before role writes and waits for the read model before
creating the login session. An administrator-disabled assignment stays disabled.
Existing unlinked accounts are not automatically linked by matching email.

Cosmos validates fresh directory evidence and manages its own sessions. Role and
group changes are checked at the next Entra login. Existing Cosmos sessions are
not revoked immediately when a group changes in AD. Application permissions and
matter assignments are enforced by Cosmos, independently of these project roles.

## Build and deployment

Build only tracked source, with no local environment files:

```sh
git archive HEAD | docker build --platform linux/amd64 \
  -f apps/login/Dockerfile.source -t cosmos-zitadel-login:<revision> -
```

Deploy the image to the ZITADEL host using a Compose override for the
`zitadel-login` service. Preserve its existing environment, token volume,
networks, and proxy labels. Keep the original image and Compose files for
rollback. Update only the login service with `up -d --no-deps zitadel-login`.

Verify `/ui/v2/login/healthy`, `/ui/v2/login/ready`, CSK registration redirects,
and the separate CSK and Trinity authorization routes. Finally, perform a fresh
Entra login with a real CSK pilot account and verify its role in Cosmos. Unit
tests and API probes do not replace this last browser check.

## Matching auth loaders and local testing (TRI-815)

The Login UI processing page and Cosmos frontend use the same loader styles and
assets for Cosmos, CSK and Trinity. The brand follows the registered OIDC callback;
branding never grants organization access. Successful handoffs skip error
translations. Session creation and MFA-method reads overlap, as do the independent
CSK policy reads; all required checks still finish before continuing.

For a local Login UI connected to the existing dev identity service, provide an
authorized dev Login UI token in an owner-only file outside this repository. Set
`ZITADEL_SERVICE_USER_TOKEN_FILE` to that file, then run from the repository root:

```sh
node apps/login/scripts/run-cosmos-local.mjs
```

In the frontend's ignored `.env.local`, set:

```dotenv
COSMOS_LOCAL_ZITADEL_UI=http://localhost:3001/ui/v2/login
COSMOS_LOCAL_ZITADEL_ISSUER=https://dev-zitadel.cosmosone.ai
```

This override applies only in development on the supported localhost domains.
The backend still validates state, nonce, PKCE and its callback allowlist. Branded
callbacks also need registration on the ZITADEL client. Google/Entra and the dev
identity API remain remote; only the Login UI runs on port 3001.

Visual checks require no identity account: open
`http://localhost:3001/ui/v2/login/dev/auth-loader?brand=csk` and the frontend's
`http://csk.localhost:3000/dev/auth-loader?brand=csk`. Use `cosmos` or `trinity` for
the other brands. Preview routes return 404 in production. Real SSO acceptance
still requires an authorized account. Remove the temporary credential after testing.
