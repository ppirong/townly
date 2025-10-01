import { NextRequest, NextResponse } from 'next/server';
import { getPendingMessages, processScheduledMessage } from '@/actions/scheduled-messages';

/**
 * 스케줄된 메시지 발송을 위한 크론잡 API
 * 
 * Vercel Cron Jobs나 외부 크론 서비스에서 호출
 * 매분마다 실행되어 발송 예정인 메시지를 확인하고 발송
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🕐 스케줄 메시지 크론잡 실행 시작:', new Date().toISOString());
    
    // 인증 토큰 확인 (보안) - 다른 크론잡과 동일한 환경변수 사용
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;
    
    if (!expectedToken) {
      console.log('❌ 크론잡 시크릿 토큰이 설정되지 않음');
      return NextResponse.json({ error: 'Cron secret token not configured' }, { status: 500 });
    }
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      console.log('❌ 크론잡 인증 실패');
      console.log(`   받은 헤더: ${authHeader}`);
      console.log(`   예상 헤더: Bearer ${expectedToken}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 발송 예정인 메시지들 조회
    const pendingMessages = await getPendingMessages();
    
    if (pendingMessages.length === 0) {
      console.log('📋 발송 예정인 메시지가 없습니다');
      return NextResponse.json({ 
        success: true, 
        message: '발송 예정인 메시지가 없습니다',
        processedCount: 0,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`📤 ${pendingMessages.length}개의 메시지 발송 처리 시작`);
    
    // 각 메시지를 순차적으로 처리
    const results = [];
    for (const message of pendingMessages) {
      try {
        console.log(`📨 메시지 처리 중: ${message.title} (ID: ${message.id})`);
        const result = await processScheduledMessage(message.id);
        results.push({
          messageId: message.id,
          title: message.title,
          success: result.success,
          error: result.error || null,
        });
        
        // 메시지 간 간격 (카카오 API 레이트 리미트 고려)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ 메시지 처리 실패 (${message.id}):`, error);
        results.push({
          messageId: message.id,
          title: message.title,
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log(`✅ 크론잡 완료: 성공 ${successCount}개, 실패 ${failureCount}개`);
    
    return NextResponse.json({
      success: true,
      message: `${pendingMessages.length}개 메시지 처리 완료`,
      processedCount: pendingMessages.length,
      successCount,
      failureCount,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ 크론잡 실행 중 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * POST 요청으로도 수동 실행 가능 (테스트용)
 */
export async function POST(request: NextRequest) {
  try {
    const { messageId } = await request.json();
    
    if (messageId) {
      // 특정 메시지만 즉시 발송
      console.log(`🚀 수동 메시지 발송: ${messageId}`);
      const result = await processScheduledMessage(messageId);
      
      return NextResponse.json({
        success: result.success,
        message: result.success ? '메시지가 성공적으로 발송되었습니다' : '메시지 발송에 실패했습니다',
        error: result.error || null,
        timestamp: new Date().toISOString(),
      });
    } else {
      // 모든 예정된 메시지 발송 (GET과 동일)
      return await GET(request);
    }
    
  } catch (error) {
    console.error('❌ 수동 메시지 발송 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
