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
      "type": "event_creation" | "search",
      "query"?: string, // Only if type is 'search'
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


// THIS IS THE MISSING FUNCTION THAT NEEDS TO BE ADDED
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
    } catch (jsonError) {
      console.error('Failed to parse OpenAI JSON response:', jsonError);
      return res.status(500).json({ message: 'Failed to parse AI response.', error: jsonError });
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
        .limit(10); // Limit results for now

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
          event: eventData, // Send back what we have so far
          questions: questions.concat(followUpQuestions),
        });
      } else {
        // All critical data is available, send to /api/publish
        return res.status(200).json({ type: 'event_ready', event: eventData });
      }
    }

    // Default case if AI doesn't categorize correctly
    return res.status(200).json({ message: 'I could not understand your request. Please try again.' });

  } catch (error: any) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ message: 'Error processing your request with AI.', error: error.message });
}
`;
}