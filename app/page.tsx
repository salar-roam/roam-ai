// app/page.tsx
'use client'; // This directive makes this component a Client Component

import { useState, FormEvent } from 'react';
import { CgSpinner } from 'react-icons/cg'; // For loading spinner

// Define interfaces for API responses
interface ChatResponse {
  type: 'event_ready' | 'follow_up' | 'search_results' | 'message';
  event?: any; // Structured event data
  questions?: string[]; // Follow-up questions
  results?: any[]; // Search results
  message?: string; // General message
  error?: string;
}

export default function Home() {
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'ai' }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentEventDraft, setCurrentEventDraft] = useState<any>(null); // To hold incomplete event data

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { text: input, sender: 'user' as const };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setInput(''); // Clear input immediately

    try {
      // Determine the API endpoint to call
      let apiEndpoint = '/api/chat';
      let body = { text: input };

      // If we have an event draft and the user is answering follow-up questions
      if (currentEventDraft && currentEventDraft.questions?.length > 0) {
        // We'll send the new input along with the existing draft to /api/chat
        // The AI needs to intelligently merge this. This is a simplification.
        // A more robust solution might involve sending the full conversation history.
        body = {
          text: `Here's more info: ${input}. Current event draft: ${JSON.stringify(currentEventDraft.event)}`,
        };
      }

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: ChatResponse = await res.json();
      console.log('API Response:', data);

      if (res.ok) {
        if (data.type === 'event_ready' && data.event) {
          // Event is ready, call /api/publish
          setMessages((prev) => [...prev, { text: 'Great! I have all the details. Publishing your event...', sender: 'ai' }]);
          const publishRes = await fetch('/api/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: data.event }),
          });
          const publishData = await publishRes.json();
          if (publishRes.ok) {
            setMessages((prev) => [...prev, { text: 'Event published successfully!', sender: 'ai' }]);
            setCurrentEventDraft(null); // Clear draft after successful publish
          } else {
            setMessages((prev) => [...prev, { text: `Error publishing event: ${publishData.message || 'Unknown error'}`, sender: 'ai' }]);
          }
        } else if (data.type === 'follow_up' && data.questions) {
          setMessages((prev) => [...prev, { text: `I need a bit more information: ${data.questions!.join(' ')}`, sender: 'ai' }]);          setCurrentEventDraft({ event: data.event, questions: data.questions }); // Store draft
        } else if (data.type === 'search_results' && data.results) {
          if (data.results.length > 0) {
            const formattedResults = data.results.map((event: any) =>
              `**${event.title}**\nDescription: ${event.description || 'N/A'}\nLocation: ${event.location?.name || 'N/A'}, ${event.location?.address || 'N/A'}\nPrice: ${event.price_text || 'Free'}\nHost: ${event.host?.name || 'N/A'}\nWhen: ${event.occurrences && event.occurrences[0]?.start_ts ? new Date(event.occurrences[0].start_ts).toLocaleString() : 'N/A'}`
            ).join('\n\n');
            setMessages((prev) => [...prev, { text: `Here are the events I found:\n\n${formattedResults}`, sender: 'ai' }]);
          } else {
            setMessages((prev) => [...prev, { text: data.message || 'No events found matching your search.', sender: 'ai' }]);
          }
          setCurrentEventDraft(null); // Clear draft after search
        } else if (data.message) {
          setMessages((prev) => [...prev, { text: data.message || 'An unknown message was received.', sender: 'ai' }]);          setCurrentEventDraft(null); // Clear draft if general message
        } else {
          setMessages((prev) => [...prev, { text: 'An unexpected response was received from the AI.', sender: 'ai' }]);
          setCurrentEventDraft(null);
        }
      } else {
        setMessages((prev) => [...prev, { text: `Error: ${data.message || 'Something went wrong.'}`, sender: 'ai' }]);
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