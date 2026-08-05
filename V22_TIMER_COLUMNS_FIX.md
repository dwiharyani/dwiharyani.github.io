# Fix Empty completion_ms and completion_time Columns

This version fixes a positional-writing problem in the old Google Sheet.

1. Open the existing Google Sheet.
2. Select **Extensions → Apps Script**.
3. Delete the old `Code.gs` content.
4. Paste `GOOGLE_APPS_SCRIPT_TIMER_LEADERBOARD_V4.gs`.
5. Save.
6. Run `setupBirthdaySheet` once.
7. Run `testTimerLeaderboardBackend`.
8. Choose **Deploy → Manage deployments**.
9. Edit the existing Web App.
10. Select **New version**.
11. Deploy.

Test:

`YOUR_EXEC_URL?action=health`

It must return `schema_version: 4`.

Timer parameter test:

`YOUR_EXEC_URL?action=validate_timer&completion_ms=123456&completion_time=02:03`

The response must contain:

- `parsed.completion_ms: 123456`
- `parsed.completion_time: "02:03"`

Version 4 writes the new row explicitly to A:H and reads it back before
returning success. It also accepts:

- completion_ms
- completionMs
- elapsed_ms
