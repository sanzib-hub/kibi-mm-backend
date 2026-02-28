// src/lib/googleSheetsClient.js
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

async function getSheetsClient() {
  // Scopes needed to read spreadsheets
  const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

  // Use Workload Identity / ADC when running in GCP.
  // For local dev you can run `gcloud auth application-default login` and ADC will work.
  const auth = new GoogleAuth({ scopes });

  // If you still want local dev to use a pasted JSON (optional fallback),
  // check for GOOGLE_SERVICE_ACCOUNT_JSON only for local dev (but avoid for prod).
  // NOTE: Your org blocks key creation in prod — do NOT store JSON in Cloud Run.
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  let client;
  if (json) {
    try {
      const creds = JSON.parse(json);
      client = auth.fromJSON(creds);
      await client.getAccessToken(); // confirm it works
    } catch (err) {
      console.warn('Invalid GOOGLE_SERVICE_ACCOUNT_JSON, falling back to ADC:', err.message);
      client = await auth.getClient();
    }
  } else {
    client = await auth.getClient();
  }

  const sheets = google.sheets({ version: 'v4', auth: client });
  return sheets;
}

// convenience helper to read a range
async function getValues(range) {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) throw new Error('GOOGLE_SHEETS_ID not set in env');

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return res.data.values || [];
}

module.exports = { getSheetsClient, getValues };