// pages/api/publish.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase'; // Adjust path if necessary

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const eventData = req.body.event; // Expecting the full event JSON

  if (!eventData) {
    return res.status(400).json({ message: 'Missing event data in request body' });
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .insert([eventData]); // Insert the event data into the 'events' table

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ message: 'Failed to publish event', error: error.message });
    }

    return res.status(200).json({ message: 'Event published successfully!', data: data });
  } catch (error: any) {
    console.error('Server error publishing event:', error);
    res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
}