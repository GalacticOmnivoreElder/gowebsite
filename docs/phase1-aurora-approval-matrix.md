# AURORA change approval and local authorization

This matrix records the proposal in [the technical design](phase1-aurora-technical-design.md), the scope in [the remediation backlog](phase1-aurora-remediation-backlog.md), and the user's follow-up authorization on 17 October 2026: “Can we commit the work and don't push I want to test locally.” That authorizes the scoped AURORA fixes, local validation, and a local commit. It does not authorize a push or production deployment.

| Change | Action | Impact / risk | Authorization status |
|---|---|---|---|
| Projects accessible names | Add stable labels to the four existing Radix select triggers. | Small, reversible UI change. | Authorized and implemented for local testing. |
| Text contrast | Add a semantic accent-text token for readable text while keeping brand fills unchanged; correct the reported event labels and Starter Pathway eyebrow. | Visible text-color change tied to reported contrast failures. | Authorized and implemented for local testing. |
| Profile ARIA | Hide the avatar's decorative status marker from assistive technology because it does not represent verified status. | Reversible semantic change, no account-data effect. | Authorized and implemented for local testing. |
| CLS and mobile overflow | Match the project loading structure to its loaded layout and constrain WordPress media and wide content. | Responsive/performance effect; verified against deterministic local fixtures. | Authorized and implemented for local testing. |
| Security headers and CSP | Verify the existing policy and response headers locally; no policy change. | CSP changes can affect auth, billing, video or telemetry. | Local verification authorized. Policy changes need evidence and separate review. |
| Quality-test dependency | Reuse Playwright already declared by the project; no package or lockfile dependency was added. | Local-only regression tests. | Authorized. |
| Database, auth, Polar, Discord, mail, calendars | No change proposed for the AURORA fixes. | The AURORA defects do not justify payment, identity, data, or event-platform changes. | Outside this authorization. |
| Local commit | Commit only the AURORA code/tests and Phase 1 documentation to the current local feature branch. | Local Git history change. | Explicitly authorized by the follow-up request. |
| Push or production deployment | No push or release through Vercel/Git. | Would expose the changes to remotes or production. | Not authorized; user asked to test locally. |
| GOHQ recurring events platform | Designs are supplied separately. No feature code, Firestore collections/rules, Calendar series, participant invitations, notifications or app configuration are in the AURORA remediation. | Substantial new product, authorization, content, data and third-party integration. | Requires its own specific implementation approval. |

No change in this proposal grants permission to charge production payments, send test mail to users, book or cancel real appointments, edit the live calendar, migrate real data, change DNS, disclose a test credential, merge to a protected branch outside its rules, or deploy unrelated unreviewed changes.

The local remediation and local-only commit are authorized. Production deployment and push remain out of scope. The GOHQ design still requires its own implementation approval.
