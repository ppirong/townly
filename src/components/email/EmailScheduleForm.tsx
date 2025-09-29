'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { createEmailScheduleSchema, CreateEmailScheduleInput } from '@/lib/schemas/email';

interface EmailScheduleFormProps {
  onSubmit: (data: CreateEmailScheduleInput) => Promise<void>;
  isLoading: boolean;
  initialData?: Partial<CreateEmailScheduleInput>;
}

export function EmailScheduleForm({
  onSubmit,
  isLoading,
  initialData,
}: EmailScheduleFormProps) {
  const [targetType, setTargetType] = useState<string>(initialData?.targetType || 'all_users');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateEmailScheduleInput>({
    resolver: zodResolver(createEmailScheduleSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      emailSubject: initialData?.emailSubject || '',
      emailTemplate: initialData?.emailTemplate || 'weather_summary',
      scheduleTime: initialData?.scheduleTime || '06:00',
      timezone: initialData?.timezone || 'Asia/Seoul',
      targetType: initialData?.targetType || 'all_users',
      isActive: initialData?.isActive ?? true,
    },
  });

  const handleFormSubmit = async (data: CreateEmailScheduleInput) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const presetSchedules = [
    { label: '아침 6시 (06:00)', value: '06:00', title: '아침 날씨 안내' },
    { label: '저녁 6시 (18:00)', value: '18:00', title: '저녁 날씨 안내' },
    { label: '아침 7시 (07:00)', value: '07:00', title: '출근 전 날씨 안내' },
    { label: '저녁 8시 (20:00)', value: '20:00', title: '내일 날씨 안내' },
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* 프리셋 스케줄 */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold">빠른 설정</Label>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {presetSchedules.map((preset) => (
              <Button
                key={preset.value}
                type="button"
                variant="outline"
                onClick={() => {
                  setValue('scheduleTime', preset.value);
                  setValue('title', preset.title);
                  setValue('emailSubject', '[날씨 안내] ' + preset.title + ' - {{date}}');
                }}
                className="justify-start"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* 제목 */}
        <div className="space-y-2">
          <Label htmlFor="title">스케줄 제목 *</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="예: 아침 날씨 안내"
          />
          {errors.title && (
            <p className="text-sm text-red-500">{errors.title.message}</p>
          )}
        </div>

        {/* 발송 시간 */}
        <div className="space-y-2">
          <Label htmlFor="scheduleTime">발송 시간 *</Label>
          <Input
            id="scheduleTime"
            type="time"
            {...register('scheduleTime')}
          />
          {errors.scheduleTime && (
            <p className="text-sm text-red-500">{errors.scheduleTime.message}</p>
          )}
        </div>
      </div>

      {/* 설명 */}
      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="스케줄에 대한 간단한 설명을 입력하세요"
          className="resize-none"
          rows={2}
        />
      </div>

      {/* 이메일 제목 */}
      <div className="space-y-2">
        <Label htmlFor="emailSubject">이메일 제목 *</Label>
        <Input
          id="emailSubject"
          {...register('emailSubject')}
          placeholder="예: [날씨 안내] 아침 날씨 정보 - {date변수}"
        />
        <p className="text-sm text-muted-foreground">
          변수: {'{{date}}'}, {'{{location}}'} 등을 사용할 수 있습니다
        </p>
        {errors.emailSubject && (
          <p className="text-sm text-red-500">{errors.emailSubject.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 이메일 템플릿 */}
        <div className="space-y-2">
          <Label>이메일 템플릿</Label>
          <Select 
            value={watch('emailTemplate')} 
            onValueChange={(value: 'weather_summary' | 'custom') => setValue('emailTemplate', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weather_summary">날씨 요약 템플릿</SelectItem>
              <SelectItem value="custom">사용자 정의 템플릿</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 시간대 */}
        <div className="space-y-2">
          <Label>시간대</Label>
          <Select 
            value={watch('timezone')} 
            onValueChange={(value) => setValue('timezone', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Asia/Seoul">한국 시간 (KST)</SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
            <SelectItem value="all_users">모든 사용자</SelectItem>
            <SelectItem value="active_users">활성 사용자</SelectItem>
            <SelectItem value="specific_users">특정 사용자</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 활성화 상태 */}
      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={watch('isActive')}
          onCheckedChange={(checked) => setValue('isActive', checked)}
        />
        <Label htmlFor="isActive">스케줄 활성화</Label>
      </div>

      {/* 제출 버튼 */}
      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '생성 중...' : '스케줄 생성'}
        </Button>
      </div>
    </form>
  );
}

// React Hook Form을 위한 의존성 설치 필요
// npm install react-hook-form @hookform/resolvers

