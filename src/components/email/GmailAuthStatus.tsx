'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface GmailAuthStatusProps {
  showActions?: boolean;
}

export function GmailAuthStatus({ showActions = true }: GmailAuthStatusProps) {
  const [authStatus, setAuthStatus] = useState<{
    isConnected: boolean;
    email?: string;
    lastChecked?: string;
    message?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const checkAuthStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/gmail/status');
      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setAuthStatus({
        isConnected: false,
        message: '인증 상태를 확인할 수 없습니다',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/gmail/test', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        showAlert('success', `Gmail 연결 테스트 성공! ${data.email}로 테스트 이메일을 발송했습니다.`);
        await checkAuthStatus();
      } else {
        showAlert('error', `연결 테스트 실패: ${data.error}`);
      }
    } catch (error) {
      showAlert('error', 'Gmail 연결 테스트 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!authStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          <span>Gmail 인증 상태 확인 중...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {alert && (
        <Alert className={alert.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {authStatus.isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span>Gmail API 인증 상태</span>
          </CardTitle>
          <CardDescription>
            이메일 발송을 위한 Gmail API 연결 상태입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 상태 표시 */}
            <div className="flex items-center justify-between">
              <span className="font-medium">연결 상태:</span>
              <Badge 
                variant={authStatus.isConnected ? 'default' : 'destructive'}
                className="flex items-center gap-1"
              >
                {authStatus.isConnected ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    연결됨
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    연결 안됨
                  </>
                )}
              </Badge>
            </div>

            {/* 이메일 주소 */}
            {authStatus.email && (
              <div className="flex items-center justify-between">
                <span className="font-medium">발송 계정:</span>
                <span className="text-sm">{authStatus.email}</span>
              </div>
            )}

            {/* 마지막 확인 시간 */}
            {authStatus.lastChecked && (
              <div className="flex items-center justify-between">
                <span className="font-medium">마지막 확인:</span>
                <span className="text-sm">{authStatus.lastChecked}</span>
              </div>
            )}

            {/* 메시지 */}
            {authStatus.message && (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {authStatus.message}
              </div>
            )}

            {/* 액션 버튼들 */}
            {showActions && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkAuthStatus}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  상태 새로고침
                </Button>

                {authStatus.isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={isLoading}
                  >
                    연결 테스트
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => window.open('/auth/gmail', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Gmail 인증 설정
                  </Button>
                )}
              </div>
            )}

            {/* 인증 안내 */}
            {!authStatus.isConnected && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h4 className="font-medium text-yellow-800 mb-2">⚠️ Gmail 인증 필요</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  이메일 발송 기능을 사용하려면 Gmail API 인증이 필요합니다.
                </p>
                <div className="text-xs text-yellow-600 space-y-1">
                  <div>1. &quot;Gmail 인증 설정&quot; 버튼을 클릭하세요</div>
                  <div>2. Google 계정으로 로그인하고 권한을 승인하세요</div>
                  <div>3. 발급받은 토큰을 환경변수에 설정하세요</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
