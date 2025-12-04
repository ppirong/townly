"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { executeKakaoLogout, getKakaoLogoutConfig } from "@/lib/utils/kakao-logout";

interface KakaoLogoutMenuProps {
  children: React.ReactNode;
}

/**
 * 카카오계정과 함께 로그아웃 메뉴 컴포넌트
 * 
 * 사용자에게 로그아웃 방식을 선택할 수 있는 다이얼로그를 제공합니다:
 * 1. 이 서비스만 로그아웃
 * 2. 카카오계정과 함께 로그아웃
 */
export function KakaoLogoutMenu({ children }: KakaoLogoutMenuProps) {
  const clerk = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 서비스만 로그아웃
  const handleServiceOnlyLogout = async () => {
    setIsLoading(true);
    try {
      console.log('🚪 서비스만 로그아웃 시작');
      await clerk.signOut();
      console.log('✅ 서비스 로그아웃 완료');
      setIsOpen(false);
    } catch (error) {
      console.error('❌ 서비스 로그아웃 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 카카오계정과 함께 로그아웃
  const handleKakaoLogout = async () => {
    setIsLoading(true);
    try {
      console.log('🚪 카카오계정과 함께 로그아웃 시작');
      
      // 먼저 Clerk 세션 정리
      await clerk.signOut();
      console.log('✅ Clerk 세션 정리 완료');
      
      // 카카오 로그아웃 페이지로 이동
      const config = getKakaoLogoutConfig();
      executeKakaoLogout(config);
      
    } catch (error) {
      console.error('❌ 카카오 로그아웃 오류:', error);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🚪 로그아웃 방식 선택
          </DialogTitle>
          <DialogDescription className="text-left space-y-2">
            <p>어떤 방식으로 로그아웃하시겠습니까?</p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {/* 서비스만 로그아웃 */}
          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">이 서비스만 로그아웃</h4>
            <p className="text-xs text-gray-600">
              Townly에서만 로그아웃합니다. 카카오계정은 로그인 상태를 유지합니다.
            </p>
            <Button
              onClick={handleServiceOnlyLogout}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? "로그아웃 중..." : "서비스만 로그아웃"}
            </Button>
          </div>
          
          {/* 카카오계정과 함께 로그아웃 */}
          <div className="border rounded-lg p-4 space-y-2 bg-blue-50 border-blue-200">
            <h4 className="font-semibold text-sm text-blue-800">카카오계정과 함께 로그아웃</h4>
            <p className="text-xs text-blue-600">
              Townly와 카카오계정 모두에서 로그아웃합니다. 다음 로그인 시 카카오 계정을 다시 선택할 수 있습니다.
            </p>
            <Button
              onClick={handleKakaoLogout}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "로그아웃 중..." : "카카오계정과 함께 로그아웃"}
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 text-center mt-4">
          💡 <strong>추천:</strong> 다른 카카오 계정으로 로그인하려면 &quot;카카오계정과 함께 로그아웃&quot;을 선택하세요.
        </div>
      </DialogContent>
    </Dialog>
  );
}
