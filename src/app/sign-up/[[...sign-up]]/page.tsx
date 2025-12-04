"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { KakaoSessionManager } from "@/components/KakaoSessionManager";
import { Button } from "@/components/ui/button";
import { clearKakaoSessionForSignup } from "@/lib/utils/kakao-session-cleaner";

// 회원가입 후 역할 설정 처리를 위한 컴포넌트
function SignUpWithRoleHandler() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role");
  const [showSessionManager, setShowSessionManager] = useState(false);
  
  // 관리자 역할로 회원가입하는 경우
  const isAdmin = role === "admin";
  
  console.log("🟡 SignUp 페이지 로드됨");
  console.log("🟡 URL 파라미터 role:", role);
  console.log("🟡 isAdmin:", isAdmin);
  
  // 페이지 로드 시 자동으로 카카오 세션 정리
  useEffect(() => {
    const autoCleanSession = async () => {
      console.log("🔄 회원가입 페이지 로드 - 카카오 세션 자동 정리 시작");
      await clearKakaoSessionForSignup();
    };
    
    autoCleanSession();
  }, []);
  
  // 회원가입 완료 후 처리
  const handleAfterSignUp = async (userData: { createdUserId: string }) => {
    console.log("🟢 회원가입 완료 콜백 실행됨");
    console.log("🟢 userData:", userData);
    console.log("🟢 isAdmin:", isAdmin);
    
    if (isAdmin && userData.createdUserId) {
      try {
        console.log("🔵 관리자 역할 설정 API 호출 시작");
        
        // 관리자 역할 설정 API 호출
        const response = await fetch("/api/user/role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: "admin" }),
        });
        
        const result = await response.json();
        console.log("🔵 API 응답:", result);
        console.log("🔵 응답 상태:", response.status);
        
        if (response.ok) {
          console.log("✅ 관리자 역할 설정 성공");
        } else {
          console.error("❌ 관리자 역할 설정 실패:", result);
        }
      } catch (error) {
        console.error("❌ 관리자 역할 설정 API 호출 오류:", error);
      }
    } else {
      console.log("⚪ 관리자 역할 설정 건너뜀 (isAdmin:", isAdmin, ", userId:", userData.createdUserId, ")");
    }
  };

  return (
    <div className="space-y-6">
      {/* 카카오 회원가입 문제 해결 도구 */}
      <div className="text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSessionManager(!showSessionManager)}
          className="mb-4"
        >
          {showSessionManager ? '🔧 문제 해결 도구 숨기기' : '🔧 카카오 회원가입 문제 해결'}
        </Button>
        
        {showSessionManager && (
          <div className="mb-6">
            <KakaoSessionManager />
          </div>
        )}
      </div>

      {/* Clerk 회원가입 컴포넌트 */}
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        redirectUrl="/"
        afterSignUpUrl="/"
      />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <div className="flex justify-center items-center min-h-screen py-12">
      <div className="w-full max-w-lg">
        <Suspense fallback={<div>로딩 중...</div>}>
          <SignUpWithRoleHandler />
        </Suspense>
      </div>
    </div>
  );
}