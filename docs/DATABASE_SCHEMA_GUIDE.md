# 데이터베이스 스키마 관리 가이드

> **통합 문서**: 스키마 동기화 문제 분석 + 예방 가이드

## 🚨 핵심 문제

### 발생한 문제 (Request ID: fd8db2a9-2146-42c3-b0b6-9ab757c19a45)
1. **Vercel 빌드 오류**: `lastUpdated` 필드 존재하지 않음
2. **스키마 불일치**: `drizzle/schema.ts` (실제 DB) ≠ `src/db/schema.ts` (앱 스키마)
3. **규칙 위반**: `drizzle/schema`에서 직접 import

### 근본 원인
- **동기화 프로세스 부재**: 두 스키마 파일 간 자동 동기화 없음
- **수동 관리의 한계**: 개발자가 수동으로 스키마 업데이트 시 누락 발생
- **빌드 시점 발견**: 개발 중에는 감지되지 않고 빌드에서만 오류 발견

## 🛠️ 해결 방안

### 1. 스키마 동기화 자동화

```json
// package.json - 필수 스크립트 추가
{
  "scripts": {
    "db:sync": "cp drizzle/schema.ts src/db/schema.ts",
    "db:check": "diff drizzle/schema.ts src/db/schema.ts || echo '스키마 불일치!'",
    "pre-build": "npm run db:check && npm run build"
  }
}
```

### 2. 개발 워크플로우 (필수 체크리스트)

#### DB 변경 시
1. ✅ 마이그레이션 파일 생성
2. ✅ `drizzle-kit push` 실행  
3. ✅ `drizzle-kit introspect` 실행
4. ✅ `npm run db:sync` 실행
5. ✅ 영향받는 파일 업데이트 (queries, DTO, services)
6. ✅ `npm run build` 테스트

#### 코드 작성 시
```typescript
// ✅ 올바른 import
import { schema } from '@/db/schema';

// ❌ 절대 금지
import { schema } from '../../../drizzle/schema';
```

### 3. 타입 안전성 보장

```typescript
// null 안전성 처리
const location = record.locationName ?? 'Unknown';
const temperature = record.temperature ?? '0';

// 타입 가드 함수
function safeString(value: string | null, fallback = ''): string {
  return value ?? fallback;
}

// Repository 패턴 사용
export class WeatherRepository {
  static async getHourlyData(userId: string) {
    return await db
      .select()
      .from(hourlyWeatherData)
      .where(eq(hourlyWeatherData.clerkUserId, userId));
  }
}
```

## 🔧 자동화 도구

### 1. Git Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit
npm run db:check
if [ $? -ne 0 ]; then
  echo "❌ 스키마 동기화 오류!"
  exit 1
fi
```

### 2. ESLint 규칙
```json
// .eslintrc.json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["**/drizzle/schema*"],
            "message": "drizzle/schema 직접 import 금지! @/db/schema 사용"
          }
        ]
      }
    ]
  }
}
```

### 3. CI/CD 통합
```yaml
# .github/workflows/build.yml
- name: Schema Sync Check
  run: npm run db:check
- name: Build Test  
  run: npm run build
```

## 📋 일일 체크리스트

### 개발 시작 전
- [ ] `npm run db:check` 실행하여 스키마 동기화 확인

### 스키마 변경 후
- [ ] 마이그레이션 실행
- [ ] `npm run db:sync` 실행
- [ ] 관련 파일 업데이트
- [ ] `npm run build` 테스트

### 커밋 전
- [ ] 타입 체크 통과 (`npm run type-check`)
- [ ] 빌드 성공 (`npm run build`)
- [ ] ESLint 통과 (`npm run lint`)

## 🎯 핵심 원칙

1. **단일 진실 소스**: `drizzle/schema.ts`를 기준으로 `src/db/schema.ts` 동기화
2. **자동화 우선**: 수동 작업 최소화, 스크립트로 자동화
3. **조기 발견**: 개발 중에 문제 감지, 빌드 전에 해결
4. **규칙 준수**: `@/db/schema`만 사용, 직접 import 금지
5. **체계적 접근**: 스키마 변경 시 영향 범위 전체 고려

## 🚀 즉시 적용 가능한 액션

### 1. 스크립트 설정 (5분)
```bash
# package.json에 스크립트 추가
npm pkg set scripts.db:sync="cp drizzle/schema.ts src/db/schema.ts"
npm pkg set scripts.db:check="diff drizzle/schema.ts src/db/schema.ts"
```

### 2. 현재 스키마 동기화 (1분)
```bash
npm run db:sync
npm run build  # 오류 확인
```

### 3. Git Hook 설정 (3분)
```bash
echo '#!/bin/sh\nnpm run db:check' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

**작성일**: 2024-11-28  
**버전**: 2.0 (통합)  
**이전 문서**: 
- `database-schema-management-guide.md`
- `SCHEMA_SYNC_ISSUE_ANALYSIS.md`
