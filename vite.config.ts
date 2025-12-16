import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Securely expose only the API_KEY. 
      // Do NOT expose the entire process.env object as it may contain sensitive server keys.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.VITE_GOOGLE_SCRIPT_URL': JSON.stringify(env.VITE_GOOGLE_SCRIPT_URL),
    }
  };
});