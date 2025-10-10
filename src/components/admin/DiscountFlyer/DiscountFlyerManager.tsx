'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import DiscountFlyerCard, { DiscountFlyerData } from './DiscountFlyerCard';
import { createMartDiscount, getMartDiscounts, deleteMartDiscount, updateMartDiscount } from '@/actions/mart-discounts';
import { MartDiscount } from '@/db/schema';
import { toast } from 'sonner';

interface DiscountFlyerManagerProps {
  martId: string;
  martName: string;
}

export default function DiscountFlyerManager({ martId, martName }: DiscountFlyerManagerProps) {
  const [discountFlyers, setDiscountFlyers] = useState<MartDiscount[]>([]);
  const [newFlyers, setNewFlyers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 할인 전단지 목록 로드
  const loadDiscountFlyers = async () => {
    setIsLoading(true);
    try {
      const result = await getMartDiscounts(martId);
      if (result.success && result.data) {
        setDiscountFlyers(result.data);
      } else {
        toast.error(result.message || '할인 전단지를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('할인 전단지 로드 오류:', error);
      toast.error('할인 전단지를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiscountFlyers();
  }, [martId]);

  // 새 할인 전단지 카드 추가
  const handleAddNewFlyer = () => {
    const newId = `new-${Date.now()}`;
    setNewFlyers([...newFlyers, newId]);
  };

  // 새 할인 전단지 저장
  const handleSaveNewFlyer = async (tempId: string, data: DiscountFlyerData) => {
    try {
      const result = await createMartDiscount(martId, {
        title: data.title,
        description: data.description,
        discountDate: data.discountDate,
        imageUrl: data.imageUrl,
        products: data.products,
        ocrAnalyzed: data.products.length > 0,
      });

      if (result.success) {
        toast.success('할인 전단지가 성공적으로 등록되었습니다.');
        
        // 새 카드 제거 및 목록 새로고침
        setNewFlyers(newFlyers.filter(id => id !== tempId));
        await loadDiscountFlyers();
      } else {
        toast.error(result.message || '할인 전단지 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('할인 전단지 저장 오류:', error);
      toast.error('할인 전단지 저장 중 오류가 발생했습니다.');
    }
  };

  // 기존 할인 전단지 수정
  const handleUpdateFlyer = async (data: DiscountFlyerData) => {
    if (!data.id) return;

    try {
      const result = await updateMartDiscount(data.id, {
        title: data.title,
        description: data.description,
        discountDate: data.discountDate,
        imageUrl: data.imageUrl,
        products: data.products,
        ocrAnalyzed: data.products.length > 0,
      });

      if (result.success) {
        toast.success('할인 전단지가 성공적으로 수정되었습니다.');
        await loadDiscountFlyers();
      } else {
        toast.error(result.message || '할인 전단지 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('할인 전단지 수정 오류:', error);
      toast.error('할인 전단지 수정 중 오류가 발생했습니다.');
    }
  };

  // 할인 전단지 삭제
  const handleDeleteFlyer = async (flyerId: string) => {
    if (!confirm('정말로 이 할인 전단지를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const result = await deleteMartDiscount(flyerId);

      if (result.success) {
        toast.success('할인 전단지가 성공적으로 삭제되었습니다.');
        await loadDiscountFlyers();
      } else {
        toast.error(result.message || '할인 전단지 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('할인 전단지 삭제 오류:', error);
      toast.error('할인 전단지 삭제 중 오류가 발생했습니다.');
    }
  };

  // 새 카드 취소
  const handleCancelNewFlyer = (tempId: string) => {
    setNewFlyers(newFlyers.filter(id => id !== tempId));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">할인 전단지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{martName} - 할인 전단지 관리</h2>
          <p className="text-gray-600 mt-1">
            날짜별 할인 상품을 등록하고 관리하세요
          </p>
        </div>
        <Button onClick={handleAddNewFlyer} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>날짜 추가</span>
        </Button>
      </div>

      {/* 할인 전단지 목록 */}
      <div className="grid gap-6">
        {/* 새로 추가되는 카드들 */}
        {newFlyers.map((tempId) => (
          <DiscountFlyerCard
            key={tempId}
            isNew={true}
            onSave={(data) => handleSaveNewFlyer(tempId, data)}
            onDelete={() => handleCancelNewFlyer(tempId)}
          />
        ))}

        {/* 기존 할인 전단지들 */}
        {discountFlyers.map((flyer) => (
          <DiscountFlyerCard
            key={flyer.id}
            isNew={false}
            initialData={{
              id: flyer.id,
              title: flyer.title,
              description: flyer.description || undefined,
              discountDate: new Date(flyer.discountDate),
              imageUrl: flyer.imageUrl || undefined,
              products: (flyer.products as any) || [],
            }}
            onSave={handleUpdateFlyer}
            onDelete={() => handleDeleteFlyer(flyer.id)}
          />
        ))}

        {/* 빈 상태 */}
        {discountFlyers.length === 0 && newFlyers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              등록된 할인 전단지가 없습니다
            </h3>
            <p className="text-gray-600 mb-6">
              첫 번째 할인 전단지를 등록해보세요
            </p>
            <Button onClick={handleAddNewFlyer} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>첫 할인 전단지 등록</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
