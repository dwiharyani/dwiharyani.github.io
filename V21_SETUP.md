# Timer and Smartphone Typing Fix — Version 21

## Why spaces did not work

The website had a global keyboard listener that called `preventDefault()` for
the Space key everywhere, including inside the birthday-message textarea.
Version 21 ignores all game keyboard shortcuts while an input or textarea is active.

## Why the timer could be missing

The old website submitted wishes to Google Apps Script through a cross-origin
POST request. Mobile Safari and some mobile Chrome configurations can return an
opaque redirect response. Version 21 uses an Apps Script JSONP `action=add`
endpoint and verifies the saved row afterward.

## Update the existing Google Sheet

1. Open the same Google Sheet.
2. Select **Extensions → Apps Script**.
3. Replace all `Code.gs` content with
   `GOOGLE_APPS_SCRIPT_TIMER_LEADERBOARD_V3.gs`.
4. Save.
5. Run `setupBirthdaySheet` once.
6. Run `testTimerLeaderboardBackend`.
7. Open **Deploy → Manage deployments**.
8. Edit the existing Web App deployment.
9. Select **New version**.
10. Deploy.

Keep the same `/exec` URL.

## Test

Open:

`YOUR_EXEC_URL?action=health`

It must contain:

```json
{
  "ok": true,
  "leaderboard": true,
  "schema_version": 3
}
```

After a new player finishes and submits a wish, the row must include values in:

- `completion_ms`
- `completion_time`
