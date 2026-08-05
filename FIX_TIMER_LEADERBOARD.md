# Fix Timer and Leaderboard Not Saving

The website was still able to connect to the old guestbook deployment, so names and messages were stored while `completion_ms` and `completion_time` were ignored.

## Update the Apps Script deployment

1. Open the Google Sheet.
2. Choose **Extensions → Apps Script**.
3. Open `Code.gs`.
4. Delete all old code.
5. Paste all code from `GOOGLE_APPS_SCRIPT_TIMER_LEADERBOARD_V2.gs`.
6. Click **Save**.
7. Select `setupBirthdaySheet` and click **Run** once.
8. Select `testTimerLeaderboardBackend` and click **Run**.
9. Confirm the execution result has `ok: true` and `schema_version: 2`.
10. Choose **Deploy → Manage deployments**.
11. Click the pencil/edit icon on the existing Web App.
12. Under **Version**, choose **New version**.
13. Click **Deploy**.

Do not create a new URL unless necessary. Updating the existing deployment keeps the current `/exec` URL.

## Test the deployed URL

Open:

`YOUR_EXEC_URL?action=health`

The correct response includes:

```json
{
  "ok": true,
  "leaderboard": true,
  "schema_version": 2
}
```

Then submit a new birthday wish after completing the game. The Google Sheet must contain:

`id | name | title | message | created_at | approved | completion_ms | completion_time`

Old wishes have blank timing values and remain below newly timed wishes.
