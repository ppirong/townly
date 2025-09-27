/**
 * 최근 카카오 메시지 확인 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { kakaoMessages } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 최근 카카오 메시지 조회 시작');
    
    // 최근 10개 메시지 조회
    const recentMessages = await db
      .select({
        id: kakaoMessages.id,
        userKey: kakaoMessages.userKey,
        message: kakaoMessages.message,
        aiResponse: kakaoMessages.aiResponse,
        responseType: kakaoMessages.responseType,
        processingTime: kakaoMessages.processingTime,
        receivedAt: kakaoMessages.receivedAt,
        createdAt: kakaoMessages.createdAt
      })
      .from(kakaoMessages)
      .orderBy(desc(kakaoMessages.createdAt))
      .limit(10);

    console.log(`📊 조회된 메시지 수: ${recentMessages.length}`);

    return NextResponse.json({
      success: true,
      count: recentMessages.length,
      messages: recentMessages.map(msg => ({
        id: msg.id.substring(0, 8) + '...',
        userKey: msg.userKey,
        message: msg.message,
        aiResponsePreview: msg.aiResponse?.substring(0, 100) + '...',
        responseType: msg.responseType,
        processingTime: msg.processingTime,
        receivedAt: msg.receivedAt,
        minutesAgo: Math.round((Date.now() - new Date(msg.createdAt).getTime()) / (1000 * 60))
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 최근 메시지 조회 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '최근 메시지 조회 실패',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
