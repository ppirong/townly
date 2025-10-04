# Google Air Quality API 설정 가이드

Google Air Quality API의 400 오류를 해결하기 위한 설정 가이드입니다.

## 🔧 수정된 내용

### 1. API 요청 형식 수정
- `extraComputations` 필드명을 올바른 값으로 수정:
  - `DOMINANT_POLLUTANT` → `DOMINANT_POLLUTANT_CONCENTRATION`
  - `POLLUTANT_ADDITIONAL_INFO` 추가
- `universalAqi: true` 추가
- `pageSize` 매개변수 추가 (예보 API용)

### 2. 시간 기간 제한 문제 해결 (Google 공식 문서 기준)
- **기본 요청 방식으로 변경**: `period` 대신 `dateTime` 필드 사용
- **미래 시간 요청**: Google 문서에 따라 `dateTime`을 미래 시간으로 설정
- **시간 범위 제한**: 
  - 시간별 예보: **최대 96시간** (Google 공식 제한)
  - 일별 예보: **최대 4일** (Google 공식 제한)
- **정시 시간 사용**: 다음 정시를 시작점으로 설정

### 3. 오류 로깅 개선
- 상세한 요청/응답 로깅 추가
- 오류 발생 시 요청 본문도 함께 로깅

## 🚀 환경변수 설정

### 1. `.env.local` 파일 생성
프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Google Maps Platform API 키
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# 기타 필요한 환경변수들...
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
DATABASE_URL=your_database_url
```

### 2. Google Maps Platform API 키 발급

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com/ 접속
   - 프로젝트 선택 또는 새 프로젝트 생성

2. **API 활성화**
   - "API 및 서비스" → "라이브러리" 이동
   - "Air Quality API" 검색 후 활성화
   - "Maps JavaScript API"도 함께 활성화 (필요시)

3. **API 키 생성**
   - "API 및 서비스" → "사용자 인증 정보" 이동
   - "+ 사용자 인증 정보 만들기" → "API 키" 선택
   - 생성된 API 키를 복사

4. **API 키 제한 설정 (권장)**
   - 생성된 API 키 클릭
   - "API 제한사항"에서 "키 제한" 선택
   - "Air Quality API" 선택
   - "애플리케이션 제한사항"에서 적절한 제한 설정

## 🧪 테스트 방법

### 1. API 테스트 엔드포인트 사용
```bash
# 기본 테스트 (서울 좌표)
curl http://localhost:3000/api/test/google-air-quality

# 특정 좌표 테스트
curl "http://localhost:3000/api/test/google-air-quality?lat=37.5665&lng=126.9780"
```

### 2. 브라우저에서 테스트
개발 서버 실행 후 다음 URL 접속:
- http://localhost:3000/api/test/google-air-quality

### 3. 대시보드에서 테스트
- http://localhost:3000/airquality-google 페이지 접속
- 위치 권한 허용 후 대기질 정보 확인

## 📊 API 사용량 제한

### Google Air Quality API 무료 한도
- **월 10,000회 호출** (약 일 333회)
- 초과 시 과금 발생

### 사용량 모니터링
- 대시보드에서 실시간 사용량 확인 가능
- API 호출 로그는 데이터베이스에 저장됨

## 🔍 문제 해결

### 400 오류 발생 시

#### 1. "The specified time period is not supported" 오류
- **원인**: 시간 범위가 API 제한을 초과하거나 현재 시간을 사용
- **해결책**: 
  - **미래 시간 사용**: `dateTime`을 다음 정시로 설정
  - **Google 공식 제한 준수**: 
    - 시간별 예보: 최대 96시간
    - 일별 예보: 최대 4일
  - **기본 요청 방식 사용**: `period` 대신 `dateTime` 필드 사용

#### 2. API 키 관련 오류
1. **API 키 확인**
   ```bash
   # 환경변수 확인
   echo $GOOGLE_MAPS_API_KEY
   ```

2. **API 활성화 확인**
   - Google Cloud Console에서 Air Quality API 활성화 여부 확인

#### 3. 요청 형식 오류
- 콘솔 로그에서 요청 본문 확인
- 위도/경도 값이 올바른 범위인지 확인 (-90~90, -180~180)

### 403 오류 발생 시
- API 키 권한 설정 확인
- 결제 정보 등록 여부 확인
- API 사용량 한도 초과 여부 확인

### 429 오류 발생 시
- API 호출 빈도 제한 초과
- 잠시 후 다시 시도하거나 호출 빈도 조절

## 📝 주요 변경사항

### `src/lib/services/google-air-quality.ts`
- **API 요청 방식 변경**: `period` → `dateTime` 필드 사용
- **미래 시간 요청**: Google 문서에 따라 다음 정시를 시작점으로 설정
- **Google 공식 제한 준수**: 최대 96시간(4일) 제한 적용
- API 요청 형식을 Google 공식 문서에 맞게 수정
- 오류 로깅 개선 및 응답 데이터 로깅 추가

### `src/actions/google-air-quality.ts`
- **Google 공식 제한 적용**: 
  - 시간별 예보: 최대 96시간
  - 일별 예보: 최대 4일
- Zod 스키마를 Google 공식 제한에 맞게 수정

### 새로 추가된 파일
- `src/app/api/test/google-air-quality/route.ts`: API 테스트 엔드포인트

## 🎯 다음 단계

1. `.env.local` 파일에 Google Maps API 키 설정
2. 개발 서버 재시작
3. 테스트 엔드포인트로 API 동작 확인
4. 대시보드에서 실제 사용 테스트

이제 Google Air Quality API가 올바른 형식으로 요청을 보내므로 400 오류가 해결될 것입니다.
