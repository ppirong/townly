import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

// .env.local 파일 명시적으로 로드
config({ path: '.env.local' });

// DATABASE_URL 검증
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL이 .env.local 파일에 설정되지 않았습니다.');
}

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
