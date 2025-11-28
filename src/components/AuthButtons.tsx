"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Shield, User } from "lucide-react";
import { useEffect, useState } from "react";

// 사용자 역할 정보 타입 정의
type UserRoleInfo = {
  isAdmin: boolean;
  role: string;
  isLoading: boolean;
};

/**
 * 사용자 역할 정보를 가져오는 커스텀 훅
 */
function useUserRole(): UserRoleInfo {
  const { user, isLoaded } = useUser();
  const [userRole, setUserRole] = useState<UserRoleInfo>({
    isAdmin: false,
    role: "customer",
    isLoading: true,
  });

  useEffect(() => {
    // 사용자 로그인 상태 확인 후 API 호출
    if (!isLoaded || !user?.id) {
      setUserRole(prev => ({ ...prev, isLoading: false }));
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
            isLoading: false 
          });
        }
      } catch (error) {
        console.error("사용자 역할 확인 실패:", error);
        setUserRole({ 
          isAdmin: false, 
          role: "customer", 
          isLoading: false 
        });
      }
    };

    checkUserRole();
  }, [user?.id, isLoaded]);

  return userRole;
}

/**
 * 로그인/회원가입/관리자회원가입 버튼 컴포넌트
 */
export default function AuthButtons() {
  const { isSignedIn, user } = useUser();
  const { isAdmin, isLoading } = useUserRole();
  
  // 회원가입 완료 시 관리자 등록 처리
  useEffect(() => {
    if (isSignedIn && user?.id) {
      const registerAsAdmin = localStorage.getItem("registerAsAdmin");
      if (registerAsAdmin === "true") {
        console.log("🔵 관리자 등록 처리 시작");
        
        // API 호출하여 관리자 역할 설정
        fetch("/api/user/role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: "admin" }),
        })
        .then(response => response.json())
        .then(data => {
          console.log("✅ 관리자 등록 완료:", data);
          localStorage.removeItem("registerAsAdmin");
          // 페이지 새로고침하여 메뉴 업데이트
          window.location.reload();
        })
        .catch(error => {
          console.error("❌ 관리자 등록 실패:", error);
          localStorage.removeItem("registerAsAdmin");
        });
      }
    }
  }, [isSignedIn, user?.id]);

  // 로그인하지 않은 경우 로그인/회원가입 버튼 표시
  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <SignInButton mode="modal">
          <Button variant="outline" size="sm">
            로그인
          </Button>
        </SignInButton>
        
        <SignUpButton mode="modal">
          <Button size="sm">
            <User className="w-4 h-4 mr-1" />
            회원가입
          </Button>
        </SignUpButton>
        
        <SignUpButton mode="modal">
          <Button 
            variant="secondary" 
            size="sm" 
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              console.log("🔴 관리자회원가입 버튼 클릭됨");
              // 관리자 회원가입 버튼 클릭 시 localStorage에 플래그 저장
              localStorage.setItem("registerAsAdmin", "true");
            }}
          >
            <Shield className="w-4 h-4 mr-1" />
            관리자회원가입
          </Button>
        </SignUpButton>
      </div>
    );
  }

  // 로그인한 경우 사용자 버튼 표시
  return (
    <div className="flex items-center gap-2">
      <UserButton afterSignOutUrl="/">
        <UserButton.MenuItems>
          {isAdmin ? (
            <UserButton.Action
              label="관리자 설정"
              labelIcon={<span>⚙️</span>}
              onClick={() => { window.location.href = "/admin/kakao"; }}
            />
          ) : (
            <UserButton.Action
              label="내 설정"
              labelIcon={<span>👤</span>}
              onClick={() => { window.location.href = "/profile"; }}
            />
          )}
        </UserButton.MenuItems>
      </UserButton>
    </div>
  );
}
