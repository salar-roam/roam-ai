// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { supabase } from '../../lib/supabase';

interface EventData {
  title?: string;
  description?: string;
  price_value?: number;
  price_text?: string;
  currency?: string;
  town?: string;
  host?: {
    name?: string;
    phone_whatsapp?: string;
  };
  location?: {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  tags?: string[];
  image_url?: string;
  links?: { url: string; text: string }[];
  recurrence_rule?: string;
  is_on_demand?: boolean;
  occurrences?: {
    start_ts: string;
    end_ts: string | null;
  }[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_abc123'; // Replace with your assistant ID

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { text: userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ message: 'Missing user input' });
  }

  try {
    // Step 1: Create a thread
    const thread = await openai.beta.threads.create();

    // Step 2: Add user message to thread
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: userInput
    });

    // Step 3: Run assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });

    // Step 4: Poll for run completion
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(res => setTimeout(res, 1000));
      const updatedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      runStatus = updatedRun.status;
    }

    if (runStatus !== 'completed') {
      return res.status(500).json({ message: 'Assistant run failed.' });
    }

    // Step 5: Get messages from thread
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data.find(m => m.role === 'assistant');
    
    // Properly type check the message content
    const rawResponse = lastMessage?.content[0]?.type === 'text' 
      ? lastMessage.content[0].text.value 
      : null;

    console.log('Raw Assistant Response:', rawResponse);

    if (!rawResponse) {
      return res.status(500).json({ message: 'No assistant reply found or invalid content type.' });
    }

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(rawResponse);
      console.log('Parsed Response:', parsedResponse);
    } catch (error) {
      console.error('Error parsing Assistant response:', error);
      return res.status(500).json({ message: 'Error parsing Assistant response.' });
    }

    // Step 6: Handle response types
    switch (parsedResponse.type) {
      case 'event_creation':
        if (!parsedResponse.event) {
          return res.status(400).json({ message: 'Invalid event data in response.' });
        }
        return res.status(200).json(parsedResponse);

      case 'search':
        if (!parsedResponse.query) {
          return res.status(400).json({ message: 'Missing search query in response.' });
        }
        return res.status(200).json(parsedResponse);

      case 'message':
        if (!parsedResponse.message) {
          return res.status(400).json({ message: 'Missing message in response.' });
        }
        return res.status(200).json(parsedResponse);

      default:
        console.error('Unrecognized response type:', parsedResponse.type);
        return res.status(400).json({ message: 'Unrecognized response type from Assistant.' });
    }

  } catch (error) {
    console.error('Error in chat API:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
