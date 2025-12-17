/**
 * ===========================================================================
 * ISO FM DIAGNOSTIC BACKEND - V3 (FINAL AUTH FIX)
 * ===========================================================================
 * 
 * PURPOSE: 
 * 1. Generates a 4-character secure ID (e.g., "A7X9") on Form Submit.
 * 2. Emails this ID to the user.
 * 3. Serves data to the React Dashboard via JSON.
 * 
 * INSTRUCTIONS:
 * 1. Overwrite your existing code with this file.
 * 2. Save.
 * 3. Run the 'setup' function once to grant permissions.
 * 4. Triggers: Add a trigger for 'onFormSubmitTrigger' (From spreadsheet -> On form submit).
 * 5. Deploy: New Deployment -> Web App -> Execute as Me -> Access: ANYONE.
 */

// --- CONFIGURATION ---
const SHEET_NAME = "Form Responses 1"; 
const ID_COLUMN_HEADER = "Respondent ID";

// COLUMN MAPPING (0-based Index)
// Adjust these numbers if your form layout is different!
// Column A=0, B=1, C=2, D=3, E=4...
const EMAIL_COLUMN_INDEX = 1; // Assuming Column B is Email
const NAME_COLUMN_INDEX = 2;  // Assuming Column C is Name

/**
 * API ENDPOINT: Handles GET requests from the React Dashboard
 */
function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); // Wait 10s for lock
  
  try {
    const id = e.parameter.id;
    
    // 1. Validate Input
    if (!id) return jsonResponse({ error: "Missing ID parameter" });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return jsonResponse({ error: "Sheet not found" });

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // 2. Find ID Column
    const idColIndex = headers.indexOf(ID_COLUMN_HEADER);
    if (idColIndex === -1) return jsonResponse({ error: "ID Column missing in sheet" });

    // 3. Search for the ID (Case Insensitive)
    let record = null;
    const searchId = String(id).trim().toUpperCase();

    // Iterate backwards to get latest submission if duplicates exist
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
 * TRIGGER: Runs automatically when a Form is submitted
 */
function onFormSubmitTrigger(e) {
  console.log("Processing Form Submission...");
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // Wait up to 30s to prevent ID collisions
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    // 1. Determine Row Index
    // We use getLastRow() to be safe if event object is partial
    const rowIdx = sheet.getLastRow(); 
    
    // 2. Setup ID Column
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let idColIndex = headers.indexOf(ID_COLUMN_HEADER);
    
    if (idColIndex === -1) {
      // Create column if it doesn't exist
      idColIndex = headers.length; 
      sheet.getRange(1, idColIndex + 1).setValue(ID_COLUMN_HEADER);
    }

    // 3. Generate & Save ID
    // Check if ID already exists (in case of re-runs)
    let uniqueId = sheet.getRange(rowIdx, idColIndex + 1).getValue();
    
    if (!uniqueId || uniqueId === "") {
      uniqueId = generateUniqueId();
      sheet.getRange(rowIdx, idColIndex + 1).setValue(uniqueId);
      SpreadsheetApp.flush(); // CRITICAL: Force save before emailing
      console.log("Generated ID:", uniqueId);
    }

    // 4. Fetch Data for Email
    // Re-fetch row data to ensure we have the saved ID and latest values
    const rowValues = sheet.getRange(rowIdx, 1, 1, sheet.getLastColumn()).getValues()[0];
    const email = rowValues[EMAIL_COLUMN_INDEX];
    const name = rowValues[NAME_COLUMN_INDEX] || "Facility Manager";

    // 5. Send Email
    if (validateEmail(email)) {
      sendAccessEmail(email, name, uniqueId);
    } else {
      console.error("Invalid Email:", email);
    }

  } catch (err) {
    console.error("Trigger Error:", err);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Generates secure 4-char ID (e.g. "A9X2")
 */
function generateUniqueId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 1, 0 to avoid confusion
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Sends the access code email
 */
function sendAccessEmail(email, name, code) {
  const appUrl = "https://tfml-diagnostic-tool.vercel.app"; // CHECK THIS MATCHES YOUR VERCEL URL
  const subject = `Your ISO 41001 Report Access Code: ${code}`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #2563eb;">ISO 41001 Maturity Assessment</h2>
      <p>Dear ${name},</p>
      <p>Your assessment is complete. To view your AI-powered analysis dashboard, use the code below:</p>
      
      <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 20px; text-align: center; margin: 25px 0; border-radius: 8px;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${code}</span>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">(Access Code)</p>
      </div>

      <div style="text-align: center;">
        <a href="${appUrl}/#/report?id=${code}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Open Dashboard
        </a>
      </div>
      
      <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
        If the button doesn't work, visit ${appUrl} and enter code <strong>${code}</strong>.
      </p>
    </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody
  });
}

/**
 * Maps Sheet Columns to JSON Keys for React
 * This loosely matches column names to avoid errors if you rename headers slightly
 */
function formatRecord(row, headers) {
  
  // Helper to find column index by loose name matching
  const getVal = (searchTerms) => {
    // 1. Try exact match first
    for (const term of searchTerms) {
      const idx = headers.indexOf(term);
      if (idx > -1) return row[idx];
    }
    // 2. Try partial match
    for (const term of searchTerms) {
      const idx = headers.findIndex(h => h.toString().toLowerCase().includes(term.toLowerCase()));
      if (idx > -1) return row[idx];
    }
    return 0; // Default to 0 if not found
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
    submissionDate: row[0], // Timestamp is always first column

    // SCORING: Maps your sheet columns to React state
    aiMaturityScore: Number(getVal(["Total Score", "Maturity Score", "Overall Score"])),
    aiMaturityLevel: getStr(["Maturity Level", "Level"]),
    
    // CLAUSE SCORES
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

function setup() {
  Logger.log("Permissions Setup Complete.");
}
