/**
 * ===========================================================================
 * ISO FM DIAGNOSTIC BACKEND - V13 (Hard Truncation & Email Safety)
 * ===========================================================================
 */

const API_KEY_NAME = 'GEMINI_API_KEY';
const MODEL_NAME = 'gemini-3-flash-preview'; 

const DASHBOARD_BASE_URL = "https://tfml-iso-41001-fmsmt-dashboard.vercel.app"; 
const SHEET_NAME = "Form Responses 1"; 
const ID_COLUMN_HEADER = "Respondent ID";

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

function onFormSubmitTrigger(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(45000)) return; // Increased lock time for stability

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
      if (recipient.email) {
        try {
          sendEmailReport(recipient.email, recipient.name, uniqueId, analysis);
        } catch (emailErr) {
          Logger.log("Email Failed but data saved: " + emailErr.toString());
        }
      }
    }
  } catch (err) {
    Logger.log("Critical Error in onFormSubmit: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

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

function callGeminiForAnalysis(formData) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(API_KEY_NAME);
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
  
  const schema = {
    type: "OBJECT",
    properties: {
      analysisResult: { type: "STRING", description: "VERY SHORT status (max 40 chars), e.g. 'Partial Maturity Found'" },
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
    contents: [{ parts: [{ text: `Act as ISO 41001 Auditor. Analyze: ${formData}. Keep 'analysisResult' extremely brief.` }] }],
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
  
  // HARD TRUNCATION: Absolutely ensure the subject is short
  let resultText = (analysis.analysisResult || "Assessment Complete").toString();
  if (resultText.length > 60) resultText = resultText.substring(0, 57) + "...";
  
  const subject = `ISO 41001 Report: ${resultText}`;
  const resultIcon = analysis.analysisScore >= 70 ? '✅' : analysis.analysisScore >= 40 ? '⚠️' : '❌';

  const htmlBody = `
    <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 20px;">
    <div style="max-width: 600px; margin: auto; padding: 30px; border-radius: 16px; background-color: #ffffff; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://raw.githubusercontent.com/mrjoe-blip/TFML-ISO41001-FMSMT-DASHBOARD/main/public/iso-fm-logo.png" 
                 alt="Logo" width="140" style="display: block; margin: 0 auto;">
        </div>

        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 6px solid #2563eb;">
            <h3 style="color: #1e293b; margin: 0; font-size: 18px;">${resultIcon} ${analysis.analysisResult}</h3>
            <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">
                Maturity Score: <strong>${analysis.analysisScore}/100</strong> | Level: <strong>${analysis.complianceLevel}</strong>
            </p>
        </div>
        
        <p style="font-size: 15px;">Dear ${name},</p>
        <p style="font-size: 15px;">Your facilities management maturity analysis is now available. Use the secure code below to access your interactive results dashboard.</p>

        <div style="background: #2563eb; padding: 25px; text-align: center; border-radius: 12px; margin: 35px 0;">
          <p style="margin: 0 0 10px 0; text-transform: uppercase; font-size: 12px; color: #bfdbfe; font-weight: 800; letter-spacing: 2px;">Your Secure Access Code</p>
          <span style="font-family: 'Monaco', 'Courier New', monospace; font-size: 42px; font-weight: 800; color: #ffffff; letter-spacing: 8px;">${code}</span>
        </div>

        <div style="margin-top: 30px;">
          <h4 style="color: #2563eb; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Strategic Gaps Identified</h4>
          <ul style="padding-left: 20px; color: #334155; font-size: 14px;">
              ${(analysis.reasons || []).map(r => `<li style="margin-bottom: 10px;">${r}</li>`).join('')}
          </ul>
        </div>
        
        <div style="text-align: center; margin: 45px 0;">
            <a href="${dashboardLink}" 
                style="display: inline-block; padding: 16px 36px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);">
                View Interactive Dashboard
            </a>
        </div>
        
        <p style="margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 25px;">
            &copy; ${new Date().getFullYear()} ISO FM Academy. This assessment is powered by Gemini 3 Strategic AI.
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
    analysis.analysisResult, (analysis.reasons || []).join('\n'), (analysis.recommendations || []).join('\n'), analysis.nextStepsGuide,
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