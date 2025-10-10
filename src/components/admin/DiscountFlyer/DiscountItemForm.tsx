'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, X, Loader2, Save, ArrowLeft, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { compressImage, validateImageFile, fileToBase64 } from '@/lib/utils/image-compression';
import { ProductInfo } from '@/lib/utils/ocr-analysis';
import { analyzeImageWithClaude } from '@/lib/utils/claude-ocr';
import { createDiscountItem, updateDiscountItem } from '@/actions/mart-discounts';
import { MartDiscount, MartDiscountItem } from '@/db/schema';
import { toast } from 'sonner';
import Link from 'next/link';

interface DiscountItemFormProps {
  martId: string;
  martName: string;
  martDiscount: MartDiscount;
  discountItem?: MartDiscountItem;
  isNew: boolean;
}

export default function DiscountItemForm({
  martId,
  martName,
  martDiscount,
  discountItem,
  isNew
}: DiscountItemFormProps) {
  const router = useRouter();
  
  const [date, setDate] = useState<Date | undefined>(
    discountItem ? new Date(discountItem.discountDate) : new Date()
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>(discountItem?.imageUrl || undefined);
  const [products, setProducts] = useState<ProductInfo[]>(
    discountItem?.products ? (discountItem.products as ProductInfo[]) : []
  );
  const [originalProducts, setOriginalProducts] = useState<ProductInfo[]>(
    discountItem?.originalProducts ? (discountItem.originalProducts as ProductInfo[]) : []
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setError(validation.error || '유효하지 않은 파일입니다.');
      return;
    }

    setIsUploading(true);

    try {
      const compressedFile = await compressImage(file);
      setImageFile(compressedFile);

      const base64 = await fileToBase64(compressedFile);
      setImagePreview(base64);

      setIsAnalyzing(true);
      const analyzedProducts = await analyzeImageWithClaude(base64);
      setOriginalProducts(analyzedProducts);
      setProducts([...analyzedProducts]);

    } catch (error) {
      console.error('이미지 처리 중 오류:', error);
      setError('이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const handleReanalyze = async () => {
    if (!imagePreview) {
      setError('다시 분석할 이미지가 없습니다.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      toast.info('Claude AI로 이미지를 다시 분석하는 중입니다...');
      const analyzedProducts = await analyzeImageWithClaude(imagePreview);
      setOriginalProducts(analyzedProducts);
      
      // 사용자가 수정한 상품 목록을 새로운 분석 결과로 업데이트
      setProducts([...analyzedProducts]);
      
      toast.success('이미지 분석이 완료되었습니다.');
    } catch (error) {
      console.error('이미지 재분석 중 오류:', error);
      setError('이미지 재분석 중 오류가 발생했습니다.');
      toast.error('이미지 재분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(undefined);
    setProducts([]);
    setOriginalProducts([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProductChange = (index: number, field: 'name' | 'price', value: string) => {
    const updatedProducts = [...products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setProducts(updatedProducts);
  };

  const handleRemoveProduct = (index: number) => {
    const updatedProducts = products.filter((_, i) => i !== index);
    setProducts(updatedProducts);
  };

  const handleAddProduct = () => {
    setProducts([...products, { name: '', price: '' }]);
  };

  const handleSave = async () => {
    if (!date) {
      setError('날짜를 선택해주세요.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const filteredProducts = products.filter(p => p.name.trim() && p.price.trim());
      
      if (isNew) {
        // 새 날짜별 할인 정보 생성
        const result = await createDiscountItem({
          discountId: martDiscount.id,
          discountDate: date,
          title: `${format(date, 'yyyy년 MM월 dd일', { locale: ko })} 할인 정보`,
          imageUrl: imagePreview,
          products: filteredProducts,
          originalProducts: originalProducts,
          ocrAnalyzed: filteredProducts.length > 0,
        });

        if (result.success) {
          toast.success('날짜별 할인 정보가 성공적으로 등록되었습니다.');
          router.push(`/admin/mart/edit/${martId}/discount-edit/${martDiscount.id}`);
        } else {
          setError(result.message || '등록 중 오류가 발생했습니다.');
        }
      } else {
        // 기존 날짜별 할인 정보 수정
        const result = await updateDiscountItem(discountItem!.id, {
          discountDate: date,
          imageUrl: imagePreview,
          products: filteredProducts,
          // originalProducts는 재분석한 경우에만 업데이트
          ...(originalProducts.length > 0 && { originalProducts }),
          ocrAnalyzed: filteredProducts.length > 0,
        });

        if (result.success) {
          toast.success('날짜별 할인 정보가 성공적으로 수정되었습니다.');
          router.push(`/admin/mart/edit/${martId}/discount-edit/${martDiscount.id}`);
        } else {
          setError(result.message || '수정 중 오류가 발생했습니다.');
        }
      }
    } catch (error) {
      console.error('저장 중 오류:', error);
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/admin/mart/edit/${martId}/discount-edit/${martDiscount.id}`);
  };

  return (
    <div className="min-h-screen bg-[#181a1b] text-white">
      {/* Header */}
      <div className="bg-[#080808]/60 border-b border-[#756d60]/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href={`/admin/mart/edit/${martId}/discount-edit/${martDiscount.id}`} 
              className="flex items-center gap-2 text-[#ada59b] hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">날짜별 할인 정보 목록</span>
            </Link>
            <div className="w-7 h-7 bg-[#181a1b] rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#d9d6d1] mb-2">
            {isNew ? '새 날짜별 할인 정보 등록' : '날짜별 할인 정보 수정'}
          </h1>
          <p className="text-[#afa89d]">{martName} - {martDiscount.title}</p>
          <p className="text-sm text-[#9d9588] mt-1">
            전단지 기간: {format(new Date(martDiscount.startDate), 'yyyy.MM.dd', { locale: ko })} - {format(new Date(martDiscount.endDate), 'yyyy.MM.dd', { locale: ko })}
          </p>
        </div>

        {/* Form */}
        <Card className="w-full bg-[#1f2223] border border-[#756d60]/50">
          <CardHeader>
            <CardTitle className="text-[#d9d6d1]">
              날짜별 할인 정보
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 날짜 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cecac4]">할인 날짜 *</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] hover:bg-[#43494b]/50",
                      !date && "text-muted-foreground"
                    )}
                    disabled={isSaving || isUploading || isAnalyzing}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "yyyy년 MM월 dd일", { locale: ko }) : "날짜를 선택하세요"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#1f2223] border-[#756d60]/50 text-[#e8e6e3]">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={isSaving || isUploading || isAnalyzing}
                  />
                </PopoverContent>
              </Popover>
              {error && error.includes('날짜') && (
                <p className="text-red-500 text-xs mt-1">{error}</p>
              )}
            </div>

            {/* 이미지 업로드 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#cecac4]">전단지 이미지</label>

              {!imagePreview ? (
                <div className="border-2 border-dashed border-[#6f675b] rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading || isAnalyzing || isSaving}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isAnalyzing || isSaving}
                    className="w-full bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] hover:bg-[#43494b]/50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        이미지 업로드
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-[#ada59b] mt-2">
                    JPG, PNG, WebP 형식 (최대 10MB)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="전단지 미리보기"
                      className="w-full h-64 object-cover rounded-lg border border-[#756d60]/50"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2"
                      disabled={isSaving || isUploading || isAnalyzing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {isAnalyzing && (
                    <div className="flex items-center justify-center p-4 bg-blue-900/20 rounded-lg text-blue-400">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="text-sm">Claude AI로 상품 정보 분석 중...</span>
                    </div>
                  )}

                  {/* 원본 Claude AI 분석 결과 미리보기 */}
                  {!isAnalyzing && originalProducts.length > 0 && (
                    <div className="mt-4 p-4 bg-[#181a1b] rounded-lg border border-[#756d60]/30">
                      <h4 className="text-sm font-medium mb-2 flex items-center text-[#d9d6d1]">
                      <Badge className="bg-green-900/30 text-green-400 text-xs font-medium px-2 py-0.5 rounded-full mr-2">
                        Claude AI 원본 분석 결과
                      </Badge>
                      인식된 상품 정보 (수정 불가)
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReanalyze}
                        disabled={isSaving || isUploading || isAnalyzing}
                        className="ml-2 bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] hover:bg-[#43494b]/50"
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        다시 분석
                      </Button>
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {originalProducts.map((product, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-2 bg-[#1f2223] rounded border border-[#756d60]/30"
                          >
                            <div className="font-medium text-[#e8e6e3]">{product.name}</div>
                            <div className="text-green-500 font-medium">{product.price}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 상품 목록 */}
            {imagePreview && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[#cecac4]">
                    상품 목록
                    <Badge className="ml-2 bg-blue-900/30 text-blue-400 text-xs font-medium px-2 py-0.5 rounded-full">
                      수정 가능
                    </Badge>
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddProduct}
                    disabled={isSaving || isUploading || isAnalyzing}
                    className="bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] hover:bg-[#43494b]/50"
                  >
                    상품 추가
                  </Button>
                </div>

                <div className="space-y-3">
                  {products.map((product, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 border border-[#756d60]/30 rounded-lg bg-[#1f2223]">
                      <div className="flex-1">
                        <Input
                          placeholder="상품명"
                          value={product.name}
                          onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                          className="bg-[#181a1b] border-[#6f675b] text-[#e8e6e3]"
                          disabled={isSaving || isUploading || isAnalyzing}
                        />
                      </div>
                      <div className="w-32">
                        <Input
                          placeholder="가격"
                          value={product.price}
                          onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                          className="bg-[#181a1b] border-[#6f675b] text-[#e8e6e3]"
                          disabled={isSaving || isUploading || isAnalyzing}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveProduct(index)}
                        disabled={isSaving || isUploading || isAnalyzing}
                        className="text-[#ada59b] hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 오류 메시지 */}
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isSaving || isUploading || isAnalyzing}
                className="flex-1 bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] hover:bg-[#43494b]/50"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || isUploading || isAnalyzing || !date}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isNew ? '등록하기' : '수정하기'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}