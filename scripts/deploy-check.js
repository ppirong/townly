#!/usr/bin/env node

/**
 * 배포 전 환경 확인 스크립트
 */

const axios = require('axios');

const PRODUCTION_URL = 'https://townly.vercel.app';
const LOCAL_URL = 'http://localhost:3000';

async function checkEndpoint(url, endpoint) {
  try {
    console.log(`🔍 Checking ${url}${endpoint}...`);
    const response = await axios.get(`${url}${endpoint}`, {
      timeout: 10000,
      validateStatus: (status) => status < 500 // 4xx는 OK, 5xx는 에러
    });
    
    console.log(`✅ ${endpoint}: ${response.status} - ${response.statusText}`);
    
    if (endpoint === '/api/health') {
      console.log(`📊 Health Data:`, JSON.stringify(response.data, null, 2));
    }
    
    return true;
  } catch (error) {
    if (error.response) {
      console.error(`❌ ${endpoint}: ${error.response.status} - ${error.response.statusText}`);
      if (error.response.data) {
        console.error(`   Error Data:`, error.response.data);
      }
    } else {
      console.error(`❌ ${endpoint}: ${error.message}`);
    }
    return false;
  }
}

async function checkEnvironment(baseUrl, envName) {
  console.log(`\n🌐 Checking ${envName} environment: ${baseUrl}`);
  console.log('─'.repeat(50));
  
  const endpoints = [
    '/api/health',
    '/api/chatbot/status',
    '/api/kakao/webhook'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const success = await checkEndpoint(baseUrl, endpoint);
    results.push({ endpoint, success });
    
    // 요청 간 간격
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n📈 ${envName} Results: ${successCount}/${totalCount} endpoints healthy`);
  
  if (successCount === totalCount) {
    console.log(`✅ ${envName} environment is fully operational`);
  } else {
    console.log(`⚠️ ${envName} environment has issues`);
  }
  
  return successCount === totalCount;
}

async function main() {
  console.log('🚀 Townly Deployment Check');
  console.log('════════════════════════════════════════════════════');
  
  const args = process.argv.slice(2);
  const checkLocal = args.includes('--local') || args.includes('-l');
  const checkProd = args.includes('--production') || args.includes('-p') || args.length === 0;
  
  let allHealthy = true;
  
  if (checkLocal) {
    const localHealthy = await checkEnvironment(LOCAL_URL, 'Local Development');
    allHealthy = allHealthy && localHealthy;
  }
  
  if (checkProd) {
    const prodHealthy = await checkEnvironment(PRODUCTION_URL, 'Production');
    allHealthy = allHealthy && prodHealthy;
  }
  
  console.log('\n🏁 Final Results');
  console.log('════════════════════════════════════════════════════');
  
  if (allHealthy) {
    console.log('🎉 All environments are healthy and ready!');
    process.exit(0);
  } else {
    console.log('💥 Some environments have issues. Please check the logs above.');
    process.exit(1);
  }
}

// 도움말 출력
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🚀 Townly Deployment Check

Usage:
  node scripts/deploy-check.js [options]

Options:
  --local, -l        Check local development environment
  --production, -p   Check production environment (default)
  --help, -h         Show this help message

Examples:
  node scripts/deploy-check.js                    # Check production only
  node scripts/deploy-check.js --local            # Check local only
  node scripts/deploy-check.js --local --prod     # Check both environments
`);
  process.exit(0);
}

// 스크립트 실행
main().catch((error) => {
  console.error('💥 Deployment check failed:', error.message);
  process.exit(1);
});
