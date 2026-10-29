# Community asset publication: storage and licensing design

Status: **draft; not ready for publication**. GO needs to decide the member licence terms, obtain the contributor's permission, and configure and verify private file storage before publishing Vasilaki's submission or migrating earlier files.

GO's chosen direction is noncommercial practice and prototypes under an active Community membership, replacement of the assets for finished games, and separately licensed commercial use. A previously created noncommercial project may remain available after membership ends, but new projects cannot use the assets under the membership licence after expiry. Further terms and counsel review are required; see `go-community-asset-license-draft.md`.

## Intended experience

- Contributors submit a pack for review, including its files, manifest, authorship and third-party dependencies. They agree to a versioned contributor agreement granting GO the rights required to host and license the pack to members; retain the agreement version, contributor identity, timestamp and pack version.
- GO reviews the contents, provenance, permitted use, licence and download before publishing. Existing CC or other licences must not be represented as GO's proprietary licence or have previously granted rights revoked.
- Members see the exact applicable licence and version before download and accept it explicitly. Record the member, licence version, pack version and acceptance time. A meaningful licence change requires a fresh acceptance.
- Every file request checks current membership and the published version server-side. Revocation, refund and expiry remove future access. Paid-through cancellation follows the existing membership resolver.
- A downloaded copy cannot be technically recalled; obligations concerning retained copies and existing shipped games belong in the licence and must be explained before acceptance.

## Private storage recommendation

Use a dedicated private Cloud Storage for Firebase / Google Cloud Storage bucket, with public access prevention and narrowly scoped server access. No public Firebase download-token URLs or public Drive links. Store object paths and immutable version identifiers only in server-owned records. Stream files through an authenticated endpoint after checking publication, membership and licence acceptance; never expose storage paths or permanent source URLs. Protect upload and download size, content type and file name, review files and dependencies, and log access without logging sensitive URLs. Configure lifecycle, backup, malware review, storage and bandwidth costs, and retention before launch.

GO can keep Google Drive as its internal working archive. Move approved files into private storage for publication; do not expose an “anyone with the link” Drive URL as a member-only download. A restricted Drive link alone also will not work for members who lack Drive permission. A server-side Drive proxy is another possible design but needs Drive API scopes, service-account access to each file, shared-drive and quota handling, and the same entitlement and acceptance checks.

If GO chooses direct Drive sharing instead, it requires a dedicated restricted folder with no public, domain-wide or broad inherited permissions. Verify the recipient's Google account, then grant that account reader access only after current membership and licence acceptance are confirmed. Persist GO-created permission IDs per account and source; do not delete permissions GO did not create. Queue idempotent changes, serialize permission modifications per Drive item, and reconcile grants and revocations after renewal, paid-through cancellation, expiry, refund, failed webhooks and email changes. Verify the resulting effective access, including inherited and other direct grants; surface failures for staff rather than reporting access as revoked. Handle overlapping entitlements, individual purchases, account deletion and lost Google-account access without revoking a valid separate licence. Google supports per-user permissions and expiry but inherited permissions and direct child permissions need independent handling; expirations are limited to one year. See https://developers.google.com/workspace/drive/api/guides/manage-sharing and https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/create. Direct Drive sharing cannot recall copies already downloaded or prevent someone authorized from sharing their own copy.

## Decisions required before legal text

1. Define commercial use, public practice prototypes versus finished games, modifications, AI training and use by contractors or teams.
2. Specify post-expiry maintenance, updates and retention for existing noncommercial projects.
3. Specify any attribution in released projects and the terms, payment and creator consent for a separate commercial licence.
4. Resolve contributor rights, third-party dependencies, ability to withdraw, GO's right to distribute, liability, takedown, dispute process, governing law and territory.
5. Identify the existing archive and each item's contributor, terms, download, and publication state. Do not infer that every file in a Drive folder is cleared for distribution.

A qualified lawyer familiar with the applicable jurisdiction should review the final contributor agreement and member licence before GO presents them as binding. This document is a design brief, not legal terms.

## Current system and release blockers

The existing asset-pack and legacy resource endpoints issue a short-lived ticket and then redirect to a stored HTTPS / Google Drive URL. The ticket checks entitlement at redemption, but the destination can remain usable if shared and is not a subscription-controlled file store. Existing `public` packs and individual grants also have distinct historical access semantics. Do not rely on these redirects as enforcement of subscription-only file access; migrate and verify each asset and its rights before changing existing grants or licences.

Vasilaki's linked submission is `GlagoliticAssetPack.zip` (approximately 6.7 MB). A metadata-level archive review found 87 files: 41 individual letters plus an alphabet collection and animation setup, each in Blender and FBX formats, and a README. The README credits Vasilaki Totsili and states that purchasers may use the assets commercially. It does not establish permission for GO's proposed membership distribution or a separate commercial resale. Do not replace or override those terms without the rights holder's agreement. The review did not open the 3D files, verify file safety, or inspect the live submission record.

On 28 October 2026, after the owner changed sharing, Drive permission metadata no longer showed an `anyone` permission; it listed the owner and the GO reviewer account. The connector did not provide enough parent or inheritance detail to verify every possible effective permission. Vasilaki's consent for the proposed member and commercial licences is outstanding; the owner will confirm it with him. Keep the pack unpublished until consent, the final terms, secure delivery and the live submission have been verified.

The prior package also needs inspection using an authorized production administrator. This development environment has no production Firebase Admin credentials. A prior read-only inventory reported one legacy package, while the Drive “Subscription Assets” folder contains a March subfolder; neither is proof that all intended assets have been identified or cleared.
