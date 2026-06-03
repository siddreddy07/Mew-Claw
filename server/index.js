import { config } from 'dotenv';
config({ path: '.env' });

import express from 'express';
import chatRoutes from './src/routes/chat.js';
import webhookRoutes from './src/routes/webhook.js';
import twitterRoutes from './src/routes/twitter.js';

const app = express();
app.use(express.json());

app.use('/api', chatRoutes);
app.use('/telegram', webhookRoutes);
app.use('/x', twitterRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
