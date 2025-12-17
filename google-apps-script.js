/**
 * ===========================================================================
 * ISO FM DIAGNOSTIC BACKEND - V6 (Merged & Fixed)
 * ===========================================================================
 * 
 * FEATURES:
 * 1. Generates 4-Char Access Code (Required for Dashboard Login).
 * 2. Runs Gemini AI Analysis on Form Submit.
 * 3. Sends HTML Email with Analysis (NO PDF).
 * 4. Serves Data to Dashboard via API.
 *
 * INSTRUCTIONS:
 * 1. Update 'DASHBOARD_BASE_URL' to your Vercel App URL.
 * 2. Set 'GEMINI_API_KEY' in Project Settings > Script Properties.
 * 3. Run 'setupSheet' function once to create columns.
 * 4. Deploy as Web App (Execute as: Me, Access: Anyone).
 */

// --- CONFIGURATION ---
const API_KEY_NAME = 'GEMINI_API_KEY';
const MODEL_NAME = 'gemini-2.5-flash'; // Using standard stable model

// !!! VERIFY THIS URL !!!
// If your dashboard is at "https://my-app.vercel.app", put that here.
// Do not include /#/ at the end here, the script adds it.
const DASHBOARD_BASE_URL = "https://tfml-diagnostic-tool.vercel.app"; 

const SHEET_NAME = "Form Responses 1"; 
const ID_COLUMN_HEADER = "Respondent ID";

// ====================================================================
// CORE FUNCTIONS
// ====================================================================

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
function setupSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet "${SHEET_NAME}" not found.`);
    return;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let lastCol = sheet.getLastColumn();

  // 1. Check/Add Respondent ID Column
  if (headers.indexOf(ID_COLUMN_HEADER) === -1) {
    sheet.insertColumnAfter(lastCol);
    sheet.getRange(1, lastCol + 1).setValue(ID_COLUMN_HEADER);
    lastCol++;
    Logger.log("Added Respondent ID column.");
  }

  // 2. Check/Add AI Analysis Columns
  const aiHeaders = [
    'AI_Analysis_Result',
    'AI_Reasons_for_Result',
    'AI_Recommendations',
    'AI_Next_Steps_Guide',
    'AI_Maturity_Score', 
    'AI_Maturity_Level', 
    'AI_Clause_6_Planning_Score',
    'AI_Clause_7_Support_Score',
    'AI_Clause_8_Operation_Score',
    'AI_Clause_9_Performance_Score'
  ];

  const missingAiHeaders = aiHeaders.filter(h => !headers.includes(h));
  
  if (missingAiHeaders.length > 0) {
    sheet.insertColumnsAfter(lastCol, missingAiHeaders.length);
    sheet.getRange(1, lastCol + 1, 1, missingAiHeaders.length).setValues([missingAiHeaders]);
    Logger.log("Added AI Analysis columns.");
  }

  SpreadsheetApp.getUi().alert('Columns checked/created successfully.');
}

/**
 * 2. TRIGGER: Runs on Form Submit
 */
function onFormSubmitTrigger(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // Prevent concurrency issues

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowIdx = e.range.getRow();
    const rowData = e.namedValues; // Form data

    // --- A. Handle ID Generation (Critical for Dashboard) ---
    let idColIndex = headers.indexOf(ID_COLUMN_HEADER);
    // If ID column missing (shouldn't happen if setup run), find it dynamically or append
    if (idColIndex === -1) {
      setupSheet(); // Try to self-heal
      idColIndex = sheet.getLastColumn() - 1; // Approx
    }

    let uniqueId = String(sheet.getRange(rowIdx, idColIndex + 1).getValue()).trim();
    if (!uniqueId || uniqueId === "" || uniqueId.length !== 4) {
      uniqueId = generateUniqueId();
      sheet.getRange(rowIdx, idColIndex + 1).setValue(uniqueId);
      SpreadsheetApp.flush(); // Commit ID immediately
    }

    // --- B. Run Gemini Analysis ---
    const dataForAI = JSON.stringify(rowData, null, 2);
    const analysis = callGeminiForAnalysis(dataForAI);

    if (analysis) {
      // Find where to write AI results
      const aiStartColIndex = headers.indexOf('AI_Analysis_Result');
      if (aiStartColIndex > -1) {
        updateSheetWithAnalysis(sheet, rowIdx, analysis, aiStartColIndex);
      } else {
        Logger.log("AI Columns not found. Run Setup.");
      }

      // --- C. Send Email (NO PDF) ---
      // Try to find email
      let email = rowData['Email Address']?.[0] || rowData['Email']?.[0] || "";
      let name = rowData['Name']?.[0] || rowData['Full Name']?.[0] || "Client";

      if (email && email.includes("@")) {
        sendEmailReport(email, name, uniqueId, analysis);
      } else {
        Logger.log("No valid email found to send report.");
      }
    }

  } catch (err) {
    Logger.log("Error in onFormSubmit: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * 3. API: Serves Data to Dashboard (doGet)
 */
function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); 
  
  try {
    const id = e.parameter.id;
    if (!id) return jsonResponse({ error: "Missing ID parameter" });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Search by ID Column
    const idColIndex = headers.indexOf(ID_COLUMN_HEADER);
    if (idColIndex === -1) return jsonResponse({ error: "ID Column missing in sheet" });

    // Map headers for easy lookup
    const headerMap = {};
    headers.forEach((h, i) => headerMap[h] = i);

    let foundRow = null;
    const searchId = String(id).trim().toUpperCase();

    // Search backwards (newest first)
    for (let i = data.length - 1; i >= 1; i--) {
      const rowId = String(data[i][idColIndex]).trim().toUpperCase();
      if (rowId === searchId) {
        foundRow = data[i];
        break;
      }
    }

    if (!foundRow) return jsonResponse({ error: "Record not found" }, 404);

    // Map to Frontend Interface
    // Note: If AI hasn't run yet, these scores might be empty.
    const record = {
      id: searchId,
      respondentName: foundRow[headerMap['Name']] || foundRow[headerMap['Full Name']] || 'Valued User',
      respondentEmail: foundRow[headerMap['Email Address']] || foundRow[headerMap['Email']] || '',
      organization: foundRow[headerMap['Organization Name']] || foundRow[headerMap['Organization']] || 'Organization',
      submissionDate: foundRow[0], // Timestamp usually at 0

      // Map AI Columns to Dashboard Types
      aiMaturityScore: Number(foundRow[headerMap['AI_Maturity_Score']] || 0),
      aiMaturityLevel: String(foundRow[headerMap['AI_Maturity_Level']] || 'Pending'),
      clause6Score: Number(foundRow[headerMap['AI_Clause_6_Planning_Score']] || 0),
      clause7Score: Number(foundRow[headerMap['AI_Clause_7_Support_Score']] || 0),
      clause8Score: Number(foundRow[headerMap['AI_Clause_8_Operation_Score']] || 0),
      clause9Score: Number(foundRow[headerMap['AI_Clause_9_Performance_Score']] || 0)
    };

    return jsonResponse(record);

  } catch (err) {
    return jsonResponse({ error: "Server Error: " + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ====================================================================
// HELPERS
// ====================================================================

function callGeminiForAnalysis(formData) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(API_KEY_NAME);
  if (!apiKey) {
    Logger.log("API Key missing.");
    return null;
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
  
  // Strict Schema for Data Consistency
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

  const prompt = `Analyze this ISO 41001 assessment data: ${formData}. 
  Provide a maturity score (0-100), level, and clause-specific scores for clauses 6, 7, 8, 9 based on the answers. 
  Output strict JSON matching the schema.`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  };

  try {
    const response = UrlFetchApp.fetch(apiUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log("Gemini Error: " + response.getContentText());
      return null;
    }

    const jsonText = JSON.parse(response.getContentText()).candidates[0].content.parts[0].text;
    return JSON.parse(jsonText);
  } catch (e) {
    Logger.log("Fetch Error: " + e.toString());
    return null;
  }
}

function updateSheetWithAnalysis(sheet, row, analysis, startColIndex) {
  const data = [
    analysis.analysisResult,
    analysis.reasons.join('\n'),
    analysis.recommendations.join('\n'),
    analysis.nextStepsGuide,
    analysis.analysisScore,
    analysis.complianceLevel,
    analysis.clauseScores.planningScore,
    analysis.clauseScores.supportScore,
    analysis.clauseScores.operationScore,
    analysis.clauseScores.performanceScore
  ];
  // +1 because sheet is 1-based, startColIndex is 0-based
  sheet.getRange(row, startColIndex + 1, 1, data.length).setValues([data]);
}

function sendEmailReport(email, name, code, analysis) {
  const dashboardLink = `${DASHBOARD_BASE_URL}/#/report?id=${code}`;
  
  const resultIcon = analysis.analysisScore >= 80 ? '✅' : analysis.analysisScore >= 50 ? '⚠️' : '❌';

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="background-color: #2563eb; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0;">Diagnostic Results Ready</h2>
        <p>ISO 41001 Facility Management Assessment</p>
      </div>
      <div style="padding: 20px;">
        <p>Dear ${name},</p>
        <p>Your AI-driven assessment is complete.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">${resultIcon} Result: ${analysis.complianceLevel}</h3>
          <p style="margin: 0;"><strong>Overall Score:</strong> ${analysis.analysisScore}/100</p>
        </div>

        <p><strong>Your Access Code:</strong> <span style="font-family: monospace; background: #eee; padding: 2px 6px; font-weight: bold;">${code}</span></p>

        <h3>AI Summary</h3>
        <ul style="color: #475569;">
          ${analysis.reasons.slice(0, 3).map(r => `<li>${r}</li>`).join('')}
        </ul>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${dashboardLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Interactive Dashboard
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
          Click the button above to view charts and detailed breakdown.
        </p>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: `ISO 41001 Maturity Results: ${code}`,
    htmlBody: htmlBody
  });
}

function generateUniqueId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function runManualAnalysis() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert("No data found.");
    return;
  }

  const values = sheet.getRange(lastRow, 1, 1, headers.length).getValues()[0];
  const namedValues = {};
  headers.forEach((h, i) => namedValues[h] = [values[i]]);

  onFormSubmitTrigger({
    namedValues: namedValues,
    range: sheet.getRange(lastRow, 1)
  });
  
  SpreadsheetApp.getUi().alert("Manual run complete. Check email and sheet.");
}

function jsonResponse(data, status = 200) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}