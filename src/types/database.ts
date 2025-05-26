export type Town = {
  id: string;
  name: string;
  tz: string;
};

export type Host = {
  id: string;
  name: string;
  phone_whatsapp: string;
  instagram?: string;
};

export type Location = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type EventOccurrence = {
  start_ts: string; // ISO 8601 string
  end_ts: string | null; // ISO 8601 string or null
};

export type EventLink = {
  url: string;
  text: string;
};

export type Event = {
  id: string;
  title: string;
  description: string;
  price_value: number;
  price_text: string;
  currency: string;
  town: string;
  host: {
    name: string;
    phone_whatsapp: string;
  };
  location: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  tags: string[];
  image_url?: string;
  links: EventLink[];
  recurrence_rule?: string;
  is_on_demand: boolean;
  occurrences: EventOccurrence[];
};

// Database schema types for Supabase
export type Database = {
  public: {
    Tables: {
      towns: {
        Row: Town;
        Insert: Omit<Town, 'id'>;
        Update: Partial<Omit<Town, 'id'>>;
      };
      hosts: {
        Row: Host;
        Insert: Omit<Host, 'id'>;
        Update: Partial<Omit<Host, 'id'>>;
      };
      locations: {
        Row: Location;
        Insert: Omit<Location, 'id'>;
        Update: Partial<Omit<Location, 'id'>>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id'>;
        Update: Partial<Omit<Event, 'id'>>;
      };
    };
  };
}; 