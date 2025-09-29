'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

function GmailCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [tokenInfo, setTokenInfo] = useState<{
    email?: string;
    expiresIn?: number;
  } | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`인증 실패: ${error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('인증 코드를 받지 못했습니다.');
        return;
      }

      // 서버로 인증 코드 전송
      const response = await fetch('/api/auth/gmail/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage('Gmail 인증이 성공적으로 완료되었습니다!');
        setTokenInfo({
          email: data.email,
          expiresIn: data.expiresIn,
        });
      } else {
        setStatus('error');
        setMessage(data.error || '인증 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Callback error:', error);
      setStatus('error');
      setMessage('인증 처리 중 오류가 발생했습니다.');
    }
  };

  const handleContinue = () => {
    if (status === 'success') {
      // 성공 시 이메일 관리 페이지로 이동
      window.location.href = '/admin/email-management';
    } else {
      // 실패 시 인증 페이지로 돌아가기
      window.location.href = '/auth/gmail';
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Gmail 인증 처리</h1>
          <p className="text-muted-foreground mt-2">
            Gmail API 인증을 처리하고 있습니다.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
              {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
              
              <span>
                {status === 'loading' && '인증 처리 중...'}
                {status === 'success' && '인증 성공'}
                {status === 'error' && '인증 실패'}
              </span>
            </CardTitle>
            <CardDescription>
              {status === 'loading' && 'Google에서 받은 인증 코드를 처리하고 있습니다.'}
              {status === 'success' && 'Gmail API 인증이 성공적으로 완료되었습니다.'}
              {status === 'error' && '인증 과정에서 문제가 발생했습니다.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status === 'loading' && (
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="text-sm text-muted-foreground">
                    잠시만 기다려주세요...
                  </p>
                </div>
              )}

              {status === 'success' && (
                <div className="space-y-4">
                  <Alert className="border-green-500">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Gmail API 인증이 완료되었습니다. 이제 자동 이메일 발송이 가능합니다.
                    </AlertDescription>
                  </Alert>

                  {tokenInfo && (
                    <div className="bg-green-50 p-4 rounded-md">
                      <h4 className="font-semibold text-green-800 mb-2">인증 정보</h4>
                      <div className="space-y-1 text-sm text-green-700">
                        {tokenInfo.email && (
                          <div className="flex justify-between">
                            <span>연결된 계정:</span>
                            <span>{tokenInfo.email}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>토큰 갱신:</span>
                          <span>자동 (24시간마다)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>상태:</span>
                          <span>활성화됨</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {status === 'error' && (
                <Alert className="border-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {message}
                  </AlertDescription>
                </Alert>
              )}

              {status !== 'loading' && (
                <div className="flex justify-center">
                  <Button onClick={handleContinue} className="w-full">
                    {status === 'success' ? '이메일 관리 페이지로 이동' : '다시 시도'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {status === 'success' && (
          <Card>
            <CardHeader>
              <CardTitle>다음 단계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Gmail API 인증 완료</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>이메일 발송 기능 활성화</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>자동 토큰 갱신 설정</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function GmailCallbackPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 max-w-2xl">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>페이지를 로딩 중입니다...</p>
        </div>
      </div>
    }>
      <GmailCallbackContent />
    </Suspense>
  );
}
