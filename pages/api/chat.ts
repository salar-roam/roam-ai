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
const getEventExtractionPrompt = (userInput: string) => `
  You are an AI assistant for Roam AI, an event management platform. Your task is to extract structured event information from user descriptions.
  If a piece of information is not explicitly provided, indicate it as 'MISSING'.
  Do not make up information. Ask follow-up questions if critical information like title, a start time, or location is missing.

  User input: "${userInput}"

  Please extract the following information in JSON format:
  {
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
    "occurrences": {
      "start_ts": string,
      "end_ts": string | null
    }[]
  }
`;