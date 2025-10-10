import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProductInfo } from '@/lib/utils/ocr-analysis';

// Claude API 요청을 위한 인터페이스
interface ClaudeRequest {
  model: string;
  messages: {
    role: string;
    content: {
      type: string;
      text?: string;
      source?: {
        type: string;
        media_type: string;
        data: string;
      };
    }[];
  }[];
  max_tokens: number;
}

export async function POST(req: Request) {
  try {
    // 인증 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, message: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    // 요청 데이터 파싱
    const { image, prompt } = await req.json();
    
    if (!image || !prompt) {
      return NextResponse.json({ success: false, message: '이미지와 프롬프트가 필요합니다.' }, { status: 400 });
    }

    // 이미지 데이터 처리 (base64 형식에서 필요한 부분만 추출)
    const base64Data = image.split(',')[1] || image;

    // Claude API 요청 구성
    const apiUrl = 'https://api.anthropic.com/v1/messages';
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'API 키가 설정되지 않았습니다. ANTHROPIC_API_KEY 또는 CLAUDE_API_KEY를 환경변수에 설정해주세요.' }, { status: 500 });
    }

    const claudeRequest: ClaudeRequest = {
      model: 'claude-3-5-sonnet-20240620',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Data
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ],
      max_tokens: 1024
    };

    // Claude API 호출
    const claudeResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(claudeRequest)
    });

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.json();
      console.error('Claude API 오류:', errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Claude API 오류: ${errorData.error?.message || claudeResponse.statusText}` 
      }, { status: claudeResponse.status });
    }

    // Claude 응답 처리
    const claudeData = await claudeResponse.json();
    const responseText = claudeData.content?.[0]?.text || '';

    // JSON 데이터 추출
    let products: ProductInfo[] = [];
    try {
      // JSON 형식 응답 추출 (정규식으로 JSON 부분 찾기)
      const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
      if (jsonMatch) {
        products = JSON.parse(jsonMatch[0]);
      } else {
        // 응답에서 JSON 형식이 없는 경우 텍스트 기반으로 파싱 시도
        const lines = responseText.split('\n').filter(line => line.includes(':'));
        products = lines.map(line => {
          const [name, price] = line.split(':').map(part => part.trim());
          return { name, price };
        });
      }
    } catch (error) {
      console.error('Claude 응답 파싱 오류:', error);
      return NextResponse.json({ 
        success: false, 
        message: '상품 정보 파싱에 실패했습니다.', 
        rawResponse: responseText 
      }, { status: 500 });
    }

    // 결과 반환
    return NextResponse.json({ 
      success: true, 
      data: products,
      message: '이미지 분석이 완료되었습니다.' 
    });

  } catch (error) {
    console.error('이미지 분석 중 오류 발생:', error);
    return NextResponse.json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}
