import { generateText } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import { tools } from '../../tools/index.js';
import { groq } from '@ai-sdk/groq';

const model = groq('openai/gpt-oss-120b');

export async function presentor(userQuery, toolName, toolResult) {
  try {
    const prompt = tools[toolName]?.presentPrompt || 'Answer concisely.';

    console.log('Presentor Running ...');

    const { text } = await generateText({
      model,
      system: prompt,
      prompt:
        `Query: ${userQuery}\n` +
        `Result: ${JSON.stringify(toolResult)}`,
    });

    return { answer: text, result: toolResult };
  } catch (error) {
    console.error('presentor error:', error.message);
    throw error;
  }
}
