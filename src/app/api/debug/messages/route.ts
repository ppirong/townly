import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { kakaoMessages, webhookLogs } from '@/db/schema';
import { desc } from 'drizzle-orm';

/**
 * 디버깅용 메시지 조회 API
 */
export async function GET() {
  try {
    console.log('🔍 디버깅: 데이터베이스에서 메시지 조회 중...');
    
    // 카카오 메시지 조회
    const messages = await db
      .select({
        id: kakaoMessages.id,
        userKey: kakaoMessages.userKey,
        message: kakaoMessages.message,
        messageType: kakaoMessages.messageType,
        receivedAt: kakaoMessages.receivedAt,
        isRead: kakaoMessages.isRead,
        createdAt: kakaoMessages.createdAt,
      })
      .from(kakaoMessages)
      .orderBy(desc(kakaoMessages.receivedAt))
      .limit(10);
    
    console.log(`📱 발견된 메시지 수: ${messages.length}`);
    
    // 웹훅 로그 조회
    const logs = await db
      .select({
        id: webhookLogs.id,
        method: webhookLogs.method,
        url: webhookLogs.url,
        statusCode: webhookLogs.statusCode,
        isSuccessful: webhookLogs.isSuccessful,
        errorMessage: webhookLogs.errorMessage,
        timestamp: webhookLogs.timestamp,
        processingTime: webhookLogs.processingTime,
        requestBody: webhookLogs.requestBody,
      })
      .from(webhookLogs)
      .orderBy(desc(webhookLogs.timestamp))
      .limit(10);
    
    console.log(`🔗 발견된 웹훅 로그 수: ${logs.length}`);
    
    return NextResponse.json({
      success: true,
      data: {
        messages: messages.map(msg => ({
          ...msg,
          receivedAt: msg.receivedAt.toISOString(),
          createdAt: msg.createdAt.toISOString(),
        })),
        webhookLogs: logs.map(log => ({
          ...log,
          timestamp: log.timestamp.toISOString(),
        })),
        counts: {
          totalMessages: messages.length,
          totalLogs: logs.length,
        },
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ 디버깅 API 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
