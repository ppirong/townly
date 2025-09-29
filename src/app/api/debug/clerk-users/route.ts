import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/nextjs/server';
import { env } from '@/lib/env';

/**
 * Clerk 사용자 목록 디버깅
 * GET /api/debug/clerk-users
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

    console.log('Starting Clerk users debug...');
    
    // Clerk 클라이언트 생성
    const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
    console.log('Clerk client created successfully');
    
    // 사용자 목록 조회
    const response = await clerkClient.users.getUserList({
      limit: 10, // 적은 수로 테스트
    });
    
    console.log('Clerk API response:', response);
    console.log('Response type:', typeof response);
    console.log('Response keys:', Object.keys(response));
    
    // 다양한 방법으로 사용자 배열 추출 시도
    const extractionMethods = {
      direct: response,
      data: response.data,
      users: response.users,
      isArray: Array.isArray(response),
      dataIsArray: Array.isArray(response.data),
    };
    
    console.log('Extraction methods:', extractionMethods);
    
    return NextResponse.json({
      success: true,
      rawResponse: response,
      extractionMethods,
      hasSecretKey: !!env.CLERK_SECRET_KEY,
      secretKeyLength: env.CLERK_SECRET_KEY?.length || 0,
    });

  } catch (error) {
    console.error('Clerk users debug error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
}
