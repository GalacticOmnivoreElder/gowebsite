# GO bug reports: Jira connection

The `/bugs` page is public. Its API creates a Jira Service Management customer request in service desk `5`, request type `10220`. The fields were checked against the public portal: email, summary, description, and optional attachment. The GO form accepts one file of up to 3 MB. The support portal remains available as a fallback.

## Configure Jira

1. Create a dedicated Atlassian service account. Grant it access to the support project and permission to view request type 10220, create customer requests, upload temporary attachments, and add public attachments to the resulting requests. An appropriate Jira Service Management agent role may be required; confirm licensing and the exact project permissions in your organization. Do not grant administrative access unless it is needed.
2. Create a scoped API token for the service account in Atlassian Administration. The Jira Service Management API documents the classic `write:servicedesk-request` scope for creating requests and uploading/adding attachments; use the granular scopes documented for those endpoints if classic scopes are unavailable. If you want to verify the field configuration through the API, the request-type fields endpoint additionally requires a read scope. Token scopes do not replace project permissions.
3. In the website's deployment environment, set `JIRA_BUG_CLOUD_ID` to `32a1c980-b7ad-4233-bb1e-3d62280bda02` (the cloud ID returned for galacticomnivore.atlassian.net), `JIRA_BUG_API_TOKEN` to the token, and `JIRA_BUG_RATE_LIMIT_SECRET` to a randomly generated secret of at least 32 bytes. Scoped service-account tokens use the `api.atlassian.com/ex/jira/{cloudId}` gateway. Never put the token or rate-limit secret in client-side variables, source control, or chat. Configure the same variables separately for any environment in which the form should work.
4. Deploy the changes and environment settings using the project's normal release process. Until configured, `/bugs` directs visitors to the existing Jira portal and submission is disabled.
5. In a test environment, submit a clearly labeled test report with an attachment, then verify its request type, description, attachment, and visibility in Jira. Also test an unavailable Jira connection and an oversized attachment. Remove or close the test request through your normal Jira workflow.

## Reporter identity and email

The form accepts anonymous reports. It includes the supplied, **unverified** email in the Jira description so staff can follow up, but creates the request as the integration account. It does not create or impersonate a Jira customer, and it does not send the reporter an automatic confirmation email. A future verified-email/customer-identity workflow is required for automatic customer notifications and portal access under the reporter's identity. Jira staff should treat the supplied address as unverified.

## Operations

The server limits requests to 3 per supplied email and 50 total per hour using Firestore transactions. Email addresses are HMAC-hashed in rate-limit documents. This is a baseline abuse limit, not a substitute for a production edge rate limiter and bot protection; configure those before promoting a widely publicized anonymous form. Enable Firestore TTL on `bug_report_rate_limits.expiresAt` if automatic cleanup is desired. A failure after Jira has accepted a request can have an unknown outcome; do not automatically retry an ambiguous creation. Attachment failures after creation are shown separately so a reporter is not told the request failed. Monitor service-account token expiration and Jira errors.

References: [Jira Service Management request API](https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-request/), [service desk API and attachment upload](https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-servicedesk/), [Atlassian service account API tokens](https://support.atlassian.com/user-management/docs/manage-api-tokens-for-service-accounts/).
