'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

export default function GmailAuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<{
    isConnected: boolean;
    email?: string;
    lastChecked?: string;
  } | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/gmail/status');
      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      console.error('Failed to check auth status:', error);
    }
  };

  const handleAuth = () => {
    if (typeof window === 'undefined') return;
    
    setIsLoading(true);
    
    const clientId = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
    if (!clientId) {
      showAlert('error', 'Gmail Client ID가 설정되지 않았습니다.');
      setIsLoading(false);
      return;
    }

    const redirectUri = `${window.location.origin}/auth/gmail/callback`;
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.send')}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `include_granted_scopes=true`;
    
    window.location.href = authUrl;
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/gmail/test', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        showAlert('success', `Gmail 연결 테스트 성공! 연결된 계정: ${data.email}`);
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

  const handleRevokeAuth = async () => {
    if (!confirm('Gmail 인증을 해제하시겠습니까? 이메일 발송이 중단됩니다.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/gmail/revoke', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        showAlert('success', 'Gmail 인증이 해제되었습니다.');
        setAuthStatus(null);
      } else {
        showAlert('error', `인증 해제 실패: ${data.error}`);
      }
    } catch (error) {
      showAlert('error', 'Gmail 인증 해제 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Gmail API 인증</h1>
          <p className="text-muted-foreground mt-2">
            이메일 발송을 위한 Gmail API 인증을 설정합니다.
          </p>
        </div>

        {alert && (
          <Alert className={alert.type === 'error' ? 'border-red-500' : 'border-green-500'}>
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        )}

        {/* 현재 인증 상태 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>인증 상태</span>
              {authStatus?.isConnected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
            <CardDescription>
              Gmail API 연결 상태를 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">연결 상태:</span>
                <Badge variant={authStatus?.isConnected ? 'default' : 'destructive'}>
                  {authStatus?.isConnected ? '연결됨' : '연결 안됨'}
                </Badge>
              </div>
              
              {authStatus?.email && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">연결된 계정:</span>
                  <span className="text-sm">{authStatus.email}</span>
                </div>
              )}
              
              {authStatus?.lastChecked && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">마지막 확인:</span>
                  <span className="text-sm">{authStatus.lastChecked}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkAuthStatus}
                  disabled={isLoading}
                >
                  상태 새로고침
                </Button>
                
                {authStatus?.isConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    연결 테스트
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 인증 설정 */}
        {!authStatus?.isConnected ? (
          <Card>
            <CardHeader>
              <CardTitle>Gmail 인증 설정</CardTitle>
              <CardDescription>
                Gmail API를 통한 이메일 발송을 위해 Google 계정 인증이 필요합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-semibold text-blue-800 mb-2">인증 과정 안내</h4>
                  <ol className="text-sm text-blue-700 space-y-1">
                    <li>1. "Gmail 인증하기" 버튼을 클릭합니다</li>
                    <li>2. Google 로그인 페이지에서 이메일 발송용 계정으로 로그인합니다</li>
                    <li>3. Gmail 발송 권한을 승인합니다</li>
                    <li>4. 자동으로 이 페이지로 돌아옵니다</li>
                  </ol>
                </div>

                <Button
                  onClick={handleAuth}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Gmail 인증하기
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">✅ Gmail 인증 완료</CardTitle>
              <CardDescription>
                이메일 발송 시스템이 정상적으로 설정되었습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-semibold text-green-800 mb-2">설정 완료</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Gmail API 인증이 완료되었습니다</li>
                    <li>• 자동 이메일 발송이 활성화되었습니다</li>
                    <li>• 토큰은 자동으로 갱신됩니다</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/admin/email-management'}
                  >
                    이메일 관리 페이지로 이동
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={handleRevokeAuth}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    인증 해제
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 기술 정보 */}
        <Card>
          <CardHeader>
            <CardTitle>기술 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>OAuth 2.0:</span>
                <span>Authorization Code Flow</span>
              </div>
              <div className="flex justify-between">
                <span>스코프:</span>
                <span>gmail.send</span>
              </div>
              <div className="flex justify-between">
                <span>토큰 갱신:</span>
                <span>자동 (24시간마다)</span>
              </div>
              <div className="flex justify-between">
                <span>Refresh Token:</span>
                <span>영구 저장</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
