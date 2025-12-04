/**
 * 프로덕션 동기화 준비 상태 점검 스크립트
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 프로덕션 동기화 준비 상태 점검');
console.log('=====================================');

// 1. 핵심 파일들 존재 여부 확인
function checkCoreFiles() {
  console.log('\n📁 핵심 파일 존재 여부 확인');
  console.log('-------------------------');
  
  const coreFiles = [
    'src/app/api/webhooks/clerk/route.ts',
    'src/db/queries/user-profiles.ts',
    'src/lib/services/user-role-service.ts',
    'src/db/schema.ts',
    'package.json'
  ];
  
  let allFilesExist = true;
  
  coreFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, '..', file));
    console.log(`${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allFilesExist = false;
  });
  
  return allFilesExist;
}

// 2. 디버그 파일들 확인 (프로덕션에서 문제가 될 수 있음)
function checkDebugFiles() {
  console.log('\n🔍 디버그 파일들 확인');
  console.log('-------------------');
  
  const debugFiles = [
    'src/app/api/debug/',
    'src/app/debug/',
    'src/app/public-webhook-monitor/',
    'src/components/WebhookRealtimeMonitor.tsx'
  ];
  
  const issues = [];
  
  debugFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    const exists = fs.existsSync(fullPath);
    
    if (exists) {
      console.log(`⚠️ ${file} (프로덕션에서 노출될 수 있음)`);
      issues.push(file);
    } else {
      console.log(`✅ ${file} (없음)`);
    }
  });
  
  return issues;
}

// 3. 환경변수 의존성 확인
function checkEnvironmentDependencies() {
  console.log('\n🔧 환경변수 의존성 확인');
  console.log('---------------------');
  
  const requiredEnvVars = [
    'CLERK_WEBHOOK_SECRET',
    'CLERK_SECRET_KEY',
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
  ];
  
  console.log('프로덕션에서 필요한 환경변수들:');
  requiredEnvVars.forEach(envVar => {
    console.log(`  • ${envVar}`);
  });
  
  return requiredEnvVars;
}

// 4. 데이터베이스 스키마 확인
function checkDatabaseSchema() {
  console.log('\n🗄️ 데이터베이스 스키마 확인');
  console.log('-------------------------');
  
  try {
    const schemaPath = path.join(__dirname, '..', 'src/db/schema.ts');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    const hasUserProfiles = schemaContent.includes('userProfiles');
    const hasUserRoles = schemaContent.includes('userRoles');
    const hasSignupMethod = schemaContent.includes('signupMethod');
    
    console.log(`${hasUserProfiles ? '✅' : '❌'} userProfiles 테이블 정의`);
    console.log(`${hasUserRoles ? '✅' : '❌'} userRoles 테이블 정의`);
    console.log(`${hasSignupMethod ? '✅' : '❌'} signupMethod 필드 정의`);
    
    return hasUserProfiles && hasUserRoles && hasSignupMethod;
  } catch (error) {
    console.log('❌ 스키마 파일 읽기 실패:', error.message);
    return false;
  }
}

// 5. 웹훅 코드 품질 확인
function checkWebhookCode() {
  console.log('\n🔗 웹훅 코드 품질 확인');
  console.log('--------------------');
  
  try {
    const webhookPath = path.join(__dirname, '..', 'src/app/api/webhooks/clerk/route.ts');
    const webhookContent = fs.readFileSync(webhookPath, 'utf8');
    
    const hasSignatureVerification = webhookContent.includes('wh.verify');
    const hasUserProfileCreation = webhookContent.includes('createUserProfile');
    const hasKakaoDetection = webhookContent.includes('oauth_kakao');
    const hasErrorHandling = webhookContent.includes('try') && webhookContent.includes('catch');
    
    console.log(`${hasSignatureVerification ? '✅' : '❌'} 서명 검증`);
    console.log(`${hasUserProfileCreation ? '✅' : '❌'} 사용자 프로필 생성`);
    console.log(`${hasKakaoDetection ? '✅' : '❌'} 카카오 로그인 감지`);
    console.log(`${hasErrorHandling ? '✅' : '❌'} 오류 처리`);
    
    return hasSignatureVerification && hasUserProfileCreation && hasKakaoDetection && hasErrorHandling;
  } catch (error) {
    console.log('❌ 웹훅 파일 읽기 실패:', error.message);
    return false;
  }
}

// 6. 프로덕션 배포 권장사항
function printProductionRecommendations() {
  console.log('\n📋 프로덕션 배포 권장사항');
  console.log('========================');
  
  console.log('\n✅ 배포 전 필수 작업:');
  console.log('1. 모든 변경사항 커밋 및 푸시');
  console.log('2. Vercel 환경변수 설정 확인');
  console.log('3. 데이터베이스 마이그레이션 실행');
  
  console.log('\n⚠️ 프로덕션 보안 고려사항:');
  console.log('1. 디버그 페이지들 접근 제한 또는 제거');
  console.log('2. 로그 레벨 조정 (민감한 정보 노출 방지)');
  console.log('3. 환경변수 보안 확인');
  
  console.log('\n🧪 배포 후 테스트 계획:');
  console.log('1. 프로덕션 사이트 접근성 확인');
  console.log('2. 카카오 회원가입 테스트');
  console.log('3. 웹훅 로그 확인 (Vercel Functions Logs)');
  console.log('4. 데이터베이스에서 사용자 정보 확인');
}

// 7. 배포 준비 상태 종합 평가
function evaluateReadiness() {
  console.log('\n🎯 배포 준비 상태 종합 평가');
  console.log('===========================');
  
  const coreFilesOk = checkCoreFiles();
  const debugIssues = checkDebugFiles();
  const schemaOk = checkDatabaseSchema();
  const webhookOk = checkWebhookCode();
  
  console.log('\n📊 평가 결과:');
  console.log(`핵심 파일: ${coreFilesOk ? '✅ 준비됨' : '❌ 문제 있음'}`);
  console.log(`데이터베이스 스키마: ${schemaOk ? '✅ 준비됨' : '❌ 문제 있음'}`);
  console.log(`웹훅 코드: ${webhookOk ? '✅ 준비됨' : '❌ 문제 있음'}`);
  console.log(`디버그 파일 이슈: ${debugIssues.length === 0 ? '✅ 없음' : `⚠️ ${debugIssues.length}개`}`);
  
  const overallReady = coreFilesOk && schemaOk && webhookOk;
  
  console.log(`\n🚀 전체 준비 상태: ${overallReady ? '✅ 배포 가능' : '❌ 추가 작업 필요'}`);
  
  if (debugIssues.length > 0) {
    console.log('\n⚠️ 디버그 파일 보안 권장사항:');
    console.log('프로덕션에서 디버그 페이지 접근을 제한하거나 환경변수로 제어하세요.');
  }
  
  return overallReady;
}

// 실행
function runCheck() {
  checkEnvironmentDependencies();
  const ready = evaluateReadiness();
  printProductionRecommendations();
  
  console.log('\n' + '='.repeat(50));
  if (ready) {
    console.log('🎉 프로덕션 배포 준비 완료!');
    console.log('Git 커밋 후 Vercel에 배포하여 테스트할 수 있습니다.');
  } else {
    console.log('⚠️ 추가 작업이 필요합니다.');
    console.log('위의 문제점들을 해결한 후 다시 확인하세요.');
  }
}

runCheck();
