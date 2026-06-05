import { config } from 'dotenv';
config({ path: '.env' });

import express from 'express';
import chatRoutes from './src/routes/chat.js';
import webhookRoutes from './src/routes/webhook.js';
import twitterRoutes from './src/routes/twitter.js';
import linkedinRoutes from './src/routes/linkedin.js';

const app = express();
app.use(express.json());

app.use('/api', chatRoutes);
app.use('/telegram', webhookRoutes);
app.use('/x', twitterRoutes);
app.use('/in', linkedinRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});