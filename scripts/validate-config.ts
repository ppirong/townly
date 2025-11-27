#!/usr/bin/env tsx

/**
 * 환경 설정 검증 스크립트
 * 
 * 애플리케이션 시작 전에 모든 필수 환경 변수와 설정이 올바른지 확인합니다.
 */

import { config } from 'dotenv';
import { 
  getCurrentEnvironment, 
  getConfig, 
  validateEnvironmentVariables,
  logConfigInfo 
} from '../src/lib/config';

// .env.local 파일 로드
config({ path: '.env.local' });

async function validateConfig() {
  console.log('🔍 환경 설정 검증을 시작합니다...\n');

  try {
    // 1. 환경 변수 검증
    console.log('1️⃣ 환경 변수 검증 중...');
    validateEnvironmentVariables();
    console.log('✅ 모든 필수 환경 변수가 설정되었습니다.\n');

    // 2. 현재 환경 정보 출력
    console.log('2️⃣ 환경 정보:');
    logConfigInfo();
    console.log('');

    // 3. 설정 값 검증
    console.log('3️⃣ 설정 값 검증 중...');
    const currentConfig = getConfig();
    
    // 대기질 API 설정 검증
    if (currentConfig.airQuality.cacheTimeout < 60) {
      console.warn('⚠️  캐시 타임아웃이 너무 짧습니다 (최소 60초 권장)');
    }
    
    if (currentConfig.airQuality.maxRetries > 10) {
      console.warn('⚠️  최대 재시도 횟수가 너무 많습니다 (최대 10회 권장)');
    }

    // 데이터베이스 설정 검증
    if (currentConfig.database.connectionTimeout < 5000) {
      console.warn('⚠️  데이터베이스 연결 타임아웃이 너무 짧습니다 (최소 5초 권장)');
    }

    // 외부 API 설정 검증
    const googleLimits = currentConfig.externalApis.google.rateLimit;
    if (googleLimits.requestsPerDay > 10000) {
      console.warn('⚠️  Google API 일일 요청 한도가 높습니다. 비용을 확인하세요.');
    }

    console.log('✅ 설정 값 검증이 완료되었습니다.\n');

    // 4. 데이터베이스 연결 테스트 (선택사항)
    if (process.argv.includes('--test-db')) {
      console.log('4️⃣ 데이터베이스 연결 테스트 중...');
      try {
        const { db } = await import('../src/db');
        await db.execute('SELECT 1');
        console.log('✅ 데이터베이스 연결이 성공했습니다.\n');
      } catch (error) {
        console.error('❌ 데이터베이스 연결 실패:', error);
        process.exit(1);
      }
    }

    console.log('🎉 모든 설정 검증이 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 설정 검증 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  validateConfig().catch((error) => {
    console.error('❌ 예상치 못한 오류:', error);
    process.exit(1);
  });
}

export { validateConfig };
