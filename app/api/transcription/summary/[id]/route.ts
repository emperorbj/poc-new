// app/api/transcription/summary/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both sync and async params (Next.js 13+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const transcriptId = resolvedParams.id;

    console.log('📋 API Route - Received transcript ID:', transcriptId);
    console.log('📋 API Route - Params:', resolvedParams);

    if (!transcriptId || transcriptId === 'undefined' || transcriptId === 'null') {
      console.error('❌ API Route - Missing transcript ID');
      return NextResponse.json(
        { detail: 'Transcript ID is required' },
        { status: 400 }
      );
    }

    // Optional: Get authorization token from headers
    const authHeader = request.headers.get('authorization');

    const url = `${API_BASE_URL}${API_ENDPOINTS.TRANSCRIPTION_SUMMARY}/${transcriptId}`;
    console.log('📤 Fetching summary from:', url);

    const headers: HeadersInit = {
      Accept: 'application/json',
    };

    // Forward authorization if provided
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    // Handle different response types
    if (!response.ok) {
      let error: any;
      try {
        error = await response.json();
      } catch {
        error = { detail: `Failed to fetch summary: ${response.statusText}` };
      }

      console.error('❌ Summary API error:', {
        status: response.status,
        error,
      });

      return NextResponse.json(error, { status: response.status });
    }

    // The API returns a string, so we need to handle it properly
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      // If it's plain text, wrap it in JSON
      const text = await response.text();
      data = text;
    }

    // Return as JSON string if it's a plain string
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Summary proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { detail: 'Internal server error', message: errorMessage },
      { status: 500 }
    );
  }
}

