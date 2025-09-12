#!/usr/bin/env node

/**
 * 개선된 카카오 웹훅 테스트 스크립트
 * GitHub 참조 코드의 패턴을 적용한 종합적인 테스트 도구
 */

const https = require('https');
const http = require('http');

// 설정
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://2da26f20f041.ngrok-free.app/api/kakao/webhook';
const HEALTH_URL = process.env.HEALTH_URL || 'https://2da26f20f041.ngrok-free.app/api/health';

// 테스트 메시지 세트
const TEST_MESSAGES = {
  basic: [
    "안녕하세요",
    "도움말",
    "고마워요",
    "파주 야당역 맛집 추천해줘"
  ],
  
  edge_cases: [
    "",
    " ",
    "a",
    "ㅁㅁㅁㅁㅁㅁㅁㅁㅁㅁ",
    "!@#$%^&*()",
    "https://example.com",
    "010-1234-5678",
    "test@example.com"
  ],
  
  regional_queries: [
    "강남역 맛집",
    "홍대 카페", 
    "신촌 술집",
    "명동 쇼핑"
  ]
};

/**
 * 표준 카카오 스킬 요청 생성
 */
function createKakaoSkillRequest(utterance, userId = 'test_user') {
  return {
    intent: {
      id: "fallback_intent",
      name: "폴백 인텐트"
    },
    userRequest: {
      timezone: "Asia/Seoul",
      params: {},
      block: {
        id: "fallback_block",
        name: "폴백 블록"
      },
      utterance: utterance,
      lang: null,
      user: {
        id: userId,
        type: "accountId",
        properties: {}
      }
    },
    bot: {
      id: "68bef0501c4ef66e4f5d73be",
      name: "townly"
    },
    action: {
      name: "폴백액션",
      clientExtra: null,
      params: {},
      id: "fallback_action", 
      detailParams: {}
    }
  };
}

/**
 * HTTP 요청 함수 (Promise 기반)
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000
    };

    const req = lib.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
            rawData: data
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * 카카오 스킬 응답 검증
 */
function validateKakaoResponse(response) {
  if (!response || typeof response !== 'object') {
    return { valid: false, error: '응답이 객체가 아님' };
  }

  if (response.version !== "2.0") {
    return { valid: false, error: `잘못된 버전: ${response.version}` };
  }

  if (!response.template || !Array.isArray(response.template.outputs)) {
    return { valid: false, error: '템플릿 구조가 잘못됨' };
  }

  if (response.template.outputs.length === 0) {
    return { valid: false, error: '출력이 없음' };
  }

  for (const output of response.template.outputs) {
    if (!output.simpleText && !output.basicCard) {
      return { valid: false, error: '지원되지 않는 출력 타입' };
    }
  }

  return { valid: true };
}

/**
 * 헬스체크 테스트
 */
async function testHealthCheck() {
  console.log('🏥 헬스체크 테스트...');
  
  try {
    const startTime = Date.now();
    const response = await makeRequest(HEALTH_URL);
    const endTime = Date.now();
    
    if (response.statusCode === 200) {
      console.log(`✅ 헬스체크 성공 (${endTime - startTime}ms)`);
      console.log(`   응답:`, response.data);
      return true;
    } else {
      console.log(`❌ 헬스체크 실패: HTTP ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 헬스체크 오류: ${error.message}`);
    return false;
  }
}

/**
 * 단일 메시지 테스트
 */
async function testSingleMessage(message, userId = 'test_user') {
  const skillRequest = createKakaoSkillRequest(message, userId);
  
  try {
    const startTime = Date.now();
    const response = await makeRequest(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Townly-Test-Bot/1.0'
      },
      body: JSON.stringify(skillRequest)
    });
    const endTime = Date.now();
    
    const timing = endTime - startTime;
    
    if (response.statusCode !== 200) {
      return {
        success: false,
        message,
        error: `HTTP ${response.statusCode}`,
        timing
      };
    }
    
    const validation = validateKakaoResponse(response.data);
    if (!validation.valid) {
      return {
        success: false,
        message,
        error: `응답 검증 실패: ${validation.error}`,
        timing,
        response: response.data
      };
    }
    
    return {
      success: true,
      message,
      timing,
      response: response.data
    };
    
  } catch (error) {
    return {
      success: false,
      message,
      error: error.message,
      timing: 0
    };
  }
}

/**
 * 메시지 세트 테스트
 */
async function testMessageSet(setName, messages) {
  console.log(`\n📝 ${setName} 테스트 시작...`);
  
  const results = [];
  let successCount = 0;
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const displayMessage = message || '[빈 메시지]';
    
    process.stdout.write(`  ${i + 1}/${messages.length} "${displayMessage}" 테스트 중...`);
    
    const result = await testSingleMessage(message, `test_user_${i}`);
    results.push(result);
    
    if (result.success) {
      successCount++;
      console.log(` ✅ (${result.timing}ms)`);
      
      // 응답 내용 간략히 표시
      const responseText = result.response?.template?.outputs?.[0]?.simpleText?.text;
      if (responseText) {
        const shortResponse = responseText.length > 50 
          ? responseText.substring(0, 50) + '...'
          : responseText;
        console.log(`     응답: "${shortResponse}"`);
      }
    } else {
      console.log(` ❌ ${result.error}`);
    }
    
    // 서버 부하 방지를 위한 짧은 지연
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const avgTiming = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.timing, 0) / successCount || 0;
  
  console.log(`\n📊 ${setName} 결과:`);
  console.log(`   성공: ${successCount}/${messages.length}`);
  console.log(`   평균 응답시간: ${Math.round(avgTiming)}ms`);
  
  return { results, successCount, total: messages.length };
}

/**
 * 부하 테스트
 */
async function loadTest(concurrency = 5, duration = 10) {
  console.log(`\n⚡ 부하 테스트 시작 (동시성: ${concurrency}, 지속시간: ${duration}초)...`);
  
  const testMessages = TEST_MESSAGES.basic;
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  let requestCount = 0;
  let successCount = 0;
  
  const workers = [];
  
  for (let i = 0; i < concurrency; i++) {
    workers.push(async () => {
      while (Date.now() < endTime) {
        const message = testMessages[requestCount % testMessages.length];
        const result = await testSingleMessage(message, `load_test_${requestCount}`);
        
        requestCount++;
        if (result.success) {
          successCount++;
        }
        
        // 너무 빠른 요청 방지
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    });
  }
  
  await Promise.all(workers.map(worker => worker()));
  
  const actualDuration = (Date.now() - startTime) / 1000;
  const rps = requestCount / actualDuration;
  
  console.log(`📊 부하 테스트 결과:`);
  console.log(`   총 요청: ${requestCount}`);
  console.log(`   성공: ${successCount}`);
  console.log(`   실제 지속시간: ${actualDuration.toFixed(1)}초`);
  console.log(`   초당 요청수: ${rps.toFixed(1)} RPS`);
  console.log(`   성공률: ${((successCount / requestCount) * 100).toFixed(1)}%`);
}

/**
 * 메인 테스트 실행
 */
async function runTests() {
  console.log('🚀 Townly 카카오 웹훅 종합 테스트 시작\n');
  console.log(`웹훅 URL: ${WEBHOOK_URL}`);
  console.log(`헬스체크 URL: ${HEALTH_URL}`);
  
  // 1. 헬스체크
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ 헬스체크 실패로 테스트를 중단합니다.');
    process.exit(1);
  }
  
  let totalTests = 0;
  let totalSuccess = 0;
  
  // 2. 기본 메시지 테스트
  const basicResult = await testMessageSet('기본 메시지', TEST_MESSAGES.basic);
  totalTests += basicResult.total;
  totalSuccess += basicResult.successCount;
  
  // 3. 엣지 케이스 테스트
  const edgeResult = await testMessageSet('엣지 케이스', TEST_MESSAGES.edge_cases);
  totalTests += edgeResult.total;
  totalSuccess += edgeResult.successCount;
  
  // 4. 지역 쿼리 테스트
  const regionalResult = await testMessageSet('지역 쿼리', TEST_MESSAGES.regional_queries);
  totalTests += regionalResult.total;
  totalSuccess += regionalResult.successCount;
  
  // 5. 부하 테스트 (옵션)
  const args = process.argv.slice(2);
  if (args.includes('--load-test')) {
    await loadTest(3, 5);
  }
  
  // 전체 결과
  console.log(`\n🏁 전체 테스트 완료`);
  console.log(`총 성공: ${totalSuccess}/${totalTests} (${((totalSuccess / totalTests) * 100).toFixed(1)}%)`);
  
  if (totalSuccess === totalTests) {
    console.log('✅ 모든 테스트가 성공했습니다!');
    process.exit(0);
  } else {
    console.log('⚠️  일부 테스트가 실패했습니다.');
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 테스트 실행 중 오류:', error);
    process.exit(1);
  });
}

module.exports = {
  createKakaoSkillRequest,
  testSingleMessage,
  validateKakaoResponse,
  TEST_MESSAGES
};
