# MCP Weather Server 설치 및 설정 가이드

이 프로젝트에 MCP Weather Server가 성공적으로 설치되었습니다. 이 가이드는 설정 및 사용 방법을 안내합니다.

## 1. AccuWeather API 키 획득

1. [AccuWeather Developer Portal](https://developer.accuweather.com/)에 회원가입
2. 새 앱을 생성하여 API 키 획득 (무료 티어 사용 가능)
3. API 키를 안전하게 보관

## 2. 환경변수 설정

`.env.local` 파일에 다음 환경변수를 추가하세요:

```bash
# AccuWeather API (MCP Weather Server용)
ACCUWEATHER_API_KEY=your_accuweather_api_key_here
```

**중요**: 실제 API 키로 `your_accuweather_api_key_here`를 교체해야 합니다.

## 3. 프로젝트 구조

### 새로 추가된 파일들:

```
src/
├── lib/services/weather.ts              # 날씨 서비스 로직
├── app/api/weather/
│   ├── hourly/route.ts                  # 시간별 날씨 API
│   ├── daily/route.ts                   # 일별 날씨 API
│   └── health/route.ts                  # 서비스 상태 확인 API
├── components/weather/
│   └── WeatherDashboard.tsx             # 날씨 대시보드 컴포넌트
└── app/weather/page.tsx                 # 날씨 페이지

claude_desktop_config.json               # Claude Desktop MCP 설정
MCP_WEATHER_SETUP.md                    # 이 가이드 문서
```

## 4. 사용 방법

### 웹 인터페이스

1. 개발 서버 실행:
   ```bash
   npm run dev
   ```

2. 브라우저에서 `http://localhost:3000/weather` 접속

3. 날씨 대시보드에서:
   - 도시명 입력
   - 온도 단위 선택 (°C/°F)
   - 시간별 또는 일별 예보 조회

### API 엔드포인트

#### 시간별 날씨 (12시간)
```
GET /api/weather/hourly?location=서울&units=metric
POST /api/weather/hourly
```

#### 일별 날씨 (1-15일)
```
GET /api/weather/daily?location=서울&days=5&units=metric
POST /api/weather/daily
```

#### 서비스 상태 확인
```
GET /api/weather/health
```

### Claude Desktop에서 사용

1. `claude_desktop_config.json` 파일을 Claude Desktop 설정 디렉토리에 복사
2. 파일 내의 `your_accuweather_api_key_here`를 실제 API 키로 교체
3. Claude Desktop 재시작
4. 새 대화에서 플러그 아이콘 클릭 후 "weather" 선택

이제 Claude에게 다음과 같이 요청할 수 있습니다:
- "서울의 시간별 날씨 예보를 알려줘"
- "도쿄의 5일 예보를 화씨로 보여줘"
- "런던에 내일 비가 올까?"

## 5. 명령어 사용법

### MCP Weather Server 직접 실행
```bash
export ACCUWEATHER_API_KEY=your_api_key_here
npx -y @timlukahorstmann/mcp-weather
```

### HTTP/REST 접근 (supergateway 사용)
```bash
npx -y supergateway --stdio "npx -y @timlukahorstmann/mcp-weather" \
  --port 4004 \
  --baseUrl http://127.0.0.1:4004 \
  --ssePath /messages \
  --messagePath /message \
  --cors "*" \
  --env ACCUWEATHER_API_KEY="$ACCUWEATHER_API_KEY"
```

## 6. 사용 가능한 도구

### 시간별 날씨 예보
- **도구명**: `weather-get_hourly`
- **설명**: 다음 12시간의 시간별 예보
- **파라미터**:
  - `location` (필수): 도시 또는 지역명
  - `units` (선택): "metric" (°C, 기본값) 또는 "imperial" (°F)

### 일별 날씨 예보
- **도구명**: `weather-get_daily`
- **설명**: 최대 15일간의 일별 예보
- **파라미터**:
  - `location` (필수): 도시 또는 지역명
  - `days` (선택): 예보 일수 (1, 5, 10, 15 중 선택, 기본값: 5)
  - `units` (선택): "metric" (°C, 기본값) 또는 "imperial" (°F)

## 7. 환경변수 확인

`src/lib/env.ts` 파일에 `ACCUWEATHER_API_KEY`가 추가되어 타입 안전하게 사용할 수 있습니다:

```typescript
import { env } from '@/lib/env';

const apiKey = env.ACCUWEATHER_API_KEY;
```

## 8. 보안 참고사항

- API 키는 절대 클라이언트 사이드에 노출하지 마세요
- 모든 날씨 API는 인증된 사용자만 접근 가능합니다
- 환경변수는 `.env.local` 파일에 안전하게 저장됩니다

## 9. 문제 해결

### API 키 관련 오류
- `.env.local` 파일에 올바른 API 키가 설정되었는지 확인
- 개발 서버를 재시작 (`npm run dev`)

### 날씨 데이터 조회 실패
- 인터넷 연결 확인
- AccuWeather API 할당량 확인 (무료 티어: 월 50회 호출)
- `/api/weather/health` 엔드포인트로 서비스 상태 확인

### Claude Desktop 연동 문제
- `claude_desktop_config.json` 파일 위치 확인
- Claude Desktop 재시작
- MCP 서버 선택 여부 확인

## 10. 추가 개발

현재 구현은 기본적인 예시 데이터를 반환합니다. 실제 AccuWeather API와 연동하려면 `src/lib/services/weather.ts` 파일의 구현을 완성해야 합니다.

MCP Weather Server의 전체 기능을 활용하려면 실제 MCP 프로토콜을 통한 통신을 구현하거나, 제공된 NPM 패키지를 직접 활용할 수 있습니다.
