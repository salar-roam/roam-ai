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
const getEventExtractionPrompt = (userInput: string) => {
  // Get current date for accurate 'tomorrow' calculation relative to Santo Domingo, DR (AST/GMT-4)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

  return `
    You are an AI assistant for Roam AI, an event management platform. Your task is to extract structured event information from user descriptions.
    If a piece of information is not explicitly provided, indicate it as 'MISSING'.
    Do not make up information. Ask follow-up questions if critical information like title, a start time, or location is missing.

    User input: "${userInput}"

    Extract the following JSON structure. If the user input is a search query, set 'type' to 'search' and 'query' to the search terms. If it's an event creation request, set 'type' to 'event_creation' and fill out the 'event' object.

    Expected JSON format:
    {
      "type": "event_creation" | "search" | "message",
      "query"?: string, // Only if type is 'search'
      "message"?: string, // Only if type is 'message'
      "event"?: { // Only if type is 'event_creation'
        "title": "string" | "MISSING",
        "description": "string" | "MISSING",
        "price_value": "number" | "MISSING",
        "price_text": "string" | "MISSING",
        "currency": "string" | "MISSING",
        "town": "string" | "MISSING",
        "host": {
          "name": "string" | "MISSING",
          "phone_whatsapp": "string" | "MISSING"
        },
        "location": {
          "name": "string" | "MISSING",
          "address": "string" | "MISSING",
          "lat": "number" | "MISSING",
          "lng": "number" | "MISSING"
        },
        "tags": ["string"] | "MISSING",
        "image_url": "string" | "MISSING",
        "links": [{"url": "string", "text": "string"}] | "MISSING",
        "recurrence_rule": "string" | "MISSING",
        "is_on_demand": "boolean" | "MISSING",
        "occurrences": [
          {"start_ts": "ISO 8601 string" | "MISSING", "end_ts": "ISO 8601 string" | null | "MISSING"}
        ]
      },
      "follow_up_questions"?: string[] // List of questions if data is missing
    }

    Examples:
    User: "Yoga at the beach tomorrow at 8am hosted by Mia for 500 pesos"
    AI: {
      "type": "event_creation",
      "event": {
        "title": "Yoga at the beach",
        "description": "MISSING",
        "price_value": 500,
        "price_text": "500 pesos",
        "currency": "DOP",
        "town": "Cabarete", // Assuming default town or inferred from context
        "host": {"name": "Mia", "phone_whatsapp": "MISSING"},
        "location": {"name": "The Beach", "address": "MISSING", "lat": "MISSING", "lng": "MISSING"},
        "tags": ["yoga", "fitness", "beach"],
        "image_url": "MISSING",
        "links": "MISSING",
        "recurrence_rule": "MISSING",
        "is_on_demand": false,
        "occurrences": [{"start_ts": "${tomorrowISO}T08:00:00-04:00", "end_ts": null}]
      },
      "follow_up_questions": ["What is the full address of the beach?", "What is Mia's WhatsApp number?", "Could you provide a description for the event?"]
    }

    User: "Free dance events this weekend in Cabarete"
    AI: {
      "type": "search",
      "query": "Free dance events this weekend in Cabarete"
    }

    User: "Tell me more about the yoga event"
    AI: {
      "type": "search",
      "query": "yoga event"
    }

    Now, extract from: "${userInput}"
  `;
};

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
      model: 'gpt-3.5-turbo-0125', // Or 'gpt-4-turbo-preview' for better results, but higher cost
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
      temperature: 0.1, // Lower temperature for more consistent JSON output
    });

    const rawResponse = completion.choices[0].message.content;
    console.log('Raw OpenAI Response:', rawResponse);

    if (!rawResponse) {
      return res.status(500).json({ message: 'OpenAI did not return a response.' });
    }

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(rawResponse);
      console.log('Parsed Response:', parsedResponse);
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      return res.status(500).json({ message: 'Error parsing AI response.' });
    }

    // Handle different response types
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
        return res.status(400).json({ message: 'Unrecognized response type from AI.' });
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}