// types/index.ts

// Defines the structure for an Event, based on your JSON
export type Event = {
    id: string;
    title: string;
    description: string;
    price_value: number | null;
    price_text: string | null;
    currency: string | null;
    town_id: string | null; // We'll store the ID, but might need town name too
    host: {
      name: string;
      phone_whatsapp: string;
      instagram?: string;
    };
    location: {
      name: string;
      address: string;
      lat: number;
      lng: number;
    };
    tags: string[] | null;
    image_url: string | null;
    links: { url: string; text: string }[] | null;
    recurrence_rule: string | null;
    is_on_demand: boolean;
    occurrences: {
      start_ts: string; // ISO 8601 string
      end_ts?: string | null; // ISO 8601 string or null
    }[];
    created_at: string;
  };
  
  // You can add other types here as needed