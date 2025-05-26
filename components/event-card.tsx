// components/event-card.tsx
import React from 'react';
import { Event } from '@/types'; // Use the shared type

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  // Handle potential null occurrences or empty array
  const firstOccurrence = event.occurrences && event.occurrences[0];
  const startDate = firstOccurrence
    ? new Date(firstOccurrence.start_ts).toLocaleString('es-DO', { // Example: Dominican Republic locale
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Date TBD';

  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm bg-white hover:shadow-md transition-shadow duration-200 ease-in-out">
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{event.title}</h3>
      {event.image_url && (
        <img src={event.image_url} alt={event.title} className="w-full h-40 object-cover rounded-md mb-3" />
      )}
      <p className="text-gray-600 mb-1">
        {event.location ? (
          <>
            <span className="font-medium">📍 {event.location.name}</span>
            {" - "}
            {event.location.address}
          </>
        ) : (
          <span>No location provided</span>
        )}
      </p>
      <p className="text-gray-800 font-medium mb-3">
        <span className="font-medium">🗓️ {startDate}</span>
      </p>
      <p className="text-gray-700 mb-4 line-clamp-2">{event.description}</p>
      <div className="flex justify-between items-center">
         <div className="text-sm text-gray-500">Host: {event.host.name}</div>
         <div className="text-right font-bold text-lg text-indigo-600">
            {event.price_text || 'Free'}
        </div>
      </div>
    </div>
  );
};

export default EventCard;