import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function extractWithClaude(
  prompt: string,
  documentText: string,
  model: string = 'claude-3-5-sonnet-20241022'
): Promise<any> {
  try {
    const message = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `${prompt}\n\nDocument text:\n${documentText}`
      }],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    throw new Error('Failed to extract JSON from Claude response');
  } catch (error) {
    throw new Error(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default client;
