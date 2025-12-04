"use client";

/**
 * 카카오 계정 자동 감지 및 signup_method 수정 컴포넌트
 * 사용자의 연결된 계정에서 카카오 계정을 감지하고 signup_method를 자동으로 수정합니다.
 */

import { useKakaoAccountDetection } from '@/lib/hooks/useKakaoAccountDetection';
import { useUser } from '@clerk/nextjs';

export function KakaoAccountDetector() {
  const { user, isLoaded } = useUser();
  const { status } = useKakaoAccountDetection();

  // 로그인하지 않은 경우 아무것도 렌더링하지 않음
  if (!isLoaded || !user) {
    return null;
  }

  // 개발 환경에서만 상태 표시 (선택사항)
  if (process.env.NODE_ENV === 'development' && (status.isChecking || status.isUpdating || status.updated || status.error)) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-100 border border-blue-300 rounded-lg p-3 text-sm z-50 max-w-sm">
        {status.isChecking && (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>카카오 계정 확인 중...</span>
          </div>
        )}
        
        {status.isUpdating && (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
            <span>signup_method 업데이트 중...</span>
          </div>
        )}
        
        {status.updated && (
          <div className="flex items-center gap-2 text-green-700">
            <span>✅</span>
            <span>카카오 계정으로 업데이트 완료</span>
          </div>
        )}
        
        {status.needsUpdate && !status.isUpdating && !status.updated && (
          <div className="flex items-center gap-2 text-orange-700">
            <span>🔧</span>
            <span>카카오 계정 감지됨 - 업데이트 필요</span>
          </div>
        )}
        
        {status.error && (
          <div className="flex items-center gap-2 text-red-700">
            <span>❌</span>
            <span>오류: {status.error}</span>
          </div>
        )}
        
        {status.hasKakaoAccount && status.currentSignupMethod === 'kakao' && !status.updated && (
          <div className="flex items-center gap-2 text-blue-700">
            <span>ℹ️</span>
            <span>카카오 계정 (이미 올바름)</span>
          </div>
        )}
      </div>
    );
  }

  return null;
}
