"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

// 사용자 역할 정보 타입 정의
export type UserRoleInfo = {
  isAdmin: boolean;
  role: string;
  isLoading: boolean;
  isSignedIn: boolean;
};

/**
 * 사용자 역할 정보를 가져오는 공통 커스텀 훅
 * 중복된 API 호출을 방지하고 캐싱을 통해 성능을 최적화합니다.
 */
export function useUserRole(): UserRoleInfo {
  const { user, isLoaded } = useUser();
  const [userRole, setUserRole] = useState<UserRoleInfo>({
    isAdmin: false,
    role: "customer",
    isLoading: true,
    isSignedIn: false,
  });

  useEffect(() => {
    // 사용자 로그인 상태 확인 후 API 호출
    if (!isLoaded) {
      return;
    }
    
    if (!user?.id) {
      setUserRole(prev => ({ ...prev, isLoading: false, isSignedIn: false }));
      return;
    }
    
    const checkUserRole = async () => {
      try {
        const response = await fetch("/api/user/type");
        if (response.ok) {
          const data = await response.json();
          setUserRole({ 
            isAdmin: data.isAdmin, 
            role: data.role, 
            isLoading: false,
            isSignedIn: true
          });
        } else {
          // API 오류 시 기본값 설정
          setUserRole({ 
            isAdmin: false, 
            role: "customer", 
            isLoading: false,
            isSignedIn: true
          });
        }
      } catch (error) {
        console.error("사용자 역할 확인 실패:", error);
        setUserRole({ 
          isAdmin: false, 
          role: "customer", 
          isLoading: false,
          isSignedIn: true
        });
      }
    };

    checkUserRole();
  }, [user?.id, isLoaded]);

  return userRole;
}
