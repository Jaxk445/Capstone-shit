// Simple Express server for backend APIs
// Currently this project uses Supabase as the primary backend,
// but this folder is prepared for any Node/Express logic or serverless
// functions you may add in the future.

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 3000;

// serve static frontend when running in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
