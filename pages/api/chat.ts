// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { supabase } from '../../lib/supabase'; // Adjust path if necessary

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

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to generate a prompt for event extraction
const getEventExtractionPrompt = (userInput: string): string => {
  // Get current date for accurate 'tomorrow' calculation relative to Santo Domingo, DR (AST/GMT-4)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

  return `You are an AI assistant for Roam AI, an event management platform. Your task is to help users create events or search for existing events.

When a user greets you or starts a conversation, respond with type: "greeting" and a friendly message.
When a user wants to create an event but hasn't provided enough information, respond with type: "follow_up" and ask for the missing information.
When a user is searching for events, respond with type: "search" and include their search query.

User input: "${userInput}"

Expected JSON format:
{
  "type": "greeting" | "event_creation" | "search" | "follow_up",
  "message"?: string, // For greeting type
  "query"?: string, // For search type
  "event"?: {
    "title": string,
    "description": string,
    "price_value": number,
    "price_text": string,
    "currency": string,
    "town": string,
    "host": {
      "name": string,
      "phone_whatsapp": string
    },
    "location": {
      "name": string,
      "address": string,
      "lat": number,
      "lng": number
    },
    "tags": string[],
    "image_url": string,
    "links": { "url": string, "text": string }[],
    "recurrence_rule": string,
    "is_on_demand": boolean,
    "occurrences": [
      {
        "start_ts": string,
        "end_ts": string | null
      }
    ]
  },
  "follow_up_questions"?: string[]
}

Examples:
User: "hello"
AI: {
  "type": "greeting",
  "message": "Hello! I'm your event assistant. Would you like to create a new event or search for existing events?"
}

User: "I want to create an event"
AI: {
  "type": "follow_up",
  "follow_up_questions": [
    "What is the title of your event?",
    "When would you like to hold the event?",
    "Where will the event take place?"
  ]
}

User: "Yoga at the beach tomorrow at 8am hosted by Mia for 500 pesos"
AI: {
  "type": "event_creation",
  "event": {
    "title": "Yoga at the beach",
    "description": "MISSING",
    "price_value": 500,
    "price_text": "500 pesos",
    "currency": "DOP",
    "town": "Cabarete",
    "host": {
      "name": "Mia",
      "phone_whatsapp": "MISSING"
    },
    "location": {
      "name": "The Beach",
      "address": "MISSING",
      "lat": "MISSING",
      "lng": "MISSING"
    },
    "tags": ["yoga", "fitness", "beach"],
    "image_url": "MISSING",
    "links": "MISSING",
    "recurrence_rule": "MISSING",
    "is_on_demand": false,
    "occurrences": [
      {
        "start_ts": "${tomorrowISO}T08:00:00-04:00",
        "end_ts": null
      }
    ]
  },
  "follow_up_questions": [
    "What is the full address of the beach?",
    "What is Mia's WhatsApp number?",
    "Could you provide a description for the event?"
  ]
}

User: "Free dance events this weekend in Cabarete"
AI: {
  "type": "search",
  "query": "Free dance events this weekend in Cabarete"
}

Now, extract from: "${userInput}"`;
};

// Update the response types
interface GreetingResponse {
  type: 'greeting';
  message: string;
}

interface SearchResponse {
  type: 'search';
  query: string;
}

interface EventCreationResponse {
  type: 'event_creation';
  event: EventData;
  follow_up_questions?: string[];
}

interface FollowUpResponse {
  type: 'follow_up';
  follow_up_questions: string[];
}

type AIResponse = GreetingResponse | SearchResponse | EventCreationResponse | FollowUpResponse;

// Type guard for AI response
function isAIResponse(response: any): response is AIResponse {
  return (
    response &&
    typeof response === 'object' &&
    (response.type === 'greeting' || 
     response.type === 'search' || 
     response.type === 'event_creation' || 
     response.type === 'follow_up')
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { text: userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ message: 'Missing user input' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      messages: [
        {
          role: 'system',
          content: getEventExtractionPrompt(userInput),
        },
        {
          role: 'user',
          content: userInput,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const rawResponse = completion.choices[0].message.content;
    console.log('Raw OpenAI Response:', rawResponse);

    if (!rawResponse) {
      return res.status(500).json({ message: 'OpenAI did not return a response.' });
    }

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(rawResponse);
    } catch (jsonError) {
      console.error('Failed to parse OpenAI JSON response:', jsonError);
      return res.status(500).json({ message: 'Failed to parse AI response.', error: jsonError });
    }

    if (!isAIResponse(parsedResponse)) {
      console.error('Invalid AI response format:', parsedResponse);
      return res.status(400).json({ message: 'Invalid response format from AI.' });
    }

    // Handle greeting
    if (parsedResponse.type === 'greeting') {
      return res.status(200).json({
        type: 'greeting',
        message: parsedResponse.message,
      });
    }

    // Handle follow-up questions
    if (parsedResponse.type === 'follow_up') {
      return res.status(200).json({
        type: 'follow_up',
        questions: parsedResponse.follow_up_questions,
      });
    }

    // Handle search queries
    if (parsedResponse.type === 'search') {
      const searchQuery = parsedResponse.query;
      if (!searchQuery) {
        return res.status(400).json({ message: 'Search query not provided by AI.' });
      }

      // Basic keyword search in Supabase
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,tags.cs.{"${searchQuery}"},host->>name.ilike.%${searchQuery}%,location->>name.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) {
        console.error('Supabase search error:', error);
        return res.status(500).json({ message: 'Error searching events.', error: error.message });
      }

      if (events && events.length > 0) {
        return res.status(200).json({ type: 'search_results', results: events });
      } else {
        return res.status(200).json({ type: 'search_results', message: 'No events found matching your search.' });
      }
    }

    // Handle event creation
    if (parsedResponse.type === 'event_creation') {
      const eventData: EventData = parsedResponse.event;
      const followUpQuestions: string[] = parsedResponse.follow_up_questions || [];

      // Check for critical missing data for event creation
      const missingCriticalData: string[] = [];
      if (!eventData.title || eventData.title === 'MISSING') missingCriticalData.push('title');
      if (!eventData.occurrences || eventData.occurrences[0]?.start_ts === 'MISSING') missingCriticalData.push('start time');
      if (!eventData.location || eventData.location.name === 'MISSING') missingCriticalData.push('location name');

      if (missingCriticalData.length > 0) {
        // Ask for more information if critical data is missing
        const questions = missingCriticalData.map(item => `What is the ${item} for the event?`);
        return res.status(200).json({
          type: 'follow_up',
          event: eventData,
          questions: questions.concat(followUpQuestions),
        });
      } else {
        // All critical data is available, send to /api/publish
        return res.status(200).json({ type: 'event_ready', event: eventData });
      }
    }

    // This should never be reached due to the type guard
    return res.status(400).json({ message: 'Invalid response type from AI.' });

  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return res.status(500).json({ message: 'Error processing your request with AI.', error: error.message });
  }
}