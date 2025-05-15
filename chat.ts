import type { NextRequest } from 'next/server';
import { OpenAI } from 'openai';
import { supabase } from '@/lib/supabase';
import { draftGapCheck, buildAssistantReply } from '@/lib/chat-helpers';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  const { message, sessionId } = await req.json();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // 1. draft parse
  const draft = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      { role: 'system', content: 'Extract structured JSON for Roam AI event or search query.' },
      { role: 'user', content: message }
    ]
  });
  const json = JSON.parse(draft.choices[0].message.content);

  // 2. gap check
  const { missing, intent } = draftGapCheck(json);

  // 3. build reply
  const reply = await buildAssistantReply({ json, missing, intent, sessionId });
  return new Response(JSON.stringify(reply), { headers: { 'Content-Type': 'application/json' } });
}
