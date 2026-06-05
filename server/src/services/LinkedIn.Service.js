import axios from 'axios';
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';

const projectRoot = path.resolve(import.meta.dirname, '..', '..', '..');

function getAccessToken() {
  return process.env.LINKEDIN_ACCESS_TOKEN;
}

async function resolveMediaPath(input) {
  const exact = path.resolve(input);
  if (fs.existsSync(exact)) return exact;
  const rooted = path.resolve(projectRoot, input);
  if (fs.existsSync(rooted)) return rooted;

  const cwd = projectRoot;
  const matches = await fg(`**/${input}`, {
    cwd,
    ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**', '__pycache__/**', '.venv/**', 'env/**', 'pip_cache/**', 'cache/**'],
    absolute: true,
    caseSensitiveMatch: false,
  });

  if (matches.length === 0) {
    const nameOnly = path.basename(input);
    const broadMatches = await fg(`**/${nameOnly}`, {
      cwd,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**', '__pycache__/**', '.venv/**', 'env/**', 'pip_cache/**', 'cache/**'],
      absolute: true,
      caseSensitiveMatch: false,
    });
    if (broadMatches.length === 0) return null;
    if (broadMatches.length > 1) return { error: `Multiple files found matching "${nameOnly}":\n${broadMatches.join('\n')}` };
    return broadMatches[0];
  }

  if (matches.length > 1) return { error: `Multiple files found matching "${input}":\n${matches.join('\n')}` };
  return matches[0];
}

async function getPersonId(accessToken) {
  const { data } = await axios.get('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data.sub;
}

function getMediaType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  return null;
}

async function uploadImage(accessToken, personId, filePath) {
  const registerRes = await axios.post(
    'https://api.linkedin.com/v2/assets?action=registerUpload',
    {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: `urn:li:person:${personId}`,
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent',
        }],
      },
    },
    { headers: { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' } }
  );

  const { uploadUrl, asset } = registerRes.data.value;
  const fileBuffer = fs.readFileSync(filePath);
  await axios.put(uploadUrl, fileBuffer, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/octet-stream' },
  });

  return asset;
}

async function uploadVideo(accessToken, personId, filePath) {
  const fileSize = fs.statSync(filePath).size;
  const initRes = await axios.post(
    'https://api.linkedin.com/v2/videos?action=initializeUpload',
    {
      initializeUploadRequest: {
        owner: `urn:li:person:${personId}`,
        fileSizeBytes: fileSize,
        uploadCaptions: false,
        uploadThumbnail: false,
      },
    },
    { headers: { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' } }
  );

  const value = initRes.data.value || initRes.data;
  const video = value.video || value.asset;
  const instructions = value.uploadInstructions || [];
  if (!instructions.length) throw new Error('No upload instructions returned from LinkedIn');

  const fileBuffer = fs.readFileSync(filePath);
  for (const chunk of instructions) {
    const chunkData = fileBuffer.slice(chunk.firstByte, chunk.lastByte + 1);
    await axios.put(chunk.uploadUrl, chunkData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Content-Range': `bytes ${chunk.firstByte}-${chunk.lastByte}/${fileSize}`,
      },
    });
  }

  return video;
}

export async function postToLinkedIn({ content, mediaPath }) {
  try {
    if (!content || content.length > 3000) {
      return { success: false, message: 'Invalid content or exceeds 3000 character limit' };
    }

    const accessToken = getAccessToken();
    if (!accessToken) {
      return { success: false, message: 'Not authenticated. Visit /in/auth first.' };
    }

    const personId = await getPersonId(accessToken);

    let mediaAsset = null;
    if (mediaPath) {
      const resolved = await resolveMediaPath(mediaPath);
      if (!resolved) return { success: false, message: `File not found: "${mediaPath}"` };
      if (resolved.error) return { success: false, message: resolved.error };

      const mediaType = getMediaType(resolved);
      if (!mediaType) return { success: false, message: 'Unsupported media format' };

      if (mediaType === 'image') {
        mediaAsset = await uploadImage(accessToken, personId, resolved);
      } else {
        mediaAsset = await uploadVideo(accessToken, personId, resolved);
      }
    }

    const postPayload = {
      author: `urn:li:person:${personId}`,
      commentary: content,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };

    if (mediaAsset) {
      postPayload.content = {
        media: { title: '', id: mediaAsset },
      };
    }

    const response = await axios.post('https://api.linkedin.com/v2/posts', postPayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    const postId = decodeURIComponent((response.headers['location'] || response.headers['x-restli-id'] || '').replace('/posts/', ''));
    if (postId) console.log('LinkedIn post URL:', `https://www.linkedin.com/feed/update/${postId}/`);

    return { success: true, message: 'LinkedIn post created successfully' };
  } catch (err) {
    console.error('LinkedIn API error:', err.response?.status, err.response?.data || err.message);
    return { success: false, message: 'Failed to post to LinkedIn' };
  }
}
