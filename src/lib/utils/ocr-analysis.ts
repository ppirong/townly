import Tesseract from 'tesseract.js';

export interface ProductInfo {
  name: string;
  price: string;
}

/**
 * OCR을 사용하여 이미지에서 텍스트를 추출하는 함수
 */
export async function extractTextFromImage(imageFile: File): Promise<string> {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imageFile,
      'kor+eng', // 한국어 + 영어 인식
      {
        logger: m => console.log('OCR 진행률:', m)
      }
    );
    
    return text;
  } catch (error) {
    console.error('OCR 분석 중 오류 발생:', error);
    throw new Error('이미지에서 텍스트를 추출하는데 실패했습니다.');
  }
}

/**
 * 추출된 텍스트에서 상품명과 가격을 파싱하는 함수
 */
export function parseProductsFromText(text: string): ProductInfo[] {
  const products: ProductInfo[] = [];
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // 가격 패턴 (원, 천원, 만원 등)
  const pricePattern = /(\d{1,3}(?:,\d{3})*)\s*(?:원|천원|만원|₩)/g;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 가격이 포함된 라인 찾기
    const priceMatches = Array.from(trimmedLine.matchAll(pricePattern));
    
    if (priceMatches.length > 0) {
      // 가격 앞의 텍스트를 상품명으로 추정
      const priceMatch = priceMatches[0];
      const priceIndex = priceMatch.index || 0;
      
      let productName = trimmedLine.substring(0, priceIndex).trim();
      const price = priceMatch[0];
      
      // 상품명이 너무 짧거나 비어있으면 전체 라인에서 가격 부분만 제거
      if (productName.length < 2) {
        productName = trimmedLine.replace(pricePattern, '').trim();
      }
      
      // 유효한 상품명이 있는 경우에만 추가
      if (productName.length >= 2) {
        products.push({
          name: productName,
          price: price
        });
      }
    }
  }
  
  // 중복 제거 (상품명 기준)
  const uniqueProducts = products.filter((product, index, self) => 
    index === self.findIndex(p => p.name === product.name)
  );
  
  return uniqueProducts;
}

/**
 * 이미지 OCR 분석 및 상품 정보 추출 (통합 함수)
 */
export async function analyzeImageForProducts(imageFile: File): Promise<ProductInfo[]> {
  try {
    console.log('OCR 분석 시작...');
    const extractedText = await extractTextFromImage(imageFile);
    console.log('추출된 텍스트:', extractedText);
    
    const products = parseProductsFromText(extractedText);
    console.log('파싱된 상품 정보:', products);
    
    return products;
  } catch (error) {
    console.error('이미지 분석 중 오류 발생:', error);
    throw error;
  }
}
