import { tokenStore } from '../routes/twitter.js';

export const postTweet = async ({ content, metadata }) => {
  try {
    if (!content || content.length > 280) {
      console.log('Invalid tweet content:', content);
      return { success: false, message: 'Invalid tweet content' };
    }

    const tokens = tokenStore.get('tokens');
    const accessToken = tokens?.accessToken || process.env.TWITTER_ACCESS_TOKEN;
    if (!accessToken) {
      return { success: false, message: 'Not authenticated. Visit /x/auth first.' };
    }

    const response = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: content }),
    });

    const data = await response.json();
    console.log('Posting tweet:', data);
    return { success: true, message: 'Tweet posted successfully', data };
  } catch (err) {
    console.log('Error posting tweet:', err);
    return { success: false, message: 'Failed to post tweet' };
  }
};


export const RefreshToken = async () => {
    try {

        console.log('Refreshing Twitter token...');

    }
    catch(err){
        console.log('Error refreshing token:', err);
        return { success: false, message: 'Failed to refresh token' };
    }
 }

export const uploadMedia = async (mediaData) => {
    try { 
        console.log('Uploading media to Twitter...');
        return { success: true, mediaId: '1234567890' };
      }

    catch(err){
        console.log('Error uploading media:', err);
        return { success: false, message: 'Failed to upload media' };
    }   

}