/**
 * GeoSight AR — Backend API (Google Apps Script)
 *
 * SETUP INSTRUCTIONS:
 * 1. Open a new Google Sheets → Extensions → Apps Script
 * 2. Delete the default code, paste this code in
 * 3. Deploy → New deployment → select type "Web app"
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 4. Copy the "exec" URL given → paste into js/sheet-connector.js (apiUrl)
 * 5. Run the setupSheets() function ONCE from the editor (Run > setupSheets)
 *    to auto-create the 4 sheets with the correct headers.
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheetName = data.sheet || "Mission_Log";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    switch (sheetName) {
      case "Mission_Log":
        sheet.appendRow([
          data.timestamp, data.studentName, data.shape,
          data.actionType, data.timeSpentSec, data.status || ""
        ]);
        break;

      case "Quiz_Log":
        sheet.appendRow([
          data.timestamp, data.studentName, data.shape,
          data.question, data.answer, data.correct, data.score
        ]);
        break;

      case "Reflection_Log":
        sheet.appendRow([
          data.timestamp, data.studentName, data.easiestShape,
          data.biggestChallenge, data.realLifeApplication, data.confidenceLevel
        ]);
        break;

      case "Certificate_Log":
        sheet.appendRow([
          data.timestamp, data.studentName, data.finalScore,
          data.tier, data.certificateId
        ]);
        break;

      default:
        sheet.appendRow([data.timestamp, JSON.stringify(data)]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Run this ONCE from the Apps Script editor (not from the web) to
 * auto-create the 4 sheets with the correct column headers.
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheets = {
    "Mission_Log": ["Timestamp", "StudentName", "Shape", "ActionType", "TimeSpentSec", "Status"],
    "Quiz_Log": ["Timestamp", "StudentName", "Shape", "Question", "Answer", "Correct", "Score"],
    "Reflection_Log": ["Timestamp", "StudentName", "EasiestShape", "BiggestChallenge", "RealLifeApplication", "ConfidenceLevel"],
    "Certificate_Log": ["Timestamp", "StudentName", "FinalScore", "Tier", "CertificateID"]
  };

  Object.keys(sheets).forEach((name) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    sheet.clear();
    sheet.appendRow(sheets[name]);
    sheet.getRange(1, 1, 1, sheets[name].length).setFontWeight("bold");
  });

  Logger.log("✅ All 4 sheets ready with headers!");
}

/**
 * Optional: manual test from the Apps Script editor (Run > doGet)
 * to confirm the "exec" URL is alive before connecting from GitHub Pages.
 *
 * IMPORTANT: Apps Script does NOT send CORS headers on its response —
 * so a normal fetch() from GitHub Pages to READ data will fail
 * (even though the POST logging earlier works fine since it uses
 * mode:'no-cors' fire-and-forget). To READ data back (e.g. Student
 * Dashboard), we use the JSONP technique (load as a <script> tag,
 * not fetch) — this fully bypasses CORS restrictions since <script>
 * tags aren't subject to CORS.
 *
 * Usage from browser: add ?callback=functionName&studentName=Ali
 * to the exec URL, the response will become "functionName({...data...})"
 */
function doGet(e) {
  const callback = e.parameter.callback;
  const studentName = e.parameter.studentName || "";

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {
    status: "GeoSight AR backend is alive ✅",
    missionLog: readSheetFiltered_(ss, "Mission_Log", studentName),
    quizLog: readSheetFiltered_(ss, "Quiz_Log", studentName),
    certificateLog: readSheetFiltered_(ss, "Certificate_Log", studentName),
    reflectionLog: readSheetFiltered_(ss, "Reflection_Log", studentName)
  };

  const json = JSON.stringify(result);

  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Read all rows in a sheet, filtered by StudentName (2nd column),
 * returned as an array of objects {header: value}.
 */
function readSheetFiltered_(ss, sheetName, studentName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows
    .filter((row) => !studentName || String(row[1]) === studentName) // column B = StudentName
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}
