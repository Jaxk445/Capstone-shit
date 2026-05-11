// Express server with backend APIs
// Handles authentication and AI chat endpoints

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleLogin } from './api/auth/login.js';
import { handleChat } from './api/ai/chat.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.post('/api/auth/login', handleLogin);
app.post('/api/ai/chat', handleChat);

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
