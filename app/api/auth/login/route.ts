// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Login API route called');

    const externalUrl = `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`;
    console.log('📤 Forwarding to external API:', externalUrl);

    const response = await fetch(externalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    console.log('📥 External API response status:', response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Login failed:', data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log('✅ Login successful');
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Login proxy error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

