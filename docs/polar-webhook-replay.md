# Polar webhook replay check

Use this procedure in Polar sandbox or an isolated staging project. Never replay
production events into a developer database.

1. Confirm the staging deployment uses `POLAR_SERVER=sandbox`, its own Firebase
   project, and the matching Polar webhook secret.
2. Create one test subscription or test order and record the Polar event ID.
3. Before replaying, record the matching counts in `orders`,
   `subscription_events`, `processed_webhooks`, `email_outbox`, and the member's
   entitlement fields.
4. Use Polar's webhook delivery view to resend the exact same signed event to
   the staging webhook URL twice. Do not edit the payload or event ID.
5. Confirm the endpoint acknowledges both deliveries. The first may perform the
   transition; the second must be reported as an already-processed replay.
6. Confirm there is one `processed_webhooks/{eventId}` marker and no duplicate
   order, subscription event, entitlement mutation, activation email, or audit
   record.
7. Repeat with a deliberately invalid signature using an HTTP client. Confirm
   the endpoint rejects it and creates no marker or state change.
8. Save redacted event IDs and result counts in the release record. Do not copy
   webhook bodies, customer emails, tokens, or payment metadata into tickets.

If a delivery fails after claiming an event, confirm the processing lease is
released and a later valid retry succeeds exactly once.
