import { processQuery } from '../services/chat.Service.js';

export async function chatHandler(req, res) {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const result = await processQuery(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
