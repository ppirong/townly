'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import { clearKakaoSession, isIncognitoMode } from '@/lib/utils/kakao-session-cleaner';

/**
 * 카카오 세션 관리 컴포넌트
 * 브라우저 세션 문제로 인한 카카오 회원가입 이슈를 해결합니다.
 */
export function KakaoSessionManager() {
  const { user } = useUser();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearKakaoSession = async () => {
    setIsClearing(true);
    
    try {
      const result = await clearKakaoSession();
      
      if (result.success) {
        alert(`✅ ${result.message}\n\n정리된 항목:\n${result.clearedItems.slice(0, 5).join('\n')}${result.clearedItems.length > 5 ? '\n...' : ''}`);
      } else {
        alert(`❌ ${result.message}`);
      }
      
    } catch (error) {
      console.error('세션 정리 중 오류:', error);
      alert('세션 정리 중 오류가 발생했습니다. 브라우저를 새로고침하거나 시크릿 모드를 사용해보세요.');
    } finally {
      setIsClearing(false);
    }
  };

  const openIncognitoGuide = async () => {
    // 현재 시크릿 모드인지 확인
    const isIncognito = await isIncognitoMode();
    
    if (isIncognito) {
      alert('✅ 현재 시크릿/프라이빗 모드입니다!\n\n이제 새로운 카카오 계정으로 회원가입할 수 있습니다.');
      return;
    }
    
    const userAgent = navigator.userAgent;
    let instructions = '';
    
    if (userAgent.includes('Chrome')) {
      instructions = 'Chrome: Ctrl+Shift+N (Windows) 또는 Cmd+Shift+N (Mac)';
    } else if (userAgent.includes('Firefox')) {
      instructions = 'Firefox: Ctrl+Shift+P (Windows) 또는 Cmd+Shift+P (Mac)';
    } else if (userAgent.includes('Safari')) {
      instructions = 'Safari: Cmd+Shift+N (Mac)';
    } else if (userAgent.includes('Edge')) {
      instructions = 'Edge: Ctrl+Shift+N (Windows)';
    } else {
      instructions = '브라우저 메뉴에서 "시크릿 모드" 또는 "프라이빗 브라우징" 선택';
    }
    
    alert(`🕵️ 시크릿 모드 열기:\n${instructions}\n\n시크릿 모드에서 새로운 카카오 계정으로 회원가입해보세요.`);
  };

  // 현재 사용자가 카카오 계정인지 확인
  const isKakaoUser = user?.externalAccounts?.some(acc => 
    acc.provider?.includes('kakao')
  );

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-center">
          🔧 카카오 회원가입 문제 해결
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>문제:</strong> 카카오 회원가입 시 기존 계정으로 자동 로그인됨
          </p>
          <p>
            <strong>원인:</strong> 브라우저에 남아있는 카카오 세션/쿠키
          </p>
        </div>
        
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-2">해결 방법 1: 세션 정리</h4>
            <Button 
              onClick={handleClearKakaoSession}
              disabled={isClearing}
              className="w-full"
              variant="outline"
            >
              {isClearing ? '정리 중...' : '🧹 카카오 세션 정리하기'}
            </Button>
            <p className="text-xs text-gray-500 mt-1">
              브라우저의 카카오 관련 쿠키와 세션을 정리합니다.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm mb-2">해결 방법 2: 시크릿 모드</h4>
            <Button 
              onClick={openIncognitoGuide}
              className="w-full"
              variant="outline"
            >
              🕵️ 시크릿 모드 가이드
            </Button>
            <p className="text-xs text-gray-500 mt-1">
              시크릿/프라이빗 브라우징 모드에서 회원가입을 진행하세요.
            </p>
          </div>
        </div>
        
        {isKakaoUser && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              ℹ️ 현재 카카오 계정으로 로그인되어 있습니다. 
              새 계정으로 가입하려면 먼저 로그아웃하세요.
            </p>
          </div>
        )}
        
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <h5 className="font-medium text-sm text-yellow-800 mb-1">
            💡 추가 팁
          </h5>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• 다른 브라우저 사용 (Chrome → Safari, Firefox 등)</li>
            <li>• 브라우저 설정에서 쿠키 및 캐시 삭제</li>
            <li>• 카카오톡 앱에서 로그아웃 후 재시도</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
