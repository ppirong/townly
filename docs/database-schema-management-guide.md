# 데이터베이스 스키마 관리 가이드

## 📋 개요

이 문서는 Next.js + TypeScript + Drizzle ORM 환경에서 개발 중에는 발견되지 않았지만 빌드 시 발생하는 데이터베이스 스키마 관련 오류를 분석하고, 이를 예방하기 위한 체계적인 접근법을 제시합니다.

## 🔍 문제 분석: 개발 환경 vs 빌드 환경

### 개발 환경 (`npm run dev`)의 특징

- **점진적 타입 검사**: 파일을 개별적으로 컴파일하며, 사용하지 않는 파일의 오류는 무시
- **느슨한 타입 검사**: TypeScript가 일부 타입 오류를 경고로만 처리
- **Hot Reload**: 변경된 파일만 다시 컴파일
- **런타임 오류 우선**: 실제 실행되는 코드 경로만 검증

### 빌드 환경 (`npm run build`)의 특징

- **전체 프로젝트 타입 검사**: 모든 파일을 한 번에 컴파일하고 타입 검사
- **엄격한 타입 검사**: 모든 타입 불일치를 오류로 처리
- **트리 쉐이킹**: 사용되지 않는 코드도 타입 검사 수행
- **프로덕션 최적화**: 모든 가능한 코드 경로 검증

## 🚨 발생한 오류 유형별 분석

### A. 필드 누락 오류

**문제 예시:**
```typescript
// ❌ 스키마에 없는 필드 사용
apiCallLogs.apiProvider  // 실제로는 'service' 필드
apiCallLogs.callTime     // 실제로는 'createdAt' 필드
```

**원인:**
- 스키마 정의와 실제 사용 코드 간의 동기화 부족
- 스키마 변경 시 관련 코드 업데이트 누락

### B. 스키마 불일치 오류

**문제 예시:**
```typescript
// ❌ 존재하지 않는 필드 접근
weatherEmbeddings.clerkUserId  // 해당 테이블에 없는 필드
weatherEmbeddings.contentType  // 실제로는 'weatherType' 필드
```

**원인:**
- 테이블 설계 변경 후 코드 업데이트 미반영
- 여러 개발자가 작업할 때 스키마 변경사항 공유 부족

### C. 타입 불일치 오류

**문제 예시:**
```typescript
// ❌ null 가능한 타입을 non-null 타입에 할당
location: record.locationName  // string | null → string 타입 불일치
```

**원인:**
- Drizzle ORM의 엄격한 타입 시스템과 실제 사용 패턴 불일치
- Optional 필드에 대한 null 체크 누락

### 개발 환경에서 감지되지 않은 이유

1. **코드 경로 미실행**: 개발 중 해당 API 엔드포인트를 실제로 호출하지 않음
2. **타입 추론 지연**: TypeScript가 런타임에서만 확인 가능한 타입 오류
3. **의존성 체인**: 다른 파일의 타입 변경이 연쇄적으로 영향을 미침

## 🛡️ 체계적 예방 방법

### 1. 스키마 우선 설계 (Schema-First Design)

#### Step 1: 명확한 스키마 정의

```typescript
/**
 * API 호출 로그 테이블
 * @description 외부 API 호출을 추적하고 통계를 수집합니다.
 * 
 * @field service - API 제공업체 (accuweather, google_air_quality 등)
 * @field endpoint - 호출한 API 엔드포인트 URL
 * @field method - HTTP 메소드 (GET, POST 등)
 * @field statusCode - HTTP 응답 상태 코드 (200, 404, 500 등)
 * @field responseTime - 응답 시간 (밀리초)
 * @field errorMessage - 오류 발생 시 오류 메시지
 * @field requestData - 요청 데이터 (JSON)
 * @field responseData - 응답 데이터 (JSON)
 * @field createdAt - 생성 시간
 */
export const apiCallLogs = pgTable('api_call_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  service: text('service').notNull(),           // 명확한 필드명
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  statusCode: integer('status_code'),
  responseTime: integer('response_time'),
  errorMessage: text('error_message'),
  requestData: jsonb('request_data'),
  responseData: jsonb('response_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 타입 추출
export type ApiCallLog = typeof apiCallLogs.$inferSelect;
export type NewApiCallLog = typeof apiCallLogs.$inferInsert;
```

#### Step 2: 스키마 문서화

모든 테이블과 필드에 대해 다음 정보를 포함:
- **목적**: 테이블의 역할과 용도
- **필드 설명**: 각 필드의 의미와 제약사항
- **관계**: 다른 테이블과의 관계
- **인덱스**: 성능을 위한 인덱스 정보

### 2. 타입 안전성 보장 방법

#### A. 타입 가드 함수 사용

```typescript
// 타입 가드로 null 체크
function ensureString(value: string | null, defaultValue: string = 'Unknown'): string {
  return value ?? defaultValue;
}

// 사용 예시
const weatherData = dbRecords.map(record => ({
  location: ensureString(record.locationName, 'Unknown Location'),
  temperature: ensureString(record.temperature, '0'),
  // ...
}));
```

#### B. 스키마 기반 헬퍼 함수

```typescript
// 스키마 필드 검증 함수
export function validateApiCallLogFields(data: Partial<NewApiCallLog>): NewApiCallLog {
  const schema = z.object({
    service: z.string().min(1),
    endpoint: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    statusCode: z.number().optional(),
    responseTime: z.number().optional(),
    errorMessage: z.string().optional(),
    requestData: z.any().optional(),
    responseData: z.any().optional(),
  });
  
  return schema.parse(data);
}
```

#### C. 타입 안전한 쿼리 빌더

```typescript
// 타입 안전한 쿼리 헬퍼
export class ApiCallLogRepository {
  static async findByService(service: string) {
    return await db
      .select()
      .from(apiCallLogs)
      .where(eq(apiCallLogs.service, service)); // 타입 안전
  }
  
  static async getSuccessfulCalls(service: string) {
    return await db
      .select()
      .from(apiCallLogs)
      .where(
        and(
          eq(apiCallLogs.service, service),
          gte(apiCallLogs.statusCode, 200),
          lt(apiCallLogs.statusCode, 300)
        )
      );
  }
  
  static async getDailyStats(service: string, date: string) {
    return await db
      .select({
        totalCalls: count(),
        successfulCalls: sql<number>`COUNT(CASE WHEN ${apiCallLogs.statusCode} >= 200 AND ${apiCallLogs.statusCode} < 300 THEN 1 END)`,
        failedCalls: sql<number>`COUNT(CASE WHEN ${apiCallLogs.statusCode} < 200 OR ${apiCallLogs.statusCode} >= 300 THEN 1 END)`,
        avgResponseTime: sql<number>`AVG(${apiCallLogs.responseTime})`,
      })
      .from(apiCallLogs)
      .where(
        and(
          eq(apiCallLogs.service, service),
          sql`DATE(${apiCallLogs.createdAt}) = ${date}`
        )
      );
  }
}
```

### 3. 개발 워크플로우 개선

#### A. 스키마 변경 체크리스트

```markdown
## 스키마 변경 체크리스트

### 변경 전
- [ ] 기존 스키마 백업
- [ ] 영향받는 코드 파일 목록 작성
- [ ] 마이그레이션 계획 수립
- [ ] 팀원들에게 변경사항 공지

### 변경 중
- [ ] 스키마 파일 업데이트 (`src/db/schema.ts`)
- [ ] 타입 정의 업데이트
- [ ] 관련 코드 파일 수정
- [ ] 문서 주석 업데이트

### 변경 후
- [ ] `npm run type-check` 실행
- [ ] `npm run build` 실행하여 타입 오류 확인
- [ ] 테스트 코드 실행
- [ ] 문서 업데이트
- [ ] 코드 리뷰 요청
```

#### B. 자동화된 검증 스크립트

```json
// package.json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "schema-check": "npm run type-check && npm run build",
    "pre-commit": "npm run schema-check && npm run lint",
    "validate-schema": "node scripts/validate-schema.js"
  }
}
```

#### C. Git Hooks 설정

```bash
# .husky/pre-commit
#!/bin/sh
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ TypeScript 타입 검사 실패"
  exit 1
fi

npm run build
if [ $? -ne 0 ]; then
  echo "❌ 빌드 실패"
  exit 1
fi

echo "✅ 모든 검사 통과"
```

### 4. 모니터링 및 검증 도구

#### A. 스키마 일관성 검사 도구

```typescript
// scripts/validate-schema.ts
import { db } from '@/db';
import { apiCallLogs, weatherEmbeddings } from '@/db/schema';

export async function validateSchemaConsistency() {
  const tables = [
    { name: 'apiCallLogs', table: apiCallLogs },
    { name: 'weatherEmbeddings', table: weatherEmbeddings },
    // 다른 테이블들...
  ];

  for (const { name, table } of tables) {
    try {
      const result = await db.select().from(table).limit(1);
      console.log(`✅ ${name} 스키마 일관성 검증 통과`);
    } catch (error) {
      console.error(`❌ ${name} 스키마 불일치 감지:`, error);
      process.exit(1);
    }
  }
}

// 실행
validateSchemaConsistency();
```

#### B. 타입 커버리지 체크

```typescript
// scripts/check-field-usage.ts
import * as fs from 'fs';
import * as path from 'path';

export function checkUnusedFields() {
  // 1. 스키마에서 모든 필드 추출
  // 2. 코드베이스에서 필드 사용 패턴 검색
  // 3. 사용되지 않는 필드 리포트
  
  console.log('📊 필드 사용 현황 분석 중...');
  // AST 파싱을 통한 필드 사용 패턴 분석
}
```

### 5. 팀 협업을 위한 가이드라인

#### A. 스키마 변경 규칙

1. **Breaking Change 금지**: 기존 필드 삭제나 타입 변경 시 마이그레이션 필수
2. **네이밍 컨벤션**: `camelCase` 일관성 유지
3. **문서화 필수**: 모든 테이블과 필드에 주석 추가
4. **리뷰 필수**: 스키마 변경은 반드시 코드 리뷰 거치기
5. **테스트 필수**: 스키마 변경 후 관련 테스트 케이스 업데이트

#### B. 개발 환경 설정

```typescript
// tsconfig.json - 엄격한 타입 검사 활성화
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

#### C. ESLint 규칙 추가

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // 타입 안전성 강화
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
  }
};
```

## 📋 실행 가능한 액션 플랜

### 즉시 적용 가능한 개선사항

#### 1. 빌드 검증을 개발 프로세스에 포함
```bash
# 개발 중 정기적으로 실행
npm run build

# 또는 타입 체크만
npm run type-check
```

#### 2. null 안전성 강화
```typescript
// ✅ 모든 nullable 필드에 기본값 제공
const location = record.locationName ?? 'Unknown Location';
const temperature = record.temperature ?? '0';
const conditions = record.conditions ?? 'Unknown';

// ✅ 타입 가드 함수 사용
function safeString(value: string | null | undefined, fallback = ''): string {
  return value ?? fallback;
}
```

#### 3. 스키마 변경 시 체크리스트 사용
- 스키마 수정 → 타입 체크 → 빌드 → 테스트 → 리뷰

#### 4. Repository 패턴 도입
```typescript
// 각 테이블별로 타입 안전한 Repository 클래스 생성
export class WeatherDataRepository {
  static async getHourlyData(userId: string, locationKey: string) {
    return await db
      .select()
      .from(hourlyWeatherData)
      .where(
        and(
          eq(hourlyWeatherData.clerkUserId, userId),
          eq(hourlyWeatherData.locationKey, locationKey)
        )
      );
  }
}
```

## 🔧 도구 및 스크립트

### 1. 스키마 검증 스크립트

```bash
# scripts/validate-all.sh
#!/bin/bash

echo "🔍 타입 검사 중..."
npm run type-check
if [ $? -ne 0 ]; then exit 1; fi

echo "🏗️ 빌드 검사 중..."
npm run build
if [ $? -ne 0 ]; then exit 1; fi

echo "🧪 테스트 실행 중..."
npm run test
if [ $? -ne 0 ]; then exit 1; fi

echo "✅ 모든 검사 통과!"
```

### 2. 스키마 변경 감지 스크립트

```typescript
// scripts/schema-diff.ts
import { execSync } from 'child_process';

export function detectSchemaChanges() {
  const gitDiff = execSync('git diff HEAD~1 src/db/schema.ts').toString();
  
  if (gitDiff.includes('export const') || gitDiff.includes('pgTable')) {
    console.log('⚠️ 스키마 변경 감지됨. 전체 타입 검사를 실행합니다.');
    execSync('npm run schema-check');
  }
}
```

## 📚 참고 자료

### 관련 문서
- [Drizzle ORM 공식 문서](https://orm.drizzle.team/)
- [TypeScript 엄격 모드 가이드](https://www.typescriptlang.org/tsconfig#strict)
- [Next.js 빌드 최적화](https://nextjs.org/docs/advanced-features/compiler)

### 추천 도구
- **Drizzle Kit**: 스키마 마이그레이션 도구
- **TypeScript ESLint**: 타입 안전성 강화
- **Husky**: Git hooks 관리
- **lint-staged**: 커밋 전 검증

---

**작성일**: 2024년 11월 17일  
**버전**: 1.0  
**작성자**: AI Assistant  
**검토**: 필요시 팀 리뷰 후 업데이트
