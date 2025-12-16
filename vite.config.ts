import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This ensures process.env is polyfilled for the Google GenAI SDK if needed,
    // though we will use import.meta.env in the service files.
    'process.env': process.env
  }
});