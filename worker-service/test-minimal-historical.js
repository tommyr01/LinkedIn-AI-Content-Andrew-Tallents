// Test minimal historical insights to isolate the issue
const { OpenAI } = require('openai');

const testMinimalPrompt = async () => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'test-key'
  });

  // Test 1: Basic prompt (should work)
  console.log('Test 1: Basic prompt...');
  try {
    const basic = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are a LinkedIn content expert.' },
        { role: 'user', content: 'Write a short LinkedIn post about leadership.' }
      ],
      max_tokens: 100,
      temperature: 0.7
    });
    console.log('✅ Basic prompt works:', basic.choices[0]?.message?.content?.slice(0, 50) + '...');
  } catch (error) {
    console.log('❌ Basic prompt failed:', error.message);
  }

  // Test 2: With minimal historical context (the issue)
  console.log('\nTest 2: With minimal historical context...');
  const minimalContext = `Based on Andrew's top-performing posts:

EXAMPLE POST (25 reactions): Most CEOs won't admit this but they struggle with leadership.

VOICE PATTERNS:
- Tone: professional
- Vulnerability: 70/100

Use these insights to create authentic content.`;

  try {
    const withContext = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { 
          role: 'system', 
          content: `You are a LinkedIn expert. ${minimalContext}` 
        },
        { role: 'user', content: 'Write a LinkedIn post about leadership.' }
      ],
      max_tokens: 100,
      temperature: 0.7
    });
    console.log('✅ With context works:', withContext.choices[0]?.message?.content?.slice(0, 50) + '...');
  } catch (error) {
    console.log('❌ With context failed:', error.message);
  }

  // Test 3: Check if it's the model
  console.log('\nTest 3: Different model...');
  try {
    const gpt35 = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a LinkedIn expert.' },
        { role: 'user', content: 'Write a LinkedIn post about leadership.' }
      ],
      max_tokens: 100,
      temperature: 0.7
    });
    console.log('✅ GPT-3.5 works:', gpt35.choices[0]?.message?.content?.slice(0, 50) + '...');
  } catch (error) {
    console.log('❌ GPT-3.5 failed:', error.message);
  }
};

testMinimalPrompt().catch(console.error);