/**
 * ===========================================================================
 * ISO FM DIAGNOSTIC BACKEND - V18 (Robust API & UI Safety)
 * ===========================================================================
 */

const API_KEY_NAME = 'GEMINI_API_KEY';
const MODEL_NAME = 'gemini-3-flash-preview'; 

const DASHBOARD_BASE_URL = "https://tfml-iso-41001-fmsmt-dashboard.vercel.app"; 
const SHEET_NAME = "Form Responses 1"; 
const ID_COLUMN_HEADER = "Respondent ID";

// --- UI SAFETY WRAPPERS ---

/**
 * Safely alerts the user or logs the message depending on the execution context.
 * Prevents "Cannot call SpreadsheetApp.getUi() from this context" error.
 */
function safeNotify(message, isError = false) {
  try {
    const ui = SpreadsheetApp.getUi();
    if (ui) {
      ui.alert(message);
    }
  } catch (e) {
    // If UI is unavailable (e.g. running as web app or trigger), log instead.
    if (isError) {
      Logger.log("ERROR NOTIFICATION: " + message);
    } else {
      Logger.log("INFO NOTIFICATION: " + message);
    }
  }
}

// --- CORE TRIGGERS ---

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('FMSMD Tool')
      .addItem('1. Setup Columns (ID & AI)', 'setupSheet')
      .addItem('2. Run Analysis on Last Row', 'runManualAnalysis')
      .addToUi();
  } catch (e) {
    Logger.log("Menu could not be added: " + e.toString());
  }
}

function onFormSubmitTrigger(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(60000)) return;

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("Sheet '" + SHEET_NAME + "' not found.");
    
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
      if (recipient.email) {
        sendEmailReport(recipient.email, recipient.name, uniqueId, analysis);
      }
    }
  } catch (err) {
    Logger.log("CRITICAL ERROR in Form Submit: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    const id = e.parameter.id;
    if (!id) return jsonResponse({ error: "MISSING_ID_PARAMETER" }, 400);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return jsonResponse({ error: "SHEET_NOT_FOUND", detail: SHEET_NAME }, 500);

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColIndex = headers.indexOf(ID_COLUMN_HEADER);
    
    if (idColIndex === -1) return jsonResponse({ error: "ID_COLUMN_MISSING" }, 500);

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
    return jsonResponse({ error: "RECORD_NOT_FOUND" }, 404);
  } catch (err) {
    return jsonResponse({ error: "INTERNAL_SERVER_ERROR", detail: err.toString() }, 500);
  }
}

// --- HELPER FUNCTIONS (ALL DEFINED IN-FILE TO PREVENT REFERENCE ERRORS) ---

function extractEmailAndName(rowData) {
  let email = '', name = '';
  const emailKeys = ['Email Address', 'Email', 'Your Email', 'Contact Email', 'email'];
  const nameKeys = ['Name', 'Full Name', 'Your Name', 'Respondent Name', 'name'];
  
  for (const k of emailKeys) {
    if (rowData[k] && rowData[k][0] && rowData[k][0].includes('@')) {
      email = rowData[k][0].trim();
      break;
    }
  }
  for (const k of nameKeys) {
    if (rowData[k] && rowData[k][0]) {
      name = rowData[k][0].trim();
      break;
    }
  }
  
  if (!email) {
    Object.keys(rowData).forEach(k => {
      const val = rowData[k][0];
      if (val && typeof val === 'string' && val.includes('@') && val.includes('.')) email = val.trim();
    });
  }
  return { email, name: name || "Client" };
}

function callGeminiForAnalysis(formData) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(API_KEY_NAME);
  if (!apiKey) {
    Logger.log("API Key missing in Script Properties: " + API_KEY_NAME);
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
  
  const schema = {
    type: "OBJECT",
    properties: {
      analysisResult: { type: "STRING" },
      analysisScore: { type: "INTEGER" },
      complianceLevel: { type: "STRING" },
      reasons: { type: "ARRAY", items: { type: "STRING" } },
      recommendations: { type: "ARRAY", items: { type: "STRING" } },
      nextStepsGuide: { type: "STRING" },
      clauseScores: {
        type: "OBJECT",
        properties: {
          planningScore: { type: "INTEGER" },
          supportScore: { type: "INTEGER" },
          operationScore: { type: "INTEGER" },
          performanceScore: { type: "INTEGER" }
        },
        required: ["planningScore", "supportScore", "operationScore", "performanceScore"]
      }
    },
    required: ["analysisResult", "analysisScore", "complianceLevel", "clauseScores", "reasons", "recommendations", "nextStepsGuide"]
  };

  const prompt = `ACT AS A SENIOR ISO 41001 LEAD AUDITOR. Analyze this diagnostic: ${formData}. Return 5 gaps starting with [GAP] and 5 actions starting with [ACTION]. Include clause references.`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema }
  };

  for (let i = 0; i < 5; i++) {
    try {
      const resp = UrlFetchApp.fetch(url, {
        method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true
      });
      if (resp.getResponseCode() === 200) {
        return JSON.parse(JSON.parse(resp.getContentText()).candidates[0].content.parts[0].text);
      }
      Utilities.sleep(2000 * Math.pow(2, i));
    } catch (e) { Logger.log("Gemini Attempt " + (i+1) + " failed: " + e.toString()); }
  }
  return null;
}

function sendEmailReport(email, name, code, analysis) {
  const dashboardLink = `${DASHBOARD_BASE_URL}/#/report?id=${code}`;
  
  let subjectText = analysis.analysisResult || "ISO 41001 Report";
  if (subjectText.length > 50) subjectText = subjectText.substring(0, 47) + "...";
  const subject = `Assessment Complete: ${subjectText}`;
  
  const resultIcon = analysis.analysisScore >= 70 ? '✅' : analysis.analysisScore >= 40 ? '⚠️' : '❌';

  const htmlBody = `
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: auto; padding: 25px; border: 1px solid #ddd; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0056b3; text-align: center;">ISO 41001 Maturity Analysis</h2>
        <div style="text-align: center; margin-bottom: 25px;">
            <img src="https://raw.githubusercontent.com/mrjoe-blip/TFML-ISO41001-FMSMT-DASHBOARD/main/public/iso-fm-logo.png" alt="Logo" width="150" style="display: block; margin: 0 auto;">
        </div>
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; border-left: 6px solid #2563eb;">
            <h3 style="margin: 0;">${resultIcon} Result: ${analysis.analysisResult}</h3>
            <p><strong>Maturity:</strong> ${analysis.complianceLevel} (Score: ${analysis.analysisScore}/100)</p>
        </div>
        <div style="background: #ffffff; padding: 20px; text-align: center; border: 2px dashed #0056b3; border-radius: 12px; margin: 30px 0;">
          <p style="text-transform: uppercase; font-size: 11px; color: #64748b; font-weight: bold;">Your Dashboard Access Code</p>
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; color: #0056b3; letter-spacing: 8px;">${code}</span>
        </div>
        <h4 style="color: #2563eb;">🔍 Gaps Identified:</h4>
        <div style="border: 1px solid #fee2e2; padding: 15px; border-radius: 8px; background-color: #fef2f2;">
            ${(analysis.reasons || []).map(r => `<p style="color: #b91c1c;"><strong>${r.includes('[GAP]') ? '' : '[GAP] '}</strong>${r}</p>`).join('')}
        </div>
        <h4 style="color: #2563eb;">💡 Strategic Actions:</h4>
        <div style="border: 1px solid #fef3c7; padding: 15px; border-radius: 8px; background-color: #fffbeb;">
            ${(analysis.recommendations || []).map(rec => `<p style="color: #92400e;"><strong>${rec.includes('[ACTION]') ? '' : '[ACTION] '}</strong>${rec}</p>`).join('')}
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="https://isofmacademy.ng/consult/" style="display: inline-block; padding: 16px 32px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Contact ISOFM Expert</a>
        </div>
        <div style="text-align: center; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <a href="${dashboardLink}" style="display: inline-block; padding: 14px 28px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Open Interactive Dashboard</a>
        </div>
    </div>
    </body>
  `;

  MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody });
}

function setupSheet(silent = false) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let lastCol = sheet.getLastColumn();
    if (headers.indexOf(ID_COLUMN_HEADER) === -1) {
      sheet.insertColumnAfter(lastCol);
      sheet.getRange(1, lastCol + 1).setValue(ID_COLUMN_HEADER);
      lastCol++;
    }
    const aiHeaders = ['AI_Analysis_Result', 'AI_Reasons_for_Result', 'AI_Recommendations', 'AI_Next_Steps_Guide', 'AI_Maturity_Score', 'AI_Maturity_Level', 'AI_Clause_6_Planning_Score', 'AI_Clause_7_Support_Score', 'AI_Clause_8_Operation_Score', 'AI_Clause_9_Performance_Score'];
    const missing = aiHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      sheet.insertColumnsAfter(lastCol, missing.length);
      sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
    }
    if (!silent) safeNotify('Columns checked/created successfully.');
  } catch (e) {
    Logger.log("Setup error: " + e.toString());
  }
}

function updateSheetWithAnalysis(sheet, row, analysis, col) {
  const data = [
    analysis.analysisResult, (analysis.reasons || []).join('\n'), (analysis.recommendations || []).join('\n'), analysis.nextStepsGuide,
    analysis.analysisScore, analysis.complianceLevel, analysis.clauseScores.planningScore, analysis.clauseScores.supportScore,
    analysis.clauseScores.operationScore, analysis.clauseScores.performanceScore
  ];
  sheet.getRange(row, col + 1, 1, data.length).setValues([data]);
}

function generateUniqueId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let res = "";
  for (let i = 0; i < 4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
  return res;
}

function jsonResponse(data, status = 200) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function runManualAnalysis() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const row = sheet.getLastRow();
  if (row <= 1) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const vals = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  const named = {}; headers.forEach((h, i) => named[h] = [vals[i]]);
  onFormSubmitTrigger({ namedValues: named, range: sheet.getRange(row, 1) });
  safeNotify("Manual run complete. Check email and sheet.");
}
