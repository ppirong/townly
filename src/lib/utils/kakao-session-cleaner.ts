/**
 * 카카오 세션 정리 유틸리티
 * 브라우저의 카카오 관련 쿠키와 세션을 정리합니다.
 */

export interface KakaoSessionCleanResult {
  success: boolean;
  message: string;
  clearedItems: string[];
}

/**
 * 카카오 관련 쿠키와 세션을 정리하는 함수
 */
export async function clearKakaoSession(): Promise<KakaoSessionCleanResult> {
  const clearedItems: string[] = [];
  
  try {
    console.log('🧹 카카오 세션 정리 시작...');
    
    // 1. 로컬 스토리지에서 카카오 관련 항목 정리
    if (typeof window !== 'undefined' && window.localStorage) {
      const localStorageKeys = Object.keys(localStorage);
      const kakaoLocalKeys = localStorageKeys.filter(key => 
        key.toLowerCase().includes('kakao') || 
        key.toLowerCase().includes('kauth') ||
        key.toLowerCase().includes('oauth')
      );
      
      kakaoLocalKeys.forEach(key => {
        localStorage.removeItem(key);
        clearedItems.push(`localStorage: ${key}`);
      });
      
      console.log(`✅ localStorage 정리: ${kakaoLocalKeys.length}개 항목`);
    }
    
    // 2. 세션 스토리지에서 카카오 관련 항목 정리
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const sessionStorageKeys = Object.keys(sessionStorage);
      const kakaoSessionKeys = sessionStorageKeys.filter(key => 
        key.toLowerCase().includes('kakao') || 
        key.toLowerCase().includes('kauth') ||
        key.toLowerCase().includes('oauth')
      );
      
      kakaoSessionKeys.forEach(key => {
        sessionStorage.removeItem(key);
        clearedItems.push(`sessionStorage: ${key}`);
      });
      
      console.log(`✅ sessionStorage 정리: ${kakaoSessionKeys.length}개 항목`);
    }
    
    // 3. 카카오 관련 쿠키 정리
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      let cookieCount = 0;
      
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        // 카카오 관련 쿠키 패턴 확인
        if (name.toLowerCase().includes('kakao') || 
            name.toLowerCase().includes('kauth') || 
            name.toLowerCase().includes('kadu') ||
            name.toLowerCase().includes('oauth') ||
            name.startsWith('_k')) {
          
          // 다양한 도메인과 경로로 쿠키 삭제 시도
          const domains = ['', '.kakao.com', '.kauth.kakao.com', '.accounts.kakao.com'];
          const paths = ['/', '/oauth', '/login'];
          
          domains.forEach(domain => {
            paths.forEach(path => {
              const cookieString = domain 
                ? `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain}`
                : `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`;
              
              document.cookie = cookieString;
            });
          });
          
          clearedItems.push(`cookie: ${name}`);
          cookieCount++;
        }
      });
      
      console.log(`✅ 쿠키 정리: ${cookieCount}개 항목`);
    }
    
    // 4. 카카오 로그아웃 API 호출 (백그라운드)
    try {
      // iframe을 사용하여 백그라운드에서 카카오 로그아웃 처리
      if (typeof document !== 'undefined') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.src = 'https://kauth.kakao.com/oauth/logout';
        
        document.body.appendChild(iframe);
        
        // 3초 후 iframe 제거
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
        
        clearedItems.push('카카오 로그아웃 API 호출');
        console.log('✅ 카카오 로그아웃 API 호출 완료');
      }
    } catch (error) {
      console.log('⚠️ 카카오 로그아웃 API 호출 실패 (무시 가능):', error);
    }
    
    console.log('🎉 카카오 세션 정리 완료');
    
    return {
      success: true,
      message: `카카오 세션이 정리되었습니다. (${clearedItems.length}개 항목)`,
      clearedItems
    };
    
  } catch (error) {
    console.error('❌ 카카오 세션 정리 중 오류:', error);
    
    return {
      success: false,
      message: `세션 정리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      clearedItems
    };
  }
}

/**
 * 회원가입 전 자동으로 카카오 세션을 정리하는 함수
 */
export async function clearKakaoSessionForSignup(): Promise<void> {
  console.log('🔄 회원가입 전 카카오 세션 자동 정리...');
  
  const result = await clearKakaoSession();
  
  if (result.success) {
    console.log('✅ 자동 세션 정리 완료:', result.message);
  } else {
    console.warn('⚠️ 자동 세션 정리 실패:', result.message);
  }
}

/**
 * 브라우저가 시크릿 모드인지 확인하는 함수
 */
export function isIncognitoMode(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Chrome/Edge 시크릿 모드 감지
      if ('webkitRequestFileSystem' in window) {
        (window as any).webkitRequestFileSystem(
          0, 1,
          () => resolve(false), // 일반 모드
          () => resolve(true)   // 시크릿 모드
        );
      }
      // Firefox 프라이빗 모드 감지
      else if ('MozAppearance' in document.documentElement.style) {
        const db = indexedDB.open('test');
        db.onerror = () => resolve(true);  // 프라이빗 모드
        db.onsuccess = () => resolve(false); // 일반 모드
      }
      // Safari 프라이빗 모드 감지
      else {
        try {
          localStorage.setItem('test', '1');
          localStorage.removeItem('test');
          resolve(false); // 일반 모드
        } catch {
          resolve(true);  // 프라이빗 모드
        }
      }
    } catch {
      resolve(false); // 감지 실패 시 일반 모드로 가정
    }
  });
}
