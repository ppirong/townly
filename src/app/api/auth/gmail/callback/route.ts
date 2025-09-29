import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { env } from '@/lib/env';
import { auth } from '@clerk/nextjs/server';

/**
 * Gmail OAuth 콜백 처리
 * POST /api/auth/gmail/callback
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // OAuth 클라이언트 설정
    const oauth2Client = new google.auth.OAuth2(
      env.GMAIL_CLIENT_ID,
      env.GMAIL_CLIENT_SECRET,
      env.GMAIL_REDIRECT_URI
    );

    // Authorization code를 토큰으로 교환
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      return NextResponse.json(
        { success: false, error: 'Refresh token not received. Please revoke access and try again.' },
        { status: 400 }
      );
    }

    // 토큰으로 사용자 정보 확인
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const userEmail = profile.data.emailAddress;

      // 성공적으로 토큰을 받았으므로 환경변수 형태로 출력
      // 실제 운영에서는 데이터베이스나 보안 저장소에 저장해야 함
      console.log('\n🎉 Gmail API 인증 성공!');
      console.log('📧 연결된 계정:', userEmail);
      console.log('\n📋 환경변수 설정:');
      console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token);
      if (tokens.access_token) {
        console.log('GMAIL_ACCESS_TOKEN=' + tokens.access_token);
      }
      console.log('GMAIL_FROM_EMAIL=' + userEmail);
      console.log('\n⚠️  이 토큰들을 .env.local 파일에 추가하세요!\n');

      return NextResponse.json({
        success: true,
        message: 'Gmail 인증이 완료되었습니다',
        email: userEmail,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        expiresIn: tokens.expiry_date,
        instructions: '콘솔에 출력된 환경변수를 .env.local 파일에 추가하세요'
      });

    } catch (profileError) {
      console.error('Gmail profile fetch error:', profileError);
      return NextResponse.json(
        { success: false, error: 'Failed to verify Gmail account' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Gmail callback error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Token exchange failed' },
      { status: 500 }
    );
  }
}
