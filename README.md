# Townly - 하이퍼 로컬 정보 에이전트

GPS 기반으로 위치별 맞춤화된 날씨, 미세먼지, 마트 할인 정보를 카카오톡으로 제공하는 서비스입니다.

## 🚀 현재 구현 상태

### ✅ 완료된 기능
- **반응형 웹 인터페이스**: 모바일/태블릿/데스크톱 지원
- **홈페이지**: 서비스 소개 및 기능 안내
- **대시보드**: 사용자 통계, 최근 활동, 빠른 설정
- **프로필 페이지**: 사용자 정보 관리 및 설정
- **위치 서비스**: GPS 기반 현재 위치 수집
- **데모 모드**: Clerk API 키 없이도 UI 확인 가능

### 🎨 디자인 시스템
- **브랜딩**: 카카오 컬러 시스템 적용 (#FEE500)
- **아이콘**: 이모지 기반 직관적 UI
- **반응형**: Tailwind CSS로 모든 화면 크기 지원
- **접근성**: 명확한 색상 대비 및 사용성

## 🛠️ 기술 스택

### Frontend
- **Next.js 14**: App Router, TypeScript
- **Tailwind CSS**: 반응형 스타일링
- **React**: 컴포넌트 기반 UI

### Authentication (설정 필요)
- **Clerk**: 소셜 로그인 (카카오 전용)
- **Middleware**: 보호된 라우트 관리

### APIs (향후 통합)
- **AccuWeather**: 날씨 정보
- **에어코리아**: 미세먼지 농도
- **카카오맵**: 위치 정보
- **OpenAI**: AI 에이전트

## 🚦 시작하기

### 1. 프로젝트 클론
```bash
git clone [repository-url]
cd townly
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 브라우저에서 확인
http://localhost:3000 접속

## 🔧 Clerk 인증 설정 (선택)

실제 카카오 로그인 기능을 사용하려면:

### 1. Clerk 계정 생성
- https://clerk.com 에서 무료 계정 생성
- 새 애플리케이션 생성

### 2. 환경 변수 설정
`.env.local` 파일 생성:
```bash
# Clerk 환경 변수
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here
```

### 3. 카카오 개발자 설정
- [카카오 디벨로퍼스](https://developers.kakao.com/) 앱 생성
- Clerk에서 카카오 OAuth 연동 설정
- Redirect URI: `https://your-clerk-domain.clerk.accounts.dev/v1/oauth_callback`

### 4. 파일 복원
```bash
# Clerk 포함 버전으로 복원
mv src/app/layout.tsx src/app/layout-demo.tsx
mv src/app/layout-with-clerk.tsx src/app/layout.tsx

mv src/app/page.tsx src/app/page-demo.tsx  
mv src/app/page-with-clerk.tsx src/app/page.tsx
```

## 📱 주요 기능

### 🏠 홈페이지
- 서비스 소개 및 특징
- 카카오 브랜딩
- CTA 버튼 및 가입 유도

### 📊 대시보드
- 사용자 통계 (알림 수, 절약 금액 등)
- 최근 활동 타임라인
- 빠른 설정 메뉴
- 실시간 정보 카드

### 👤 프로필 페이지
- 사용자 정보 요약
- 계정 설정 관리
- 알림 설정
- 빠른 작업 메뉴

### 📍 위치 서비스
- GPS 기반 현재 위치 수집
- 사용자 권한 요청
- 좌표 → 주소 변환 준비

## 🎯 다음 개발 단계

### 우선순위 1: 백엔드 API 통합
- [ ] AccuWeather API 연동
- [ ] 에어코리아 API 연동
- [ ] 카카오맵 API 연동
- [ ] OpenAI API 연동

### 우선순위 2: 데이터베이스
- [ ] PostgreSQL 스키마 설계
- [ ] Drizzle ORM 설정
- [ ] 사용자 데이터 저장
- [ ] 알림 히스토리 관리

### 우선순위 3: 카카오톡 봇
- [ ] 카카오 i 오픈빌더 설정
- [ ] 웹훅 스킬 서버 구현
- [ ] 메시지 템플릿 개발
- [ ] 실시간 알림 시스템

### 우선순위 4: 고급 기능
- [ ] 마트 할인 정보 크롤링
- [ ] AI 기반 추천 시스템
- [ ] 사용자 선호도 학습
- [ ] 알림 스케줄링

## 📂 프로젝트 구조

```
townly/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── dashboard/         # 대시보드 페이지
│   │   ├── profile/           # 프로필 페이지
│   │   ├── sign-in/           # 로그인 페이지
│   │   └── sign-up/           # 회원가입 페이지
│   ├── components/            # 재사용 컴포넌트
│   │   └── WelcomeDashboard.tsx
│   └── middleware.ts          # Clerk 미들웨어
├── public/                    # 정적 파일
└── README.md                  # 프로젝트 문서
```

## 🔍 개발 모드 vs 운영 모드

### 현재 (데모 모드)
- Clerk API 키 없이 UI 확인 가능
- 모든 기능 시각적 구현
- 가상 데이터로 기능 시연

### 운영 모드 (Clerk 설정 후)
- 실제 카카오 로그인 가능
- 사용자별 데이터 관리
- 보호된 라우트 접근 제어

## 🤝 기여하기

1. Fork 프로젝트
2. Feature 브랜치 생성
3. 변경사항 커밋
4. Pull Request 생성

## 📄 라이센스

MIT License

## 📞 지원

문의사항이나 버그 리포트는 Issues를 통해 알려주세요.

---

**🎉 현재 상태**: UI/UX 완성, API 통합 준비 완료! 
**⏭️ 다음 단계**: Clerk 설정 또는 외부 API 통합