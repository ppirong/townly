'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Calendar, Edit, Trash2, ShoppingBag, DollarSign } from 'lucide-react';
import Image from 'next/image';
import { 
  getDiscountItems,
  deleteDiscountItem
} from '@/actions/mart-discounts';
import { MartDiscount, MartDiscountItem } from '@/db/schema';
import { toast } from 'sonner';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DiscountItemsListManagerProps {
  martId: string;
  martName: string;
  martDiscount: MartDiscount;
  initialDiscountItems: MartDiscountItem[];
}

export default function DiscountItemsListManager({ 
  martId, 
  martName, 
  martDiscount, 
  initialDiscountItems 
}: DiscountItemsListManagerProps) {
  const router = useRouter();
  const [discountItems, setDiscountItems] = useState<MartDiscountItem[]>(initialDiscountItems);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // 새 날짜별 할인 정보 등록 페이지로 이동
  const handleAddDiscountItem = () => {
    router.push(`/admin/mart/edit/${martId}/discount-item/new?discountId=${martDiscount.id}`);
  };

  // 날짜별 할인 정보 수정 페이지로 이동
  const handleEditDiscountItem = (itemId: string) => {
    console.log(`[DEBUG] 할인 정보 수정 페이지로 이동: martId=${martId}, itemId=${itemId}`);
    router.push(`/admin/mart/edit/${martId}/discount-item/${itemId}`);
  };

  // 날짜별 할인 정보 삭제
  const handleDeleteDiscountItem = async (itemId: string, discountDate: Date) => {
    const formattedDate = format(discountDate, 'yyyy년 MM월 dd일', { locale: ko });
    
    if (!confirm(`${formattedDate}의 할인 정보를 삭제하시겠습니까?`)) {
      return;
    }

    setIsDeleting(itemId);

    try {
      const result = await deleteDiscountItem(itemId);
      
      if (result.success) {
        toast.success('날짜별 할인 정보가 삭제되었습니다.');
        setDiscountItems(prev => prev.filter(item => item.id !== itemId));
      } else {
        toast.error(result.message || '삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('날짜별 할인 정보 삭제 오류:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(null);
    }
  };

  // 날짜 포맷팅
  const formatDiscountDate = (date: Date) => {
    return format(new Date(date), 'yyyy년 MM월 dd일 (EEE)', { locale: ko });
  };

  // 상품 개수 계산
  const getProductCount = (products: unknown) => {
    if (!products || !Array.isArray(products)) return 0;
    return products.length;
  };

  return (
    <div className="min-h-screen bg-[#181a1b] text-white">
      {/* Header */}
      <div className="bg-[#080808]/60 border-b border-[#756d60]/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href={`/admin/mart/edit/${martId}/discount-info`} 
              className="flex items-center gap-2 text-[#ada59b] hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">할인 전단지 목록</span>
            </Link>
            <div className="w-7 h-7 bg-[#181a1b] rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#d9d6d1] mb-2">날짜별 할인 정보</h1>
              <p className="text-[#afa89d]">{martName} - {martDiscount.title}</p>
              <p className="text-sm text-[#9d9588] mt-1">
                전단지 기간: {format(new Date(martDiscount.startDate), 'yyyy.MM.dd', { locale: ko })} - {format(new Date(martDiscount.endDate), 'yyyy.MM.dd', { locale: ko })}
              </p>
            </div>
          </div>
        </div>

        {/* Discount Items List */}
        {discountItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discountItems
              .sort((a, b) => new Date(a.discountDate).getTime() - new Date(b.discountDate).getTime())
              .map((item) => (
                <Card
                  key={item.id}
                  className="bg-transparent border border-[#756d60]/50 rounded-2xl overflow-hidden hover:border-[#756d60] transition-colors"
                >
                  {/* 할인 정보 이미지 */}
                  <div className="relative h-40 bg-[#18212e]">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={`${formatDiscountDate(item.discountDate)} 할인 정보`}
                        className="w-full h-full object-cover"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#18212e] to-[#2a2f3a]">
                        <div className="text-center">
                          <ShoppingBag className="w-8 h-8 text-[#ada59b] mx-auto mb-2" />
                          <p className="text-[#ada59b] text-sm">이미지 없음</p>
                        </div>
                      </div>
                    )}

                    {/* OCR 분석 완료 표시 */}
                    {item.ocrAnalyzed && (
                      <div className="absolute top-4 left-4 bg-green-900/20 backdrop-blur-sm rounded-lg px-3 py-1">
                        <span className="text-green-400 text-xs font-medium">OCR 분석 완료</span>
                      </div>
                    )}
                  </div>

                  {/* 할인 정보 */}
                  <CardContent className="p-4 space-y-3">
                    {/* 날짜 */}
                    <div className="flex items-center gap-2 text-[#e8e6e3]">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">{formatDiscountDate(item.discountDate)}</span>
                    </div>

                    {/* 상품 개수 */}
                    <div className="flex items-center gap-2 text-[#afa89d] text-sm">
                      <DollarSign className="w-3 h-3" />
                      <span>등록된 상품: {getProductCount(item.products)}개</span>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDiscountItem(item.id)}
                        className="flex-1 bg-[#43494b]/30 border-[#6f675b] text-[#52afff] hover:bg-[#43494b]/50 text-xs flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDiscountItem(item.id, item.discountDate)}
                        disabled={isDeleting === item.id}
                        className="flex-1 bg-[#43494b]/30 border-[#6f675b] text-[#ff6063] hover:bg-[#43494b]/50 text-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        {isDeleting === item.id ? (
                          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        삭제
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
            {/* 날짜별 할인 등록 카드 */}
            <Card
              className="bg-transparent border border-dashed border-[#756d60]/50 rounded-2xl overflow-hidden hover:border-[#756d60] transition-colors flex flex-col justify-center items-center h-[280px]"
            >
              <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full">
                <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-[#e8e6e3] text-lg font-semibold mb-2">날짜별 할인 등록</h3>
                <p className="text-[#afa89d] mb-4">새로운 날짜의 할인 정보를 등록하세요</p>
                <Button
                  onClick={handleAddDiscountItem}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  할인 등록하기
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-transparent border border-[#756d60]/50 rounded-2xl">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-[#ada59b] mx-auto mb-4" />
              <h3 className="text-[#e8e6e3] text-lg font-semibold mb-2">등록된 날짜별 할인 정보가 없습니다</h3>
              <p className="text-[#afa89d] mb-6">첫 번째 날짜별 할인 정보를 등록해보세요.</p>
              <Button
                onClick={handleAddDiscountItem}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                날짜별 할인 등록
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
