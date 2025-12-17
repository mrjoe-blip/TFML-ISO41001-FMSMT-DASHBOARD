/**
 * ===========================================================================
 * ISO FM DIAGNOSTIC BACKEND - V5 (ANALYSIS RESTORED)
 * ===========================================================================
 * 
 * INSTRUCTIONS:
 * 1. Paste this code into Extensions > Apps Script.
 * 2. UPDATE 'VERCEL_APP_URL' variable below to your actual Vercel project URL.
 * 3. Save.
 * 4. IMPORTANT: Click Deploy > Manage Deployments > Edit (Pencil) > Version: New Version > Deploy.
 *    (If you do not create a New Version, the changes will NOT take effect).
 */

// --- CONFIGURATION ---
// !!! REPLACE THIS WITH YOUR ACTUAL VERCEL APP URL !!!
// Example: "https://my-fm-dashboard.vercel.app"
const VERCEL_APP_URL = "https://tfml-diagnostic-tool.vercel.app"; 

const SHEET_NAME = "Form Responses 1"; 
const ID_COLUMN_HEADER = "Respondent ID";

// COLUMN MAPPING (0-based Index)
// Column A=0, B=1, C=2...
const EMAIL_COLUMN_INDEX = 1; 
const NAME_COLUMN_INDEX = 2;

/**
 * API ENDPOINT: Handles GET requests from the React Dashboard
 */
function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); 
  
  try {
    const id = e.parameter.id;
    if (!id) return jsonResponse({ error: "Missing ID parameter" });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return jsonResponse({ error: "Sheet not found" });

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find ID Column
    const idColIndex = headers.indexOf(ID_COLUMN_HEADER);
    if (idColIndex === -1) return jsonResponse({ error: "ID Column missing in sheet" });

    // Search for ID
    let record = null;
    const searchId = String(id).trim().toUpperCase();

    // Search backwards for latest
    for (let i = data.length - 1; i >= 1; i--) {
      const rowId = String(data[i][idColIndex]).trim().toUpperCase();
      if (rowId === searchId) {
        record = formatRecord(data[i], headers);
        break;
      }
    }

    if (!record) return jsonResponse({ error: "Record not found" }, 404);
    return jsonResponse(record);

  } catch (err) {
    return jsonResponse({ error: "Server Error: " + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * TRIGGER: Runs automatically on Form Submit
 */
function onFormSubmitTrigger(e) {
  console.log("Processing Form Submission...");
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); 
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const rowIdx = sheet.getLastRow(); 
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // 1. Ensure ID Column Exists
    let idColIndex = headers.indexOf(ID_COLUMN_HEADER);
    if (idColIndex === -1) {
      idColIndex = headers.length; 
      sheet.getRange(1, idColIndex + 1).setValue(ID_COLUMN_HEADER);
    }

    // 2. Generate ID (If empty or invalid)
    let uniqueId = String(sheet.getRange(rowIdx, idColIndex + 1).getValue()).trim();
    if (!uniqueId || uniqueId === "" || uniqueId.length !== 4) {
      uniqueId = generateUniqueId();
      sheet.getRange(rowIdx, idColIndex + 1).setValue(uniqueId);
    }
    
    // FORCE SAVE to ensure formulas update before we read them
    SpreadsheetApp.flush(); 

    // 3. Fetch Data for Email
    // Re-fetch row to get calculated formula values
    const freshRowValues = sheet.getRange(rowIdx, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Format the record to get scores
    const record = formatRecord(freshRowValues, headers);
    
    // 4. Send Email with Analysis
    if (validateEmail(record.respondentEmail)) {
      sendAccessEmail(record.respondentEmail, record.respondentName, uniqueId, record);
    } else {
      console.error("Invalid Email:", record.respondentEmail);
    }

  } catch (err) {
    console.error("Trigger Error:", err);
  } finally {
    lock.releaseLock();
  }
}

function generateUniqueId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sendAccessEmail(email, name, code, record) {
  const subject = `Your Assessment Results & Access Code: ${code}`;
  
  // HTML Template with Analysis Summary
  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      
      <!-- Header -->
      <div style="background-color: #2563eb; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Assessment Complete</h1>
        <p style="color: #bfdbfe; margin: 5px 0 0 0;">ISO 41001 Facility Management Diagnostic</p>
      </div>

      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #334155;">Dear ${name},</p>
        <p style="color: #64748b; line-height: 1.5;">Thank you for completing the diagnostic. Your preliminary results have been analyzed.</p>

        <!-- Access Code Box -->
        <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
          <p style="margin: 0 0 10px 0; text-transform: uppercase; font-size: 11px; color: #64748b; font-weight: bold; letter-spacing: 1px;">Your Access Code</p>
          <span style="font-family: monospace; font-size: 36px; font-weight: 700; color: #1e293b; letter-spacing: 4px; background: white; padding: 5px 15px; border-radius: 4px; border: 1px solid #cbd5e1;">${code}</span>
        </div>

        <!-- Analysis Summary Table -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;">Diagnostic Summary</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b; font-weight: 500;">Overall Maturity Score</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #2563eb; font-size: 18px;">${record.aiMaturityScore}/100</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 0; color: #64748b;">Maturity Level</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #0f172a;">${record.aiMaturityLevel}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 15px;">
                <p style="margin: 0 0 10px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Clause Breakdown</p>
                
                <!-- Clause 6 -->
                <div style="margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 2px;">
                    <span style="color: #334155;">Planning (Cl. 6)</span>
                    <span style="font-weight: bold; color: #334155;">${record.clause6Score}%</span>
                  </div>
                  <div style="height: 6px; width: 100%; background: #e2e8f0; border-radius: 3px;">
                    <div style="height: 100%; background: #3b82f6; width: ${record.clause6Score}%; border-radius: 3px;"></div>
                  </div>
                </div>

                <!-- Clause 7 -->
                <div style="margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 2px;">
                    <span style="color: #334155;">Support (Cl. 7)</span>
                    <span style="font-weight: bold; color: #334155;">${record.clause7Score}%</span>
                  </div>
                  <div style="height: 6px; width: 100%; background: #e2e8f0; border-radius: 3px;">
                    <div style="height: 100%; background: #3b82f6; width: ${record.clause7Score}%; border-radius: 3px;"></div>
                  </div>
                </div>

                <!-- Clause 8 -->
                <div style="margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 2px;">
                    <span style="color: #334155;">Operation (Cl. 8)</span>
                    <span style="font-weight: bold; color: #334155;">${record.clause8Score}%</span>
                  </div>
                  <div style="height: 6px; width: 100%; background: #e2e8f0; border-radius: 3px;">
                    <div style="height: 100%; background: #3b82f6; width: ${record.clause8Score}%; border-radius: 3px;"></div>
                  </div>
                </div>

                <!-- Clause 9 -->
                <div style="margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 2px;">
                    <span style="color: #334155;">Performance (Cl. 9)</span>
                    <span style="font-weight: bold; color: #334155;">${record.clause9Score}%</span>
                  </div>
                  <div style="height: 6px; width: 100%; background: #e2e8f0; border-radius: 3px;">
                    <div style="height: 100%; background: #3b82f6; width: ${record.clause9Score}%; border-radius: 3px;"></div>
                  </div>
                </div>

              </td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${VERCEL_APP_URL}/#/report?id=${code}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
            View Full Interactive Report
          </a>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 15px;">
            If the button doesn't work, verify the URL or visit the dashboard and enter your code manually.
          </p>
        </div>
      </div>
      
      <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} ISO FM Academy. Automated Notification.</p>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody
  });
}

function formatRecord(row, headers) {
  const getVal = (searchTerms) => {
    for (const term of searchTerms) {
      const idx = headers.indexOf(term);
      if (idx > -1) return row[idx];
    }
    for (const term of searchTerms) {
      const idx = headers.findIndex(h => String(h).toLowerCase().includes(term.toLowerCase()));
      if (idx > -1) return row[idx];
    }
    return 0;
  };

  const getStr = (searchTerms) => {
    const val = getVal(searchTerms);
    return val === 0 ? "" : String(val);
  };

  return {
    id: getStr([ID_COLUMN_HEADER]),
    respondentName: getStr(["Name", "Full Name", "Respondent Name"]),
    respondentEmail: getStr(["Email", "Email Address"]),
    organization: getStr(["Organization", "Company", "Organization Name"]),
    submissionDate: row[0], 
    aiMaturityScore: Number(getVal(["Total Score", "Maturity Score", "Overall Score"])),
    aiMaturityLevel: getStr(["Maturity Level", "Level"]),
    clause6Score: Number(getVal(["Clause 6", "Planning", "Clause 6 Score"])),
    clause7Score: Number(getVal(["Clause 7", "Support", "Clause 7 Score"])),
    clause8Score: Number(getVal(["Clause 8", "Operation", "Clause 8 Score"])),
    clause9Score: Number(getVal(["Clause 9", "Performance", "Clause 9 Score"]))
  };
}

function validateEmail(email) {
  return email && String(email).includes("@");
}

function jsonResponse(data, status = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}