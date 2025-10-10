"use client";

import { Suspense } from 'react';
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMart } from "@/actions/mart";
import { createMartDiscount, CreateDiscountInput } from "@/actions/mart-discounts";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import { ArrowLeft, Save, Calendar, Upload, Percent } from 'lucide-react';

interface DiscountFormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  discountRate: string;
  imageUrl: string;
}

function DiscountRegisterContent() {
  const params = useParams();
  const router = useRouter();
  const martId = params.id as string;
  
  const [martName, setMartName] = useState<string>('');
  const [formData, setFormData] = useState<DiscountFormData>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    discountRate: '',
    imageUrl: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof DiscountFormData, string>>>({});
  const [error, setError] = useState<string | null>(null);

  // 마트 정보 로드
  useEffect(() => {
    const fetchMartData = async () => {
      try {
        const { success, data, message } = await getMart(martId);
        
        if (!success || !data) {
          setError(message || "마트 정보를 불러오는데 실패했습니다.");
          setIsLoading(false);
          return;
        }
        
        setMartName(data.name || "");
        setIsLoading(false);
      } catch (err) {
        console.error("마트 정보 조회 오류:", err);
        setError("마트 정보를 불러오는 중 오류가 발생했습니다.");
        setIsLoading(false);
      }
    };
    
    fetchMartData();
  }, [martId]);

  // 폼 검증 함수
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof DiscountFormData, string>> = {};
    
    // 필수 필드 검증
    if (!formData.title.trim()) newErrors.title = '할인 제목을 입력해주세요';
    if (!formData.startDate) newErrors.startDate = '시작일을 선택해주세요 (필수)';
    if (!formData.endDate) newErrors.endDate = '종료일을 선택해주세요 (필수)';
    
    // 날짜 유효성 검증
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (startDate >= endDate) {
        newErrors.endDate = '종료일은 시작일보다 늦어야 합니다';
      }
      
      // 과거 날짜 검증
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        newErrors.startDate = '시작일은 오늘 이후여야 합니다';
      }
    }
    
    // 할인율 형식 검증 (선택사항)
    if (formData.discountRate && formData.discountRate.trim()) {
      const discountValue = parseFloat(formData.discountRate.replace('%', ''));
      if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
        newErrors.discountRate = '올바른 할인율을 입력해주세요 (1-100%)';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof DiscountFormData, value: string) => {
    // 에러 상태 초기화
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // 폼 검증
    if (!validateForm()) {
      toast.error('필수 항목을 모두 입력해주세요');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 데이터 변환
      const discountData: CreateDiscountInput = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        discountRate: formData.discountRate.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined,
      };
      
      const result = await createMartDiscount(martId, discountData);
      
      if (result.success) {
        toast.success(result.message || '할인 전단지가 등록되었습니다');
        
        // 1.5초 후 할인 정보 페이지로 이동
        setTimeout(() => {
          router.push(`/admin/mart/edit/${martId}/discount-info`);
        }, 1500);
      } else {
        toast.error(result.message || '등록 중 오류가 발생했습니다');
      }
    } catch (error) {
      console.error('할인 전단지 등록 오류:', error);
      toast.error(error instanceof Error ? error.message : '등록 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#181a1b] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-white text-lg">마트 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-[#181a1b] text-white">
        <div className="bg-[#080808]/60 border-b border-[#756d60]/50">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href={`/admin/mart/edit/${martId}/discount-info`} className="flex items-center gap-2 text-[#ada59b] hover:text-white">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">할인 정보</span>
              </Link>
              <div className="w-7 h-7 bg-[#181a1b] rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Card className="bg-transparent border border-[#756d60]/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-[#e8e6e3] text-xl font-semibold text-center">오류 발생</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-red-500">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181a1b] text-white">
      {/* Header */}
      <div className="bg-[#080808]/60 border-b border-[#756d60]/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/admin/mart/edit/${martId}/discount-info`} className="flex items-center gap-2 text-[#ada59b] hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">할인 정보</span>
            </Link>
            <div className="w-7 h-7 bg-[#181a1b] rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">할인 전단지 등록</h1>
          <p className="text-[#afa89d] text-lg">{martName}의 새로운 할인 전단지를 등록해주세요</p>
          <p className="text-red-400 text-sm mt-2">* 표시는 필수 입력 항목입니다</p>
        </div>

        {/* Form */}
        <Card className="bg-transparent border border-[#756d60]/50 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-[#e8e6e3] text-xl font-semibold flex items-center gap-2">
              <div className="w-5 h-5 bg-[#e8e6e3] rounded"></div>
              할인 전단지 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 할인 제목 */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[#cecac4] text-sm font-medium flex items-center">
                할인 제목
                <span className="ml-1 text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                maxLength={100}
                className={`bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg ${errors.title ? 'border-red-500' : ''}`}
                placeholder="예: 신선한 과일 대할인"
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1">{errors.title}</p>
              )}
            </div>

            {/* 할인 설명 */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[#cecac4] text-sm font-medium">
                할인 설명 <span className="text-[#9d9588]">(선택)</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                maxLength={500}
                rows={3}
                className="bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg resize-none"
                placeholder="할인에 대한 자세한 설명을 입력하세요"
              />
              <p className="text-[#9d9588] text-xs">{formData.description.length}/500자</p>
            </div>

            {/* 할인 기간 */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-[#cecac4] text-sm font-medium flex items-center">
                  시작일 *
                  <span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={`bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg ${errors.startDate ? 'border-red-500' : ''}`}
                  required
                />
                {errors.startDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-[#cecac4] text-sm font-medium flex items-center">
                  종료일 *
                  <span className="ml-1 text-red-500">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={`bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg ${errors.endDate ? 'border-red-500' : ''}`}
                  required
                />
                {errors.endDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* 할인율 */}
            <div className="space-y-2">
              <Label htmlFor="discountRate" className="text-[#cecac4] text-sm font-medium">
                할인율 <span className="text-[#9d9588]">(선택)</span>
              </Label>
              <div className="relative">
                <Input
                  id="discountRate"
                  value={formData.discountRate}
                  onChange={(e) => handleInputChange('discountRate', e.target.value)}
                  className={`bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg pr-10 ${errors.discountRate ? 'border-red-500' : ''}`}
                  placeholder="30"
                />
                <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ada59b]" />
              </div>
              {errors.discountRate ? (
                <p className="text-red-500 text-xs mt-1">{errors.discountRate}</p>
              ) : (
                <p className="text-[#9d9588] text-xs">숫자만 입력하세요 (예: 30)</p>
              )}
            </div>

            {/* 이미지 URL */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-[#cecac4] text-sm font-medium">
                이미지 URL <span className="text-[#9d9588]">(선택)</span>
              </Label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                className="bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg"
                placeholder="https://example.com/discount-image.jpg"
              />
              <p className="text-[#9d9588] text-xs">할인 전단지 이미지 URL을 입력하세요 (할인 상품 등록 시 이미지 업로드 가능)</p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center mt-8">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(errors).length > 0}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-12 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                등록 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                등록 완료
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DiscountRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#181a1b] flex items-center justify-center">
      <div className="text-white">로딩 중...</div>
    </div>}>
      <DiscountRegisterContent />
      <Toaster position="top-center" richColors />
    </Suspense>
  );
}
