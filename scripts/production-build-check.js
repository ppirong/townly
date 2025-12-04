#!/usr/bin/env node

/**
 * 프로덕션 빌드 오류 진단 스크립트
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 프로덕션 빌드 오류 진단 시작...\n');

// 1. 패키지 정보 확인
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('📦 패키지 정보:');
console.log(`   - Name: ${packageJson.name}`);
console.log(`   - Version: ${packageJson.version}`);
console.log(`   - Node Engine: ${packageJson.engines?.node || 'not specified'}`);
console.log(`   - Next.js: ${packageJson.dependencies?.next || 'not found'}`);
console.log('');

// 2. TypeScript 설정 확인
try {
  const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  console.log('📝 TypeScript 설정:');
  console.log(`   - Strict: ${tsConfig.compilerOptions?.strict}`);
  console.log(`   - Target: ${tsConfig.compilerOptions?.target}`);
  console.log(`   - Module: ${tsConfig.compilerOptions?.module}`);
  console.log('');
} catch (error) {
  console.log('❌ tsconfig.json 읽기 실패');
}

// 3. 환경변수 파일 확인
const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local'];
console.log('🔧 환경변수 파일:');
envFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`   - ${file}: ${exists ? '✅ 존재' : '❌ 없음'}`);
});
console.log('');

// 4. 잠재적 문제 파일 검사
console.log('🔍 잠재적 문제 파일 검사:');

// any 타입 사용 검사
const anyUsageFiles = [];
const checkForAnyUsage = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      checkForAnyUsage(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes(': any') || content.includes('as any')) {
          anyUsageFiles.push(filePath);
        }
      } catch (error) {
        // 파일 읽기 실패 무시
      }
    }
  });
};

try {
  checkForAnyUsage('src');
  if (anyUsageFiles.length > 0) {
    console.log('   ⚠️  any 타입 사용 파일들:');
    anyUsageFiles.slice(0, 5).forEach(file => {
      console.log(`      - ${file}`);
    });
    if (anyUsageFiles.length > 5) {
      console.log(`      ... 그 외 ${anyUsageFiles.length - 5}개 파일`);
    }
  } else {
    console.log('   ✅ any 타입 사용 없음');
  }
} catch (error) {
  console.log('   ❌ 파일 검사 실패');
}

console.log('');

// 5. 권장사항
console.log('💡 프로덕션 빌드 오류 해결 방법:');
console.log('');
console.log('1. 환경변수 확인:');
console.log('   npm run check-env');
console.log('');
console.log('2. 로컬에서 프로덕션 모드 테스트:');
console.log('   NODE_ENV=production npm run build');
console.log('');
console.log('3. TypeScript 엄격 모드 테스트:');
console.log('   npx tsc --noEmit --strict');
console.log('');
console.log('4. 의존성 정리:');
console.log('   rm -rf node_modules package-lock.json');
console.log('   npm install');
console.log('');
console.log('5. Vercel 로그 확인:');
console.log('   vercel logs [deployment-url]');
