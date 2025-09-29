import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { env } from '@/lib/env';

/**
 * Gmail OAuth 설정 디버깅
 * GET /api/debug/gmail-config
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const config = {
      GMAIL_CLIENT_ID: env.GMAIL_CLIENT_ID || 'NOT_SET',
      GMAIL_CLIENT_SECRET: env.GMAIL_CLIENT_SECRET ? 'SET' : 'NOT_SET',
      GMAIL_REDIRECT_URI: env.GMAIL_REDIRECT_URI || 'NOT_SET',
      GMAIL_REFRESH_TOKEN: env.GMAIL_REFRESH_TOKEN ? 'SET' : 'NOT_SET',
      GMAIL_ACCESS_TOKEN: env.GMAIL_ACCESS_TOKEN ? 'SET' : 'NOT_SET',
      GMAIL_FROM_EMAIL: env.GMAIL_FROM_EMAIL || 'NOT_SET',
      NEXT_PUBLIC_GMAIL_CLIENT_ID: env.NEXT_PUBLIC_GMAIL_CLIENT_ID || 'NOT_SET',
    };

    console.log('Gmail OAuth Configuration:', config);

    return NextResponse.json({
      config,
      origin: request.nextUrl.origin,
      expectedRedirectUri: `${request.nextUrl.origin}/auth/gmail/callback`,
      currentRedirectUri: env.GMAIL_REDIRECT_URI,
      isMatch: env.GMAIL_REDIRECT_URI === `${request.nextUrl.origin}/auth/gmail/callback`,
    });

  } catch (error) {
    console.error('Gmail config debug error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
