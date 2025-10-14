import { ProductInfo } from './ocr-analysis';

/**
 * Claude API를 사용하여 이미지에서 상품명과 가격 정보를 추출하는 함수
 */
export async function analyzeImageWithClaude(imageBase64: string): Promise<ProductInfo[]> {
  try {
    // API 요청 준비
    const apiUrl = '/api/claude/analyze-image';
    
    // 이미지 데이터 전송
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        image: imageBase64,
        prompt: "이 할인 전단지 이미지에서 상품명과 가격을 추출해주세요. 각 상품에 대해 상품명과 가격을 정확하게 식별하고, JSON 형식으로 반환해주세요. 특히 상품명 뒤에 표시된 수량 정보(예: 1통, 2kg, 4개, 1팩, 2마리, 600g, 100g 등)를 상품명의 일부로 포함해주세요. 예시 형식: [{\"name\": \"사과 4개\", \"price\": \"1,000원\"}, {\"name\": \"바나나 1송이\", \"price\": \"2,500원\"}]. 다음은 정확한 인식이 필요한 예시입니다: '단호박' → '단호박 1통', '샤인머스켓' → '샤인머스켓 2kg', '황금사과' → '황금사과 4개', '골드키위' → '골드키위 1팩', '제주은갈치' → '제주은갈치 2마리', '한돈암돼지 생삼겹살' → '한돈암돼지 생삼겹살 600g', '한우1+등급이상 꽃등심' → '한우1+등급이상 꽃등심 100g'"
      }),
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.message || '이미지 분석에 실패했습니다.');
    }

    return result.data as ProductInfo[];
  } catch (error) {
    console.error('Claude를 통한 이미지 분석 중 오류 발생:', error);
    throw new Error('이미지 분석 중 오류가 발생했습니다.');
  }
}
