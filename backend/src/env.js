// Load backend/.env when it exists (local dev). On hosts like Render the
// variables come from the dashboard and there is no .env file.
try {
  process.loadEnvFile();
} catch {}
