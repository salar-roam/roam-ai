// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { openai } from '../../lib/openai';
import { supabase } from '../../lib/supabase';
import { getTownTimezone } from '../../lib/timezone-helpers';

// --- Interfaces (Updated) ---
interface ExtractedEventData {
  title: string;
  description?: string;
  price_value: number;
  price_text: string;
  currency: string;
  town: string;
  host: {
    name: string;
    phone_whatsapp: string;
    instagram?: string;
  };
  location: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
  };
  tags?: string[];
  image_url?: string;
  links?: Array<{ url: string; text: string }>;
  recurrence_rule: 'one-time' | 'weekly' | 'monthly' | 'daily' | 'yearly';
  is_on_demand?: boolean;
  occurrences: Array<{
    start_ts: string;
    end_ts?: string | null;
  }>;
}

interface EventCreationAIResponse {
  type: 'event_creation';
  status: 'incomplete' | 'confirmation_pending' | 'complete';
  event: ExtractedEventData;
  follow_up_questions?: string[];
  confirmation_message?: string;
  user_facing_message?: string;
}

interface SearchAIResponse {
  type: 'search';
  query: string;
  user_facing_message?: string;
}

interface GeneralMessageAIResponse {
  type: 'message';
  message: string;
}

// Combined AI response type
type AIResponse = EventCreationAIResponse | SearchAIResponse | GeneralMessageAIResponse;

// --- Main API Handler Function (Contains the full prompt and logic) ---
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { text: userInput, currentEventDraft, conversationHistory } = req.body;

  if (!userInput) {
    return res.status(400).json({ message: 'Missing user input' });
  }

  try {
    const tz = currentEventDraft?.town ? getTownTimezone(currentEventDraft.town) : 'America/Santo_Domingo';
    const now = new Date();
    const tomorrow = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString().split('T')[0];

    const formattedHistory = JSON.stringify(conversationHistory || [], null, 2);
    const formattedDraft = JSON.stringify(currentEventDraft || {}, null, 2);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-0125',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that MUST respond in JSON format. Your response MUST be a valid JSON object with a "type" field that is either "event_creation", "search", or "message".

For event creation:
{
  "type": "event_creation",
  "status": "incomplete",
  "event": {
    "title": "string",
    "description": "string",
    "price_value": 0,
    "price_text": "string",
    "currency": "string",
    "town": "string",
    "host": {
      "name": "string",
      "phone_whatsapp": "string"
    },
    "location": {
      "name": "string",
      "address": "string"
    }
  },
  "follow_up_questions": ["string"]
}

For search:
{
  "type": "search",
  "query": "string",
  "user_facing_message": "string"
}

For general messages:
{
  "type": "message",
  "message": "string"
}`,
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

    let parsedResponse: AIResponse;
    try {
      parsedResponse = JSON.parse(rawResponse);
      console.log('Parsed Response:', parsedResponse);
    } catch (jsonError) {
      console.error('Failed to parse OpenAI JSON response:', jsonError);
      return res.status(500).json({ message: 'Failed to parse AI response.', error: jsonError });
    }

    // Handle different response types
    if (parsedResponse.type === 'event_creation') {
      const eventData: ExtractedEventData = parsedResponse.event;
      const status = parsedResponse.status;
      const followUpQuestions: string[] = parsedResponse.follow_up_questions || [];
      const confirmationMessage: string | undefined = parsedResponse.confirmation_message;
      const userFacingMessage: string | undefined = parsedResponse.user_facing_message;

      if (status === 'incomplete' && followUpQuestions.length > 0) {
        return res.status(200).json({ type: 'follow_up', event: eventData, questions: followUpQuestions });
      }

      if (status === 'confirmation_pending' && confirmationMessage) {
        return res.status(200).json({ type: 'follow_up', event: eventData, questions: [confirmationMessage] });
      }

      if (status === 'complete' && eventData) {
        return res.status(200).json({ type: 'event_ready', event: eventData, message: userFacingMessage || 'Event is ready for publishing!' });
      }
    }

    if (parsedResponse.type === 'search') {
      const searchQuery = parsedResponse.query;
      if (!searchQuery) {
        return res.status(400).json({ message: 'Search query not provided by AI.' });
      }

      // --- PgVector Search Placeholder (More complex logic will go here) ---
      // For now, retaining basic keyword search.
      // This will be updated with actual embedding generation and vector search in a later step.
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          id, title, description, price_value, price_text, currency, tags, image_url, links, recurrence_rule, is_on_demand,
          towns(name, tz),
          hosts(id, name, phone_whatsapp, instagram),
          locations(id, name, address, lat, lng),
          event_occurrences(start_ts, end_ts)
        `)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,tags.cs.{"${searchQuery}"},hosts.name.ilike.%${searchQuery}%,locations.name.ilike.%${searchQuery}%`)
        .limit(10); // Limit results for now

      if (error) {
        console.error('Supabase search error:', error);
        return res.status(500).json({ message: 'Error searching events.', error: error.message });
      }

      // Flatten nested data for frontend display
      const formattedResults = events.map((event: any) => {
        return {
          id: event.id,
          title: event.title,
          description: event.description || 'N/A',
          price_text: event.price_text || 'Free',
          host: event.hosts?.name || 'N/A',
          location: `${event.locations?.name || 'N/A'}, ${event.locations?.address || 'N/A'}`,
          occurrences: event.event_occurrences // Keep occurrences as array
        };
      });

      if (formattedResults && formattedResults.length > 0) {
        return res.status(200).json({ type: 'search_results', results: formattedResults, message: parsedResponse.user_facing_message });
      } else {
        return res.status(200).json({ type: 'search_results', message: parsedResponse.user_facing_message || 'No events found matching your search.' });
      }
    }

    if (parsedResponse.type === 'message') {
      return res.status(200).json({ type: 'message', message: parsedResponse.message });
    }

    // If we get here, the response type wasn't recognized
    console.error('Unrecognized response type:', parsedResponse);
    return res.status(200).json({ 
      type: 'message', 
      message: parsedResponse.user_facing_message || 'I could not understand your request. Please try again.' 
    });

  } catch (error: any) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ message: 'Error processing your request with AI.', error: error.message });
  }
}