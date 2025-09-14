'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, X, Clock, Calendar, Repeat, MessageSquare } from 'lucide-react';

interface CreateScheduledMessageFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type ScheduleType = 'daily' | 'weekly' | 'monthly' | 'once';

interface FormData {
  title: string;
  message: string;
  scheduleType: ScheduleType;
  scheduleTime: string;
  scheduleDay?: number;
  isActive: boolean;
}

export function CreateScheduledMessageForm({ onSuccess, onCancel }: CreateScheduledMessageFormProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    message: '',
    scheduleType: 'daily',
    scheduleTime: '09:00',
    isActive: true,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 입력 검증
      if (!formData.title.trim()) {
        throw new Error('스케줄 제목을 입력해주세요.');
      }
      
      if (!formData.message.trim()) {
        throw new Error('메시지 내용을 입력해주세요.');
      }
      
      if (!formData.scheduleTime) {
        throw new Error('발송 시간을 설정해주세요.');
      }
      
      if ((formData.scheduleType === 'weekly' || formData.scheduleType === 'monthly') && formData.scheduleDay === undefined) {
        throw new Error(`${formData.scheduleType === 'weekly' ? '요일' : '날짜'}을 선택해주세요.`);
      }

      console.log('폼 데이터 전송 중:', formData);

      // API 엔드포인트 호출
      const response = await fetch('/api/scheduled-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `서버 오류 (${response.status}): 스케줄 생성에 실패했습니다.`);
      }

      const result = await response.json();
      console.log('스케줄 생성 성공:', result);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getSchedulePreview = () => {
    const { scheduleType, scheduleTime, scheduleDay } = formData;
    
    switch (scheduleType) {
      case 'daily':
        return `매일 ${scheduleTime}에 발송`;
      case 'weekly':
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return scheduleDay !== undefined ? `매주 ${days[scheduleDay]}요일 ${scheduleTime}에 발송` : '요일을 선택해주세요';
      case 'monthly':
        return scheduleDay !== undefined ? `매월 ${scheduleDay}일 ${scheduleTime}에 발송` : '날짜를 선택해주세요';
      case 'once':
        return `일회성 ${scheduleTime}에 발송`;
      default:
        return '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 에러 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              스케줄 제목 *
            </label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="예: 매일 아침 날씨 알림"
              maxLength={100}
              required
            />
          </div>
          
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              메시지 내용 *
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="구독자들에게 발송할 메시지를 입력하세요..."
              className="w-full min-h-[120px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
              maxLength={1000}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.message.length}/1000자
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 스케줄 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            스케줄 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="scheduleType" className="block text-sm font-medium text-gray-700 mb-2">
              발송 주기 *
            </label>
            <select
              id="scheduleType"
              value={formData.scheduleType}
              onChange={(e) => handleInputChange('scheduleType', e.target.value as ScheduleType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="daily">매일</option>
              <option value="weekly">매주</option>
              <option value="monthly">매월</option>
              <option value="once">일회성</option>
            </select>
          </div>

          <div>
            <label htmlFor="scheduleTime" className="block text-sm font-medium text-gray-700 mb-2">
              발송 시간 *
            </label>
            <Input
              id="scheduleTime"
              type="time"
              value={formData.scheduleTime}
              onChange={(e) => handleInputChange('scheduleTime', e.target.value)}
              required
            />
          </div>

          {/* 요일 선택 (weekly) */}
          {formData.scheduleType === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                요일 선택 *
              </label>
              <div className="grid grid-cols-7 gap-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleInputChange('scheduleDay', index)}
                    className={`py-2 px-3 text-sm rounded-md border transition-colors ${
                      formData.scheduleDay === index
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 날짜 선택 (monthly) */}
          {formData.scheduleType === 'monthly' && (
            <div>
              <label htmlFor="scheduleDay" className="block text-sm font-medium text-gray-700 mb-2">
                발송 날짜 *
              </label>
              <select
                id="scheduleDay"
                value={formData.scheduleDay || ''}
                onChange={(e) => handleInputChange('scheduleDay', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">날짜 선택</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{day}일</option>
                ))}
              </select>
            </div>
          )}

          {/* 스케줄 미리보기 */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <Calendar className="inline h-4 w-4 mr-1" />
              <strong>스케줄 미리보기:</strong> {getSchedulePreview()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 활성화 설정 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <input
              id="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              생성 즉시 활성화 (체크 해제 시 비활성 상태로 생성됩니다)
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 버튼 */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="h-4 w-4 mr-1" />
          취소
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
              생성 중...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1" />
              스케줄 생성
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
