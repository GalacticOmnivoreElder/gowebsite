import { createRemoteJWKSet, jwtVerify } from "jose";

const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const EMAIL_OUTBOX_AUDIENCE =
  "https://www.galacticomnivore.com/api/cron/email-outbox";
const GITHUB_REPOSITORY = "GalacticOmnivoreElder/gowebsite";
const GITHUB_REPOSITORY_ID = "821858267";
const GITHUB_REPOSITORY_OWNER_ID = "194530138";
const PRODUCTION_REF = "refs/heads/prod";
const EMAIL_OUTBOX_WORKFLOW_REF =
  `${GITHUB_REPOSITORY}/.github/workflows/email-outbox.yml@${PRODUCTION_REF}`;
const ALLOWED_EVENTS = new Set(["schedule", "workflow_dispatch"]);
const ALLOWED_SUBJECTS = new Set([
  `repo:${GITHUB_REPOSITORY}:ref:${PRODUCTION_REF}`,
  `repo:GalacticOmnivoreElder@${GITHUB_REPOSITORY_OWNER_ID}` +
    `/gowebsite@${GITHUB_REPOSITORY_ID}:ref:${PRODUCTION_REF}`,
]);

const githubActionsJwks = createRemoteJWKSet(
  new URL(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`)
);

export async function verifyGithubActionsOidcToken(token) {
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, githubActionsJwks, {
      algorithms: ["RS256"],
      audience: EMAIL_OUTBOX_AUDIENCE,
      issuer: GITHUB_OIDC_ISSUER,
    });

    return (
      ALLOWED_SUBJECTS.has(payload.sub) &&
      payload.repository === GITHUB_REPOSITORY &&
      String(payload.repository_id) === GITHUB_REPOSITORY_ID &&
      String(payload.repository_owner_id) === GITHUB_REPOSITORY_OWNER_ID &&
      payload.ref === PRODUCTION_REF &&
      payload.workflow_ref === EMAIL_OUTBOX_WORKFLOW_REF &&
      ALLOWED_EVENTS.has(payload.event_name)
    );
  } catch {
    return false;
  }
}
