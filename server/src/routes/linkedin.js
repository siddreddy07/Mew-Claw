import { Router } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { oauthStore } from './twitter.js';

const linkedinTokenStore = new Map();

const router = Router();


router.get("/auth", (req, res) => {
  const state = Math.random().toString(36).substring(2);

  const redirectUri =
    process.env.LINKEDIN_CALLBACK_URL ||
    "http://localhost:3000/linkedin/callback";

  const scope = "openid profile w_member_social";

  const url =
    "https://www.linkedin.com/oauth/v2/authorization" +
    `?response_type=code` +
    `&client_id=${process.env.LINKEDIN_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}` +
    `&scope=${encodeURIComponent(scope)}`;

  oauthStore.set(state, {
    createdAt: Date.now(),
  });

  console.log('Linkedin auth Url :',{url})

  res.redirect(url);
});


export { linkedinTokenStore };
export default router;
