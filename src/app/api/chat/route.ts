import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: messages.map((message: any) => ({
      content: message.content,
      role: message.role,
    })),
  });

  const reply = completion.choices[0]?.message?.content || '';
  return NextResponse.json({ reply });
} 