"use client";

import { Suspense } from 'react';
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMart, updateMart } from "@/actions/mart";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import { ArrowLeft, Save, Check } from 'lucide-react';

// 지역 데이터
const REGIONS = {
  '서울특별시': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
  '부산광역시': ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
  '대구광역시': ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
  '인천광역시': ['강화군', '계양구', '미추홀구', '남동구', '동구', '부평구', '서구', '연수구', '옹진군', '중구'],
  '광주광역시': ['광산구', '남구', '동구', '북구', '서구'],
  '대전광역시': ['대덕구', '동구', '서구', '유성구', '중구'],
  '울산광역시': ['남구', '동구', '북구', '울주군', '중구'],
  '세종특별자치시': ['세종시'],
  '경기도': ['가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
  '강원도': ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'],
  '충청북도': ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '진천군', '청주시', '충주시', '증평군'],
  '충청남도': ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '연기군', '예산군', '천안시', '청양군', '태안군', '홍성군'],
  '전라북도': ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'],
  '전라남도': ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
  '경상북도': ['경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'],
  '경상남도': ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'],
  '제주특별자치도': ['서귀포시', '제주시']
};

interface MartFormData {
  name: string;
  managerName: string;
  managerPhone: string;
  address: string;
  latitude: string;
  longitude: string;
  businessHours: string;
  region: string;
  detailRegion: string;
}

function MartEditContent() {
  const params = useParams();
  const router = useRouter();
  const martId = params.id as string;
  
  const [activeTab, setActiveTab] = useState('mart-info');

  // 탭 변경 핸들러
  const handleTabChange = (value: string) => {
    if (value === 'discount-info') {
      // 할인 정보 탭 클릭 시 할인 정보 페이지로 이동
      router.push(`/admin/mart/edit/${martId}/discount-info`);
      return;
    }
    setActiveTab(value);
  };
  const [formData, setFormData] = useState<MartFormData>({
    name: '',
    managerName: '',
    managerPhone: '',
    address: '',
    latitude: '',
    longitude: '',
    businessHours: '',
    region: '',
    detailRegion: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof MartFormData, string>>>({});
  const [detailRegions, setDetailRegions] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 폼 검증 함수
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof MartFormData, string>> = {};
    
    // 필수 필드 검증
    if (!formData.name.trim()) newErrors.name = '마트 이름을 입력해주세요';
    if (!formData.managerName.trim()) newErrors.managerName = '담당자 이름을 입력해주세요';
    if (!formData.managerPhone.trim()) newErrors.managerPhone = '담당자 연락처를 입력해주세요';
    if (!formData.address.trim()) newErrors.address = '마트 주소를 입력해주세요';
    if (!formData.businessHours.trim()) newErrors.businessHours = '영업 시간을 입력해주세요';
    if (!formData.region) newErrors.region = '지역을 선택해주세요';
    if (!formData.detailRegion && formData.region) newErrors.detailRegion = '상세 지역을 선택해주세요';
    
    // 위도/경도 형식 검증 (입력된 경우에만)
    const latRegex = /^-?([1-8]?\d(\.\d+)?|90(\.0+)?)$/;
    const lngRegex = /^-?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
    
    if (formData.latitude && formData.latitude.trim() && !latRegex.test(formData.latitude)) {
      newErrors.latitude = '올바른 위도 형식이 아닙니다 (-90 ~ 90)';
    }
    
    if (formData.longitude && formData.longitude.trim() && !lngRegex.test(formData.longitude)) {
      newErrors.longitude = '올바른 경도 형식이 아닙니다 (-180 ~ 180)';
    }
    
    // 전화번호 형식 검증
    const phoneRegex = /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/;
    if (formData.managerPhone && !phoneRegex.test(formData.managerPhone)) {
      newErrors.managerPhone = '올바른 전화번호 형식이 아닙니다';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 지역 선택 시 상세 지역 업데이트
  useEffect(() => {
    if (formData.region && REGIONS[formData.region as keyof typeof REGIONS]) {
      setDetailRegions(REGIONS[formData.region as keyof typeof REGIONS]);
      if (!REGIONS[formData.region as keyof typeof REGIONS].includes(formData.detailRegion)) {
        setFormData(prev => ({ ...prev, detailRegion: '' }));
      }
    } else {
      setDetailRegions([]);
    }
  }, [formData.region]);

  // 전화번호 포맷팅
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleInputChange = (field: keyof MartFormData, value: string) => {
    if (field === 'managerPhone') {
      value = formatPhoneNumber(value);
    }
    
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
        
        // 지역 정보 분리 (예: "경기도 성남시" -> "경기도", "성남시")
        const regionParts = data.region ? data.region.split(" ") : ["", ""];
        const mainRegion = regionParts[0] || "";
        const subRegion = regionParts.slice(1).join(" ") || "";
        
        // 폼 데이터 설정
        setFormData({
          name: data.name || "",
          managerName: "", // 백엔드에 저장되어 있지 않으면 빈 문자열로 설정
          managerPhone: data.phone || "",
          address: data.address || "",
          latitude: data.latitude || "",
          longitude: data.longitude || "",
          businessHours: data.responseTime || "", // responseTime 필드에 영업 시간이 저장됨
          region: mainRegion,
          detailRegion: subRegion,
        });
        
        setIsLoading(false);
      } catch (err) {
        console.error("마트 정보 조회 오류:", err);
        setError("마트 정보를 불러오는 중 오류가 발생했습니다.");
        setIsLoading(false);
      }
    };
    
    fetchMartData();
  }, [martId]);

  const handleSubmit = async () => {
    // 폼 검증
    if (!validateForm()) {
      toast.error('필수 항목을 모두 입력해주세요');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await updateMart(martId, formData);
      
      if (result.success) {
        toast.success(result.message || '마트 정보가 수정되었습니다');
        setSuccessMessage('마트 정보가 수정되었습니다');
        
        // 1.5초 후 마트 관리 페이지로 이동
        setTimeout(() => {
          router.push('/admin/mart');
        }, 1500);
      } else {
        toast.error(result.message || '오류가 발생했습니다');
      }
    } catch (error) {
      console.error('마트 수정 오류:', error);
      toast.error(error instanceof Error ? error.message : '오류가 발생했습니다');
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
              <Link href="/admin/mart" className="flex items-center gap-2 text-[#ada59b] hover:text-white">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">마트 관리</span>
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
            <Link href="/admin/mart" className="flex items-center gap-2 text-[#ada59b] hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">마트 관리</span>
            </Link>
            <div className="w-7 h-7 bg-[#181a1b] rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">마트 정보를 수정해 주세요</h1>
          <p className="text-[#afa89d] text-lg">마트 정보를 수정해 주세요</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#18212e]/50 border border-[#756d60] rounded-lg mb-8">
            <TabsTrigger 
              value="mart-info" 
              className="data-[state=active]:bg-[#43494b]/30 data-[state=active]:border data-[state=active]:border-[#6f675b] data-[state=active]:text-[#e5e3df] text-[#ada59b]"
            >
              마트 정보
            </TabsTrigger>
            <TabsTrigger 
              value="discount-info"
              className="data-[state=active]:bg-[#43494b]/30 data-[state=active]:border data-[state=active]:border-[#6f675b] data-[state=active]:text-[#e5e3df] text-[#ada59b]"
            >
              할인 정보
            </TabsTrigger>
            <TabsTrigger 
              value="discount-schedule"
              className="data-[state=active]:bg-[#43494b]/30 data-[state=active]:border data-[state=active]:border-[#6f675b] data-[state=active]:text-[#e5e3df] text-[#ada59b]"
            >
              할인 일정
            </TabsTrigger>
          </TabsList>

          {/* 마트 정보 탭 */}
          <TabsContent value="mart-info" className="space-y-6">
            {/* 기본 정보 */}
            <Card className="bg-transparent border border-[#756d60]/50 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-[#e8e6e3] text-xl font-semibold flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#e8e6e3] rounded"></div>
                  기본 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[#cecac4] text-sm font-medium">
                      마트 이름 *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      maxLength={20}
                      className={`bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="마트 이름을 입력하세요"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="managerName" className="text-[#cecac4] text-sm font-medium">
                      마트 담당자 이름 *
                    </Label>
                    <Input
                      id="managerName"
                      value={formData.managerName}
                      onChange={(e) => handleInputChange('managerName', e.target.value)}
                      maxLength={20}
                      className={`bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg ${errors.managerName ? 'border-red-500' : ''}`}
                      placeholder="담당자 이름을 입력하세요"
                    />
                    {errors.managerName && (
                      <p className="text-red-500 text-xs mt-1">{errors.managerName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="managerPhone" className="text-[#cecac4] text-sm font-medium">
                    마트 담당자 연락처 *
                  </Label>
                  <Input
                    id="managerPhone"
                    value={formData.managerPhone}
                    onChange={(e) => handleInputChange('managerPhone', e.target.value)}
                    className={`bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg ${errors.managerPhone ? 'border-red-500' : ''}`}
                    placeholder="010-0000-0000"
                  />
                  {errors.managerPhone ? (
                    <p className="text-red-500 text-xs mt-1">{errors.managerPhone}</p>
                  ) : (
                    <p className="text-[#9d9588] text-xs">숫자만 입력하시면 자동으로 하이픈이 추가됩니다</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-[#cecac4] text-sm font-medium">
                    마트 주소 *
                  </Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    maxLength={30}
                    className={`bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg ${errors.address ? 'border-red-500' : ''}`}
                    placeholder="마트 주소를 입력하세요"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-xs mt-1">{errors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="latitude" className="text-[#cecac4] text-sm font-medium">
                      위도 <span className="text-[#9d9588]">(선택)</span>
                    </Label>
                    <Input
                      id="latitude"
                      value={formData.latitude}
                      onChange={(e) => handleInputChange('latitude', e.target.value)}
                      className={`bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg ${errors.latitude ? 'border-red-500' : ''}`}
                      placeholder="37.5665"
                    />
                    {errors.latitude && (
                      <p className="text-red-500 text-xs mt-1">{errors.latitude}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude" className="text-[#cecac4] text-sm font-medium">
                      경도 <span className="text-[#9d9588]">(선택)</span>
                    </Label>
                    <Input
                      id="longitude"
                      value={formData.longitude}
                      onChange={(e) => handleInputChange('longitude', e.target.value)}
                      className={`bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg ${errors.longitude ? 'border-red-500' : ''}`}
                      placeholder="126.9780"
                    />
                    {errors.longitude && (
                      <p className="text-red-500 text-xs mt-1">{errors.longitude}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessHours" className="text-[#cecac4] text-sm font-medium">
                    마트 영업 시간 *
                  </Label>
                  <Input
                    id="businessHours"
                    value={formData.businessHours}
                    onChange={(e) => handleInputChange('businessHours', e.target.value)}
                    maxLength={30}
                    className={`bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg ${errors.businessHours ? 'border-red-500' : ''}`}
                    placeholder="오전 9시 - 오후 10시"
                  />
                  {errors.businessHours && (
                    <p className="text-red-500 text-xs mt-1">{errors.businessHours}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="region" className="text-[#cecac4] text-sm font-medium">
                      마트 위치 지역 *
                    </Label>
                    <Select value={formData.region} onValueChange={(value) => handleInputChange('region', value)}>
                      <SelectTrigger className={`bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg ${errors.region ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="지역을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#43494b] border-[#6f675b]">
                        {Object.keys(REGIONS).map((region) => (
                          <SelectItem key={region} value={region} className="text-[#e8e6e3] focus:bg-[#6f675b]">
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.region && (
                      <p className="text-red-500 text-xs mt-1">{errors.region}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="detailRegion" className="text-[#cecac4] text-sm font-medium">
                      마트 위치 상세 지역 *
                    </Label>
                    <Select 
                      value={formData.detailRegion} 
                      onValueChange={(value) => handleInputChange('detailRegion', value)}
                      disabled={!formData.region}
                    >
                      <SelectTrigger className={`bg-[#43494b]/30 border-[#6f675b] text-[#e8e6e3] rounded-lg ${errors.detailRegion ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="상세 지역을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#43494b] border-[#6f675b]">
                        {detailRegions.map((region) => (
                          <SelectItem key={region} value={region} className="text-[#e8e6e3] focus:bg-[#6f675b]">
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.detailRegion && (
                      <p className="text-red-500 text-xs mt-1">{errors.detailRegion}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 할인 정보 탭 */}
          <TabsContent value="discount-info" className="space-y-6">
            <Card className="bg-transparent border border-[#756d60]/50 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-[#e8e6e3] text-xl font-semibold">할인 정보</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                <p className="text-[#ada59b] mb-6">할인 전단지를 관리하고 등록할 수 있습니다.</p>
                <Link href={`/admin/mart/edit/${martId}/discount-info`}>
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium">
                    할인 정보 관리하기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 할인 일정 탭 */}
          <TabsContent value="discount-schedule" className="space-y-6">
            <Card className="bg-transparent border border-[#756d60]/50 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-[#e8e6e3] text-xl font-semibold">할인 일정</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[#ada59b]">할인 일정 설정 기능은 추후 구현 예정입니다.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                처리 중...
              </>
            ) : successMessage ? (
              <>
                <Check className="w-4 h-4" />
                {successMessage}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                수정 완료
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EditMartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#181a1b] flex items-center justify-center">
      <div className="text-white">로딩 중...</div>
    </div>}>
      <MartEditContent />
      <Toaster position="top-center" richColors />
    </Suspense>
  );
}