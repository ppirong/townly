'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, CalendarDays, Calendar, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  updateMartDiscount, 
  deleteMartDiscount, 
  getDiscountWithItems,
  createDiscountItem,
  updateDiscountItem,
  deleteDiscountItem,
  CreateDiscountItemInput
} from '@/actions/mart-discounts';
import { MartDiscount, MartDiscountItem } from '@/db/schema';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import DiscountItemCard, { DiscountItemData } from './DiscountItemCard';

interface DiscountEditManagerProps {
  martId: string;
  martName: string;
  discount: MartDiscount;
}

export default function DiscountEditManager({ martId, martName, discount }: DiscountEditManagerProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 할인 전단지 상태
  const [discountData, setDiscountData] = useState<MartDiscount>(discount);
  
  // 할인 상품 항목 상태
  const [discountItems, setDiscountItems] = useState<MartDiscountItem[]>([]);
  
  // 새로운 할인 상품 항목 상태
  const [newItems, setNewItems] = useState<string[]>([]);

  // 현재 선택된 탭
  const [activeTab, setActiveTab] = useState('info');

  // 페이지 로드 시 할인 전단지와 할인 상품 항목 정보 로드
  useEffect(() => {
    const loadDiscountData = async () => {
      setIsLoading(true);
      try {
        const result = await getDiscountWithItems(discount.id);
        if (result.success && result.data) {
          setDiscountData(result.data.discount);
          setDiscountItems(result.data.items || []);
        } else {
          toast.error(result.message || '할인 전단지 정보를 불러오는데 실패했습니다.');
        }
      } catch (error) {
        console.error('할인 전단지 정보 로드 오류:', error);
        toast.error('할인 전단지 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDiscountData();
  }, [discount.id]);

  // 할인 전단지 삭제
  const handleDeleteDiscount = async () => {
    if (!confirm('정말로 이 할인 전단지를 삭제하시겠습니까? 모든 할인 상품 정보도 함께 삭제됩니다.')) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteMartDiscount(discount.id);

      if (result.success) {
        toast.success('할인 전단지가 성공적으로 삭제되었습니다.');
        router.push(`/admin/mart/edit/${martId}/discount-info`);
      } else {
        toast.error(result.message || '할인 전단지 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('할인 전단지 삭제 오류:', error);
      toast.error('할인 전단지 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 새 할인 상품 항목 카드 추가
  const handleAddNewItem = () => {
    const tempId = `new-${Date.now()}`;
    setNewItems([...newItems, tempId]);
    // 항목 탭으로 전환
    setActiveTab('items');
  };

  // 새 할인 상품 항목 카드 취소
  const handleCancelNewItem = (tempId: string) => {
    setNewItems(newItems.filter(id => id !== tempId));
  };

  // 새 할인 상품 항목 저장
  const handleSaveNewItem = async (tempId: string, data: DiscountItemData) => {
    try {
      const itemData: CreateDiscountItemInput = {
        discountId: discount.id,
        discountDate: data.discountDate,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        originalImageUrl: data.originalImageUrl,
        imageSize: data.imageSize,
        products: data.products,
        ocrAnalyzed: data.ocrAnalyzed || false,
      };

      const result = await createDiscountItem(itemData);

      if (result.success) {
        toast.success('할인 상품 항목이 성공적으로 등록되었습니다.');
        // 임시 ID 제거
        setNewItems(newItems.filter(id => id !== tempId));
        // 할인 상품 항목 목록 새로고침
        const updatedResult = await getDiscountWithItems(discount.id);
        if (updatedResult.success && updatedResult.data) {
          setDiscountItems(updatedResult.data.items || []);
        }
      } else {
        toast.error(result.message || '할인 상품 항목 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('할인 상품 항목 등록 오류:', error);
      toast.error('할인 상품 항목 등록 중 오류가 발생했습니다.');
    }
  };

  // 할인 상품 항목 수정
  const handleUpdateItem = async (data: DiscountItemData) => {
    if (!data.id) {
      toast.error('할인 상품 항목 ID가 없습니다.');
      return;
    }

    try {
      const result = await updateDiscountItem(data.id, {
        discountDate: data.discountDate,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        originalImageUrl: data.originalImageUrl,
        imageSize: data.imageSize,
        products: data.products,
        ocrAnalyzed: data.ocrAnalyzed,
      });

      if (result.success) {
        toast.success('할인 상품 항목이 성공적으로 수정되었습니다.');
        // 할인 상품 항목 목록 새로고침
        const updatedResult = await getDiscountWithItems(discount.id);
        if (updatedResult.success && updatedResult.data) {
          setDiscountItems(updatedResult.data.items || []);
        }
      } else {
        toast.error(result.message || '할인 상품 항목 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('할인 상품 항목 수정 오류:', error);
      toast.error('할인 상품 항목 수정 중 오류가 발생했습니다.');
    }
  };

  // 할인 상품 항목 삭제
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('정말로 이 할인 상품 항목을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const result = await deleteDiscountItem(itemId);

      if (result.success) {
        toast.success('할인 상품 항목이 성공적으로 삭제되었습니다.');
        // 할인 상품 항목 목록에서 삭제
        setDiscountItems(discountItems.filter(item => item.id !== itemId));
      } else {
        toast.error(result.message || '할인 상품 항목 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('할인 상품 항목 삭제 오류:', error);
      toast.error('할인 상품 항목 삭제 중 오류가 발생했습니다.');
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return format(d, 'yyyy년 MM월 dd일', { locale: ko });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#181a1b] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-white text-lg">할인 전단지 정보를 불러오는 중...</p>
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
              <span className="text-sm">할인 정보 목록</span>
            </Link>
            <div className="w-7 h-7 bg-[#181a1b] rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#d9d6d1] mb-2">할인 전단지 관리</h1>
          <p className="text-[#afa89d]">{martName}의 할인 전단지 정보를 관리하세요.</p>
        </div>

        {/* 할인 전단지 정보 카드 */}
        <Card className="bg-[#1f2223] border border-[#756d60]/50 rounded-xl mb-8">
          <CardHeader>
            <CardTitle className="text-[#e8e6e3] flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              할인 전단지 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-[#ada59b] text-sm mb-1">제목</h3>
                <p className="text-[#e8e6e3] font-medium">{discountData.title}</p>
              </div>
              <div>
                <h3 className="text-[#ada59b] text-sm mb-1">할인율</h3>
                <p className="text-[#e8e6e3] font-medium">{discountData.discountRate || '지정되지 않음'}</p>
              </div>
              <div>
                <h3 className="text-[#ada59b] text-sm mb-1">할인 기간</h3>
                <p className="text-[#e8e6e3] font-medium">
                  {formatDate(discountData.startDate)} ~ {formatDate(discountData.endDate)}
                </p>
              </div>
              <div>
                <h3 className="text-[#ada59b] text-sm mb-1">설명</h3>
                <p className="text-[#e8e6e3] font-medium">{discountData.description || '설명 없음'}</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button
                variant="destructive"
                onClick={handleDeleteDiscount}
                disabled={isDeleting}
                className="text-sm"
              >
                {isDeleting ? '삭제 중...' : '할인 전단지 삭제'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 탭 메뉴 */}
        <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="bg-[#1f2223] border border-[#756d60]/50 rounded-lg p-1">
            <TabsTrigger value="info" className="data-[state=active]:bg-[#2a2f3a] data-[state=active]:text-white">
              할인 상품 정보
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="mt-6">
            {/* 할인 상품 항목 목록 */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#d9d6d1]">
                  날짜별 할인 상품 정보
                </h2>
                <Button 
                  onClick={handleAddNewItem}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  새 할인 날짜 추가
                </Button>
              </div>

              {/* 새로 추가된 할인 상품 항목 카드들 */}
              {newItems.length > 0 && (
                <div className="space-y-6 mb-8">
                  <h3 className="text-lg font-medium text-[#d9d6d1]">새 할인 상품 정보</h3>
                  
                  {newItems.map((tempId) => (
                    <DiscountItemCard
                      key={tempId}
                      isNew={true}
                      discountId={discount.id}
                      startDate={new Date(discountData.startDate)}
                      endDate={new Date(discountData.endDate)}
                      onSave={(data) => handleSaveNewItem(tempId, data)}
                      onDelete={() => handleCancelNewItem(tempId)}
                    />
                  ))}
                </div>
              )}

              {/* 기존 할인 상품 항목 목록 */}
              {discountItems.length > 0 ? (
                <div className="space-y-6">
                  {discountItems.map((item) => (
                    <DiscountItemCard
                      key={item.id}
                      isNew={false}
                      discountId={discount.id}
                      startDate={new Date(discountData.startDate)}
                      endDate={new Date(discountData.endDate)}
                      initialData={{
                        id: item.id,
                        discountId: item.discountId,
                        title: item.title,
                        description: item.description || undefined,
                        discountDate: new Date(item.discountDate),
                        imageUrl: item.imageUrl || undefined,
                        originalImageUrl: item.originalImageUrl || undefined,
                        imageSize: item.imageSize || undefined,
                        products: (item.products as any) || [],
                        ocrAnalyzed: item.ocrAnalyzed || false,
                      }}
                      onSave={handleUpdateItem}
                      onDelete={() => handleDeleteItem(item.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 bg-[#1f2223] border border-[#756d60]/30 rounded-xl">
                  <Info className="w-12 h-12 text-[#ada59b] mx-auto mb-4" />
                  <h3 className="text-[#e8e6e3] text-lg font-medium mb-2">등록된 할인 상품이 없습니다</h3>
                  <p className="text-[#ada59b] mb-6">새 할인 날짜를 추가하여 할인 상품 정보를 등록해보세요.</p>
                  <Button 
                    onClick={handleAddNewItem}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    새 할인 날짜 추가
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}