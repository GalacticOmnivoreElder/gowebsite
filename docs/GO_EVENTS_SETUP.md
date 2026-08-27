# GO Events setup

The `/events` page uses the GO application UI and Google Calendar as its source of truth. The Google Calendar iframe is no longer used as the primary event surface.

## Public events

Set these server-side values in the deployment environment:

```text
GO_EVENTS_PUBLIC_CALENDAR_ID=d88aa1c479a0ef990128bda11f762b849698d58daf1cbb134871079fecb3a518@group.calendar.google.com
GO_EVENTS_TIMEZONE=Europe/Belgrade
GOOGLE_CALENDAR_API_KEY=...
```

Enable the Google Calendar API for the Google Cloud project that owns the key. Restrict the key to the Calendar API and the deployment environment.

The API key is server-only. It must not be prefixed with `NEXT_PUBLIC_`.

## Members-only events

Create a separate restricted Google Calendar for GO Community meetings and put the Google Meet links there. Do not put a private Meet link on the public calendar and rely only on the website button to protect it.

Set:

```text
GO_EVENTS_MEMBERS_CALENDAR_ID=...
GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON={...}
```

The service account must be granted permission to see all event details on the restricted calendar. Alternatively, provide the service account values through `GOOGLE_CALENDAR_CLIENT_EMAIL` and `GOOGLE_CALENDAR_PRIVATE_KEY`.

## Event content shown on the GO page

The custom GO event view reads the standard Google Calendar event fields:

- Event title becomes the event subject.
- Description becomes the event briefing.
- Location becomes the Where field and marks the event as in person.
- A Google Meet conference becomes the Format field and supplies the join action when access allows it.
- Start and end times become the When and Duration fields.

For the best presentation, give each event a specific title, add a short description with the agenda or expected outcome, enter the physical location when applicable, and add Google Meet through Google Calendar for online sessions. The page displays a clear fallback when a location or briefing has not been supplied.

Member events are fetched server-side and their Meet URL is never returned by the public `/api/go-events` response. The protected endpoint `/api/go-events/[eventId]/join` checks the Firebase user token and the canonical active Community membership state before returning the URL.

The Google Meet room should also use Google’s own access controls, such as requiring sign-in or host approval. A user who has received a Meet URL may still share it, so the website gate should be treated as one layer of access control.

## Event metadata markers

For event categorization, the event description may include these internal lines:

```text
GO_ACCESS: members
GO_TYPE: community
```

The markers are removed from the website description. `GO_ACCESS: members` makes an event members-only in the normalized GO data. The preferred secure setup is still to store that event, including its Meet link, on the restricted members calendar.

If a members-only event is found on the public calendar, the protected join route fails closed and does not issue its Meet link.

## Public links retained

The subscription action still points to the public calendar:

https://calendar.google.com/calendar/u/0?cid=ZDg4YWExYzQ3OWEwZWY5OTAxMjhiZGExMWY3NjJiODQ5Njk4ZDU4ZGFmMWNiYjEzNDg3MTA3OWZlY2IzYTUxOEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t

If the custom GO event API is temporarily unavailable, the events page offers
this public Google Calendar view as a backup:

https://calendar.google.com/calendar/embed?src=d88aa1c479a0ef990128bda11f762b849698d58daf1cbb134871079fecb3a518%40group.calendar.google.com&ctz=Europe%2FBelgrade

The GO scheduling CTA still points to:

https://calendar.app.google/Ge6GvfiaaaMhAHHf6
