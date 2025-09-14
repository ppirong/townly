import { NextRequest, NextResponse } from 'next/server';
import { sendKakaoBroadcast, sendKakaoAlimtalk, getKakaoWalletInfo } from '@/lib/services/kakao-business';
import { env } from '@/lib/env';

/**
 * 카카오 채널로 메시지 전송 API
 * POST /api/kakao/send-message
 */
export async function POST(request: NextRequest) {
  try {
    const { message, recipient, messageType, templateId, templateArgs } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('📤 카카오 채널로 메시지 전송 시도:', {
      message,
      recipient: recipient || 'broadcast',
      messageType: messageType || 'text',
      timestamp: new Date().toISOString()
    });

    // 메시지 검증 및 처리
    const cleanMessage = message.trim();
    if (cleanMessage.length > 1000) {
      return NextResponse.json(
        { error: '메시지가 너무 깁니다 (최대 1000자)' },
        { status: 400 }
      );
    }

    // 월렛 잔액 확인
    let walletInfo;
    try {
      walletInfo = await getKakaoWalletInfo();
      console.log('💰 카카오 월렛 잔액:', walletInfo.balance, 'KRW');
    } catch (error) {
      console.error('월렛 정보 조회 실패:', error);
      // 월렛 정보를 가져오지 못해도 시뮬레이션 모드로 계속 진행
    }

    let result;

    // 메시지 유형에 따라 다른 API 호출
    if (templateId) {
      // 알림톡 발송
      console.log('📨 알림톡 발송 모드');
      result = await sendKakaoAlimtalk(cleanMessage, templateId, undefined, templateArgs);
    } else {
      // 브로드캐스트 메시지 발송
      console.log('📢 브로드캐스트 발송 모드');
      result = await sendKakaoBroadcast(cleanMessage);
    }

    if (result.success) {
      console.log('✅ 카카오 메시지 발송 성공:', {
        messageId: result.messageId,
        sentCount: result.sentCount,
        cost: result.cost
      });

      return NextResponse.json({
        success: true,
        message: '메시지가 성공적으로 카카오 채널에 전송되었습니다',
        messageId: result.messageId,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        cost: result.cost,
        walletBalance: walletInfo?.balance,
        timestamp: new Date().toISOString(),
        mode: env.KAKAO_ADMIN_KEY ? 'production' : 'simulation'
      });
    } else {
      console.error('❌ 카카오 메시지 발송 실패:', result.error);

      return NextResponse.json({
        success: false,
        error: result.error,
        sentCount: result.sentCount || 0,
        failedCount: result.failedCount || 1,
        cost: result.cost || 0,
        walletBalance: walletInfo?.balance,
        timestamp: new Date().toISOString(),
        mode: env.KAKAO_ADMIN_KEY ? 'production' : 'simulation'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ 메시지 전송 중 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET 요청 처리 (API 정보 및 월렛 상태 제공)
 */
export async function GET() {
  try {
    // 월렛 정보 조회
    let walletInfo;
    let apiStatus = 'simulation';
    
    try {
      walletInfo = await getKakaoWalletInfo();
      if (env.KAKAO_ADMIN_KEY) {
        apiStatus = 'development'; // 실제 API 키는 있지만 아직 실제 연동 전 단계
      }
    } catch (error) {
      console.error('월렛 정보 조회 실패:', error);
      apiStatus = 'simulation'; // 에러 발생 시도 시뮬레이션으로 처리
    }

    return NextResponse.json({
      service: 'Kakao Business Message API',
      description: '카카오 채널로 브로드캐스트 메시지 및 알림톡을 전송하는 API',
      status: {
        api: apiStatus,
        wallet: walletInfo ? {
          balance: walletInfo.balance,
          currency: walletInfo.currency,
          lastUpdated: walletInfo.lastUpdated
        } : null,
        configuredKeys: {
          adminKey: !!env.KAKAO_ADMIN_KEY,
          channelId: !!env.KAKAO_CHANNEL_ID,
          senderKey: !!env.KAKAO_SENDER_KEY,
        }
      },
      usage: {
        method: 'POST',
        endpoint: '/api/kakao/send-message',
        body: {
          message: 'string (required) - 전송할 메시지',
          messageType: 'string (optional) - text, image, template',
          templateId: 'string (optional) - 알림톡 템플릿 ID',
          templateArgs: 'object (optional) - 템플릿 변수',
          recipient: 'string (optional) - 수신자 정보 (미래 확장용)'
        }
      },
      examples: {
        broadcast: {
          message: '🏘️ Townly 서비스 안내: 오늘의 날씨와 미세먼지 정보를 확인하세요!'
        },
        alimtalk: {
          message: '안녕하세요, {{name}}님! 오늘의 날씨는 {{weather}}입니다.',
          templateId: 'townly_weather_001',
          templateArgs: {
            name: '홍길동',
            weather: '맑음'
          }
        }
      },
      pricing: {
        broadcast: '15원/건',
        alimtalk: '8원/건',
        note: '시뮬레이션 모드에서는 비용이 발생하지 않습니다.'
      }
    });
  } catch (error) {
    return NextResponse.json({
      service: 'Kakao Business Message API',
      status: 'error',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
