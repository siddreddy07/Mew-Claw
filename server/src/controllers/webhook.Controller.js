import { handleWebhook } from '../services/webhook.Service.js';

export async function webhookHandler(req, res) {
  console.log('Received webhook:', JSON.stringify(req.body));
  res.json({ ok: true });

  try {
    await handleWebhook(req.body);
  } catch (error) {
    console.error('Webhook error:', error.message);
  }
}

