import { Router } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { TwitterApi } from 'twitter-api-v2';

const router = Router();

const client = new TwitterApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});

const oauthStore = new Map();
const tokenStore = new Map();

router.get('/auth', (req, res) => {
  const redirectUri = process.env.X_CALLBACK_URL || 'http://localhost:3000/telegram/x/callback';

  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    redirectUri,
    {
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    }
  );

  oauthStore.set(state, { codeVerifier, createdAt: Date.now() });

  console.log({ url, codeVerifier, state });
  res.redirect(url);
});

export { oauthStore, tokenStore };
export default router;
