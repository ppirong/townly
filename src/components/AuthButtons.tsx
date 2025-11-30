"use client";

import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { clerkDarkAppearance } from "@/lib/clerk-appearance";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * 로그인/회원가입/관리자회원가입 버튼 컴포넌트
 */
export default function AuthButtons() {
  const { user } = useUser();
  const { isAdmin, isLoading, isSignedIn } = useUserRole();
  
  
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
          <button className="bg-transparent border border-gray-600 hover:bg-gray-700 hover:text-white px-3 py-1 rounded text-sm">
            로그인
          </button>
        </SignInButton>
        
        <SignUpButton mode="modal">
          <button className="bg-yellow-400 hover:bg-yellow-300 text-black px-3 py-1 rounded text-sm font-medium transition-colors">
            👤 회원가입
          </button>
        </SignUpButton>
        
        <SignUpButton mode="modal">
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            onClick={() => {
              console.log("🔴 관리자회원가입 버튼 클릭됨");
              // 관리자 회원가입 버튼 클릭 시 localStorage에 플래그 저장
              localStorage.setItem("registerAsAdmin", "true");
            }}
          >
            🛡️ 관리자회원가입
          </button>
        </SignUpButton>
      </div>
    );
  }

  // 로그인한 경우 사용자 버튼 표시
  return (
    <div className="flex items-center gap-2">
      <UserButton afterSignOutUrl="/">
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
    </div>
  );
}
