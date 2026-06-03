import { Router } from 'express';
import { webhookHandler } from '../controllers/webhook.Controller.js';
import { TwitterApi } from 'twitter-api-v2';
import { oauthStore, tokenStore } from './twitter.js';

const router = Router();

router.post('/webhook', webhookHandler);

router.get('/x/callback', async (req, res) => {

    console.log('Received Twitter OAuth callback with query:', req.query);

  const { state, code } = req.query;

  if (!state || !code) {
    return res.status(400).send('Missing state or code');
  }

  const stored = oauthStore.get(state);
  if (!stored) {
    return res.status(400).send('Invalid or expired state');
  }

  oauthStore.delete(state);

  try {
    const client = new TwitterApi({
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
    });

    const redirectUri = process.env.X_CALLBACK_URL || 'http://localhost:3000/telegram/x/callback';

    const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
      code,
      codeVerifier: stored.codeVerifier,
      redirectUri,
    });

    tokenStore.set('tokens', { accessToken, refreshToken, expiresIn });
    console.log('Twitter OAuth tokens stored:', { accessToken, refreshToken, expiresIn });

    res.send('✅ Twitter authenticated successfully! You can close this tab.');
  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    res.status(500).send('❌ Authentication failed. Try again.');
  }
});

export default router;
