'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, X, Loader2, Trash2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { compressImage, validateImageFile, fileToBase64 } from '@/lib/utils/image-compression';
import { ProductInfo } from '@/lib/utils/ocr-analysis';
import { analyzeImageWithClaude } from '@/lib/utils/claude-ocr';

interface DiscountItemCardProps {
  onSave: (data: DiscountItemData) => Promise<void>;
  onDelete?: () => void;
  initialData?: Partial<DiscountItemData>;
  isNew?: boolean;
  discountId: string;
  startDate?: Date;
  endDate?: Date;
}

export interface DiscountItemData {
  id?: string;
  discountId: string;
  title: string;
  description?: string;
  discountDate: Date;
  imageUrl?: string;
  originalImageUrl?: string;
  imageSize?: number;
  products: ProductInfo[];
  ocrAnalyzed?: boolean;
}

export default function DiscountItemCard({ 
  onSave, 
  onDelete, 
  initialData, 
  isNew = true,
  discountId,
  startDate,
  endDate
}: DiscountItemCardProps) {
  const [date, setDate] = useState<Date | undefined>(
    initialData?.discountDate || new Date()
  );
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>(initialData?.imageUrl);
  const [products, setProducts] = useState<ProductInfo[]>(initialData?.products || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    
    // 파일 유효성 검사
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setError(validation.error || '유효하지 않은 파일입니다.');
      return;
    }

    setIsUploading(true);
    
    try {
      // 이미지 압축
      const compressedFile = await compressImage(file);
      setImageFile(compressedFile);
      
      // 미리보기 생성
      const base64 = await fileToBase64(compressedFile);
      setImagePreview(base64);
      
      // OCR 분석 시작 (Claude API 사용)
      setIsAnalyzing(true);
      const analyzedProducts = await analyzeImageWithClaude(base64);
      setProducts(analyzedProducts);
      
    } catch (error) {
      console.error('이미지 처리 중 오류:', error);
      setError('이미지 처리 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(undefined);
    setProducts([]);
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

  const validateDate = (): boolean => {
    if (!date) {
      setError('날짜를 선택해주세요.');
      return false;
    }

    // 날짜가 할인 기간 내에 있는지 확인
    if (startDate && endDate && date) {
      if (date < startDate || date > endDate) {
        setError(`날짜는 할인 기간(${format(startDate, 'yyyy-MM-dd')} ~ ${format(endDate, 'yyyy-MM-dd')}) 내에 있어야 합니다.`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateDate()) {
      return;
    }

    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const data: DiscountItemData = {
        id: initialData?.id,
        discountId: discountId,
        title: title.trim(),
        description: description.trim() || undefined,
        discountDate: date!,
        imageUrl: imagePreview,
        originalImageUrl: initialData?.originalImageUrl,
        imageSize: initialData?.imageSize,
        products: products.filter(p => p.name.trim() && p.price.trim()),
        ocrAnalyzed: products.length > 0,
      };

      await onSave(data);
    } catch (error) {
      console.error('저장 중 오류:', error);
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full border border-gray-200 shadow-sm">
      <CardHeader className="bg-gray-50 border-b border-gray-200">
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-medium">{isNew ? '새 할인 상품 정보' : '할인 상품 정보 수정'}</span>
          {!isNew && onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="ml-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* 날짜 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">할인 날짜 <span className="text-red-500">*</span></label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "yyyy년 MM월 dd일", { locale: ko }) : "날짜를 선택하세요"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                disabled={(d) => {
                  // 할인 기간 외의 날짜 비활성화
                  if (startDate && endDate) {
                    return d < startDate || d > endDate;
                  }
                  return false;
                }}
              />
            </PopoverContent>
          </Popover>
          {startDate && endDate && (
            <p className="text-xs text-gray-500">
              할인 기간: {format(startDate, "yyyy년 MM월 dd일")} ~ {format(endDate, "yyyy년 MM월 dd일")}
            </p>
          )}
        </div>

        {/* 제목 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">제목 <span className="text-red-500">*</span></label>
          <Input
            placeholder="할인 상품 제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* 설명 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">설명 (선택사항)</label>
          <Textarea
            placeholder="할인 상품에 대한 추가 설명을 입력하세요"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        {/* 이미지 업로드 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">상품 이미지 (선택사항)</label>
          
          {!imagePreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
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
              <p className="text-sm text-gray-500 mt-2">
                JPG, PNG, WebP 형식 (최대 10MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="할인 상품 미리보기"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {isAnalyzing && (
                <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="text-sm text-blue-700">Claude AI로 상품 정보 분석 중...</span>
                </div>
              )}
              
              {/* 인식된 상품 정보 미리보기 */}
              {!isAnalyzing && products.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full mr-2">
                      Claude AI 분석 결과
                    </span>
                    인식된 상품 정보
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {products.map((product, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-center p-2 bg-white rounded border border-gray-100 hover:bg-gray-50"
                      >
                        <div className="font-medium text-gray-800">{product.name}</div>
                        <div className="text-green-600 font-medium">{product.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 상품 목록 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">상품 목록</label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddProduct}
            >
              상품 추가
            </Button>
          </div>
          
          {products.length > 0 ? (
            <div className="space-y-3">
              {products.map((product, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Input
                      placeholder="상품명"
                      value={product.name}
                      onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      placeholder="가격"
                      value={product.price}
                      onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveProduct(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 border border-dashed rounded-lg">
              <p className="text-sm text-gray-500">등록된 상품이 없습니다. 상품을 추가하거나 이미지를 업로드하세요.</p>
            </div>
          )}
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* 저장 버튼 */}
        <Button
          onClick={handleSave}
          disabled={isSaving || isUploading || isAnalyzing}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              저장하기
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
