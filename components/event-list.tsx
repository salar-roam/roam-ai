// components/event-list.tsx
import React from 'react';
import EventCard from './event-card';
import { Event } from '@/types'; // Use the shared type

interface EventListProps {
  events: Event[];
  isLoading: boolean;
}

const EventList: React.FC<EventListProps> = ({ events, isLoading }) => {
  if (isLoading) {
      return <div className="text-center text-gray-500">Loading events...</div>;
  }

  if (!events || events.length === 0) {
    return <p className="text-center text-gray-500 p-8 bg-white rounded-lg shadow-sm">No events found yet. Try searching or ask the AI to create one!</p>;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
};

export default EventList;