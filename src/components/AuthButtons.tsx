"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { clerkDarkAppearance } from "@/lib/clerk-appearance";
import { useUserRole } from "@/hooks/useUserRole";
import { KakaoLoginButton, KakaoLogoutButton } from "@/components/KakaoLoginButton";
import { KakaoLogoutMenu } from "@/components/KakaoLogoutMenu";

/**
 * 로그인/회원가입/관리자회원가입 버튼 컴포넌트
 * 
 * 🔧 2024-12 업데이트: 카카오 자동 로그인 문제 해결
 * - 기존 Clerk 기본 버튼 대신 커스텀 카카오 로그인 버튼 사용
 * - 카카오 세션 정리 기능 추가
 */
export default function AuthButtons() {
  const { user } = useUser();
  const { isAdmin, isLoading, isSignedIn } = useUserRole();
  const [showKakaoLogout, setShowKakaoLogout] = useState(false);
  
  
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
        {/* 카카오 세션 정리 버튼 (선택적 표시) */}
        <div className="relative">
          <KakaoLogoutButton className="text-xs text-gray-400 hover:text-gray-600 underline">
            다른 카카오 계정
          </KakaoLogoutButton>
        </div>
        
        {/* 구분선 */}
        <div className="text-gray-400 text-xs">|</div>
        
        {/* 로그인 버튼 - Clerk 다이얼로그 */}
        <SignInButton mode="modal">
          <Button 
            variant="outline" 
            size="sm"
            className="bg-transparent border border-gray-600 hover:bg-gray-700 hover:text-white px-3 py-1 rounded text-sm"
          >
            로그인
          </Button>
        </SignInButton>
        
        {/* 회원가입 버튼 - Clerk 다이얼로그 */}
        <SignUpButton mode="modal">
          <Button 
            size="sm"
            className="bg-yellow-400 hover:bg-yellow-300 text-black px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            👤 회원가입
          </Button>
        </SignUpButton>
        
        {/* 관리자 회원가입 버튼 - 페이지 이동 */}
        <Button 
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
          onClick={() => {
            // 관리자 회원가입 플래그 설정 후 회원가입 페이지로 이동
            localStorage.setItem("registerAsAdmin", "true");
            window.location.href = "/sign-up?role=admin";
          }}
        >
          🛡️ 관리자회원가입
        </Button>
      </div>
    );
  }

  // 로그인한 경우 사용자 버튼 표시
  return (
    <div className="flex items-center gap-2">
      <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonTrigger: "hidden" } }}>
        <UserButton.MenuItems>
          {isAdmin && (
            <UserButton.Action
              label="관리자 설정"
              labelIcon={<span>⚙️</span>}
              onClick={() => { window.location.href = "/admin/kakao"; }}
            />
          )}
        </UserButton.MenuItems>
      </UserButton>
      
      {/* 커스텀 사용자 메뉴 */}
      <div className="relative">
        <KakaoLogoutMenu>
          <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">
            <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-black">
              {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="hidden sm:inline">
              {user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || "사용자"}
            </span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </KakaoLogoutMenu>
      </div>
    </div>
  );
}
