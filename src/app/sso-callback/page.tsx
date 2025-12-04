"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * SSO 콜백 페이지
 * OAuth 인증 후 리다이렉트되는 페이지입니다.
 */
export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p className="text-white">로그인 처리 중...</p>
        <AuthenticateWithRedirectCallback />
      </div>
    </div>
  );
}

