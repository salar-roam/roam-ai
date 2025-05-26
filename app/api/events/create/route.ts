// app/api/events/create/route.ts
import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';
import { Event } from '@/types'; // Import our new type

export async function POST(req: Request) {
  try {
    const eventData: Partial<Event> = await req.json(); // Use Partial<Event> for incoming data

    console.log("Received data for event creation:", eventData);

    // --- CRITICAL TODO: VALIDATION ---
    // You MUST add server-side validation here.
    // Check for mandatory fields: title, description, host, location, occurrences etc.
    // Check data types. Use a library like Zod for best results.
    if (!eventData.title || !eventData.description || !eventData.host || !eventData.location || !eventData.occurrences) {
        return NextResponse.json({ error: 'Missing mandatory event fields' }, { status: 400 });
    }

    // --- TODO: Handle Town lookup/creation ---
    // Look up town ID based on eventData.town (you need to add 'town' to the input)
    // For now, setting it to null.
    const town_id = null;

    // Prepare data for Supabase (ensure it matches your table structure)
    const dataToInsert = {
       title: eventData.title,
       description: eventData.description,
       price_value: eventData.price_value,
       price_text: eventData.price_text,
       currency: eventData.currency,
       town_id: town_id,
       host: eventData.host,
       location: eventData.location,
       tags: eventData.tags,
       image_url: eventData.image_url,
       links: eventData.links,
       recurrence_rule: eventData.recurrence_rule,
       is_on_demand: eventData.is_on_demand ?? false, // Default value
       occurrences: eventData.occurrences,
    };


    const { data, error } = await supabase
      .from('events')
      .insert([dataToInsert])
      .select() // Use select() to get the inserted data back
      .single(); // Assuming you insert one at a time


    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Supabase Error', details: error.message }, { status: 500 });
    }

    console.log("Event created successfully:", data);

    // --- TODO: Trigger WhatsApp Notification Here ---
    // Call your WhatsApp service/API with the host's phone number.

    return NextResponse.json({ message: 'Event created successfully!', data: data }, { status: 201 });

  } catch (error) {
    console.error('Event creation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to create event', details: errorMessage }, { status: 500 });
  }
}