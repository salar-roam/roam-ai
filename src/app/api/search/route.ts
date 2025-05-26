import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const town = searchParams.get('town')

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    let searchQuery = supabase
      .from('events')
      .select('*')
      .textSearch('title', query)

    if (town) {
      searchQuery = searchQuery.eq('town', town)
    }

    const { data, error } = await searchQuery.limit(10)

    if (error) {
      console.error('[Search API Error]', error)
      return NextResponse.json(
        { error: 'Failed to search events' },
        { status: 500 }
      )
    }

    return NextResponse.json({ results: data })
  } catch (error) {
    console.error('[Search API Error]', error)
    const errorMessage = error instanceof Error ? error.message : 'An internal error occurred.'
    return NextResponse.json(
      { error: 'Failed to process search request', details: errorMessage },
      { status: 500 }
    )
  }
} 