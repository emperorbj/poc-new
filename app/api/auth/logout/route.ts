// app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    // API expects refresh_token as query parameter
    const { searchParams } = new URL(request.url);
    const refreshToken = searchParams.get('refresh_token');

    if (!refreshToken) {
      return NextResponse.json(
        { detail: 'refresh_token is required' },
        { status: 400 }
      );
    }

    // Build URL with query parameter
    const url = new URL(`${API_BASE_URL}${API_ENDPOINTS.LOGOUT}`);
    url.searchParams.append('refresh_token', refreshToken);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Logout proxy error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

