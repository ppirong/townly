# 스마트 TTL 전략 변경 가이드

## 개요

AccuWeather API와 Google Air Quality API를 6시, 12시, 18시, 24시에 정해진 시각에 배치로 호출하여 데이터를 수집하는 방식으로 변경됨에 따라, 스마트 TTL 전략을 전면 재설계했습니다.

---

## 1. 이전 방식 (On-Demand 캐싱)

### 동작 방식
- 사용자가 날씨/대기질 데이터를 요청할 때마다 캐시 확인
- 캐시가 만료되었거나 없으면 **즉시 API 호출**
- 호출한 데이터를 캐시에 저장하고 TTL 설정

### TTL 전략
```typescript
// 사용자 패턴 기반 동적 TTL
- 시간별 날씨: 30분 ~ 6시간 (사용자별 조정)
- 일별 날씨: 1시간 ~ 24시간 (사용자별 조정)
- 예보 시간과의 거리에 따른 동적 조정
- 사용자 빈도/선호 위치/시간대에 따른 multiplier 적용
```

### 문제점
1. **API 호출이 분산되고 예측 불가능**
   - 사용자 요청 시점에 따라 API 호출 발생
   - 레이트 리밋 관리 어려움
   
2. **중복 호출 가능성**
   - 여러 사용자가 같은 위치를 조회할 때 각각 API 호출
   
3. **사용자별 TTL이 복잡**
   - 패턴 분석 오버헤드
   - 실시간성과 API 절약 사이 트레이드오프

4. **데이터 신선도 불균형**
   - 활발한 사용자는 최신 데이터
   - 비활성 사용자는 오래된 데이터

---

## 2. 새로운 방식 (Scheduled Batch Update)

### 동작 방식
- **6시, 12시, 18시, 24시(0시)** 정각에 크론 작업 실행
- 모든 사용자의 위치 정보를 기반으로 **배치로 API 호출**
- 데이터베이스에 저장 (기존 데이터 교체)
- 사용자 요청 시 **데이터베이스에서만 조회** (API 호출 없음)

### 배치 업데이트 흐름
```
00:00 (자정) → 모든 사용자 데이터 수집 → DB 저장 (만료: 06:00)
06:00 (아침) → 모든 사용자 데이터 수집 → DB 저장 (만료: 12:00)
12:00 (점심) → 모든 사용자 데이터 수집 → DB 저장 (만료: 18:00)
18:00 (저녁) → 모든 사용자 데이터 수집 → DB 저장 (만료: 24:00)
```

### 장점
1. **API 호출 예측 가능**
   - 하루 4회, 정해진 시각에만 호출
   - 레이트 리밋 관리 용이
   
2. **중복 호출 제거**
   - 모든 사용자가 동일한 배치 데이터 공유
   
3. **일관된 데이터 신선도**
   - 모든 사용자가 동일한 시점의 최신 데이터 사용
   
4. **사용자 응답 속도 향상**
   - DB 조회만으로 즉시 응답 (API 대기 없음)

---

## 3. 새로운 TTL 전략

### 핵심 원칙

#### ✅ 배치 주기 기반 고정 TTL
**이전**: 사용자 패턴에 따라 30분~24시간 가변  
**변경**: **다음 배치 시간까지 고정 (6시간)**

```typescript
// 새로운 TTL 계산
function calculateBatchBasedTTL(currentTime: Date): number {
  const currentHour = currentTime.getHours();
  
  // 다음 배치 시간 계산 (6, 12, 18, 24)
  let nextBatchHour: number;
  if (currentHour < 6) nextBatchHour = 6;
  else if (currentHour < 12) nextBatchHour = 12;
  else if (currentHour < 18) nextBatchHour = 18;
  else nextBatchHour = 24; // 다음날 0시
  
  // 다음 배치까지 남은 시간 (분)
  const hoursUntilNext = nextBatchHour - currentHour;
  return hoursUntilNext * 60;
}
```

#### ✅ 데이터 유형별 차등 적용

**시간별 날씨 (Hourly Weather)**
- TTL: **다음 배치 시간까지 고정**
- 이유: 배치 시 12시간 데이터를 수집하므로, 다음 배치까지는 충분히 유효

**일별 날씨 (Daily Weather)**
- TTL: **다음 배치 시간까지 고정**
- 이유: 배치 시 5일 데이터를 수집하므로, 일 단위 예보는 6시간 단위 갱신으로 충분

**대기질 데이터 (Air Quality)**
- TTL: **다음 배치 시간까지 고정**
- 이유: Google Air Quality API도 동일한 배치 주기로 수집

#### ✅ 사용자 패턴 분석의 새로운 역할

**이전**: TTL multiplier 적용 (캐시 시간 연장/단축)  
**변경**: **배치 우선순위 결정** (어떤 사용자를 먼저 업데이트할지)

```typescript
// 새로운 사용자 패턴 활용
interface UserPriority {
  userId: string;
  priorityScore: number; // 0-100
  reasoning: string[];
}

function calculateBatchPriority(pattern: UserPattern): number {
  let score = 50; // 기본 점수
  
  // 고빈도 사용자 우선
  if (pattern.avgQueriesPerDay > 10) score += 30;
  else if (pattern.avgQueriesPerDay > 5) score += 15;
  
  // 최근 활동 사용자 우선
  if (pattern.recentActivityDays < 7) score += 20;
  
  return Math.min(100, score);
}
```

---

## 4. 구현 변경 사항

### 4.1. TTL 설정 상수 업데이트

```typescript
// src/lib/services/smart-ttl-manager.ts

export const TTL_CONFIG = {
  // 배치 주기 기반 고정 TTL
  BATCH_INTERVAL_HOURS: 6, // 배치 간격 (시간)
  
  // 최대 TTL (다음 배치 시간 + 버퍼)
  MAX_TTL_MINUTES: 6 * 60 + 30, // 6.5시간 (30분 버퍼)
  
  // 최소 TTL (긴급 업데이트용)
  MIN_TTL_MINUTES: 30, // 30분
  
  // 위치 키는 거의 변하지 않으므로 장기 캐싱
  LOCATION_KEY: 7 * 24 * 60, // 7일
} as const;
```

### 4.2. 배치 시간 계산 함수

```typescript
// src/lib/services/smart-ttl-manager.ts

/**
 * 다음 배치 실행 시간 계산
 */
export function getNextBatchTime(currentTime: Date = new Date()): Date {
  const current = new Date(currentTime);
  const currentHour = current.getHours();
  
  const batchHours = [0, 6, 12, 18];
  let nextBatchHour = batchHours.find(h => h > currentHour);
  
  if (nextBatchHour === undefined) {
    // 오늘의 마지막 배치(18시)가 지났으면 다음날 0시
    nextBatchHour = 0;
    current.setDate(current.getDate() + 1);
  }
  
  current.setHours(nextBatchHour, 0, 0, 0);
  return current;
}

/**
 * 다음 배치까지 남은 시간 (분)
 */
export function getTimeUntilNextBatch(currentTime: Date = new Date()): number {
  const nextBatch = getNextBatchTime(currentTime);
  const diffMs = nextBatch.getTime() - currentTime.getTime();
  return Math.ceil(diffMs / (1000 * 60)); // 분 단위로 올림
}

/**
 * 배치 기반 TTL 계산
 */
export function calculateBatchBasedTTL(dataType: 'weather' | 'airquality'): number {
  const minutesUntilNextBatch = getTimeUntilNextBatch();
  
  // 최소 30분 보장 (배치 직후에도 최소 캐시 유지)
  const ttl = Math.max(TTL_CONFIG.MIN_TTL_MINUTES, minutesUntilNextBatch);
  
  // 최대 6.5시간 제한 (다음 배치 + 버퍼)
  return Math.min(TTL_CONFIG.MAX_TTL_MINUTES, ttl);
}
```

### 4.3. 사용자 우선순위 계산

```typescript
// src/lib/services/smart-ttl-manager.ts

/**
 * 배치 업데이트 우선순위 계산
 */
export async function calculateBatchUpdatePriority(
  clerkUserId: string
): Promise<{ score: number; reasoning: string[] }> {
  const pattern = await SmartTTLManager.analyzeUserPattern(clerkUserId);
  
  let score = 50; // 기본 점수
  const reasoning: string[] = [];
  
  // 1. 사용 빈도 (최대 +30점)
  if (pattern.avgQueriesPerDay > 10) {
    score += 30;
    reasoning.push('고빈도 사용자 (일 10회 이상): 최우선 업데이트');
  } else if (pattern.avgQueriesPerDay > 5) {
    score += 15;
    reasoning.push('중빈도 사용자 (일 5-10회): 우선 업데이트');
  } else if (pattern.avgQueriesPerDay > 2) {
    score += 8;
    reasoning.push('일반 사용자 (일 2-5회): 정상 우선순위');
  }
  
  // 2. 최근 활동성 (최대 +20점)
  if (pattern.recentActivityDays < 3) {
    score += 20;
    reasoning.push('최근 3일 이내 활동: 최우선 업데이트');
  } else if (pattern.recentActivityDays < 7) {
    score += 10;
    reasoning.push('최근 7일 이내 활동: 우선 업데이트');
  }
  
  // 3. 시간대 패턴 매칭 (최대 +10점)
  const currentHour = new Date().getHours();
  if (pattern.timePreference === 'morning' && currentHour >= 6 && currentHour < 12) {
    score += 10;
    reasoning.push('아침 시간대 선호 사용자: 현재 시간 최적화');
  } else if (pattern.timePreference === 'evening' && currentHour >= 18 && currentHour < 24) {
    score += 10;
    reasoning.push('저녁 시간대 선호 사용자: 현재 시간 최적화');
  }
  
  return {
    score: Math.min(100, score),
    reasoning,
  };
}
```

### 4.4. 배치 스케줄러 우선순위 통합

```typescript
// src/lib/services/user-weather-scheduler.ts

/**
 * 우선순위 기반 사용자 정렬
 */
async function sortUsersByPriority(
  userLocations: UserLocation[]
): Promise<UserLocation[]> {
  const priorityScores = await Promise.all(
    userLocations.map(async (user) => ({
      user,
      priority: await calculateBatchUpdatePriority(user.clerkUserId),
    }))
  );
  
  // 우선순위 높은 순으로 정렬
  return priorityScores
    .sort((a, b) => b.priority.score - a.priority.score)
    .map(item => item.user);
}

// collectAllUsersWeatherData 함수에서 사용
const sortedUsers = await sortUsersByPriority(allUserLocations);
for (const userLocation of sortedUsers) {
  // 우선순위 높은 사용자부터 데이터 수집
  // ...
}
```

---

## 5. 변경 전후 비교

### API 호출 패턴

| 항목 | 이전 (On-Demand) | 현재 (Batch) |
|------|------------------|--------------|
| 호출 시점 | 사용자 요청 시 | 6, 12, 18, 24시 |
| 호출 빈도 | 예측 불가 | 하루 4회 고정 |
| 중복 호출 | 높음 | 없음 |
| 레이트 리밋 위험 | 높음 | 낮음 (제어 가능) |

### TTL 전략

| 항목 | 이전 (Dynamic) | 현재 (Batch-based) |
|------|----------------|-------------------|
| 기본 원칙 | 사용자 패턴 기반 | 배치 주기 기반 |
| 시간별 TTL | 30분~6시간 (가변) | 6시간 고정 |
| 일별 TTL | 1시간~24시간 (가변) | 6시간 고정 |
| 계산 복잡도 | 높음 | 낮음 |
| 데이터 신선도 | 불균형 | 일관됨 |

### 사용자 패턴 활용

| 항목 | 이전 | 현재 |
|------|------|------|
| 목적 | TTL multiplier | 배치 우선순위 |
| 영향 범위 | 캐시 유지 시간 | 업데이트 순서 |
| 복잡도 | 높음 (개인화된 TTL) | 중간 (우선순위만) |

---

## 6. 마이그레이션 가이드

### 6.1. 기존 캐시 데이터 처리

```bash
# 기존 가변 TTL 데이터를 일괄 정리
# /api/weather/cache-cleanup 엔드포인트 호출
```

### 6.2. 크론 작업 확인

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/weather-collector",
      "schedule": "0 * * * *"  // 매시간 실행 (내부에서 6,12,18,24시만 실제 동작)
    }
  ]
}
```

### 6.3. 환경변수 확인

```bash
CRON_SECRET=your_secret_key  # 크론 작업 인증용
```

---

## 7. 모니터링 및 최적화

### 7.1. 배치 성공률 모니터링

```typescript
// 배치 실행 후 결과 확인
{
  totalUsers: 100,
  successCount: 98,
  failureCount: 2,
  executionTime: 45000 // ms
}
```

### 7.2. TTL 효율성 지표

```typescript
// Smart TTL Dashboard에서 확인
{
  cacheHitRate: 99.5%, // 캐시 적중률 (높을수록 좋음)
  avgTTL: 360, // 평균 TTL (분)
  expiredItemsToday: 4, // 오늘 만료된 아이템 수 (배치 주기와 일치)
  storageEfficiency: 95% // 저장 공간 효율성
}
```

### 7.3. 사용자 우선순위 분포

```typescript
// 우선순위 스코어 분포 확인
{
  highPriority: 15, // 80점 이상
  mediumPriority: 45, // 50-80점
  lowPriority: 40, // 50점 미만
}
```

---

## 8. 예상 효과

### 8.1. API 호출 절감
- **이전**: 일 평균 1,000+ 호출 (사용자별 분산)
- **현재**: 일 400 호출 (배치 4회 × 사용자 100명)
- **절감률**: 약 60%

### 8.2. 응답 속도 개선
- **이전**: 평균 800ms (API 호출 포함)
- **현재**: 평균 50ms (DB 조회만)
- **개선**: 약 16배 빠름

### 8.3. 데이터 일관성
- **이전**: 사용자마다 다른 시점 데이터
- **현재**: 모든 사용자 동일 시점 데이터
- **개선**: 100% 일관성

### 8.4. 운영 안정성
- **레이트 리밋 초과 위험**: 거의 없음 (제어 가능한 배치)
- **예측 가능성**: 높음 (고정된 스케줄)
- **확장성**: 우수 (사용자 수 증가해도 배치 주기 유지)

---

## 9. 향후 개선 사항

### 9.1. 동적 배치 간격
- 날씨 변화가 큰 시기: 3시간 간격
- 안정적인 시기: 12시간 간격
- AI 기반 예측으로 배치 간격 최적화

### 9.2. 지역별 배치 분산
- 같은 지역 사용자 그룹화
- 지역별 API 호출 횟수 최소화
- 글로벌 확장 시 타임존 고려

### 9.3. 실시간 알림 통합
- 기상 특보 발생 시 즉시 배치 업데이트
- 사용자별 알림 설정 연동

---

## 결론

배치 업데이트 방식으로의 전환은 단순한 API 호출 방식의 변경이 아니라, **전체 캐싱 전략의 패러다임 전환**입니다.

**핵심 변화:**
1. ❌ 사용자 패턴 기반 가변 TTL → ✅ 배치 주기 기반 고정 TTL
2. ❌ On-Demand API 호출 → ✅ Scheduled Batch 수집
3. ❌ TTL multiplier → ✅ 배치 우선순위

이를 통해 **API 절감, 응답 속도 개선, 데이터 일관성 보장**이라는 세 가지 핵심 목표를 모두 달성할 수 있습니다.
