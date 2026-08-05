# Connect the Birthday Wish Wall to Google Sheets

The website is already prepared to use Google Sheets as the shared database. You only need to create the Sheet, deploy the included Apps Script, and paste one URL into `index.html`.

## 1. Create the Google Sheet

1. Open Google Sheets and create a blank spreadsheet.
2. Give it a name such as **Dhai Birthday Wishes**.
3. You do not need to publish the spreadsheet or give visitors edit access.

## 2. Add the Apps Script

1. In the spreadsheet, select **Extensions → Apps Script**.
2. Delete the example code in `Code.gs`.
3. Copy all code from `GOOGLE_APPS_SCRIPT_CODE.gs` into `Code.gs`.
4. Save the project.
5. From the function selector, choose `setupBirthdaySheet` and click **Run** once.
6. Approve the Google permission request. This creates and formats the **Birthday Wishes** tab.

## 3. Deploy it as a Web App

1. In Apps Script, select **Deploy → New deployment**.
2. Click the deployment-type gear and choose **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy** and approve access if requested.
5. Copy the Web App URL. Use the URL ending in `/exec`, not the `/dev` testing URL.

## 4. Connect the website

Open `index.html`, find the `CONFIG` block near the beginning of the JavaScript, and paste the Web App URL:

```js
guestbook: {
  mode: "auto",
  googleAppsScriptUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
}
```

Save the file and upload the website again. When connected, the final page will display:

`📊 Shared through Google Sheets`

All visitors will then read and add messages to the same birthday wall.

## Data stored in Google Sheets

The script creates these columns:

| id | name | title | message | created_at | approved |
|---|---|---|---|---|---|

The `approved` column is useful for moderation.

- By default, new messages are visible immediately.
- To require manual approval, change this line in `GOOGLE_APPS_SCRIPT_CODE.gs` before deployment:

```js
const REQUIRE_APPROVAL = true;
```

With approval enabled, set a message's `approved` cell to `TRUE` in Google Sheets before it appears publicly.

## Updating the Apps Script later

After editing Apps Script code:

1. Select **Deploy → Manage deployments**.
2. Open the existing deployment.
3. Click **Edit**.
4. Choose **New version** and deploy.

The Web App URL stays the same.

## Troubleshooting

- **The page says “Add Google Sheets Web App URL”**: the URL is empty or is not the `/exec` URL.
- **The page falls back to device storage**: verify the deployment access is **Anyone**, then redeploy a new version.
- **Messages save but do not appear**: check the `approved` column and the `REQUIRE_APPROVAL` setting.
- **You changed the script but nothing changed**: deploy a new version rather than only clicking Save.
