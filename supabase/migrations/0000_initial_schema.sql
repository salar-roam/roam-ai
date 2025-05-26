-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create towns table if it doesn't exist
DO $$ BEGIN
    CREATE TABLE IF NOT EXISTS towns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        tz TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
EXCEPTION
    WHEN duplicate_table THEN
        NULL;
END $$;

-- Create hosts table if it doesn't exist
DO $$ BEGIN
    CREATE TABLE IF NOT EXISTS hosts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        phone_whatsapp TEXT NOT NULL,
        instagram TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
EXCEPTION
    WHEN duplicate_table THEN
        NULL;
END $$;

-- Create locations table if it doesn't exist
DO $$ BEGIN
    CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
EXCEPTION
    WHEN duplicate_table THEN
        NULL;
END $$;

-- Create events table if it doesn't exist
DO $$ BEGIN
    CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        price_value DECIMAL(10,2) NOT NULL,
        price_text TEXT NOT NULL,
        currency TEXT NOT NULL,
        town UUID NOT NULL REFERENCES towns(id),
        host UUID NOT NULL REFERENCES hosts(id),
        location UUID NOT NULL REFERENCES locations(id),
        tags TEXT[] DEFAULT '{}',
        image_url TEXT,
        links JSONB DEFAULT '[]'::jsonb,
        recurrence_rule TEXT,
        is_on_demand BOOLEAN DEFAULT false,
        occurrences JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
EXCEPTION
    WHEN duplicate_table THEN
        NULL;
END $$;

-- Create indexes if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'events_title_idx') THEN
        CREATE INDEX events_title_idx ON events USING GIN (to_tsvector('english', title));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'events_description_idx') THEN
        CREATE INDEX events_description_idx ON events USING GIN (to_tsvector('english', description));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'events_tags_idx') THEN
        CREATE INDEX events_tags_idx ON events USING GIN (tags);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'events_town_idx') THEN
        CREATE INDEX events_town_idx ON events(town);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'events_host_idx') THEN
        CREATE INDEX events_host_idx ON events(host);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'events_location_idx') THEN
        CREATE INDEX events_location_idx ON events(location);
    END IF;
END $$;

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE towns ENABLE ROW LEVEL SECURITY;
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access on towns" ON towns;
DROP POLICY IF EXISTS "Allow public read access on hosts" ON hosts;
DROP POLICY IF EXISTS "Allow public read access on locations" ON locations;
DROP POLICY IF EXISTS "Allow public read access on events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to insert events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to update their events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to delete their events" ON events;

-- Create policies for public read access
CREATE POLICY "Allow public read access on towns" ON towns
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access on hosts" ON hosts
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access on locations" ON locations
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access on events" ON events
    FOR SELECT USING (true);

-- Create policies for authenticated write access
CREATE POLICY "Allow authenticated users to insert events" ON events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update their events" ON events
    FOR UPDATE USING (auth.uid() = host);

CREATE POLICY "Allow authenticated users to delete their events" ON events
    FOR DELETE USING (auth.uid() = host); 