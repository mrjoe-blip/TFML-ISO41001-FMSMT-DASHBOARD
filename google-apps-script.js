/**
 * ===========================================================================
 * ISO FM DIAGNOSTIC BACKEND - V11 (Rich Email & UI Safe)
 * ===========================================================================
 * FEATURES:
 * 1. Generates 4-Char Access Code.
 * 2. Runs Gemini 3 AI Analysis with 5 retries (handles 503 errors).
 * 3. Sends RICH HTML Email with the high-quality template the user preferred.
 * 4. Serves Data to Dashboard via API.
 * 5. Fixed: Exception: Cannot call SpreadsheetApp.getUi() from this context.
 */

// --- CONFIGURATION ---
const API_KEY_NAME = 'GEMINI_API_KEY';
const MODEL_NAME = 'gemini-3-flash-preview'; 

// Ensure NO trailing slash here
const DASHBOARD_BASE_URL = "https://tfml-iso-41001-fmsmt-dashboard.vercel.app"; 

const SHEET_NAME = "Form Responses 1"; 
const ID_COLUMN_HEADER = "Respondent ID";

// ====================================================================
// CORE FUNCTIONS
// ====================================================================

/**
 * Safely shows an alert only if running in a UI context (e.g. from a button).
 * Prevents "Cannot call SpreadsheetApp.getUi() from this context" errors on triggers.
 */
function safeAlert(message) {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert(message);
  } catch (e) {
    Logger.log(`[ALERT LOG]: ${message}`);
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('FMSMD Tool')
    .addItem('1. Setup Columns (ID & AI)', 'setupSheet')
    .addItem('2. Run Analysis on Last Row', 'runManualAnalysis')
    .addToUi();
}

/**
 * 1. SETUP: Creates necessary columns if missing.
 */
function setupSheet(silent = false) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    if (!silent) safeAlert(`Sheet "${SHEET_NAME}" not found.`);
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

/**
 * 2. TRIGGER: Primary entry point for Form Submissions.
 */
function onFormSubmitTrigger(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowIdx = e.range.getRow();
    const rowData = e.namedValues;

    // A. Generate/Get Unique Access ID
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

    // B. Call Gemini for detailed analysis
    const analysis = callGeminiForAnalysis(JSON.stringify(rowData, null, 2));

    if (analysis) {
      const aiStartColIndex = headers.indexOf('AI_Analysis_Result');
      if (aiStartColIndex > -1) {
        updateSheetWithAnalysis(sheet, rowIdx, analysis, aiStartColIndex);
      }
      
      // C. Extract contact and send rich HTML email
      const recipient = extractEmailAndName(rowData);
      if (recipient.email) {
        sendEmailReport(recipient.email, recipient.name, uniqueId, analysis);
      } else {
        Logger.log("No valid email found in row " + rowIdx);
      }
    } else {
      Logger.log("Gemini analysis failed for row " + rowIdx);
    }
  } catch (err) {
    Logger.log("Error in onFormSubmit: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * 3. API: Serving JSON data to the React Frontend.
 */
function doGet(e) {
  try {
    const id = e.parameter.id;
    if (!id) return jsonResponse({ error: "Missing ID" }, 400);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColIndex = headers.indexOf(ID_COLUMN_HEADER);
    
    if (idColIndex === -1) return jsonResponse({ error: "ID Column missing" }, 500);

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
    return jsonResponse({ error: err.toString() }, 500);
  }
}

// ====================================================================
// HELPERS
// ====================================================================

function callGeminiForAnalysis(formData) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(API_KEY_NAME);
  if (!apiKey) return null;

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

  const payload = {
    contents: [{ parts: [{ text: `Analyze this ISO 41001 FM assessment data: ${formData}. Return JSON with maturity scores for clauses 6, 7, 8, 9.` }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  };

  for (let i = 0; i < 5; i++) {
    try {
      const resp = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      
      if (resp.getResponseCode() === 200) {
        const text = JSON.parse(resp.getContentText()).candidates[0].content.parts[0].text;
        return JSON.parse(text);
      }
      Utilities.sleep(2000 * Math.pow(2, i));
    } catch (e) {
      Utilities.sleep(2000);
    }
  }
  return null;
}

function extractEmailAndName(rowData) {
  let email = '', name = '';
  ['Email Address', 'Email', 'Your Email', 'Contact Email'].forEach(k => {
    if (rowData[k] && rowData[k][0] && rowData[k][0].includes('@')) email = rowData[k][0].trim();
  });
  ['Name', 'Full Name', 'Your Name', 'Respondent Name'].forEach(k => {
    if (rowData[k] && rowData[k][0]) name = rowData[k][0].trim();
  });
  
  if (!email) {
    Object.keys(rowData).forEach(k => {
      const val = rowData[k][0];
      if (val && typeof val === 'string' && val.includes('@') && val.includes('.')) email = val.trim();
    });
  }
  return { email, name: name || "Client" };
}

function sendEmailReport(email, name, code, analysis) {
  const dashboardLink = `${DASHBOARD_BASE_URL}/#/report?id=${code}`;
  const subject = `Your ISO 41001:2018 FM Assessment - Maturity Report: ${analysis.analysisResult}`;
  const resultIcon = analysis.analysisResult.includes('High') ? '✅' : analysis.analysisResult.includes('Partial') ? '⚠️' : '❌';

  const htmlBody = `
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
        <h2 style="color: #0056b3; border-bottom: 3px solid #0056b3; padding-bottom: 10px; text-align: center;">
            Facilities Management Assessment Report
        </h2>
        
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://raw.githubusercontent.com/mrjoe-blip/TFML-ISO41001-FMSMT-DASHBOARD/main/public/iso-fm-logo.png" 
                 alt="ISOFM Academy Logo" width="150" style="max-width: 150px; height: auto; border-radius: 4px; display: block; margin: 0 auto;">
        </div>

        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 5px solid #28a745;">
            <h3 style="color: #28a745; margin: 0; display: flex; align-items: center;">
                ${resultIcon} Definitive Result: ${analysis.analysisResult}
            </h3>
            <p style="margin-top: 5px; font-size: 0.9em;">
                <strong>Maturity Level:</strong> ${analysis.complianceLevel} (Score: ${analysis.analysisScore}/100)
            </p>
        </div>
        
        <p>Dear ${name},<br><br>Based on your assessment entries, the following is a detailed analysis report:</p>

        <div style="background: #fff; padding: 15px; text-align: center; border: 2px dashed #0056b3; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0 0 5px 0; text-transform: uppercase; font-size: 11px; color: #666; font-weight: bold;">Your Dashboard Access Code</p>
          <span style="font-family: monospace; font-size: 28px; font-weight: 700; color: #0056b3; letter-spacing: 4px;">${code}</span>
        </div>

        <h4 style="color: #007bff;">🔍 Core Reasons for Result:</h4>
        <ul style="list-style-type: none; padding-left: 0; border: 1px solid #ffdddd; padding: 10px; border-radius: 4px; background-color: #fff8f8;">
            ${(analysis.reasons || []).map(reason => `<li style="margin-bottom: 8px; color: #dc3545;"><strong>[GAP]</strong> ${reason}</li>`).join('')}
        </ul>

        <h4 style="color: #007bff; margin-top: 20px;">💡 Actionable Recommendations:</h4>
        <ul style="list-style-type: none; padding-left: 0; border: 1px solid #fff3cd; padding: 10px; border-radius: 4px; background-color: #fffceb;">
            ${(analysis.recommendations || []).map(rec => `<li style="margin-bottom: 8px; color: #ffc107;"><strong>[ACTION]</strong> ${rec}</li>`).join('')}
        </ul>
        
        <h4 style="color: #007bff; margin-top: 20px;">🚀 Next Steps Guide:</h4>
        <p style="padding: 10px; background-color: #e6f7ff; border-radius: 4px; border-left: 4px solid #007bff;">
            ${analysis.nextStepsGuide}
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardLink}" 
                style="display: inline-block; padding: 12px 25px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 1.1em; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                View Interactive Dashboard
            </a>
        </div>
        
        <p style="margin-top: 30px; font-size: 0.9em; color: #999; text-align: center;">
            © ${new Date().getFullYear()} ISO FM Academy. This report was generated by our AI analysis system.
        </p>
    </div>
    </body>
  `;

  MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody });
}

function jsonResponse(data, status = 200) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function generateUniqueId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let res = "";
  for (let i = 0; i < 4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
  return res;
}

function updateSheetWithAnalysis(sheet, row, analysis, col) {
  const data = [
    analysis.analysisResult, analysis.reasons.join('\n'), analysis.recommendations.join('\n'), analysis.nextStepsGuide,
    analysis.analysisScore, analysis.complianceLevel, analysis.clauseScores.planningScore, analysis.clauseScores.supportScore,
    analysis.clauseScores.operationScore, analysis.clauseScores.performanceScore
  ];
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