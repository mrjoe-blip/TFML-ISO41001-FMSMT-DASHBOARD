/**
 * Google Apps Script for Automated ISO 41001 Analysis using the Gemini API.
 *
 * This script is designed to run automatically when a Google Form is submitted
 * (On Form Submit Trigger). It sends the form data to the Gemini API for
 * structured analysis, updates the Google Sheet with the results, and emails
 * a detailed HTML/PDF report and a dashboard link to the respondent.
 *
 * The script also provides a Web App endpoint (doGet) to securely retrieve
 * analysis data for an external dashboard application.
 */

// --- Configuration ---
// The script will now securely fetch the API key from Script Properties under this name.
const API_KEY_NAME = 'GEMINI_API_KEY';
const MODEL_NAME = 'gemini-2.5-flash-preview-09-2025';

// IMPORTANT: Replace this with the final, deployed URL of your external dashboard
var DASHBOARD_BASE_URL = "https://tfml-iso-41001-fmsmt-dashboard.vercel.app"; 
const SHEET_NAME = 'Form Responses 1'; // Assumes the default name of the Form Responses sheet

// ====================================================================
// CORE APPS SCRIPT FUNCTIONS
// ====================================================================

/**
 * Creates a custom menu in the spreadsheet UI when the spreadsheet is opened.
 */
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('FMSMD Tool')
        .addItem('1. Create/Check Analysis Columns', 'setupSheet')
        .addItem('2. Run Analysis on Last Row (Manual)', 'runManualAnalysis')
        .addItem('3. Test Model Availability (Debug)', 'checkAvailableModels')
        .addToUi();
}

/**
 * Safely shows an alert if the UI environment is available.
 * @param {string} message The message to alert.
 */
function uiAlert(message) {
    try {
        SpreadsheetApp.getUi().alert(message);
    } catch (e) {
        Logger.log(`UI Alert attempted: ${message}`);
    }
}

/**
 * Utility function to securely retrieve the API key from Script Properties.
 * @returns {string|null} The API key or null if not found.
 */
function getApiKey() {
    const key = PropertiesService.getScriptProperties().getProperty(API_KEY_NAME);
    if (!key) {
        Logger.log(`FATAL: API Key is not set in Script Properties under the name ${API_KEY_NAME}.`);
        return null;
    }
    return key;
}

/**
 * UTILITY: Checks which Gemini Models are available to your API Key.
 */
function checkAvailableModels() {
    const apiKey = getApiKey();
    if (!apiKey) {
        uiAlert(`Cannot check models. API Key not found in Script Properties ('${API_KEY_NAME}').`);
        return;
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const options = {
        method: 'get',
        muteHttpExceptions: true
    };

    try {
        const response = UrlFetchApp.fetch(url, options);
        const data = JSON.parse(response.getContentText());
        
        if (data.models) {
            const modelIds = data.models.map(m => m.name.replace('models/', '')).join('\n');
            Logger.log('AVAILABLE MODELS:\n' + modelIds);
            uiAlert('List of available models logged to Executions.\n\nCheck the "Executions" log to see the exact IDs you can use in the MODEL_NAME variable.');
        } else {
            Logger.log('Error listing models: ' + JSON.stringify(data));
            uiAlert('Could not list models. Check API Key.');
        }
    } catch (e) {
        Logger.log('Error fetching models: ' + e.toString());
        uiAlert('Error fetching models. See logs.');
    }
}

/**
 * Sets up the required columns in the sheet to store the AI analysis results.
 * Run this function once after pasting the code, or use the custom menu item.
 */
function setupSheet() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
        uiAlert(`Error: Sheet named "${SHEET_NAME}" not found. Please update the SHEET_NAME variable.`);
        return;
    }

    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // The full, correct list of 10 AI headers in final desired order:
    const allAIHeaders = [
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

    // Determine which headers are missing
    const missingHeaders = allAIHeaders.filter(h => !existingHeaders.includes(h));

    if (missingHeaders.length === 0) {
        uiAlert('Analysis columns already exist.');
        return;
    }

    let headersModified = false;
    const lastCol = sheet.getLastColumn();

    // Insert ALL missing headers at the very end of the sheet.
    if (missingHeaders.length > 0) {
        const insertAfterCol = lastCol;
        
        // Determine the specific headers to insert, preserving their order
        const headersToInsert = allAIHeaders.filter(h => !existingHeaders.includes(h));

        if (headersToInsert.length > 0) {
            sheet.insertColumnsAfter(insertAfterCol, headersToInsert.length);
            sheet.getRange(1, insertAfterCol + 1, 1, headersToInsert.length).setValues([headersToInsert]);
            headersModified = true;
            Logger.log(`Inserted ${headersToInsert.length} missing AI columns at the end of the sheet.`);
        }
    }

    if (headersModified) {
        uiAlert('Analysis columns created/corrected successfully! The missing headers were added to the rightmost end of the sheet.');
    }
}

/**
 * Manually runs the analysis on the latest submission row.
 */
function runManualAnalysis() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      if (!sheet) {
        uiAlert(`Error: Sheet named "${SHEET_NAME}" not found. Please update the SHEET_NAME variable.`);
        return;
    }

    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
        uiAlert("No form submissions found to analyze.");
        return;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const fullRowData = sheet.getRange(lastRow, 1, 1, headers.length).getValues()[0];

    // Convert array data to the namedValues format expected by the trigger function
    const rowData = {};
    headers.forEach((header, index) => {
        // Use an array structure for compatibility with trigger event object format
        rowData[header] = [fullRowData[index]]; 
    });

    // Simulate the event object for the trigger function
    const e = {
        namedValues: rowData,
        range: sheet.getRange(lastRow, 1, 1, headers.length)
    };

    // Run the main trigger logic
    onFormSubmitTrigger(e);
    uiAlert(`Manual analysis complete for row ${lastRow}. Check the Sheet and your email.`);
}


/**
 * The main function triggered automatically upon form submission.
 * @param {Object} e The event object passed by the form submit trigger.
 */
function onFormSubmitTrigger(e) {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const rowData = e.namedValues; // Response data as {Header: [Value]}
        const rowNumber = e.range.getRow();

        // Find the starting column index for AI data (where 'AI_Analysis_Result' should be)
        const analysisStartColIndex = headers.indexOf('AI_Analysis_Result');

        // 1. Prepare data for AI & locate email address
        const dataForAI = JSON.stringify(rowData, null, 2);

        // Check for common email header names
        let emailAddress = null;
        if (rowData['Email Address']) {
            emailAddress = rowData['Email Address'][0];
        } else if (rowData['Email']) {
            emailAddress = rowData['Email'][0];
        } else if (rowData['Email address']) {
            emailAddress = rowData['Email address'][0];
        }

        Logger.log(`Captured Email Address for Row ${rowNumber}: ${emailAddress || 'NOT FOUND'}`);

        if (!emailAddress) {
            Logger.log("WARNING: Could not find an email address using common headers. Row keys found: " + Object.keys(rowData).join(', '));
        }

        // 2. Call the AI Engine (Gemini API)
        const analysis = callGeminiForAnalysis(dataForAI);

        // 3. Process the AI Response
        if (analysis && analysis.analysisResult) {
            // 4. Update the Google Sheet
            if (analysisStartColIndex === -1) {
                Logger.log('FATAL: AI Analysis columns not found. Run setupSheet manually.');
                return;
            }
            // Pass the 0-based index to the update function
            updateSheetWithAnalysis(sheet, rowNumber, analysis, analysisStartColIndex);

            // 5. Send Email Report & Dashboard Link with PDF Attachment (FIXED LOGIC)
            if (emailAddress) {
                sendReportWithPDFAndDashboard(e, analysis, emailAddress);
            } else {
                Logger.log("Email cannot be sent as a valid email address was not found.");
            }
        } else {
            Logger.log("AI analysis failed or returned an unexpected format. Check the API Key and execution logs.");
        }

    } catch (error) {
        Logger.log('Error during form submission processing: ' + error.toString());
    }
}

/**
 * Communicates with the Gemini API to get the ISO 41001 analysis.
 * Now retrieves API Key securely and includes exponential backoff.
 * @param {string} formData JSON string of the form data.
 * @returns {Object|null} Parsed JSON object of the AI analysis, or null on failure.
 */
function callGeminiForAnalysis(formData) {
    const apiKey = getApiKey();

    if (!apiKey) {
        return null;
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    const systemPrompt = `You are a world-class Facilities Management (FM) Data Analyst and ISO 41001:2018 certification consultant.
Your task is to analyze the provided form responses, which are based on the ISO 41001 requirements.
1. Determine the organization's current level of compliance/maturity in the context of ISO 41001.
2. Generate a numerical score from 0 (Non-compliant) to 100 (Fully Compliant) representing the current overall maturity.
3. Generate a standardized compliance level (e.g., 'Level 1: Ad-hoc', 'Level 2: Basic', 'Level 3: Optimized', 'Level 4: Managed').
4. **Generate specific numerical scores (0-100) for the four core ISO 41001 clauses (6, 7, 8, 9).**
5. Provide clear, succinct reasons for the result, referencing observed gaps or strengths relative to specific ISO 41001 clauses (e.g., 'Failure to address 6.1 Planning').
6. Suggest actionable recommendations to effect required changes and close compliance gaps.
7. Provide a definitive 'Next Steps Guide' for the organization to start remediation.
You MUST respond ONLY with a JSON object that strictly adheres to the provided schema.`;

    const userQuery = `Analyze the following organization's Facilities Management maturity assessment results based on ISO 41001:2018. The responses are in JSON format: \n\n${formData}`;

    // Define the required JSON structure for the response 
    const responseSchema = {
        type: "OBJECT",
        properties: {
            analysisResult: { type: "STRING", description: "A high-level verdict (e.g., 'High Compliance', 'Partial Compliance', 'Area for Concern')." },
            analysisScore: { type: "INTEGER", description: "A numerical score from 0 to 100 representing overall compliance/maturity for dashboard use." },
            complianceLevel: { type: "STRING", description: "A standardized maturity level (e.g., 'Level 3: Optimized') for dashboard filtering." },
            reasons: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Clear, succinct reasons for the result, referencing observed gaps based on ISO 41001 clauses."
            },
            recommendations: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Actionable recommendations for the organization to effect required changes."
            },
            nextStepsGuide: { type: "STRING", description: "This guide provides a starting point; if you need further review and consultation, please contact ISO-FM Academy via our website. https://isofmacademy.ng/consult/" },
            // Specific clause scores
            clauseScores: {
                type: "OBJECT",
                description: "Specific numerical maturity scores (0-100) for key ISO 41001 clauses.",
                properties: {
                    planningScore: { type: "INTEGER", description: "Score for Clause 6: Planning." },
                    supportScore: { type: "INTEGER", description: "Score for Clause 7: Support." },
                    operationScore: { type: "INTEGER", description: "Score for Clause 8: Operation." },
                    performanceScore: { type: "INTEGER", description: "Score for Clause 9: Performance evaluation." }
                },
                required: ["planningScore", "supportScore", "operationScore", "performanceScore"]
            }
        },
        required: ["analysisResult", "analysisScore", "complianceLevel", "reasons", "recommendations", "nextStepsGuide", "clauseScores"]
    };

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    };

    const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
    };

    const MAX_RETRIES = 3;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = UrlFetchApp.fetch(apiUrl, options);
            const responseCode = response.getResponseCode();
            const responseText = response.getContentText();

            if (responseCode === 200) {
                const result = JSON.parse(responseText);
                // The AI response is a stringified JSON object inside 'parts[0].text'
                const jsonString = result.candidates[0].content.parts[0].text;
                return JSON.parse(jsonString);
            } else {
                Logger.log(`API Error (Attempt ${i + 1}/${MAX_RETRIES}): Code ${responseCode}, Response: ${responseText}`);
                if (i < MAX_RETRIES - 1) {
                    Utilities.sleep(Math.pow(2, i) * 1000); // Exponential backoff
                    continue; 
                }
                return null; 
            }
        } catch (e) {
            Logger.log(`Fetch error (Attempt ${i + 1}/${MAX_RETRIES}): ` + e.toString());
            if (i < MAX_RETRIES - 1) {
                Utilities.sleep(Math.pow(2, i) * 1000); // Exponential backoff
                continue; 
            }
            return null; 
        }
    }
    return null; 
}

/**
 * Writes the structured analysis back to the Google Sheet.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The active sheet object.
 * @param {number} rowNumber The row number to update.
 * @param {Object} analysis The structured AI analysis object.
 * @param {number} analysisStartColIndex The 0-based index of the 'AI_Analysis_Result' column.
 */
function updateSheetWithAnalysis(sheet, rowNumber, analysis, analysisStartColIndex) {
    // Array ordered to match the 10 columns defined in setupSheet
    const analysisData = [
        analysis.analysisResult, 
        analysis.reasons.join('\n- '), 
        analysis.recommendations.join('\n- '), 
        analysis.nextStepsGuide, 
        analysis.analysisScore, 
        analysis.complianceLevel, 
        analysis.clauseScores.planningScore, 
        analysis.clauseScores.supportScore, 
        analysis.clauseScores.operationScore, 
        analysis.clauseScores.performanceScore 
    ];

    // analysisStartColIndex is 0-based. Sheet range uses 1-based indexing (index + 1).
    const startColOneBased = analysisStartColIndex + 1;

    // The range now spans 10 columns
    sheet.getRange(rowNumber, startColOneBased, 1, analysisData.length).setValues([analysisData]);
    Logger.log(`Sheet updated successfully for row ${rowNumber}. Starting column: ${startColOneBased}`);
}

/**
 * Sends a detailed HTML email report, attaches the PDF of the spreadsheet,
 * and includes the unique link to the interactive dashboard.
 * * @param {Object} e The event object passed by the form submit trigger.
 * @param {Object} analysis The structured AI analysis object.
 * @param {string} recipientEmail The email address to send the report to.
 */
function sendReportWithPDFAndDashboard(e, analysis, recipientEmail) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAME);
        const row = e.range.getRow();
        
        // --- 1. Dashboard URL Setup ---
        const respondentId = "user_" + row;
        const uniqueDashboardUrl = DASHBOARD_BASE_URL + "/#/report?id=" + respondentId;

        // --- 2. PDF Generation (FIXED) ---
        // Generates a PDF of the current spreadsheet.
        const pdfBlob = ss.getAs(MimeType.PDF)
                          .setName(`ISO-41001_Maturity_Assessment_Row_${row}.pdf`);

        // --- 3. HTML Content Generation (Combined Detail + Dashboard Link) ---
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
                
                <div style="background-color: #e8f5e9; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 5px solid #28a745;">
                    <h3 style="color: #28a745; margin: 0; display: flex; align-items: center;">
                        ${resultIcon} Definitive Result: ${analysis.analysisResult}
                    </h3>
                    <p style="margin-top: 5px; font-size: 0.9em;">
                        <strong>Maturity Level:</strong> ${analysis.complianceLevel} (Score: ${analysis.analysisScore}/100)
                    </p>
                </div>
                
                <p style="margin-bottom: 20px;">Based on your assessment entries, the following is a detailed analysis report:</p>

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
                
                <!-- Dashboard Link Section -->
                <div style="text-align: center; margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 20px;">
                    <h3>Interactive Dashboard Available</h3>
                    <p>For a detailed, interactive visualization of your AI analysis, please click the link below:</p>
                    <a href="${uniqueDashboardUrl}" 
                        style="display: inline-block; padding: 12px 25px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 1.1em; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        View Interactive Dashboard
                    </a>
                    <p style="margin-top: 10px; font-size: 0.8em; color: #999;">
                        (Your full assessment responses are attached as a PDF.)
                    </p>
                </div>
                
                <p style="margin-top: 30px; font-size: 0.9em; color: #999; text-align: center;">
                    This report was generated automatically by our ISO 41001 AI analysis system.
                </p>
            </div>
            </body>
        `;

        // --- 4. Send Email with Attachments ---
        MailApp.sendEmail({
            to: recipientEmail,
            subject: subject,
            htmlBody: htmlBody,
            attachments: [pdfBlob]
        });
        
        Logger.log(`Detailed Report (HTML + PDF) and Dashboard Link sent successfully to ${recipientEmail}`);

    } catch (error) {
        Logger.log("Error sending combined report email: " + error.toString());
    }
}


// ====================================================================
// WEB APP / DATA ENDPOINT FUNCTION (DO NOT USE FOR TRIGGERS)
// ====================================================================

/**
 * Serves as the public Web App endpoint to retrieve specific analysis data 
 * for an external dashboard, filtered by a unique 'id' (respondent row number).
 *
 * NOTE: For security, ensure your deployment only allows 'Anyone, even anonymous'
 * access, but relies on the obscurity of the 'id' (row number) for a basic access control.
 * @param {Object} e Event object from the Web App request, containing parameters.
 * @returns {GoogleAppsScript.Content.TextOutput} JSON data for the requested row.
 */
function doGet(e) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    
    // The ID is expected to be a string like "user_2", extract the row number
    var idParam = e.parameter.id; 
    
    if (!sheet || !idParam || !idParam.startsWith('user_')) {
        return ContentService.createTextOutput(JSON.stringify({error: "Invalid request or sheet not found"}))
            .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Extract the row number (e.g., 2 from "user_2")
    var requestedRow = parseInt(idParam.split('_')[1], 10); 
    
    if (isNaN(requestedRow) || requestedRow <= 1) {
        return ContentService.createTextOutput(JSON.stringify({error: "Invalid row number in ID"})).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    // Find the current column indexes (0-based) dynamically
    const headerMap = {};
    headers.forEach((h, i) => headerMap[h] = i);
    
    // Check if the requested row exists in the data
    if (requestedRow > data.length) { // Use > data.length as index is 0-based
        return ContentService.createTextOutput(JSON.stringify({error: "ID (Row) not found"})).setMimeType(ContentService.MimeType.JSON);
    }
    
    var row = data[requestedRow - 1]; // Array index is row - 1

    // Map the needed fields for the dashboard using dynamic indexes
    var record = {
        id: idParam,
        // Common form headers (Adjust these if your Form headers differ!)
        respondentName: row[headerMap['Name']] || 'N/A', // Assuming 'Name' is a header
        respondentEmail: row[headerMap['Email Address']] || row[headerMap['Email']] || 'N/A',
        organization: row[headerMap['Organization Name']] || 'N/A', // Assuming 'Organization Name'
        submissionDate: row[headerMap['Timestamp']] || 'N/A', // Assuming 'Timestamp'

        // AI Generated Fields (Must match the headers created in setupSheet)
        aiAnalysisResult: row[headerMap['AI_Analysis_Result']] || 'N/A',
        aiMaturityScore: row[headerMap['AI_Maturity_Score']] || 0,
        aiMaturityLevel: row[headerMap['AI_Maturity_Level']] || 'N/A',
        clause6Score: row[headerMap['AI_Clause_6_Planning_Score']] || 0,
        clause7Score: row[headerMap['AI_Clause_7_Support_Score']] || 0,
        clause8Score: row[headerMap['AI_Clause_8_Operation_Score']] || 0,
        clause9Score: row[headerMap['AI_Clause_9_Performance_Score']] || 0
    };
    
    return ContentService.createTextOutput(JSON.stringify(record)).setMimeType(ContentService.MimeType.JSON);
}