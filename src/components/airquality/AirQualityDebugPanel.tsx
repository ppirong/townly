'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCcw, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { manualCollect90HourData } from '@/actions/google-air-quality';
import { useRouter } from 'next/navigation';

interface AirQualityDebugPanelProps {
  latitude: number;
  longitude: number;
}

/**
 * 대기질 데이터 수집 디버그 패널
 * 수동으로 90시간 대기질 데이터를 수집할 수 있습니다.
 */
export function AirQualityDebugPanel({ latitude, longitude }: AirQualityDebugPanelProps) {
  const router = useRouter();
  const [isCollecting, setIsCollecting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    dataCount: number;
    timestamp: string;
  } | null>(null);

  const handleCollectData = async () => {
    setIsCollecting(true);
    setLastResult(null);

    try {
      console.log('🔄 수동 데이터 수집 시작...');
      
      const result = await manualCollect90HourData(latitude, longitude);
      
      setLastResult({
        ...result,
        timestamp: new Date().toLocaleString('ko-KR'),
      });

      if (result.success) {
        console.log('✅ 수동 데이터 수집 완료:', result);
        // 페이지 새로고침하여 새 데이터 표시
        router.refresh();
      } else {
        console.error('❌ 수동 데이터 수집 실패:', result.message);
      }
    } catch (error) {
      console.error('❌ 수동 데이터 수집 오류:', error);
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : '알 수 없는 오류',
        dataCount: 0,
        timestamp: new Date().toLocaleString('ko-KR'),
      });
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>디버그 패널</span>
            </CardTitle>
            <CardDescription>
              수동으로 90시간 대기질 데이터를 수집합니다
            </CardDescription>
          </div>
          <Button
            onClick={handleCollectData}
            disabled={isCollecting}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCcw className={`h-4 w-4 ${isCollecting ? 'animate-spin' : ''}`} />
            <span>{isCollecting ? '수집 중...' : '대기질 정보 가져오기'}</span>
          </Button>
        </div>
      </CardHeader>
      
      {lastResult && (
        <CardContent>
          <div className={`flex items-start space-x-3 p-4 rounded-lg ${
            lastResult.success 
              ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
          }`}>
            {lastResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${
                lastResult.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
              }`}>
                {lastResult.success ? '✅ 수집 완료' : '❌ 수집 실패'}
              </p>
              <p className={`text-sm mt-1 ${
                lastResult.success 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {lastResult.message}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {lastResult.success && lastResult.dataCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {lastResult.dataCount}시간 데이터
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {lastResult.timestamp}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

