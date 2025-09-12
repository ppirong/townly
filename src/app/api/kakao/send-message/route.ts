import { NextRequest, NextResponse } from 'next/server';

/**
 * 카카오 채널로 메시지 전송 API
 * POST /api/kakao/send-message
 */
export async function POST(request: NextRequest) {
  try {
    const { message, recipient } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('📤 카카오 채널로 메시지 전송 시도:', {
      message,
      recipient: recipient || 'default_channel',
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

    // 실제 카카오톡 비즈니스 API 호출은 복잡한 인증과 설정이 필요하므로
    // 여기서는 웹훅으로 시뮬레이션하여 챗봇으로 메시지를 전송합니다.
    
    // 카카오 채널로 메시지가 전송된 것처럼 시뮬레이션 (개선된 버전)
    const simulatedWebhookData = {
      intent: {
        id: "cursor_message_intent",
        name: "커서메시지"
      },
      userRequest: {
        timezone: "Asia/Seoul",
        params: {
          ignoreMe: "true"
        },
        block: {
          id: "cursor_block",
          name: "커서 블록"
        },
        utterance: cleanMessage,
        lang: null,
        user: {
          id: "cursor_user_simulation",
          type: "accountId",
          properties: {
            source: "cursor_ide",
            simulatedMessage: true
          }
        }
      },
      bot: {
        id: "68bef0501c4ef66e4f5d73be",
        name: "townly"
      },
      action: {
        name: "커서메시지처리",
        clientExtra: null,
        params: {},
        id: "cursor_action",
        detailParams: {}
      }
    };

    // 로컬 웹훅으로 시뮬레이션된 메시지 전송 (개선된 버전)
    const webhookUrl = process.env.NODE_ENV === 'production' 
      ? `https://${request.headers.get('host')}/api/kakao/webhook`
      : 'http://localhost:3000/api/kakao/webhook';
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Townly-Internal-Test'
      },
      body: JSON.stringify(simulatedWebhookData)
    });

    if (!webhookResponse.ok) {
      throw new Error(`웹훅 호출 실패: ${webhookResponse.status} ${webhookResponse.statusText}`);
    }

    const webhookResult = await webhookResponse.json();

    console.log('✅ 시뮬레이션된 메시지 처리 완료');

    return NextResponse.json({
      success: true,
      message: '메시지가 성공적으로 카카오 채널에 전송되었습니다 (시뮬레이션)',
      sentMessage: message,
      timestamp: new Date().toISOString(),
      webhookResponse: webhookResult,
      note: '실제 카카오 채널에는 표시되지 않지만, 웹훅을 통해 챗봇으로 메시지가 전달되어 관리자 페이지에서 확인할 수 있습니다.'
    });

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
 * GET 요청 처리 (API 정보 제공)
 */
export async function GET() {
  return NextResponse.json({
    service: 'Kakao Message Sender',
    description: '카카오 채널로 메시지를 전송하는 API',
    usage: {
      method: 'POST',
      endpoint: '/api/kakao/send-message',
      body: {
        message: 'string (required) - 전송할 메시지',
        recipient: 'string (optional) - 수신자 정보'
      }
    },
    example: {
      message: '커서에서 보내는 문자입니다',
      recipient: 'townly_channel'
    }
  });
}
