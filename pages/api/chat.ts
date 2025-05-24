// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { supabase } from '../../lib/supabase';

// Define the structure for an event
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
    start_ts: string; // ISO 8601
    end_ts: string | null;
  }[];
}

// Define response types
interface BaseResponse {
  type: 'event_creation' | 'search' | 'message';
}

interface EventCreationResponse extends BaseResponse {
  type: 'event_creation';
  event: EventData;
  follow_up_questions?: string[];
}

interface SearchResponse extends BaseResponse {
  type: 'search';
  query: string;
}

interface MessageResponse extends BaseResponse {
  type: 'message';
  message: string;
}

type AIResponse = EventCreationResponse | SearchResponse | MessageResponse;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_xiJWFReVZ160EzJ9RUyVCRVh';

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

    let parsedResponse: AIResponse;
    try {
      const parsed = JSON.parse(rawResponse);
      if (!isAIResponse(parsed)) {
        throw new Error('Invalid response format');
      }
      parsedResponse = parsed;
      console.log('Parsed Response:', parsedResponse);
    } catch (error) {
      console.error('Error parsing Assistant response:', error);
      return res.status(500).json({ message: 'Error parsing Assistant response.' });
    }

    // Step 6: Handle response types
    const response = parsedResponse as AIResponse;
    switch (response.type) {
      case 'event_creation':
        if (!response.event) {
          return res.status(400).json({ message: 'Invalid event data in response.' });
        }
        return res.status(200).json(response);

      case 'search':
        if (!response.query) {
          return res.status(400).json({ message: 'Missing search query in response.' });
        }
        return res.status(200).json(response);

      case 'message':
        if (!response.message) {
          return res.status(400).json({ message: 'Missing message in response.' });
        }
        return res.status(200).json(response);

      default:
        console.error('Unrecognized response type:', response.type);
        return res.status(400).json({ message: 'Unrecognized response type from Assistant.' });
    }

  } catch (error) {
    console.error('Error in chat API:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

// Type guard to check if the response is a valid AIResponse
function isAIResponse(response: any): response is AIResponse {
  if (!response || typeof response !== 'object') return false;
  if (!response.type || !['event_creation', 'search', 'message'].includes(response.type)) return false;

  switch (response.type) {
    case 'event_creation':
      return !!response.event;
    case 'search':
      return typeof response.query === 'string';
    case 'message':
      return typeof response.message === 'string';
    default:
      return false;
  }
}