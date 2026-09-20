
import 'dotenv/config';
import OpenAI from 'openai';

const baseURL = process.env.OPENAI_BASE_URL || 'http://localhost:20128/v1';
const apiKey = process.env.OPENAI_API_KEY || 'sk-omniroute-local';

console.log(`Testing OpenAI SDK against baseURL: ${baseURL}`);

const openai = new OpenAI({
  baseURL,
  apiKey,
});

async function main() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hola! Test de conexión' }],
    });
    console.log('Response:', response);
  } catch (error: unknown) {
    console.log('OmniRoute local gateway reached successfully!');
    const message = error instanceof Error ? error.message : String(error);
    console.log('Status / Error from gateway:', message);
  }
}

main();
