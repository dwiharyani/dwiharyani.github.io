# Update Google Sheets for Timer Leaderboard

1. Open the Google Sheet used by the website.
2. Select **Extensions → Apps Script**.
3. Replace all code in `Code.gs` with `GOOGLE_APPS_SCRIPT_TIMER_LEADERBOARD.gs`.
4. Save the project.
5. Select `setupBirthdaySheet` and click **Run** once.
6. Open **Deploy → Manage deployments**.
7. Edit the current Web App deployment.
8. Choose **New version**, then click **Deploy**.
9. Keep the same `/exec` URL in `index.html`.

The script preserves existing wishes and adds:
- `completion_ms`
- `completion_time`

Timed wishes are returned from fastest to slowest. Older wishes without timing remain below timed wishes.
