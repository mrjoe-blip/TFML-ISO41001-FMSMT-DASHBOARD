# TFML Maturity Diagnostic Tool

A comprehensive Facility Management maturity assessment dashboard powered by ISO 41001 standards and Google Gemini AI.

## 🚀 Features

- **ISO 41001 Analysis**: Visualizes maturity across Planning, Support, Operation, and Performance clauses.
- **AI-Driven Insights**: Uses Google Gemini 2.5 Flash to generate real-time executive summaries and gap analysis.
- **Interactive Charts**: Radar charts, gauges, and scatter plots built with Recharts.
- **Secure Authentication**: Uses unique 4-character alphanumeric Access Codes for respondent privacy.
- **Print-Ready**: Optimized CSS for generating PDF reports.

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd tfml-diagnostic-tool
npm install
```

### 2. Configure the Backend (Google Apps Script)
**This is critical for ID generation and Emailing.**

1.  Open your Google Sheet containing the diagnostic data.
2.  Go to `Extensions` > `Apps Script`.
3.  Open the file `google-apps-script.js` in this repository.
4.  Copy the **entire content** of `google-apps-script.js`.
5.  Paste it into the Google Apps Script editor (replace any existing code).
6.  **Setup Trigger (For Emails):**
    *   Click the Clock icon (Triggers) on the left sidebar.
    *   Click "Add Trigger".
    *   Choose function: `processFormSubmission`.
    *   Event type: `On form submit`.
    *   Save (You will need to authorize permissions).
7.  **Deploy as API (For Dashboard):**
    *   Click `Deploy` > `New Deployment`.
    *   Select type: `Web App`.
    *   Description: "Dashboard API".
    *   Execute as: `Me`.
    *   **Who has access: `Anyone`** (This is crucial! If you select "Only Me", the Vercel app will get a Network Error).
    *   Click Deploy.
    *   Copy the **Web App URL**.

### 3. Environment Configuration
Create a `.env` file in the root directory.

```env
# Your Google Gemini API Key
API_KEY=your_gemini_api_key_here

# The Web App URL you copied in step 2
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

### 4. Run Locally
```bash
npm run dev
```

## ☁️ Deployment (Vercel)

This project is optimized for Vercel.

1.  **Push to GitHub**: Commit your changes and push to a new GitHub repository.
2.  **Import to Vercel**: Select your GitHub repository.
3.  **Configure Environment Variables**:
    *   `API_KEY`: Your Gemini API Key.
    *   `VITE_GOOGLE_SCRIPT_URL`: Your Google Script Web App URL.
4.  **Deploy**: Click "Deploy".

## 📂 Project Structure

- `/src`: React source code.
- `/services`: API integration (Google Script & Gemini).
- `/components`: UI components (Charts, Layouts).
- `/public`: Static assets (Logo).
- `google-apps-script.js`: **Backend logic** (Copy to Google).

## 📄 License
Private Property of ISO FM Academy.
