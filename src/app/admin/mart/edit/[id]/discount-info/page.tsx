"use client";

import { Suspense } from 'react';
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMart } from "@/actions/mart";
import { getMartDiscounts, deleteMartDiscount, getDiscountWithItems } from "@/actions/mart-discounts";
import { createEmptyDiscount } from "@/actions/create-empty-discount";
import { updateDiscountPeriod } from "@/actions/update-discount-period";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import { ArrowLeft, Plus, Calendar, MapPin, Clock, DollarSign, CheckCircle, Edit, Trash2, Tag, ShoppingBag } from 'lucide-react';

interface DiscountFlyer {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  discountRate?: string;
  itemCount?: number;
  productCount?: number;
  createdAt: Date;
}

function DiscountInfoContent() {
  const params = useParams();
  const router = useRouter();
  const martId = params.id as string;
  
  const [martName, setMartName] = useState<string>('');
  const [discountFlyers, setDiscountFlyers] = useState<DiscountFlyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

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
        
        // 할인 전단지 데이터 조회
        const discountResult = await getMartDiscounts(martId);
        
        if (discountResult.success && discountResult.data) {
          // 각 할인 전단지의 할인 상품 항목 수 조회
          const discountsWithItems = await Promise.all(
            discountResult.data.map(async (discount) => {
              const itemsResult = await getDiscountWithItems(discount.id);
              const itemCount = itemsResult.success ? itemsResult.data?.items.length || 0 : 0;
              
              // 모든 상품 수 계산
              let productCount = 0;
              if (itemsResult.success && itemsResult.data?.items) {
                itemsResult.data.items.forEach(item => {
                  if (item.products && Array.isArray(item.products)) {
                    productCount += (item.products as any).length;
                  }
                });
              }
              
              return {
                id: discount.id,
                title: discount.title,
                description: discount.description || undefined,
                startDate: new Date(discount.startDate),
                endDate: new Date(discount.endDate),
                discountRate: discount.discountRate || undefined,
                itemCount,
                productCount,
                createdAt: new Date(discount.createdAt),
              };
            })
          );
          
          setDiscountFlyers(discountsWithItems);
        } else {
          // 데이터가 없거나 오류가 발생한 경우 빈 배열로 설정
          setDiscountFlyers([]);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error("마트 정보 조회 오류:", err);
        setError("마트 정보를 불러오는 중 오류가 발생했습니다.");
        setIsLoading(false);
      }
    };
    
    fetchMartData();
  }, [martId]);

  // 행사 기간 포맷팅
  const formatEventPeriod = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const formatDate = (date: Date) => {
      return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`;
    };
    
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  // 빈 할인 전단지 생성 후 수정 페이지로 이동
  const handleAddDiscount = async () => {
    try {
      // 로딩 표시
      toast.loading('할인 전단지를 생성하는 중입니다...');
      
      // 빈 할인 전단지 생성
      const result = await createEmptyDiscount(martId);
      
      if (result.success && result.data?.id) {
        toast.dismiss();
        toast.success('할인 전단지가 생성되었습니다. 정보를 입력해주세요.');
        
        // 생성된 할인 전단지의 수정 페이지로 이동
        router.push(`/admin/mart/edit/${martId}/discount-edit/${result.data.id}`);
      } else {
        toast.dismiss();
        toast.error(result.message || '할인 전단지 생성에 실패했습니다.');
      }
    } catch (error) {
      toast.dismiss();
      console.error('할인 전단지 생성 오류:', error);
      toast.error('할인 전단지 생성 중 오류가 발생했습니다.');
    }
  };

  // 할인 전단지 수정 페이지로 이동
  const handleEditDiscount = (discountId: string) => {
    router.push(`/admin/mart/edit/${martId}/discount-edit/${discountId}`);
  };
  
  // 할인 기간 업데이트
  const handleUpdateDiscountPeriod = async (discountId: string) => {
    setIsUpdating(discountId);
    
    try {
      const result = await updateDiscountPeriod(discountId);
      
      if (result.success) {
        toast.success(result.message || '할인 기간이 업데이트되었습니다');
        
        // 목록에서 해당 항목 업데이트
        setDiscountFlyers(prev => prev.map(flyer => {
          if (flyer.id === discountId && result.data) {
            return {
              ...flyer,
              startDate: new Date(result.data.startDate),
              endDate: new Date(result.data.endDate)
            };
          }
          return flyer;
        }));
      } else {
        toast.error(result.message || '업데이트 중 오류가 발생했습니다');
      }
    } catch (error) {
      console.error('할인 기간 업데이트 오류:', error);
      toast.error('업데이트 중 오류가 발생했습니다');
    } finally {
      setIsUpdating(null);
    }
  };

  // 할인 전단지 삭제
  const handleDeleteDiscount = async (discountId: string, title: string) => {
    if (!confirm(`"${title}" 할인 전단지를 삭제하시겠습니까? 모든 할인 상품 정보도 함께 삭제됩니다.`)) {
      return;
    }

    setIsDeleting(discountId);

    try {
      const result = await deleteMartDiscount(discountId);

      if (result.success) {
        toast.success(result.message || '할인 전단지가 삭제되었습니다');
        
        // 목록에서 삭제된 항목 제거
        setDiscountFlyers(prev => prev.filter(flyer => flyer.id !== discountId));
      } else {
        toast.error(result.message || '삭제 중 오류가 발생했습니다');
      }
    } catch (error) {
      console.error('할인 전단지 삭제 오류:', error);
      toast.error('삭제 중 오류가 발생했습니다');
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#181a1b] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-white text-lg">할인 정보를 불러오는 중...</p>
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
              <Link href={`/admin/mart/edit/${martId}`} className="flex items-center gap-2 text-[#ada59b] hover:text-white">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">마트 정보 수정</span>
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
            <Link href={`/admin/mart/edit/${martId}`} className="flex items-center gap-2 text-[#ada59b] hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">마트 정보 수정</span>
            </Link>
            <div className="w-7 h-7 bg-[#181a1b] rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#d9d6d1] mb-2">등록된 할인 정보</h1>
              <p className="text-[#afa89d]">{martName}의 할인 전단지를 확인해보세요.</p>
            </div>
            <Button 
              onClick={handleAddDiscount}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              할인 전단지 등록
            </Button>
          </div>
        </div>

        {/* Discount Flyers Grid */}
        {discountFlyers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discountFlyers.map((flyer) => (
              <Card 
                key={flyer.id} 
                className="bg-transparent border border-[#756d60]/50 rounded-2xl overflow-hidden hover:border-[#756d60] transition-colors"
              >
                {/* 할인 전단지 헤더 */}
                <div className="bg-[#18212e] p-4">
                  <h3 className="text-[#e8e6e3] font-semibold text-lg mb-2">{flyer.title}</h3>
                  
                  {/* 할인율 배지 */}
                  {flyer.discountRate && (
                    <div className="inline-block bg-[#7204c1]/20 backdrop-blur-sm rounded-lg px-3 py-1 mb-2">
                      <span className="text-[#cd96ff] text-xs font-medium">{flyer.discountRate} 할인</span>
                    </div>
                  )}
                  
                  {/* 할인 상품 항목 수 배지 */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <div className="inline-flex items-center bg-[#2a3a4a] rounded-full px-3 py-1">
                      <Calendar className="w-3 h-3 text-blue-400 mr-1" />
                      <span className="text-[#8ab4d8] text-xs">{flyer.itemCount || 0}개 날짜</span>
                    </div>
                    
                    <div className="inline-flex items-center bg-[#2a3a4a] rounded-full px-3 py-1">
                      <ShoppingBag className="w-3 h-3 text-blue-400 mr-1" />
                      <span className="text-[#8ab4d8] text-xs">{flyer.productCount || 0}개 상품</span>
                    </div>
                  </div>
                </div>

                {/* 할인 정보 */}
                <CardContent className="p-4 space-y-3">
                  {/* 상세 정보 */}
                  <div className="space-y-2">
                    {/* 행사 기간 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#afa89d] text-xs">
                        <Calendar className="w-3 h-3" />
                        <span>{formatEventPeriod(flyer.startDate, flyer.endDate)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateDiscountPeriod(flyer.id)}
                        disabled={isUpdating === flyer.id}
                        className="bg-[#43494b]/30 border-[#6f675b] text-[#52afff] hover:bg-[#43494b]/50 text-xs flex items-center gap-1 h-6 px-2 disabled:opacity-50"
                      >
                        {isUpdating === flyer.id ? (
                          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                        ) : null}
                        업데이트
                      </Button>
                    </div>

                    {/* 설명 */}
                    {flyer.description && (
                      <div className="flex items-start gap-2 text-[#afa89d] text-xs">
                        <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{flyer.description}</span>
                      </div>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditDiscount(flyer.id)}
                      className="flex-1 bg-[#43494b]/30 border-[#6f675b] text-[#52afff] hover:bg-[#43494b]/50 text-xs flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      수정
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDiscount(flyer.id, flyer.title)}
                      disabled={isDeleting === flyer.id}
                      className="flex-1 bg-[#43494b]/30 border-[#6f675b] text-[#ff6063] hover:bg-[#43494b]/50 text-xs flex items-center gap-1 disabled:opacity-50"
                    >
                      {isDeleting === flyer.id ? (
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
          </div>
        ) : (
          <Card className="bg-transparent border border-[#756d60]/50 rounded-2xl">
            <CardContent className="p-12 text-center">
              <DollarSign className="w-16 h-16 text-[#ada59b] mx-auto mb-4" />
              <h3 className="text-[#e8e6e3] text-lg font-semibold mb-2">등록된 할인 정보가 없습니다</h3>
              <p className="text-[#afa89d] mb-6">첫 번째 할인 전단지를 등록해보세요.</p>
              <Button 
                onClick={handleAddDiscount}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                할인 전단지 등록
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function DiscountInfoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#181a1b] flex items-center justify-center">
      <div className="text-white">로딩 중...</div>
    </div>}>
      <DiscountInfoContent />
      <Toaster position="top-center" richColors />
    </Suspense>
  );
}