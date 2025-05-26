// components/chat.tsx
'use client';

import { useChat } from 'ai/react';
import { useState, useRef, useEffect } from 'react';
import EventList from './event-list';
import { Event } from '@/types'; // Import Event type

export default function Chat() {
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- TODO: This is where you will implement AI function calling/tool handling ---
  // You will need to check if the AI's response includes a 'tool_call'
  // If it's a 'search_events' call, you run the search and update results.
  // If it's a 'create_event' call, you send to the create API.
  const handleAiResponse = (messageContent: string) => {
      console.log("AI says:", messageContent);
      // This is a placeholder. Real logic will parse AI output
      // or (better) handle tool calls.
      // If AI signaled a search was needed, you'd call fetchSearchResults here.
  };

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
      api: '/api/chat',
      onFinish: (message) => {
          // This runs when the AI finishes streaming its response.
          // You could potentially parse the final message here.
          handleAiResponse(message.content);
      },
      // --- TODO: Add `experimental_onToolCall` here when using Vercel AI SDK v3+ ---
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
  }, [messages]);


  // --- MOCK SEARCH FUNCTION (Replace with real API call) ---
  const fetchSearchResults = async (query: string, town: string) => {
      setIsSearching(true);
      try {
          const response = await fetch('/api/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, town }),
          });
          if (!response.ok) throw new Error("Search failed");
          const data: Event[] = await response.json();
          setSearchResults(data);
      } catch (error) {
          console.error("Failed to fetch search results:", error);
          setSearchResults([]); // Clear results on error
      } finally {
          setIsSearching(false);
      }
  };

  // --- EXAMPLE: Trigger search from chat (Highly simplified) ---
  const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      // SUPER BASIC intent detection (you need the AI to do this properly)
      if (input.toLowerCase().startsWith("find ")) {
          // Example: "find parties in Santo Domingo"
          const parts = input.split(" in ");
          const query = parts[0].replace("find ", "").trim();
          const town = parts[1] ? parts[1].trim() : "";
          fetchSearchResults(query, town);
      }
      handleSubmit(e); // Send message to AI regardless
  };


  return (
    <div className="flex h-screen w-screen"> {/* Ensure full screen */}
      {/* Chat Area */}
      <div className="w-1/3 h-full flex flex-col bg-gray-50 p-4 border-r border-gray-200">
        <h1 className="text-2xl font-bold text-indigo-700 p-4 text-center border-b mb-4">Event AI Assistant</h1>
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto mb-4 p-4 bg-white rounded-lg shadow-inner">
          {messages.map(m => (
            <div key={m.id} className={`mb-3 p-3 rounded-xl shadow-sm clear-both ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white ml-auto float-right'
                  : 'bg-gray-200 text-gray-900 mr-auto float-left'
              } max-w-[85%]`}>
              <span className="font-bold block text-xs mb-1">{m.role === 'user' ? 'You' : 'AI'}</span>
              {m.content}
            </div>
          ))}
           {isLoading && <div className="text-center text-gray-500 clear-both">AI is thinking...</div>}
        </div>

        <form onSubmit={handleChatSubmit} className="flex">
          <input
            className="flex-1 border border-gray-300 rounded-l-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={input}
            placeholder="Search or say 'Create event'..."
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button type="submit" className="bg-indigo-600 text-white p-3 rounded-r-lg hover:bg-indigo-700 focus:outline-none disabled:opacity-50" disabled={isLoading}>
            Send
          </button>
        </form>
      </div>

      {/* Event Display Area */}
      <div className="w-2/3 h-full overflow-y-auto p-6 bg-gray-100">
         <h2 className="text-3xl font-bold mb-6 text-gray-800">Events Feed</h2>
         <EventList events={searchResults} isLoading={isSearching} />
      </div>
    </div>
  );
}