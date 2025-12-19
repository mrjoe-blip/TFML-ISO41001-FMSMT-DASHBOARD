/**
 * ===========================================================================
 * ISO FM DIAGNOSTIC BACKEND - V16 (Fixed ReferenceError & Auditor Quality)
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
  if (!lock.tryLock(60000)) return;

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
          Logger.log("Email Failed: " + emailErr.toString());
        }
      }
    }
  } catch (err) {
    Logger.log("Critical Error in GAS: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

function callGeminiForAnalysis(formData) {
  const apiKey = PropertiesService.getScriptProperties().getProperty(API_KEY_NAME);
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
  
  const schema = {
    type: "OBJECT",
    properties: {
      analysisResult: { type: "STRING", description: "VERY SHORT status for subject line (max 40 chars)" },
      analysisScore: { type: "INTEGER" },
      complianceLevel: { type: "STRING" },
      reasons: { type: "ARRAY", items: { type: "STRING" }, description: "High-quality gaps starting with [GAP] and citing specific ISO 41001 clauses" },
      recommendations: { type: "ARRAY", items: { type: "STRING" }, description: "Strategic actions starting with [ACTION]" },
      nextStepsGuide: { type: "STRING", description: "Comprehensive summary of next steps" },
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

  const prompt = `ACT AS A LEAD ISO 41001 AUDITOR. 
  Analyze the following FM maturity diagnostic data: ${formData}.
  
  REQUIREMENTS:
  1. GAPS: Identify 5 high-impact deficiencies. MUST cite specific clauses (e.g., 8.1, 7.2). Prefix with "[GAP] ".
  2. ACTIONS: Provide 5 high-impact strategic recommendations. Prefix with "[ACTION] ".
  3. SUBJECT: The 'analysisResult' must be a professional 4-8 word executive summary for an email subject.
  4. QUALITY: Use professional, high-stakes auditing terminology.`;

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
    } catch (e) { Utilities.sleep(2000); }
  }
  return null;
}

function extractEmailAndName(rowData) {
  let email = '', name = '';
  // Try common headers first
  const emailKeys = ['Email Address', 'Email', 'Your Email', 'Contact Email'];
  const nameKeys = ['Name', 'Full Name', 'Your Name', 'Respondent Name'];
  
  emailKeys.forEach(k => { if (rowData[k] && rowData[k][0] && rowData[k][0].includes('@')) email = rowData[k][0].trim(); });
  nameKeys.forEach(k => { if (rowData[k] && rowData[k][0]) name = rowData[k][0].trim(); });
  
  // Fallback scan if standard headers fail
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
  
  // Safety truncation for subject line
  let subjectSummary = analysis.analysisResult || "Maturity Report";
  if (subjectSummary.length > 55) subjectSummary = subjectSummary.substring(0, 52) + "...";
  const subject = `ISO 41001 Auditor Report: ${subjectSummary}`;
  
  const resultIcon = analysis.analysisScore >= 70 ? '✅' : analysis.analysisScore >= 40 ? '⚠️' : '❌';

  const htmlBody = `
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f7f9; padding: 20px;">
    <div style="max-width: 620px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <h2 style="color: #1e3a8a; border-bottom: 3px solid #3b82f6; padding-bottom: 12px; text-align: center; margin-top: 0;">
            ISO 41001:2018 FM Maturity Analysis
        </h2>
        
        <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://raw.githubusercontent.com/mrjoe-blip/TFML-ISO41001-FMSMT-DASHBOARD/main/public/iso-fm-logo.png" 
                 alt="ISOFM Academy Logo" width="160" style="display: block; margin: 0 auto;">
        </div>

        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 10px; margin-bottom: 30px; border-left: 6px solid #3b82f6;">
            <h3 style="color: #1e3a8a; margin: 0; font-size: 18px;">${resultIcon} Result: ${analysis.analysisResult}</h3>
            <p style="margin-top: 8px; font-size: 14px; color: #475569;">
                <strong>Maturity:</strong> ${analysis.complianceLevel} | <strong>Score:</strong> ${analysis.analysisScore}/100
            </p>
        </div>
        
        <p style="font-size: 15px;">Dear ${name},<br><br>Your Facilities Management diagnostic is complete. Please review the specific clause-based gaps and strategic actions identified by our AI Auditor below.</p>

        <div style="background: #ffffff; padding: 25px; text-align: center; border: 2px dashed #3b82f6; border-radius: 12px; margin: 35px 0;">
          <p style="margin: 0 0 8px 0; text-transform: uppercase; font-size: 11px; color: #64748b; font-weight: 800; letter-spacing: 1px;">Your Secure Access Code</p>
          <span style="font-family: 'Monaco', 'Courier New', monospace; font-size: 40px; font-weight: 900; color: #1e3a8a; letter-spacing: 8px;">${code}</span>
        </div>

        <h4 style="color: #1e3a8a; margin-bottom: 15px; font-size: 17px;">🔍 Core Auditor Gaps Identified:</h4>
        <div style="border: 1px solid #fee2e2; padding: 18px; border-radius: 10px; background-color: #fef2f2; margin-bottom: 25px;">
            ${(analysis.reasons || []).map(r => `<p style="margin-bottom: 12px; color: #b91c1c; font-size: 14px; line-height: 1.6;"><strong>${r.includes('[GAP]') ? '' : '[GAP] '}</strong>${r}</p>`).join('')}
        </div>

        <h4 style="color: #1e3a8a; margin-bottom: 15px; font-size: 17px;">💡 Strategic Recommendations:</h4>
        <div style="border: 1px solid #fef3c7; padding: 18px; border-radius: 10px; background-color: #fffbeb; margin-bottom: 25px;">
            ${(analysis.recommendations || []).map(rec => `<p style="margin-bottom: 12px; color: #92400e; font-size: 14px; line-height: 1.6;"><strong>${rec.includes('[ACTION]') ? '' : '[ACTION] '}</strong>${rec}</p>`).join('')}
        </div>
        
        <h4 style="color: #1e3a8a; margin-bottom: 15px; font-size: 17px;">🚀 Expert Implementation Guide</h4>
        <p style="padding: 18px; background-color: #eff6ff; border-radius: 10px; border-left: 5px solid #3b82f6; font-size: 14px; color: #1e40af; line-height: 1.6;">
            ${analysis.nextStepsGuide}
        </p>
        
        <div style="text-align: center; margin: 40px 0;">
            <a href="https://isofmacademy.ng/consult/" 
                style="display: inline-block; padding: 16px 36px; background-color: #10b981; color: white; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
                Contact ISOFM Academy Experts
            </a>
        </div>

        <div style="text-align: center; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 30px;">
            <h3 style="margin-bottom: 10px; color: #1e293b; font-size: 18px;">Full Dashboard Visualization</h3>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 25px;">Open the interactive portal to view benchmarks and strategic radar charts.</p>
            <a href="${dashboardLink}" 
                style="display: inline-block; padding: 14px 30px; background-color: #1e3a8a; color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
                View Interactive Dashboard
            </a>
        </div>
        
        <p style="margin-top: 50px; font-size: 11px; color: #94a3b8; text-align: center;">
            &copy; ${new Date().getFullYear()} ISO FM Academy. Assessment results are confidential.
        </p>
    </div>
    </body>
  `;

  MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody });
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
