import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in environment variables.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge';

// System prompt to guide the assistant
const SYSTEM_PROMPT = `You are a friendly and efficient event assistant. 
Your main tasks are helping users find events and create new events. 
If the user wants to create an event, gather all required details. 
When the user confirms posting, respond with '##POST_EVENT##' followed by a JSON object with all event details. 
Otherwise, just answer as a helpful assistant.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Missing messages array.' }), { status: 400 });
    }

    // Add the system prompt to the conversation
    const chatMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Send the conversation to OpenAI GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: chatMessages,
      temperature: 0.7,
    });

    const aiMessage = completion.choices[0]?.message?.content || '';
    let eventResult = null;

    // Check if the AI wants to post an event
    if (aiMessage.includes('##POST_EVENT##')) {
      const match = aiMessage.match(/##POST_EVENT##\s*([\s\S]+)/);
      if (match) {
        try {
          const eventData = JSON.parse(match[1]);
          // Insert the event into Supabase
          const { data, error } = await supabase.from('events').insert([eventData]).select().single();
          if (error) {
            eventResult = { error: error.message };
          } else {
            eventResult = { success: true, event: data };
          }
        } catch (err) {
          eventResult = { error: 'Failed to parse event data or insert into Supabase.' };
        }
      }
    }

    // Return the AI's response and any event posting result
    return new Response(
      JSON.stringify({ ai: aiMessage, eventResult }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Chat API Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal error occurred.';
    return new Response(
      JSON.stringify({ error: 'Failed to process chat message.', details: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 