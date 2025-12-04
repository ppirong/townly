'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

interface ProfileSyncStatus {
  isChecking: boolean;
  isCreating: boolean;
  hasProfile: boolean | null;
  error: string | null;
  lastChecked: Date | null;
}

/**
 * 사용자 프로필 자동 동기화 훅
 * 웹훅이 실패하거나 지연될 경우를 대비한 클라이언트 사이드 백업 메커니즘
 */
export function useUserProfileSync() {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<ProfileSyncStatus>({
    isChecking: false,
    isCreating: false,
    hasProfile: null,
    error: null,
    lastChecked: null
  });

  useEffect(() => {
    if (isLoaded && user) {
      checkAndCreateUserProfile();
    }
  }, [isLoaded, user]);

  const checkAndCreateUserProfile = async () => {
    if (!user) return;

    setStatus(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // 1. 프로필 존재 여부 확인
      const checkResponse = await fetch(`/api/user-profile/${user.id}`);
      
      if (checkResponse.ok) {
        // 프로필이 이미 존재함
        setStatus(prev => ({
          ...prev,
          isChecking: false,
          hasProfile: true,
          lastChecked: new Date()
        }));
        return;
      }

      if (checkResponse.status === 404) {
        // 프로필이 없으므로 생성
        setStatus(prev => ({ ...prev, isChecking: false, isCreating: true }));
        
        // 가입 방법 감지
        let signupMethod: 'email' | 'kakao' = 'email';
        if (user.externalAccounts && user.externalAccounts.length > 0) {
          const kakaoAccount = user.externalAccounts.find(account => 
            account.provider === 'oauth_kakao' || account.provider === 'kakao'
          );
          if (kakaoAccount) {
            signupMethod = 'kakao';
          }
        }

        // 프로필 생성 요청
        const createResponse = await fetch('/api/user-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkUserId: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName,
            mobilePhone: user.primaryPhoneNumber?.phoneNumber,
            imageUrl: user.imageUrl,
            signupMethod
          })
        });

        if (createResponse.ok) {
          console.log('✅ 클라이언트에서 사용자 프로필 생성 완료');
          setStatus(prev => ({
            ...prev,
            isCreating: false,
            hasProfile: true,
            lastChecked: new Date()
          }));
        } else {
          throw new Error(`프로필 생성 실패: ${createResponse.status}`);
        }
      } else {
        throw new Error(`프로필 확인 실패: ${checkResponse.status}`);
      }

    } catch (error) {
      console.error('❌ 사용자 프로필 동기화 실패:', error);
      setStatus(prev => ({
        ...prev,
        isChecking: false,
        isCreating: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        lastChecked: new Date()
      }));
    }
  };

  // 수동 재시도 함수
  const retry = () => {
    if (user && !status.isChecking && !status.isCreating) {
      checkAndCreateUserProfile();
    }
  };

  return {
    ...status,
    retry
  };
}

/**
 * 사용자 프로필 존재 여부만 확인하는 가벼운 훅
 */
export function useUserProfileCheck() {
  const { user, isLoaded } = useUser();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      checkProfile();
    }
  }, [isLoaded, user]);

  const checkProfile = async () => {
    if (!user) return;

    setIsChecking(true);
    try {
      const response = await fetch(`/api/user-profile/${user.id}`);
      setHasProfile(response.ok);
    } catch (error) {
      console.error('프로필 확인 실패:', error);
      setHasProfile(false);
    } finally {
      setIsChecking(false);
    }
  };

  return { hasProfile, isChecking, checkProfile };
}
