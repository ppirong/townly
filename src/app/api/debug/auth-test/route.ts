import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Server-side auth test started');
    
    const authResult = await auth();
    const userId = authResult.userId;
    
    console.log('👤 Server auth result:', { userId });
    
    return NextResponse.json({
      success: !!userId,
      userId: userId,
      timestamp: new Date().toISOString(),
      message: userId ? 'Server-side authentication successful' : 'Server-side authentication failed',
      debug: {
        authFunctionExists: typeof auth === 'function',
        authResultType: typeof authResult,
        authResultKeys: Object.keys(authResult || {}),
      }
    });
    
  } catch (error) {
    console.error('❌ Server auth test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      message: 'Server-side authentication test failed'
    }, { status: 500 });
  }
}
