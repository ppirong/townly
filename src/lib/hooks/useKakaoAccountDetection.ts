/**
 * 카카오 계정 감지 및 signup_method 자동 수정 훅
 * 사용자의 연결된 계정에서 카카오 계정을 감지하고 signup_method를 올바르게 설정합니다.
 */

import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useCallback } from 'react';

interface KakaoDetectionStatus {
  isChecking: boolean;
  isUpdating: boolean;
  hasKakaoAccount: boolean;
  currentSignupMethod: 'email' | 'kakao' | null;
  needsUpdate: boolean;
  updated: boolean;
  error: string | null;
  lastChecked: Date | null;
}

export function useKakaoAccountDetection() {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<KakaoDetectionStatus>({
    isChecking: false,
    isUpdating: false,
    hasKakaoAccount: false,
    currentSignupMethod: null,
    needsUpdate: false,
    updated: false,
    error: null,
    lastChecked: null,
  });

  const checkAndUpdateSignupMethod = useCallback(async () => {
    if (!user) return;

    setStatus(prev => ({ 
      ...prev, 
      isChecking: true, 
      error: null,
      updated: false 
    }));

    try {
      // 1. 사용자의 연결된 계정에서 카카오 계정 확인
      const hasKakaoAccount = user.externalAccounts?.some(account => 
        String(account.provider) === 'oauth_kakao' || 
        String(account.provider) === 'kakao' ||
        String(account.provider) === 'oauth_custom_kakao' ||
        String(account.provider).includes('kakao')
      ) || false;

      console.log('🔍 카카오 계정 감지 결과:', {
        userId: user.id,
        hasKakaoAccount,
        externalAccounts: user.externalAccounts?.map(acc => acc.provider)
      });

      // 2. 현재 사용자 프로필의 signup_method 확인
      const profileResponse = await fetch(`/api/user-profile/info?userId=${user.id}`);
      
      if (profileResponse.status === 404) {
        // 프로필이 없으면 건너뜀 (useUserProfileSync에서 처리)
        setStatus(prev => ({ 
          ...prev, 
          isChecking: false,
          hasKakaoAccount,
          lastChecked: new Date() 
        }));
        return;
      }

      if (!profileResponse.ok) {
        throw new Error(`프로필 확인 실패: ${profileResponse.status}`);
      }

      const profileData = await profileResponse.json();
      const currentSignupMethod = profileData.signupMethod as 'email' | 'kakao';

      // 3. 업데이트가 필요한지 확인
      const needsUpdate = hasKakaoAccount && currentSignupMethod === 'email';

      setStatus(prev => ({
        ...prev,
        isChecking: false,
        hasKakaoAccount,
        currentSignupMethod,
        needsUpdate,
        lastChecked: new Date()
      }));

      // 4. 필요한 경우 signup_method 업데이트
      if (needsUpdate) {
        console.log('🔧 signup_method 업데이트 필요:', {
          userId: user.id,
          currentSignupMethod,
          hasKakaoAccount
        });

        setStatus(prev => ({ ...prev, isUpdating: true }));

        const updateResponse = await fetch('/api/user-profile/signup-method', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkUserId: user.id,
            signupMethod: 'kakao'
          })
        });

        if (updateResponse.ok) {
          console.log('✅ signup_method가 kakao로 업데이트되었습니다');
          setStatus(prev => ({
            ...prev,
            isUpdating: false,
            currentSignupMethod: 'kakao',
            needsUpdate: false,
            updated: true
          }));
        } else {
          throw new Error(`signup_method 업데이트 실패: ${updateResponse.status}`);
        }
      }

    } catch (error) {
      console.error('❌ 카카오 계정 감지 및 업데이트 실패:', error);
      setStatus(prev => ({
        ...prev,
        isChecking: false,
        isUpdating: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        lastChecked: new Date()
      }));
    }
  }, [user]);

  useEffect(() => {
    if (isLoaded && user) {
      checkAndUpdateSignupMethod();
    }
  }, [isLoaded, user, checkAndUpdateSignupMethod]);


  // 수동 재시도 함수
  const retry = () => {
    setStatus(prev => ({ 
      ...prev, 
      error: null, 
      updated: false, 
      needsUpdate: false 
    }));
    checkAndUpdateSignupMethod();
  };

  return {
    status,
    retry,
  };
}
