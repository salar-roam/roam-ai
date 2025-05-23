// app/page.tsx
'use client'; // This directive makes this component a Client Component

import { useState, FormEvent, useEffect, useRef } from 'react'; // Added useEffect and useRef
import { CgSpinner } from 'react-icons/cg'; // For loading spinner

// --- Define interfaces for API responses (Updated - mapsLink removed from ExtractedEventData) ---
interface ExtractedEventData {
  title?: string;
  description?: string;
  price_value?: number;
  price_text?: string;
  currency?: string;
  town?: string;
  host?: {
    name?: string;
    phone_whatsapp?: string;
    instagram?: string;
  };
  location?: {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    // mapsLink?: string; // REMOVED from frontend interface
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
}

interface GeneralMessageAIResponse {
  type: 'message';
  message: string;
}

interface SearchResultsAIResponse {
  type: 'search_results';
  results?: any[];
  message?: string;
}

// Combined AI response type
type AIResponse = EventCreationAIResponse | SearchAIResponse | GeneralMessageAIResponse | SearchResultsAIResponse;

// Message interface for chat history
interface Message {
  text: string;
  sender: 'user' | 'ai';
}

export default function Home() {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentEventDraft, setCurrentEventDraft] = useState<ExtractedEventData | null>(null); // To hold incomplete event data

  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { text: input, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setInput(''); // Clear input immediately

    try {
      const apiEndpoint = '/api/chat';

      // Prepare conversation history for the AI
      // Send entire history for now, could optimize to last N messages later
      const conversationHistory = messages; 
      
      const body = {
        text: userMessage.text, // Send the current user input
        currentEventDraft: currentEventDraft, // Send the current draft to the AI
        conversationHistory: conversationHistory // Send relevant history
      };

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: AIResponse = await res.json();
      console.log('API Response:', data);

      if (res.ok) {
        if (data.type === 'event_creation') {
          setCurrentEventDraft(data.event); // Always update draft with AI's latest understanding

          if (data.status === 'incomplete' && data.follow_up_questions && data.follow_up_questions.length > 0) {
            const followUpText = Array.isArray(data.follow_up_questions) && data.follow_up_questions.length > 0
              ? data.follow_up_questions.join(' ')
              : 'Can you provide more details?';
            setMessages((prev) => [...prev, { text: `I need a bit more information: ${followUpText}`, sender: 'ai' }]);
          } else if (data.status === 'confirmation_pending' && data.confirmation_message) {
            setMessages((prev) => [...prev, { text: data.confirmation_message ?? '', sender: 'ai' }]);
          } else if (data.status === 'complete' && data.event) {
            // Event is ready, call /api/publish
            setMessages((prev) => [...prev, { text: 'Great! I have all the details. Publishing your event...', sender: 'ai' }]);
            const publishRes = await fetch('/api/publish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: data.event }), // Send the AI's extracted event data
            });
            const publishData = await publishRes.json();
            if (publishRes.ok) {
              setMessages((prev) => [...prev, { text: data.user_facing_message ?? 'Event published successfully! 🎉', sender: 'ai' }]);
              setCurrentEventDraft(null); // Clear draft after successful publish
            } else {
              setMessages((prev) => [...prev, { text: `Error publishing event: ${publishData.message ?? 'Unknown error'}`, sender: 'ai' }]);
            }
          } else {
            // Fallback for unexpected AI response in event creation mode
            setMessages((prev) => [...prev, { text: data.user_facing_message ?? 'I\'m still processing your event details. Could you clarify?', sender: 'ai' }]);
          }
        } else if (data.type === 'search_results') {
          if (Array.isArray(data.results) && data.results.length > 0) {
            const formattedResults = data.results.map((event: any) => {
              return `**${event.title}**\nDescription: ${event.description || 'N/A'}\nLocation: ${event.location || 'N/A'}\nPrice: ${event.price_text || 'Free'}\nHost: ${event.host || 'N/A'}\nWhen: ${event.occurrences && event.occurrences[0]?.start_ts ? new Date(event.occurrences[0].start_ts).toLocaleString() : 'N/A'}`;
            }).join('\n\n');
            setMessages((prev) => [...prev, { text: `Here are the events I found:\n\n${formattedResults}`, sender: 'ai' }]);
          } else {
            const msg = typeof data.message === 'string' ? data.message : 'No events found matching your search.';
            setMessages((prev) => [...prev, { text: msg, sender: 'ai' }]);
          }
          setCurrentEventDraft(null);
        } else if (data.type === 'message') {
          setMessages((prev) => [...prev, { text: (data as GeneralMessageAIResponse).message ?? 'An unknown message was received.', sender: 'ai' }]);
          setCurrentEventDraft(null);
        } else {
          setMessages((prev) => [...prev, { text: 'An unexpected response was received from the AI.', sender: 'ai' }]);
          setCurrentEventDraft(null);
        }
      } else {
        const errorMsg = 'message' in data && typeof data.message === 'string'
          ? data.message
          : 'Something went wrong.';
        setMessages((prev) => [...prev, { text: `Error: ${errorMsg}`, sender: 'ai' }]);
        setCurrentEventDraft(null);
      }
    } catch (error: any) {
      console.error('Frontend fetch error:', error);
      setMessages((prev) => [...prev, { text: `Failed to connect to the assistant: ${error.message}`, sender: 'ai' }]);
      setCurrentEventDraft(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-8">
      <div className="flex flex-col items-center justify-center flex-grow w-full max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">Roam AI</h1>

        <div className="w-full flex-grow bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {messages.length === 0 && (
            <p className="text-gray-400 text-center">Type a description of your event or a search query!</p>
          )}
          {messages.map((msg, index) => (
            <div key={index} className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block px-4 py-2 rounded-lg ${
                msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
              }`}>
                {msg.text.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </span>
            </div>
          ))}
          {loading && (
            <div className="text-center mt-4">
              <CgSpinner className="animate-spin inline-block text-white text-3xl" />
            </div>
          )}
          <div ref={messagesEndRef} /> {/* For auto-scrolling */}
        </div>

        <form onSubmit={handleSubmit} className="w-full flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={loading ? 'Processing...' : 'Describe an event or search...'}
            className="flex-grow p-3 rounded-l-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
