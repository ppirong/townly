'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sendManualEmailSchema, SendManualEmailInput } from '@/lib/schemas/email';

interface ManualEmailSenderProps {
  onSend: (data: SendManualEmailInput) => Promise<void>;
  isLoading: boolean;
}

export function ManualEmailSender({
  onSend,
  isLoading,
}: ManualEmailSenderProps) {
  const [targetType, setTargetType] = useState<string>('all_users');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(sendManualEmailSchema),
    defaultValues: {
      subject: '',
      location: '서울',
      timeOfDay: 'morning',
      targetType: 'all_users',
      forceRefreshWeather: true,
    },
  });

  const handleFormSubmit = async (data: SendManualEmailInput) => {
    try {
      await onSend(data);
      // 성공 시 폼 리셋 (테스트 이메일 제외)
      if (data.targetType !== 'test') {
        reset();
      }
    } catch (error) {
      console.error('Manual email send error:', error);
    }
  };

  const quickSendOptions = [
    {
      label: '아침 날씨 안내 (전체 발송)',
      onClick: () => {
        setValue('subject', '[날씨 안내] 아침 날씨 정보');
        setValue('timeOfDay', 'morning');
        setValue('targetType', 'all_users');
        setValue('location', '서울');
      },
    },
    {
      label: '저녁 날씨 안내 (전체 발송)',
      onClick: () => {
        setValue('subject', '[날씨 안내] 저녁 날씨 정보');
        setValue('timeOfDay', 'evening');
        setValue('targetType', 'all_users');
        setValue('location', '서울');
      },
    },
    {
      label: '테스트 이메일',
      onClick: () => {
        setValue('subject', '[테스트] 날씨 안내 이메일');
        setValue('timeOfDay', 'morning');
        setValue('targetType', 'test');
        setValue('location', '서울');
      },
    },
  ];

  const currentTargetType = watch('targetType');

  return (
    <div className="space-y-6">
      {/* 빠른 발송 옵션 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">빠른 발송</CardTitle>
          <CardDescription>
            자주 사용하는 설정으로 빠르게 이메일을 발송할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {quickSendOptions.map((option, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                onClick={option.onClick}
                className="justify-start h-auto py-3"
              >
                <div className="text-left">
                  <div className="font-medium">{option.label}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 상세 설정 폼 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">상세 설정</CardTitle>
          <CardDescription>
            이메일 발송에 대한 세부 설정을 조정할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 이메일 제목 */}
              <div className="space-y-2">
                <Label htmlFor="subject">이메일 제목 *</Label>
                <Input
                  id="subject"
                  {...register('subject')}
                  placeholder="예: [날씨 안내] 오늘의 날씨 정보"
                />
                {errors.subject && (
                  <p className="text-sm text-red-500">{errors.subject.message}</p>
                )}
              </div>

              {/* 위치 */}
              <div className="space-y-2">
                <Label htmlFor="location">지역</Label>
                <Select 
                  value={watch('location')} 
                  onValueChange={(value) => setValue('location', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="서울">서울</SelectItem>
                    <SelectItem value="부산">부산</SelectItem>
                    <SelectItem value="대구">대구</SelectItem>
                    <SelectItem value="인천">인천</SelectItem>
                    <SelectItem value="광주">광주</SelectItem>
                    <SelectItem value="대전">대전</SelectItem>
                    <SelectItem value="울산">울산</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 시간대 */}
              <div className="space-y-2">
                <Label>시간대</Label>
                <Select 
                  value={watch('timeOfDay')} 
                  onValueChange={(value: 'morning' | 'evening') => setValue('timeOfDay', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">아침 (6시 기준)</SelectItem>
                    <SelectItem value="evening">저녁 (18시 기준)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 발송 대상 */}
              <div className="space-y-2">
                <Label>발송 대상</Label>
                <Select 
                  value={targetType} 
                  onValueChange={(value) => {
                    setTargetType(value);
                    setValue('targetType', value as any);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_users">
                      <div className="flex items-center justify-between w-full">
                        <span>모든 사용자</span>
                        <Badge variant="secondary">전체 발송</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="active_users">
                      <div className="flex items-center justify-between w-full">
                        <span>활성 사용자</span>
                        <Badge variant="secondary">활성 사용자만</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="test">
                      <div className="flex items-center justify-between w-full">
                        <span>테스트 발송</span>
                        <Badge variant="outline">테스트</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 테스트 이메일 주소 (테스트 발송 시에만 표시) */}
            {currentTargetType === 'test' && (
              <div className="space-y-2">
                <Label htmlFor="testEmail">테스트 이메일 주소 *</Label>
                <Input
                  id="testEmail"
                  type="email"
                  {...register('testEmail')}
                  placeholder="test@example.com"
                />
                {errors.testEmail && (
                  <p className="text-sm text-red-500">{errors.testEmail.message}</p>
                )}
              </div>
            )}

            {/* 날씨 데이터 새로고침 */}
            <div className="flex items-center space-x-2">
              <Switch
                id="forceRefreshWeather"
                checked={watch('forceRefreshWeather')}
                onCheckedChange={(checked) => setValue('forceRefreshWeather', checked)}
              />
              <Label htmlFor="forceRefreshWeather">최신 날씨 데이터 가져오기</Label>
              <span className="text-sm text-muted-foreground">(권장)</span>
            </div>

            {/* 발송 경고 메시지 */}
            {currentTargetType !== 'test' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      ⚠️ 실제 발송 주의
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        선택한 대상에게 실제 이메일이 발송됩니다. 
                        {currentTargetType === 'all_users' && ' 모든 구독자에게 발송됩니다.'}
                        {currentTargetType === 'active_users' && ' 활성 구독자에게 발송됩니다.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 발송 버튼 */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                disabled={isLoading}
              >
                초기화
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className={currentTargetType === 'test' ? '' : 'bg-orange-600 hover:bg-orange-700'}
              >
                {isLoading ? '발송 중...' : 
                 currentTargetType === 'test' ? '테스트 발송' : '이메일 발송'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

