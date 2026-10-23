/**
 * Leakcheck -> Google Sheets mirror.
 *
 * This Apps Script receives each lead from the Leakcheck server action (mirrorToSheet)
 * and appends it as a row. The first lead also writes the header row automatically.
 *
 * SETUP
 * 1. Create a new Google Sheet. Open Extensions -> Apps Script.
 * 2. Delete the default code, paste this whole file in, and Save.
 * 3. Click Deploy -> New deployment -> type "Web app".
 *      - Description: Leakcheck leads
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Click Deploy and authorise when prompted.
 * 4. Copy the Web app URL (it ends in /exec).
 * 5. Put it in the project's .env as:  SHEET_WEBHOOK_URL=<that url>
 * 6. Restart the app (npm run dev). New leads now also land in this sheet.
 *
 * To test without the app: Run -> select testAppend -> Run (adds a sample row).
 */

// Column order for the sheet. Must match the keys sent by mirrorToSheet in src/forms/actions.ts.
var COLUMNS = [
  'timestamp', 'source', 'name', 'business', 'whatsapp', 'email', 'consent',
  'currency', 'type', 'inquiries', 'value', 'convert_out_of_10', 'reply_speed',
  'slip_through', 'quiet_quotes', 'follow_up', 'no_shows', 'reminders', 'unpaid',
  'ask_back', 'monthly_low', 'monthly_high', 'top_leak', 'leak_unanswered',
  'leak_slow_replies', 'leak_quotes', 'leak_no_shows', 'leak_payments',
  'leak_repeat', 'report_text'
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    appendRow(data);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function appendRow(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
  }
  var row = COLUMNS.map(function (key) {
    var v = data[key];
    return v === undefined || v === null ? '' : v;
  });
  sheet.appendRow(row);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Optional: run this once from the editor to confirm rows are written.
function testAppend() {
  appendRow({
    timestamp: new Date().toISOString(),
    name: 'Test Lead', business: 'Test Co', whatsapp: '+10000000000',
    email: 'test@example.com', consent: 'yes', currency: 'GBP', type: 'Food and catering',
    monthly_low: 850, monthly_high: 1400, top_leak: 'Quotes nobody chased'
  });
}
