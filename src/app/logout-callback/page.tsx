"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/**
 * 카카오 로그아웃 콜백 페이지
 * 
 * 카카오계정과 함께 로그아웃 완료 후 리다이렉트되는 페이지입니다.
 * 이 페이지에서 Clerk 세션도 정리하고 홈으로 이동합니다.
 */
export default function LogoutCallbackPage() {
  const clerk = useClerk();
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      console.log('🚪 카카오 로그아웃 콜백 처리 시작');
      
      try {
        // Clerk 세션 정리
        await clerk.signOut();
        console.log('✅ Clerk 로그아웃 완료');
        
        // 홈 페이지로 리다이렉트
        router.push('/');
        
      } catch (error) {
        console.error('❌ 로그아웃 처리 중 오류:', error);
        // 오류가 발생해도 홈으로 이동
        router.push('/');
      }
    };

    handleLogout();
  }, [clerk, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400 mx-auto"></div>
        <div className="space-y-2">
          <p className="text-white text-lg font-medium">로그아웃 처리 중...</p>
          <p className="text-gray-400 text-sm">잠시만 기다려주세요.</p>
        </div>
      </div>
    </div>
  );
}
