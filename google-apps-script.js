/**
 * ===========================================================================
 * ISO FM DIAGNOSTIC BACKEND - V23 (Professional Greeting & Headings)
 * ===========================================================================
 */

const API_KEY_NAME = 'GEMINI_API_KEY';
const MODEL_NAME = 'gemini-3-flash-preview'; 

const DASHBOARD_BASE_URL = "https://tfml-iso-41001-fmsmt-dashboard.vercel.app"; 
const SHEET_NAME = "Form Responses 1"; 
const ID_COLUMN_HEADER = "Respondent ID";

function safeNotify(message, isError = false) {
  try {
    const ui = SpreadsheetApp.getUi();
    if (ui) ui.alert(message);
  } catch (e) {
    Logger.log((isError ? "ERROR: " : "INFO: ") + message);
  }
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('FMSMD Tool')
      .addItem('1. Setup Columns (ID & AI)', 'setupSheet')
      .addItem('2. Run Analysis on Last Row', 'runManualAnalysis')
      .addToUi();
  } catch (e) { Logger.log("Menu Error: " + e.toString()); }
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
      updateSheetWithAnalysis(sheet, rowIdx, analysis, headers.indexOf('AI_Analysis_Result'));
      const recipient = extractEmailAndName(rowData);
      if (recipient.email) sendEmailReport(recipient.email, recipient.name, uniqueId, analysis);
    }
  } catch (err) { Logger.log("Submit Error: " + err.toString()); } finally { lock.releaseLock(); }
}

function doGet(e) {
  try {
    const id = e.parameter.id;
    if (!id) return jsonResponse({ error: "MISSING_ID" }, 400);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColIndex = headers.indexOf(ID_COLUMN_HEADER);
    if (idColIndex === -1) return jsonResponse({ error: "ID_COL_MISSING" }, 500);
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
    return jsonResponse({ error: "NOT_FOUND" }, 404);
  } catch (err) { return jsonResponse({ error: "SERVER_ERROR", detail: err.toString() }, 500); }
}

function extractEmailAndName(rowData) {
  let email = '', name = '';
  const emailKeys = ['Email Address', 'Email', 'Your Email', 'Contact Email', 'email'];
  const nameKeys = ['Name', 'Full Name', 'Your Name', 'Respondent Name', 'name'];
  for (const k of emailKeys) { if (rowData[k] && rowData[k][0] && rowData[k][0].includes('@')) { email = rowData[k][0].trim(); break; } }
  for (const k of nameKeys) { if (rowData[k] && rowData[k][0]) { name = rowData[k][0].trim(); break; } }
  if (!email) { Object.keys(rowData).forEach(k => { const val = rowData[k][0]; if (val && typeof val === 'string' && val.includes('@') && val.includes('.')) email = val.trim(); }); }
  return { email, name: name || "Client" };
}

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
      clauseScores: { type: "OBJECT", properties: { planningScore: { type: "INTEGER" }, supportScore: { type: "INTEGER" }, operationScore: { type: "INTEGER" }, performanceScore: { type: "INTEGER" } }, required: ["planningScore", "supportScore", "operationScore", "performanceScore"] }
    },
    required: ["analysisResult", "analysisScore", "complianceLevel", "clauseScores", "reasons", "recommendations", "nextStepsGuide"]
  };
  const payload = { contents: [{ parts: [{ text: "ACT AS ISO 41001 AUDITOR. Analyze diagnostic data and identify specific clause gaps and strategic actions. Format output clearly: " + formData }] }], generationConfig: { responseMimeType: "application/json", responseSchema: schema } };
  for (let i = 0; i < 5; i++) {
    try {
      const resp = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
      if (resp.getResponseCode() === 200) return JSON.parse(JSON.parse(resp.getContentText()).candidates[0].content.parts[0].text);
      Utilities.sleep(1500 * Math.pow(2, i));
    } catch (e) { Logger.log("Gemini Err: " + e.toString()); }
  }
  return null;
}

function sendEmailReport(email, name, code, analysis) {
  const dashboardLink = `${DASHBOARD_BASE_URL}/#/report?id=${code}`;
  
  // Safe subject truncation
  let subjectStr = analysis.analysisResult || "Maturity Report";
  if (subjectStr.length > 60) subjectStr = subjectStr.substring(0, 57) + "...";
  const subject = `Diagnostic Complete: ${subjectStr}`;
  
  // Dynamic Banner Colors
  const bannerBg = analysis.analysisScore >= 70 ? '#f0fdf4' : analysis.analysisScore >= 40 ? '#fefce8' : '#fef2f2';
  const bannerBorder = analysis.analysisScore >= 70 ? '#22c55e' : analysis.analysisScore >= 40 ? '#eab308' : '#ef4444';
  const bannerText = analysis.analysisScore >= 70 ? '#166534' : analysis.analysisScore >= 40 ? '#854d0e' : '#991b1b';
  const icon = analysis.analysisScore >= 70 ? '✅' : analysis.analysisScore >= 40 ? '⚠️' : '❌';

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; max-width: 650px; margin: auto; padding: 10px; background-color: #ffffff;">
      <div style="padding: 25px; border: 1px solid #f1f5f9; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
        
        <div style="text-align: center; margin-bottom: 25px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px;">
          <img src="https://raw.githubusercontent.com/mrjoe-blip/TFML-ISO41001-FMSMT-DASHBOARD/main/public/iso-fm-logo.png" alt="ISO FM Academy" width="120" style="display: block; margin: 0 auto 10px;">
          <h2 style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase;">ISO 41001 Facility Management Maturity Assessment</h2>
        </div>

        <p style="font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 5px;">Dear ${name},</p>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 25px; margin-top: 0;">Thank you for completing the ISO 41001 Maturity Diagnostic. Below is the summarized audit of your Facility Management Management System (FMMS).</p>

        <!-- DEFINITIVE RESULT BANNER -->
        <div style="background-color: ${bannerBg}; border: 1px solid ${bannerBorder}; border-left: 5px solid ${bannerBorder}; padding: 18px; border-radius: 8px; margin-bottom: 30px;">
          <h3 style="margin: 0; color: ${bannerText}; font-size: 16px; font-weight: 800;">
            ${icon} Definitive Result: ${analysis.analysisResult}
          </h3>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: ${bannerText}; opacity: 0.9;">
            <strong>Maturity Level:</strong> ${analysis.complianceLevel} (Score: ${analysis.analysisScore}/100)
          </p>
        </div>

        <p style="font-size: 14px; color: #475569; margin-bottom: 15px; font-weight: 500;">Based on your assessment entries, the following is a detailed analysis report:</p>

        <!-- CORE REASONS / GAPS -->
        <h4 style="color: #2563eb; font-size: 15px; margin-bottom: 12px; margin-top: 25px;">
          <span style="margin-right: 6px;">🔍</span> Core Reasons for Result:
        </h4>
        <div style="background-color: #fff1f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 18px; margin-bottom: 25px;">
          ${(analysis.reasons || []).map(r => `
            <p style="margin-bottom: 12px; font-size: 13px; color: #991b1b; line-height: 1.5; margin-top: 0;">
              <strong style="color: #dc2626;">[GAP]</strong> ${r.replace(/^\[GAP\]\s*/i, '')}
            </p>
          `).join('')}
        </div>

        <!-- ACTIONABLE RECOMMENDATIONS -->
        <h4 style="color: #2563eb; font-size: 15px; margin-bottom: 12px;">
          <span style="margin-right: 6px;">💡</span> Actionable Recommendations:
        </h4>
        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 18px; margin-bottom: 25px;">
          ${(analysis.recommendations || []).map(r => `
            <p style="margin-bottom: 12px; font-size: 13px; color: #854d0e; line-height: 1.5; margin-top: 0;">
              <strong style="color: #ca8a04;">[ACTION]</strong> ${r.replace(/^\[ACTION\]\s*/i, '')}
            </p>
          `).join('')}
        </div>

        <!-- NEXT STEPS SIDEBAR -->
        <h4 style="color: #2563eb; font-size: 15px; margin-bottom: 12px;">
          <span style="margin-right: 6px;">🚀</span> Next Steps Guide: Expert Consultation
        </h4>
        <div style="background-color: #eff6ff; border-left: 5px solid #2563eb; padding: 18px; border-radius: 6px; margin-bottom: 40px;">
          <p style="font-size: 13.5px; color: #1e3a8a; margin: 0; line-height: 1.6;">
            ${analysis.nextStepsGuide || "This guide provides a starting point for strategic FM alignment. Immediate action must focus on closing identified gaps in compliance and operational documentation."}
            <br><br>
            <a href="https://isofmacademy.ng/consult/" style="color: #2563eb; font-weight: 800; text-decoration: underline;">Request Expert Review & Consultation</a>
          </p>
        </div>

        <!-- DASHBOARD CTA -->
        <div style="border-top: 1px solid #f1f5f9; padding-top: 35px; text-align: center; background-color: #f8fafc; border-radius: 0 0 12px 12px; margin: 0 -25px -25px -25px; padding: 40px 25px;">
          <h3 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px; font-weight: 900;">Interactive Dashboard Available</h3>
          <p style="font-size: 13.5px; color: #64748b; margin-bottom: 25px; line-height: 1.5; max-width: 450px; margin-left: auto; margin-right: auto;">
            For detailed benchmarks, radar charts, and your complete action plan, visit our interactive dashboard using your access code: <span style="font-family: monospace; font-weight: bold; color: #1e293b; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${code}</span>
          </p>
          <a href="${dashboardLink}" style="display: inline-block; padding: 16px 40px; background-color: #1e3a8a; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(30, 58, 138, 0.2);">
            Open Interactive Dashboard
          </a>
          <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">
            &copy; ${new Date().getFullYear()} ISO FM Academy. Assessment results are confidential.
          </p>
        </div>

      </div>
    </div>
  `;

  MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody });
}

function setupSheet(silent = false) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const aiHeaders = ['AI_Analysis_Result', 'AI_Reasons_for_Result', 'AI_Recommendations', 'AI_Next_Steps_Guide', 'AI_Maturity_Score', 'AI_Maturity_Level', 'AI_Clause_6_Planning_Score', 'AI_Clause_7_Support_Score', 'AI_Clause_8_Operation_Score', 'AI_Clause_9_Performance_Score'];
    const missing = aiHeaders.filter(h => !headers.includes(h));
    if (headers.indexOf(ID_COLUMN_HEADER) === -1) sheet.getRange(1, sheet.getLastColumn()+1).setValue(ID_COLUMN_HEADER);
    if (missing.length > 0) sheet.getRange(1, sheet.getLastColumn()+1, 1, missing.length).setValues([missing]);
    if (!silent) safeNotify('Diagnostic columns configured successfully.');
  } catch (e) { Logger.log("Setup Error: " + e.toString()); }
}

function updateSheetWithAnalysis(sheet, row, analysis, colIdx) {
  if (colIdx < 0) return;
  const data = [analysis.analysisResult, analysis.reasons.join('\n'), analysis.recommendations.join('\n'), analysis.nextStepsGuide, analysis.analysisScore, analysis.complianceLevel, analysis.clauseScores.planningScore, analysis.clauseScores.supportScore, analysis.clauseScores.operationScore, analysis.clauseScores.performanceScore];
  sheet.getRange(row, colIdx + 1, 1, data.length).setValues([data]);
}

function generateUniqueId() { return Math.random().toString(36).substring(2, 6).toUpperCase(); }
function jsonResponse(data, status = 200) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function runManualAnalysis() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const row = sheet.getLastRow();
  if (row <= 1) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const named = {}; headers.forEach((h, i) => named[h] = [sheet.getRange(row, i+1).getValue()]);
  onFormSubmitTrigger({ namedValues: named, range: sheet.getRange(row, 1) });
  safeNotify("AI Analysis re-triggered for selected row.");
}