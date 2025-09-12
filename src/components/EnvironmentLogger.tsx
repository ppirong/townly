'use client';

import { useEffect } from 'react';

/**
 * 클라이언트 사이드에서 환경 정보를 로깅하는 컴포넌트
 */
export default function EnvironmentLogger() {
  useEffect(() => {
    // 클라이언트에서는 기본적인 정보만 로깅
    console.log('🌐 Client Environment Info:');
    console.log(`📍 NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🔗 Current URL: ${window.location.origin}`);
    
    // 현재 URL이 예상된 URL과 일치하는지 확인
    const expectedUrls = {
      production: 'https://townly.vercel.app',
      development: 'http://localhost:3000'
    };
    
    const currentUrl = window.location.origin;
    const isProduction = process.env.NODE_ENV === 'production';
    const expectedUrl = isProduction ? expectedUrls.production : expectedUrls.development;
    
    if (currentUrl === expectedUrl) {
      console.log('✅ URL matches expected environment');
    } else {
      console.warn(`⚠️ URL mismatch - Expected: ${expectedUrl}, Current: ${currentUrl}`);
    }
  }, []);

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null;
}
