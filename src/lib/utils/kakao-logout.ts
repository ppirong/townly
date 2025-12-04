/**
 * 카카오계정과 함께 로그아웃 유틸리티
 * 
 * 카카오 개발자 문서 참조:
 * https://developers.kakao.com/docs/latest/ko/kakaologin/utilize#logout-with-kakao-account
 */

export interface KakaoLogoutOptions {
  /** 로그아웃 후 리다이렉트될 URL */
  logoutRedirectUri: string;
  /** 카카오 앱 키 (REST API 키) */
  clientId: string;
}

/**
 * 카카오계정과 함께 로그아웃 URL 생성
 * 
 * 사용자에게 "이 서비스만 로그아웃" 또는 "카카오계정과 함께 로그아웃" 선택 화면을 제공합니다.
 */
export function createKakaoLogoutUrl(options: KakaoLogoutOptions): string {
  const { logoutRedirectUri, clientId } = options;
  
  const params = new URLSearchParams({
    client_id: clientId,
    logout_redirect_uri: logoutRedirectUri,
  });

  return `https://kauth.kakao.com/oauth/logout?${params.toString()}`;
}

/**
 * 카카오계정과 함께 로그아웃 실행
 * 
 * 현재 창에서 카카오 로그아웃 선택 페이지로 이동합니다.
 */
export function executeKakaoLogout(options: KakaoLogoutOptions): void {
  const logoutUrl = createKakaoLogoutUrl(options);
  
  console.log('🚪 카카오계정과 함께 로그아웃 시작');
  console.log('로그아웃 URL:', logoutUrl);
  
  // 현재 창에서 카카오 로그아웃 페이지로 이동
  window.location.href = logoutUrl;
}

/**
 * 카카오계정과 함께 로그아웃 (새 창)
 * 
 * 새 창에서 카카오 로그아웃 선택 페이지를 열고, 완료 후 현재 페이지를 새로고침합니다.
 */
export function executeKakaoLogoutInNewWindow(options: KakaoLogoutOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const logoutUrl = createKakaoLogoutUrl(options);
    
    console.log('🚪 카카오계정과 함께 로그아웃 시작 (새 창)');
    console.log('로그아웃 URL:', logoutUrl);
    
    // 새 창에서 카카오 로그아웃 페이지 열기
    const popup = window.open(
      logoutUrl,
      'kakao_logout',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );
    
    if (!popup) {
      reject(new Error('팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.'));
      return;
    }
    
    // 팝업 창 모니터링
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        console.log('✅ 카카오 로그아웃 창이 닫혔습니다.');
        
        // 로그아웃 완료 후 페이지 새로고침
        setTimeout(() => {
          window.location.reload();
        }, 500);
        
        resolve();
      }
    }, 1000);
    
    // 10분 후 타임아웃
    setTimeout(() => {
      if (!popup.closed) {
        popup.close();
        clearInterval(checkClosed);
        reject(new Error('로그아웃 시간이 초과되었습니다.'));
      }
    }, 600000); // 10분
  });
}

/**
 * 환경 변수에서 카카오 설정 가져오기
 */
export function getKakaoLogoutConfig(): KakaoLogoutOptions {
  // 카카오 앱의 REST API 키 (환경 변수 또는 하드코딩)
  const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || '2219dd4cc7903887f8833359aad5b294';
  
  // 로그아웃 후 리다이렉트될 URL - 현재 도메인 기반으로 동적 생성
  let logoutRedirectUri = 'https://towny-kr.vercel.app/logout-callback'; // 기본값 (운영환경)
  
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // 개발환경 감지
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      logoutRedirectUri = `${origin}/logout-callback`;
    } else {
      // 운영환경 - 현재 도메인 사용
      logoutRedirectUri = `${origin}/logout-callback`;
    }
    
    console.log('🔗 카카오 로그아웃 리다이렉트 URI:', logoutRedirectUri);
  }
  
  return {
    clientId,
    logoutRedirectUri,
  };
}
