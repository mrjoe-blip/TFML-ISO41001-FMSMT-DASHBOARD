/**
 * ===========================================================================
 * ISO FM DIAGNOSTIC BACKEND - V9 (Latest Model & Robustness)
 * ===========================================================================
 */

const API_KEY_NAME = 'GEMINI_API_KEY';
const MODEL_NAME = 'gemini-3-flash-preview'; 

const DASHBOARD_BASE_URL = "https://tfml-iso-41001-fmsmt-dashboard.vercel.app"; 
const SHEET_NAME = "Form Responses 1"; 
const ID_COLUMN_HEADER = "Respondent ID";

function safeAlert(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    Logger.log(`UI Alert suppressed: ${message}`);
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('FMSMD Tool')
    .addItem('1. Setup Columns (ID & AI)', 'setupSheet')
    .addItem('2. Run Analysis on Last Row', 'runManualAnalysis')
    .addToUi();
}

function setupSheet(silent = false) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    const msg = `Sheet "${SHEET_NAME}" not found.`;
    if (!silent) safeAlert(msg);
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let lastCol = sheet.getLastColumn();

  if (headers.indexOf(ID_COLUMN_HEADER) === -1) {
    sheet.insertColumnAfter(lastCol);
    sheet.getRange(1, lastCol + 1).setValue(ID_COLUMN_HEADER);
    lastCol++;
  }

  const aiHeaders = [
    'AI_Analysis_Result', 'AI_Reasons_for_Result', 'AI_Recommendations', 'AI_Next_Steps_Guide',
    'AI_Maturity_Score', 'AI_Maturity_Level', 'AI_Clause_6_Planning_Score', 'AI_Clause_7_Support_Score',
    'AI_Clause_8_Operation_Score', 'AI_Clause_9_Performance_Score'
  ];

  const missingAiHeaders = aiHeaders.filter(h => !headers.includes(h));
  if (missingAiHeaders.length > 0) {
    sheet.insertColumnsAfter(lastCol, missingAiHeaders.length);
    sheet.getRange(1, lastCol + 1, 1, missingAiHeaders.length).setValues([missingAiHeaders]);
  }

  if (!silent) safeAlert('Columns checked/created successfully.');
}

function onFormSubmitTrigger(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowIdx = e.range.getRow();
    const rowData = e.namedValues;

    let idColIndex = headers.indexOf(ID_COLUMN_HEADER);
    if (idColIndex === -1) {
      setupSheet(true); 
      idColIndex = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].indexOf(ID_COLUMN_HEADER);
    }

    let uniqueId = String(sheet.getRange(rowIdx, idColIndex + 1).getValue()).trim();
    if (!uniqueId || uniqueId.length !== 4) {
      uniqueId = generateUniqueId();
      sheet.getRange(rowIdx, idColIndex + 1).setValue(uniqueId);
      SpreadsheetApp.flush();
    }

    const analysis = callGeminiForAnalysis(JSON.stringify(rowData, null, 2));

    if (analysis) {
      const aiStartColIndex = headers.indexOf('AI_Analysis_Result');
      if (aiStartColIndex > -1) {
        updateSheetWithAnalysis(sheet, rowIdx, analysis, aiStartColIndex);
      }
      const recipient = extractEmailAndName(rowData);
      if (recipient.email) sendEmailReport(recipient.email, recipient.name, uniqueId, analysis);
    }
  } catch (err) {
    Logger.log("Error in onFormSubmit: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    const id = e.parameter.id;
    if (!id) return jsonResponse({ error: "Missing ID" });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColIndex = headers.indexOf(ID_COLUMN_HEADER);
    const headerMap = {};
    headers.forEach((h, i) => headerMap[h] = i);

    const searchId = String(id).trim().toUpperCase();
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][idColIndex]).trim().toUpperCase() === searchId) {
        const row = data[i];
        return jsonResponse({
          id: searchId,
          respondentName: row[headerMap['Name']] || row[headerMap['Full Name']] || 'User',
          respondentEmail: row[headerMap['Email Address']] || row[headerMap['Email']] || '',
          organization: row[headerMap['Organization Name']] || row[headerMap['Organization']] || 'Organization',
          submissionDate: Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
          aiMaturityScore: Number(row[headerMap['AI_Maturity_Score']] || 0),
          aiMaturityLevel: String(row[headerMap['AI_Maturity_Level']] || 'Pending'),
          clause6Score: Number(row[headerMap['AI_Clause_6_Planning_Score']] || 0),
          clause7Score: Number(row[headerMap['AI_Clause_7_Support_Score']] || 0),
          clause8Score: Number(row[headerMap['AI_Clause_8_Operation_Score']] || 0),
          clause9Score: Number(row[headerMap['AI_Clause_9_Performance_Score']] || 0)
        });
      }
    }
    return jsonResponse({ error: "Record not found" }, 404);
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function callGeminiForAnalysis(formData) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(API_KEY_NAME);
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: `Analyze this assessment data: ${formData}. Return JSON with maturity score (0-100), level, and scores for ISO 41001 clauses 6, 7, 8, 9.` }] }],
    generationConfig: { responseMimeType: "application/json" }
  };

  for (let i = 0; i < 5; i++) {
    try {
      const resp = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
      if (resp.getResponseCode() === 200) {
        const result = JSON.parse(resp.getContentText());
        return JSON.parse(result.candidates[0].content.parts[0].text);
      }
      Utilities.sleep(2000 * Math.pow(2, i));
    } catch (e) { Utilities.sleep(2000); }
  }
  return null;
}

function generateUniqueId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let res = "";
  for (let i = 0; i < 4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
  return res;
}

function extractEmailAndName(rowData) {
  let email = '', name = '';
  ['Email Address', 'Email'].forEach(k => { if (rowData[k] && rowData[k][0].includes('@')) email = rowData[k][0].trim(); });
  ['Name', 'Full Name'].forEach(k => { if (rowData[k] && rowData[k][0]) name = rowData[k][0].trim(); });
  return { email, name: name || "Client" };
}

function sendEmailReport(email, name, code, analysis) {
  const body = `<h2>ISO 41001 Assessment Report</h2><p>Dear ${name}, your maturity score is ${analysis.analysisScore}/100.</p><p>Access code: <strong>${code}</strong></p><a href="${DASHBOARD_BASE_URL}/#/report?id=${code}">View Dashboard</a>`;
  MailApp.sendEmail({ to: email, subject: "Your FM Assessment Report", htmlBody: body });
}

function jsonResponse(data, status = 200) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function updateSheetWithAnalysis(sheet, row, analysis, col) {
  const data = [analysis.analysisResult, (analysis.reasons || []).join('\n'), (analysis.recommendations || []).join('\n'), analysis.nextStepsGuide, analysis.analysisScore, analysis.complianceLevel, analysis.clauseScores.planningScore, analysis.clauseScores.supportScore, analysis.clauseScores.operationScore, analysis.clauseScores.performanceScore];
  sheet.getRange(row, col + 1, 1, data.length).setValues([data]);
}

function runManualAnalysis() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const row = sheet.getLastRow();
  if (row <= 1) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const vals = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  const named = {}; headers.forEach((h, i) => named[h] = [vals[i]]);
  onFormSubmitTrigger({ namedValues: named, range: sheet.getRange(row, 1) });
}