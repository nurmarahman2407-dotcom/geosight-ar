/**
 * GeoSight AR — Backend API (Google Apps Script)
 *
 * CARA SETUP:
 * 1. Buka Google Sheets baru → Extensions → Apps Script
 * 2. Padam kod default, paste kod ni
 * 3. Deploy → New deployment → pilih type "Web app"
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 4. Salin URL "exec" yang diberi → paste dalam js/sheet-connector.js (apiUrl)
 * 5. Jalankan fungsi setupSheets() SEKALI dari editor (Run > setupSheets)
 *    untuk auto-cipta 4 sheet dengan header yang betul.
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
 * Jalankan SEKALI je dari editor Apps Script (bukan dari web) untuk
 * auto-cipta 4 sheet dengan header column yang betul.
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

  Logger.log("✅ Semua 4 sheet siap dengan header!");
}

/**
 * Optional: test manual dari editor Apps Script (Run > doGet)
 * untuk sahkan URL "exec" hidup sebelum sambung dari GitHub Pages.
 *
 * PENTING: Apps Script TIDAK hantar header CORS pada response —
 * jadi fetch() biasa dari GitHub Pages untuk BACA data akan gagal
 * (walaupun POST logging tadi ok sebab guna mode:'no-cors' fire-and-forget).
 * Untuk BACA balik data (contoh: Student Dashboard), kita guna teknik
 * JSONP (load sebagai <script> tag, bukan fetch) — ini elak sekatan CORS
 * sepenuhnya sebab <script> tag tak tertakluk kat CORS.
 *
 * Cara guna dari browser: tambah ?callback=namaFungsi&studentName=Ali
 * pada URL exec, response akan jadi "namaFungsi({...data...})"
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
 * Baca semua row dalam 1 sheet, tapis ikut StudentName (kolum ke-2),
 * pulangkan sebagai array of objects {header: value}.
 */
function readSheetFiltered_(ss, sheetName, studentName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows
    .filter((row) => !studentName || String(row[1]) === studentName) // kolum B = StudentName
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
}
