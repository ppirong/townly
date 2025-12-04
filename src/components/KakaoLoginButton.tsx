"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useState } from "react";

interface KakaoLoginButtonProps {
  mode: "sign-in" | "sign-up";
  isAdmin?: boolean; // 관리자 회원가입 여부
  className?: string;
  children?: React.ReactNode;
}

/**
 * 커스텀 카카오 로그인 버튼
 * 
 * Clerk의 기본 카카오 로그인은 prompt 파라미터가 없어서
 * 카카오에 이미 로그인되어 있으면 자동으로 그 계정을 사용합니다.
 * 
 * 이 컴포넌트는 prompt=login 파라미터를 추가하여
 * 항상 카카오 로그인 화면을 표시합니다.
 */
export function KakaoLoginButton({ mode, isAdmin = false, className, children }: KakaoLoginButtonProps) {
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 관리자 회원가입인 경우 localStorage에 플래그 저장
      if (mode === "sign-up" && isAdmin) {
        localStorage.setItem("registerAsAdmin", "true");
        console.log("🛡️ 관리자 회원가입 플래그 설정");
      }

      // Clerk가 로드되었는지 확인
      if (mode === "sign-in" && !signInLoaded) {
        throw new Error("로그인 시스템이 아직 로드되지 않았습니다.");
      }
      if (mode === "sign-up" && !signUpLoaded) {
        throw new Error("회원가입 시스템이 아직 로드되지 않았습니다.");
      }

      console.log(`🔐 카카오 ${mode === "sign-in" ? "로그인" : (isAdmin ? "관리자 회원가입" : "회원가입")} 시작`);

      // OAuth provider 이름 (Clerk Dashboard에서 Custom OAuth로 설정됨)
      const oauthStrategy = "oauth_custom_kakao";

      if (mode === "sign-in" && signIn) {
        await signIn.authenticateWithRedirect({
          strategy: oauthStrategy as any,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      } else if (mode === "sign-up" && signUp) {
        await signUp.authenticateWithRedirect({
          strategy: oauthStrategy as any,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
      }
    } catch (err) {
      console.error("카카오 로그인 오류:", err);
      setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  const isReady = mode === "sign-in" ? signInLoaded : signUpLoaded;

  return (
    <div>
      <button
        onClick={handleKakaoLogin}
        disabled={!isReady || isLoading}
        className={className || "w-full bg-[#FEE500] hover:bg-[#FDD800] text-black font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"}
      >
        {isLoading ? (
          <span>로딩 중...</span>
        ) : (
          children || (
            <>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10 2C5.58172 2 2 4.94289 2 8.5C2 10.7269 3.42833 12.6857 5.5 13.8V18L9.5 15H10C14.4183 15 18 12.0571 18 8.5C18 4.94289 14.4183 2 10 2Z"
                  fill="black"
                />
              </svg>
              <span>카카오로 {mode === "sign-in" ? "로그인" : "회원가입"}</span>
            </>
          )
        )}
      </button>
      {error && (
        <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
      )}
    </div>
  );
}

/**
 * 카카오 계정에서 로그아웃하는 버튼
 * 카카오 세션을 정리하여 다른 계정으로 로그인할 수 있게 합니다.
 */
export function KakaoLogoutButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const handleKakaoLogout = () => {
    // 카카오 로그아웃 페이지를 새 탭에서 열기
    window.open(
      "https://accounts.kakao.com/logout?continue=https://accounts.kakao.com/weblogin/account",
      "_blank",
      "width=500,height=600"
    );
  };

  return (
    <button
      onClick={handleKakaoLogout}
      className={className || "text-sm text-gray-500 hover:text-gray-700 underline"}
    >
      {children || "다른 카카오 계정으로 로그인하기"}
    </button>
  );
}

