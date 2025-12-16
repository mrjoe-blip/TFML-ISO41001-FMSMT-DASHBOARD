# TFML Maturity Diagnostic Tool

A comprehensive Facility Management maturity assessment dashboard powered by ISO 41001 standards and Google Gemini AI.

## 🚀 Features

- **ISO 41001 Analysis**: Visualizes maturity across Planning, Support, Operation, and Performance clauses.
- **AI-Driven Insights**: Uses Google Gemini 2.5 Flash to generate real-time executive summaries and gap analysis.
- **Interactive Charts**: Radar charts, gauges, and scatter plots built with Recharts.
- **Secure Authentication**: Simple ID-based login system for respondents.
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

### 2. Environment Configuration
Create a `.env` file in the root directory. **Do not commit this file.**

```env
# Your Google Gemini API Key
API_KEY=your_gemini_api_key_here

# URL of your deployed Google Apps Script Web App
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

### 3. Add Logo
Ensure your logo file is placed at:
`public/iso-fm-logo.png`

### 4. Run Locally
```bash
npm run dev
```

## ☁️ Deployment (Vercel)

This project is optimized for Vercel.

1.  **Push to GitHub**: Commit your changes and push to a new GitHub repository.
2.  **Import to Vercel**:
    *   Go to your Vercel Dashboard.
    *   Click "Add New..." -> "Project".
    *   Select your GitHub repository.
3.  **Configure Environment Variables**:
    *   In the Vercel deployment setup, look for "Environment Variables".
    *   Add `API_KEY` with your production Gemini key.
    *   Add `VITE_GOOGLE_SCRIPT_URL` with your Google Script URL.
4.  **Deploy**: Click "Deploy".

## 📂 Project Structure

- `/src`: React source code.
- `/services`: API integration (Google Script & Gemini).
- `/components`: UI components (Charts, Layouts).
- `/public`: Static assets (Logo).

## 🔒 Security Note

This application uses a client-side build process. Environment variables defined in `vite.config.ts` are embedded into the browser bundle at build time. Ensure your Google Apps Script is deployed with access set to "Anyone" to avoid CORS issues.

## 📄 License
Private Property of ISO FM Academy.
