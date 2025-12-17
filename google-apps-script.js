/**
 * ===========================================================================
 * ISO FM DIAGNOSTIC BACKEND - V7 (Fixes & Rich Report)
 * ===========================================================================
 * FEATURES:
 * 1. Generates 4-Char Access Code (Required for Dashboard Login).
 * 2. Runs Gemini AI Analysis on Form Submit.
 * 3. Sends DETAILED HTML Email with Analysis (Restored).
 * 4. Serves Data to Dashboard via API.
 * 5. Fixed 'getUi' error on triggers.
 *
 * INSTRUCTIONS:
 * 1. Update 'DASHBOARD_BASE_URL' to your Vercel App URL.
 * 2. Set 'GEMINI_API_KEY' in Project Settings > Script Properties.
 * 3. Run 'setupSheet' function once to create columns.
 * 4. Deploy as Web App (Execute as: Me, Access: Anyone).
 */

// --- CONFIGURATION ---
const API_KEY_NAME = 'GEMINI_API_KEY';
const MODEL_NAME = 'gemini-2.5-flash'; 

// !!! VERIFY THIS URL !!!
// Ensure NO trailing slash here to avoid double slashes later.
const DASHBOARD_BASE_URL = "https://tfml-iso-41001-fmsmt-dashboard.vercel.app"; 

const SHEET_NAME = "Form Responses 1"; 
const ID_COLUMN_HEADER = "Respondent ID";

// ====================================================================
// CORE FUNCTIONS
// ====================================================================

/**
 * Safely shows an alert if the UI environment is available.
 * If the UI unavailable (e.g., running from a trigger), it logs the message instead.
 * @param {string} message The message to alert.
 */
function safeAlert(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    // Fails silently in non-UI context (like onFormSubmit trigger)
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

/**
 * 1. SETUP: Creates necessary columns if missing.
 * Added 'silent' parameter to prevent 'getUi' errors during automatic triggers.
 */
function setupSheet(silent = false) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    const msg = `Sheet "${SHEET_NAME}" not found.`;
    if (!silent) safeAlert(msg); // Use safeAlert
    Logger.log(msg);
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

  if (!silent) {
    safeAlert('Columns checked/created successfully.'); // Use safeAlert
  } else {
    Logger.log('Columns checked/created successfully.');
  }
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
      setupSheet(true); // Pass 'true' to run silently without UI alerts
      // Re-fetch headers to get new column index
      const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      idColIndex = updatedHeaders.indexOf(ID_COLUMN_HEADER);
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

      // --- C. Send Email (Detailed Report) ---
      const recipient = extractEmailAndName(rowData);

      if (recipient.email) {
        sendEmailReport(recipient.email, recipient.name, uniqueId, analysis);
      } else {
        Logger.log("No valid email found to send report.");
      }
    } else {
      Logger.log("AI Analysis failed (analysis is null). Check logs.");
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

/**
 * Extracts the most likely email address and name from the form submission data.
 */
function extractEmailAndName(rowData) {
  let email = '';
  let name = '';
  
  // 1. Check for standard/common email keys
  const standardEmailKeys = ['Email Address', 'Email', 'Your Email', 'Contact Email', 'email'];
  for (const key of standardEmailKeys) {
    if (rowData[key] && rowData[key][0] && String(rowData[key][0]).includes('@')) {
      email = String(rowData[key][0]).trim();
      break;
    }
  }

  // 2. Check for standard/common name keys
  const standardNameKeys = ['Name', 'Full Name', 'Your Name', 'Respondent Name', 'name'];
  for (const key of standardNameKeys) {
    if (rowData[key] && rowData[key][0] && String(rowData[key][0]).trim() !== '') {
      name = String(rowData[key][0]).trim();
      break;
    }
  }

  // 3. Fallback search
  if (!email) {
    const keys = Object.keys(rowData);
    for (const key of keys) {
      const val = rowData[key][0];
      if (typeof val === 'string' && val.includes('@') && val.includes('.') && val.length > 5) {
        email = val.trim();
        break; 
      }
    }
  }

  return { 
    email: email, 
    name: name || "Client" 
  };
}

function callGeminiForAnalysis(formData) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(API_KEY_NAME);
  if (!apiKey) {
    Logger.log("API Key missing. Set 'GEMINI_API_KEY' in Script Properties.");
    return null;
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
  const MAX_RETRIES = 3;
  let delay = 2000;

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

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = UrlFetchApp.fetch(apiUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      const responseCode = response.getResponseCode();
      const rawGeminiOutput = response.getContentText();

      if (responseCode === 200) {
        try {
            const apiResponse = JSON.parse(rawGeminiOutput);
            const modelTextOutput = apiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (modelTextOutput) {
                return JSON.parse(modelTextOutput);
            }
        } catch (parseError) {
            Logger.log(`Parse Error: ${parseError.toString()}`);
        }
      } else {
        Logger.log(`Gemini API Error (Attempt ${attempt}): ${responseCode}`);
      }

      if (attempt < MAX_RETRIES) {
        Utilities.sleep(delay);
        delay *= 2;
      }
      
    } catch (e) {
      Logger.log(`Fetch Error (Attempt ${attempt}): ${e.toString()}`);
      if (attempt < MAX_RETRIES) {
        Utilities.sleep(delay);
        delay *= 2;
      }
    }
  }
  return null;
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

// RESTORED DETAILED EMAIL REPORT
function sendEmailReport(email, name, code, analysis) {
  // Corrected Dashboard URL construction (removed potential for double slashes)
  const dashboardLink = `${DASHBOARD_BASE_URL}/#/report?id=${code}`;
  
  const subject = `Your ISO 41001:2018 FM Assessment - Maturity Report: ${analysis.analysisResult}`;

  const resultIcon = analysis.analysisResult.includes('High') ? '✅' :
      analysis.analysisResult.includes('Partial') ? '⚠️' :
      '❌';

  const htmlBody = `
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
        <h2 style="color: #0056b3; border-bottom: 3px solid #0056b3; padding-bottom: 10px; text-align: center;">
            Facilities Management Assessment Report
        </h2>
        
        <!-- FIXED LOGO URL: Using raw.githubusercontent.com for reliable email rendering -->
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://raw.githubusercontent.com/mrjoe-blip/TFML-ISO41001-FMSMT-DASHBOARD/99d46a833cb2e3ba591e71a26c4a452d99779266/public/iso-fm-logo.png" 
                 alt="ISOFM Academy Logo" 
                 width="150" 
                 style="max-width: 150px; height: auto; border-radius: 4px; display: block; margin: 0 auto;">
        </div>

        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 5px solid #28a745;">
            <h3 style="color: #28a745; margin: 0; display: flex; align-items: center;">
                ${resultIcon} Definitive Result: ${analysis.analysisResult}
            </h3>
            <p style="margin-top: 5px; font-size: 0.9em;">
                <strong>Maturity Level:</strong> ${analysis.complianceLevel} (Score: ${analysis.analysisScore}/100)
            </p>
        </div>
        
        <p style="margin-bottom: 20px;">Dear ${name},<br><br>Based on your assessment entries, the following is a detailed analysis report:</p>

         <!-- Access Code Box -->
        <div style="background: #fff; padding: 15px; text-align: center; border: 2px dashed #0056b3; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0 0 5px 0; text-transform: uppercase; font-size: 11px; color: #666; font-weight: bold;">Your Dashboard Access Code</p>
          <span style="font-family: monospace; font-size: 28px; font-weight: 700; color: #0056b3; letter-spacing: 4px;">${code}</span>
        </div>

        <h4 style="color: #007bff; display: flex; align-items: center;"><span style="font-size: 1.2em; margin-right: 8px;">🔍</span> Core Reasons for Result:</h4>
        <ul style="list-style-type: none; padding-left: 0; border: 1px solid #ffdddd; padding: 10px; border-radius: 4px; background-color: #fff8f8;">
            ${analysis.reasons.map(reason => `<li style="margin-bottom: 8px; color: #dc3545;"><strong>[GAP]</strong> ${reason}</li>`).join('')}
        </ul>

        <h4 style="color: #007bff; display: flex; align-items: center; margin-top: 20px;"><span style="font-size: 1.2em; margin-right: 8px;">💡</span> Actionable Recommendations:</h4>
        <ul style="list-style-type: none; padding-left: 0; border: 1px solid #fff3cd; padding: 10px; border-radius: 4px; background-color: #fffceb;">
            ${analysis.recommendations.map(rec => `<li style="margin-bottom: 8px; color: #ffc107;"><strong>[ACTION]</strong> ${rec}</li>`).join('')}
        </ul>
        
        <h4 style="color: #007bff; display: flex; align-items: center; margin-top: 20px;"><span style="font-size: 1.2em; margin-right: 8px;">🚀</span> Next Steps Guide: Expert Consultation</h4>
        <p style="padding: 10px; background-color: #e6f7ff; border-radius: 4px; border-left: 4px solid #007bff;">
            ${analysis.nextStepsGuide}
        </p>
        
        <div style="text-align: center; margin: 20px 0;">
            <a href="https://isofmacademy.ng/consult/" 
                style="display: inline-block; padding: 12px 25px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 1.1em; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                Contact ISOFM Academy
            </a>
        </div>

        <div style="text-align: center; margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 20px;">
            <h3>Interactive Dashboard Available</h3>
            <p>For a detailed, interactive visualization of your AI analysis, please click the link below and enter your access code:</p>
            <a href="${dashboardLink}" 
                style="display: inline-block; padding: 12px 25px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 1.1em; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                View Interactive Dashboard
            </a>
        </div>
        
        <p style="margin-top: 30px; font-size: 0.9em; color: #999; text-align: center;">
            This report was generated automatically by our ISO 41001 AI analysis system.
        </p>
    </div>
    </body>
  `;

  MailApp.sendEmail({
    to: email,
    subject: subject,
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
    safeAlert("No data found."); // Use safeAlert
    return;
  }

  const values = sheet.getRange(lastRow, 1, 1, headers.length).getValues()[0];
  const namedValues = {};
  headers.forEach((h, i) => namedValues[h] = [values[i]]);

  onFormSubmitTrigger({
    namedValues: namedValues,
    range: sheet.getRange(lastRow, 1)
  });
  
  safeAlert("Manual run complete. Check email and sheet."); // Use safeAlert
}

function jsonResponse(data, status = 200) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}