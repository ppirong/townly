import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { kakaoMessages, webhookLogs } from '@/db/schema';
import { getChatGPTResponse, generateContextualSystemPrompt, validateAndProcessResponse } from '@/lib/services/openai';

/**
 * 카카오톡 챗봇 스킬 웹훅 엔드포인트
 * POST /api/kakao/webhook
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let statusCode = '200';
  let errorMessage: string | null = null;
  
  try {
    // 요청 본문 읽기
    const body = await request.text();
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const contentType = request.headers.get('content-type') || '';
    
    // 기본 보안 검증
    if (!contentType.includes('application/json')) {
      console.warn('⚠️ 잘못된 Content-Type:', contentType);
    }
    
    // 카카오 i 오픈빌더 User-Agent 검증 (선택사항)
    const isKakaoRequest = userAgent.includes('kakaotalk') || 
                          userAgent.includes('kakao') || 
                          clientIP.includes('kakao') ||
                          request.headers.get('host')?.includes('kakao');
    
    if (!isKakaoRequest && process.env.NODE_ENV === 'production') {
      console.warn('⚠️ 의심스러운 요청 - User-Agent:', userAgent, 'IP:', clientIP);
    }
    
    // 웹훅 로그 저장을 위한 기본 정보
    const logData = {
      method: 'POST',
      url: request.url,
      userAgent,
      requestBody: body,
      requestHeaders: Object.fromEntries(request.headers.entries()),
      ipAddress: clientIP,
      timestamp: new Date(),
    };
    
    if (!body) {
      statusCode = '400';
      errorMessage = 'Request body is empty';
      
      // 에러 로그 저장
      await db.insert(webhookLogs).values({
        ...logData,
        statusCode,
        errorMessage,
        isSuccessful: false,
        processingTime: `${Date.now() - startTime}ms`,
      });
      
      // 카카오톡 챗봇 스킬 에러 응답 형식
      return NextResponse.json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: {
              text: "요청을 처리할 수 없습니다."
            }
          }]
        }
      });
    }

    console.log('📥 카카오 웹훅 요청 수신:', body);

    // JSON 파싱
    let skillRequest;
    try {
      skillRequest = JSON.parse(body);
    } catch (error) {
      console.error('JSON parsing error:', error);
      statusCode = '400';
      errorMessage = 'Invalid JSON';
      
      // JSON 파싱 에러 로그 저장
      await db.insert(webhookLogs).values({
        ...logData,
        statusCode,
        errorMessage,
        isSuccessful: false,
        processingTime: `${Date.now() - startTime}ms`,
      });
      
      // 카카오톡 챗봇 스킬 에러 응답 형식
      return NextResponse.json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: {
              text: "요청 형식이 올바르지 않습니다."
            }
          }]
        }
      });
    }

    console.log('🔍 파싱된 스킬 요청:', skillRequest);

    // 카카오톡 챗봇 스킬 요청 처리
    const userUtterance = skillRequest.userRequest?.utterance;
    const userId = skillRequest.userRequest?.user?.id || 'unknown';
    const messageType = detectMessageType(skillRequest);
    const botId = skillRequest.bot?.id || 'unknown';
    
    // 메시지 내용 검증
    if (!userUtterance || userUtterance.trim() === '') {
      console.warn('⚠️ 빈 메시지 수신:', skillRequest);
      
      // 카카오톡 챗봇 스킬 응답 형식
      return NextResponse.json({
        version: "2.0",
        template: {
          outputs: [{
            simpleText: {
              text: "메시지를 이해할 수 없습니다. 텍스트로 다시 입력해주세요."
            }
          }]
        }
      });
    }
    
    // 봇 ID 검증 (보안 강화)
    const expectedBotId = '68bef0501c4ef66e4f5d73be';
    if (botId !== expectedBotId && process.env.NODE_ENV === 'production') {
      console.warn('⚠️ 잘못된 봇 ID:', botId, '(예상:', expectedBotId, ')');
    }
    
    console.log(`👤 사용자 ${userId}: "${userUtterance}"`);
    
    // ChatGPT를 사용한 챗봇 응답 생성
    const aiResponseStartTime = Date.now();
    const responseResult = await generateAITownlyResponseWithMetadata(userUtterance);
    const aiProcessingTime = `${Date.now() - aiResponseStartTime}ms`;
    
    console.log(`🤖 ${responseResult.type} 응답: "${responseResult.text}"`);
    console.log(`⏱️ AI 응답 생성 시간: ${aiProcessingTime}`);

    try {
      // 메시지와 AI 응답을 데이터베이스에 저장 (개선된 버전)
      const messageRecord = await db.insert(kakaoMessages).values({
        userKey: userId,
        message: userUtterance.trim(),
        messageType: messageType,
        aiResponse: responseResult.text,
        responseType: responseResult.type,
        processingTime: aiProcessingTime,
        channelId: expectedBotId,
        rawData: skillRequest,
        receivedAt: new Date(),
      }).returning({ id: kakaoMessages.id });
      
      console.log('💾 메시지와 AI 응답이 데이터베이스에 저장되었습니다. ID:', messageRecord[0]?.id);
    } catch (dbError) {
      console.error('데이터베이스 저장 오류:', dbError);
      
      // 데이터베이스 오류 상세 로깅
      if (dbError instanceof Error) {
        console.error('DB 에러 상세:', {
          name: dbError.name,
          message: dbError.message,
          stack: dbError.stack
        });
      }
      
      // 데이터베이스 오류가 있어도 웹훅 응답은 성공으로 처리
      // 하지만 로그에 기록하여 추후 분석 가능
    }
    
    const responseText = responseResult.text;
    
    // 카카오톡 챗봇 스킬 응답 형식
    const skillResponse = {
      version: "2.0",
      template: {
        outputs: [{
          simpleText: {
            text: responseText
          }
        }]
      }
    };

    // 성공 로그 저장
    await db.insert(webhookLogs).values({
      method: 'POST',
      url: request.url,
      userAgent: request.headers.get('user-agent') || 'unknown',
      requestBody: body,
      requestHeaders: Object.fromEntries(request.headers.entries()),
      statusCode: '200',
      responseBody: JSON.stringify(skillResponse),
      processingTime: `${Date.now() - startTime}ms`,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      isSuccessful: true,
      timestamp: new Date(),
    });

    console.log('✅ 카카오톡 챗봇 응답 전송 완료');
    
    // 카카오톡 챗봇 스킬에 응답 전송
    return NextResponse.json(skillResponse);

  } catch (error) {
    console.error('웹훅 처리 중 오류:', error);
    
    // 에러 로그 저장
    try {
      await db.insert(webhookLogs).values({
        method: 'POST',
        url: request.url,
        userAgent: request.headers.get('user-agent') || 'unknown',
        requestBody: 'Error reading request body',
        requestHeaders: Object.fromEntries(request.headers.entries()),
        statusCode: '500',
        responseBody: JSON.stringify({ error: 'Internal server error' }),
        processingTime: `${Date.now() - startTime}ms`,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        isSuccessful: false,
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error('로그 저장 중 오류:', logError);
    }
    
    // 카카오톡 챗봇 스킬 에러 응답
    return NextResponse.json({
      version: "2.0",
      template: {
        outputs: [{
          simpleText: {
            text: "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
          }
        }]
      }
    });
  }
}

/**
 * GET 요청 처리 (헬스체크용)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const responseData = {
      status: 'healthy',
      service: 'Townly Kakao Webhook',
      timestamp: new Date().toISOString(),
    };

    // GET 요청 로그 저장
    await db.insert(webhookLogs).values({
      method: 'GET',
      url: request.url,
      userAgent: request.headers.get('user-agent') || 'unknown',
      requestBody: null,
      requestHeaders: Object.fromEntries(request.headers.entries()),
      statusCode: '200',
      responseBody: JSON.stringify(responseData),
      processingTime: `${Date.now() - startTime}ms`,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      isSuccessful: true,
      timestamp: new Date(),
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('GET 요청 처리 중 오류:', error);
    
    // GET 요청 에러 로그 저장
    try {
      await db.insert(webhookLogs).values({
        method: 'GET',
        url: request.url,
        userAgent: request.headers.get('user-agent') || 'unknown',
        requestBody: null,
        requestHeaders: Object.fromEntries(request.headers.entries()),
        statusCode: '500',
        responseBody: JSON.stringify({ error: 'Internal server error' }),
        processingTime: `${Date.now() - startTime}ms`,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        isSuccessful: false,
        timestamp: new Date(),
      });
    } catch (logError) {
      console.error('GET 요청 로그 저장 중 오류:', logError);
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 메시지 타입 감지 함수
 */
function detectMessageType(skillRequest: any): string {
  // 메시지 타입 분석
  const utterance = skillRequest.userRequest?.utterance || '';
  const params = skillRequest.userRequest?.params || {};
  
  // 이미지 메시지 감지
  if (params.imageUrl || utterance.includes('[이미지]')) {
    return 'image';
  }
  
  // URL 포함 메시지 감지
  if (utterance.includes('http://') || utterance.includes('https://')) {
    return 'url';
  }
  
  // 전화번호 패턴 감지
  if (/\d{2,3}-\d{3,4}-\d{4}/.test(utterance)) {
    return 'phone';
  }
  
  // 이메일 패턴 감지
  if (/@/.test(utterance) && utterance.includes('.')) {
    return 'email';
  }
  
  // 기본값은 텍스트
  return 'text';
}

/**
 * ChatGPT를 사용한 Townly 챗봇 응답 생성 함수 (메타데이터 포함)
 */
async function generateAITownlyResponseWithMetadata(userMessage: string): Promise<{text: string, type: string}> {
  try {
    // 빈 메시지나 특수 문자만 있는 경우 기본 처리
    const trimmedMessage = userMessage.trim();
    if (!trimmedMessage || trimmedMessage.length < 2) {
      return {
        text: `안녕하세요! 🏘️ Townly입니다.

무엇을 도와드릴까요? 구체적인 질문을 해주시면 더 정확한 답변을 드릴 수 있어요! 😊`,
        type: 'default'
      };
    }

    // 메시지 유형에 따른 컨텍스트 생성
    const systemPrompt = generateContextualSystemPrompt(userMessage);
    
    // ChatGPT API 호출
    const chatGPTResponse = await getChatGPTResponse(userMessage, systemPrompt);
    
    // 응답 검증 및 후처리
    const finalResponse = validateAndProcessResponse(chatGPTResponse);
    
    return {
      text: finalResponse,
      type: 'chatgpt'
    };
    
  } catch (error) {
    console.error('ChatGPT 응답 생성 중 오류:', error);
    
    // ChatGPT 실패 시 기본 응답으로 폴백
    const fallbackResponse = generateFallbackResponse(userMessage);
    return {
      text: fallbackResponse,
      type: 'fallback'
    };
  }
}

/**
 * ChatGPT를 사용한 Townly 챗봇 응답 생성 함수 (하위 호환성)
 */
async function generateAITownlyResponse(userMessage: string): Promise<string> {
  const result = await generateAITownlyResponseWithMetadata(userMessage);
  return result.text;
}

/**
 * ChatGPT 실패 시 사용할 기본 응답 함수
 */
function generateFallbackResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase().trim();
  
  // 맛집 관련 질문인 경우
  if (lowerMessage.includes('맛집') || lowerMessage.includes('음식') || lowerMessage.includes('식당')) {
    return `🍽️ 맛집 정보를 찾고 계시는군요!

더 정확한 추천을 위해 지역을 알려주세요:
• "강남역 맛집 추천해줘"
• "홍대 카페 어디가 좋을까?"
• "명동 점심 메뉴 추천"

어떤 지역의 맛집을 찾으시나요? 😊`;
  }
  
  // 인사말 처리
  if (lowerMessage.includes('안녕') || lowerMessage.includes('처음') || lowerMessage.includes('시작')) {
    return `안녕하세요! 🏘️ Townly입니다.

저는 하이퍼 로컬 정보 에이전트로, 다음과 같은 도움을 드릴 수 있어요:

🍽️ **맛집 추천** - 지역별 맛집과 카페 정보
📍 **동네 정보** - 편의시설, 교통, 주변 정보  
🌤️ **생활 정보** - 날씨, 교통상황 등

구체적인 질문을 해주시면 더 정확한 정보를 드릴 수 있어요! 😊`;
  }
  
  // 기본 응답
  return `안녕하세요! 🏘️ Townly입니다.

현재 AI 서비스 처리 중 일시적인 문제가 발생했습니다.

다음과 같은 도움을 드릴 수 있어요:
• 맛집이나 카페 추천
• 주변 편의시설 정보  
• 교통 정보
• 동네 소식

💡 **팁**: 지역명과 함께 질문하시면 더 정확한 정보를 드릴 수 있어요!

궁금한 것이 있으시면 언제든 물어보세요! 😊`;
}
