import { Router } from 'express';
import { webhookHandler } from '../controllers/webhook.Controller.js';
import { TwitterApi } from 'twitter-api-v2';
import { oauthStore, tokenStore } from './twitter.js';
import { linkedinTokenStore } from './linkedin.js';
import axios from "axios";

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

export const linkedinCallback = async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  try {
    // Exchange code → access token
    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, expires_in } = tokenRes.data;

    linkedinTokenStore.set('tokens', { accessToken: access_token, expiresIn: expires_in });
    console.log('LinkedIn OAuth tokens stored:', { accessToken: access_token, expiresIn: expires_in });

    return res.json({
      access_token,
      expires_in,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to fetch LinkedIn token",
    });
  }
};

router.get('/in/callback',linkedinCallback)




export default router;
