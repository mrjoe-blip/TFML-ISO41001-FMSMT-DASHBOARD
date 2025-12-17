/**
 * ===========================================================================
 * ISO FM DIAGNOSTIC BACKEND - V4 (NO PDF, ROBUST ID)
 * ===========================================================================
 * 
 * INSTRUCTIONS:
 * 1. Paste this code into Extensions > Apps Script.
 * 2. Save.
 * 3. IMPORTANT: Click Deploy > Manage Deployments > Edit (Pencil) > Version: New Version > Deploy.
 *    (If you do not create a New Version, the changes will NOT take effect).
 * 4. Ensure "Who has access" is set to "Anyone".
 */

// --- CONFIGURATION ---
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
  // Wait up to 30s to avoid collisions
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

    // 2. Generate ID (Logic: If empty OR not 4 chars, regenerate)
    let uniqueId = String(sheet.getRange(rowIdx, idColIndex + 1).getValue()).trim();
    
    if (!uniqueId || uniqueId === "" || uniqueId.length !== 4) {
      uniqueId = generateUniqueId();
      sheet.getRange(rowIdx, idColIndex + 1).setValue(uniqueId);
      SpreadsheetApp.flush(); // FORCE SAVE to disk immediately
      console.log("Generated New ID:", uniqueId);
    } else {
      console.log("Using Existing ID:", uniqueId);
    }

    // 3. Fetch Data for Email
    // Re-fetch the row to be absolutely sure we have the data on disk
    const freshRowValues = sheet.getRange(rowIdx, 1, 1, sheet.getLastColumn()).getValues()[0];
    const email = freshRowValues[EMAIL_COLUMN_INDEX];
    const name = freshRowValues[NAME_COLUMN_INDEX] || "Facility Manager";

    // 4. Send Email (No PDF)
    if (validateEmail(email)) {
      sendAccessEmail(email, name, uniqueId);
    } else {
      console.error("Invalid Email, cannot send code:", email);
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

function sendAccessEmail(email, name, code) {
  const appUrl = "https://tfml-diagnostic-tool.vercel.app"; 
  const subject = `Your Assessment Access Code: ${code}`;
  
  // HTML Template - No PDF Attachment logic
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #2563eb; margin-top: 0;">ISO 41001 Assessment Complete</h2>
      <p>Dear ${name},</p>
      <p>Your diagnostic report is ready. Please use the following Access Code to view your dashboard:</p>
      
      <div style="background: #f8fafc; padding: 15px; text-align: center; border: 1px dashed #cbd5e1; margin: 20px 0; border-radius: 6px;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 700; color: #1e293b; letter-spacing: 4px;">${code}</span>
        <div style="font-size: 11px; color: #64748b; margin-top: 5px;">(Enter this code on the login screen)</div>
      </div>

      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${appUrl}/#/report?id=${code}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          View Report
        </a>
      </div>
      
      <p style="font-size: 12px; color: #999;">
        If the button above does not work, go to <a href="${appUrl}">${appUrl}</a> and manually enter code: <strong>${code}</strong>
      </p>
    </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody
    // No attachments array here
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