/**
 * 카카오 라우팅 문제 진단 API
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔍 카카오 라우팅 진단 - 요청 수신');
    console.log('요청 데이터:', JSON.stringify(body, null, 2));
    
    const userMessage = body.userRequest?.utterance || '';
    const userId = body.userRequest?.user?.id || '';
    
    return NextResponse.json({
      diagnostic: "카카오 라우팅 진단",
      endpoint: "/api/debug/kakao-routing-test",
      message: `"${userMessage}" 메시지가 이 엔드포인트로 도달했습니다.`,
      userId: userId,
      problem: "날씨 질문이 스킬(/api/kakao/skills/weather-rag)로 라우팅되어 admin 페이지에 표시되지 않음",
      solution: "카카오 i 오픈빌더에서 모든 메시지가 웹훅(/api/kakao/webhook)으로 전달되도록 설정 필요",
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 카카오 라우팅 진단 실패:', error);
    
    return NextResponse.json(
      { 
        error: '라우팅 진단 실패',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
