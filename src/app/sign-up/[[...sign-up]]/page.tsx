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
        appearance={{
          elements: {
            card: "shadow-none border-none",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton: {
              backgroundColor: "#FEE500",
              color: "#000000",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              padding: "14px 20px",
              "&:hover": {
                backgroundColor: "#FDD800",
                transform: "translateY(-1px)"
              }
            },
            formButtonPrimary: {
              backgroundColor: "#FEE500",
              color: "#000000",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              padding: "14px 20px",
              "&:hover": {
                backgroundColor: "#FDD800",
                transform: "translateY(-1px)"
              }
            },
            dividerRow: "my-4",
            dividerText: "또는",
            footer: "hidden",
            socialButtonsBlockButtonText: "text-black font-semibold"
          },
          variables: {
            colorPrimary: "#FEE500",
            borderRadius: "12px"
          }
        }}
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        redirectUrl="/"
        afterSignUpUrl="/"
      />
      
      {/* Features Highlight */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <span className="text-green-500 mr-2">✓</span>
          실시간 날씨 & 미세먼지 알림
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <span className="text-green-500 mr-2">✓</span>
          우리 동네 마트 할인 정보
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <span className="text-green-500 mr-2">✓</span>
          카카오톡으로 편리한 알림
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50">
      <div className="flex items-center justify-center min-h-screen px-4 py-12">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-yellow-400 rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl">🏘️</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Townly
            </h1>
            <h2 className="text-xl text-gray-700 mb-2">
              새로운 여정을 시작하세요!
            </h2>
            <p className="text-gray-600">
              카카오 계정 또는 이메일로 간편하게 가입하세요
            </p>
          </div>

          {/* Signup Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <Suspense fallback={<div className="text-center">로딩 중...</div>}>
              <SignUpWithRoleHandler />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}