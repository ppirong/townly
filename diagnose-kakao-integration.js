#!/usr/bin/env node

/**
 * 카카오 채널-챗봇 연동 문제 진단 도구
 * 실제 고객 메시지가 챗봇에 도달하지 않는 문제를 체계적으로 분석
 */

const https = require('https');
const http = require('http');

// 설정
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://2da26f20f041.ngrok-free.app/api/kakao/webhook';
const NGROK_URL = 'http://localhost:4040/api/requests/http';
const HEALTH_URL = WEBHOOK_URL.replace('/api/kakao/webhook', '/api/health');

console.log('🔍 카카오 채널-챗봇 연동 문제 진단 시작');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

/**
 * HTTP 요청 함수
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
 * 1. 기본 인프라 체크
 */
async function checkInfrastructure() {
  console.log('🏗️  1. 기본 인프라 체크');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 헬스체크
  try {
    console.log('   📡 서버 헬스체크...');
    const healthResponse = await makeRequest(HEALTH_URL);
    
    if (healthResponse.statusCode === 200) {
      console.log('   ✅ 서버 정상 동작');
      console.log(`   📊 응답: ${JSON.stringify(healthResponse.data, null, 2)}`);
    } else {
      console.log(`   ❌ 서버 응답 이상: ${healthResponse.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ 서버 접근 불가: ${error.message}`);
    return false;
  }

  // 웹훅 엔드포인트 체크
  try {
    console.log('   🔗 웹훅 엔드포인트 체크...');
    const webhookResponse = await makeRequest(WEBHOOK_URL, { method: 'GET' });
    
    if (webhookResponse.statusCode === 200) {
      console.log('   ✅ 웹훅 엔드포인트 정상');
    } else {
      console.log(`   ⚠️  웹훅 엔드포인트 응답: ${webhookResponse.statusCode}`);
    }
  } catch (error) {
    console.log(`   ❌ 웹훅 엔드포인트 접근 불가: ${error.message}`);
    return false;
  }

  // ngrok 터널 체크
  try {
    console.log('   🌐 ngrok 터널 체크...');
    const ngrokResponse = await makeRequest(NGROK_URL);
    
    if (ngrokResponse.statusCode === 200) {
      console.log('   ✅ ngrok 터널 정상');
      
      // 최근 요청 확인
      const requests = ngrokResponse.data?.requests || [];
      const recentRequests = requests.slice(0, 5);
      
      console.log(`   📊 최근 요청 ${recentRequests.length}개:`);
      recentRequests.forEach((req, i) => {
        const timestamp = new Date(req.started_at).toLocaleString('ko-KR');
        console.log(`      ${i + 1}. ${req.request?.method} ${req.request?.path} - ${timestamp}`);
      });
    } else {
      console.log(`   ⚠️  ngrok API 응답: ${ngrokResponse.statusCode}`);
    }
  } catch (error) {
    console.log(`   ⚠️  ngrok API 접근 불가 (정상적일 수 있음): ${error.message}`);
  }

  return true;
}

/**
 * 2. 카카오 스킬 연동 테스트
 */
async function testKakaoSkillIntegration() {
  console.log('\n🤖 2. 카카오 스킬 연동 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 표준 카카오 스킬 요청 생성
  const skillRequest = {
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
      utterance: "진단 테스트 메시지",
      lang: null,
      user: {
        id: "real_kakao_user_diagnostic_test",
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

  try {
    console.log('   📤 카카오 스킬 요청 전송...');
    const response = await makeRequest(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'KakaoOpenBuilder/1.0'
      },
      body: JSON.stringify(skillRequest)
    });

    console.log(`   📨 응답 상태: ${response.statusCode}`);
    
    if (response.statusCode === 200 && response.data) {
      console.log('   ✅ 카카오 스킬 형식 응답 정상');
      
      // 응답 구조 검증
      if (response.data.version === "2.0" && response.data.template) {
        console.log('   ✅ 카카오 스킬 응답 형식 올바름');
        
        const responseText = response.data.template.outputs?.[0]?.simpleText?.text;
        if (responseText) {
          console.log(`   💬 응답 내용: "${responseText.substring(0, 100)}..."`);
        }
      } else {
        console.log('   ⚠️  카카오 스킬 응답 형식 문제');
        console.log(`   📋 응답 구조: ${JSON.stringify(response.data, null, 2)}`);
      }
    } else {
      console.log(`   ❌ 카카오 스킬 응답 실패`);
      console.log(`   📋 응답: ${response.rawData}`);
    }
  } catch (error) {
    console.log(`   ❌ 카카오 스킬 테스트 실패: ${error.message}`);
  }
}

/**
 * 3. 외부 접근성 확인
 */
async function checkExternalAccess() {
  console.log('\n🌍 3. 외부 접근성 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    console.log('   🔍 curl 명령으로 외부 접근성 테스트...');
    console.log(`   💡 다음 명령을 다른 터미널에서 실행해보세요:`);
    console.log(`      curl -X GET "${WEBHOOK_URL}"`);
    console.log(`      curl -X POST "${WEBHOOK_URL}" -H "Content-Type: application/json" -d '{"test": true}'`);
    
    // 카카오 i 오픈빌더가 접근할 수 있는지 시뮬레이션
    const curlTest = await makeRequest(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'curl/7.68.0',
        'X-Forwarded-For': '211.249.220.24' // 카카오 IP 대역 시뮬레이션
      },
      body: JSON.stringify({
        userRequest: {
          utterance: "외부 접근성 테스트",
          user: { id: "external_access_test" }
        },
        bot: { id: "68bef0501c4ef66e4f5d73be" }
      })
    });
    
    if (curlTest.statusCode === 200) {
      console.log('   ✅ 외부 curl 접근 성공');
    } else {
      console.log(`   ⚠️  외부 curl 접근 응답: ${curlTest.statusCode}`);
    }
    
  } catch (error) {
    console.log(`   ❌ 외부 접근성 테스트 실패: ${error.message}`);
  }
}

/**
 * 4. 카카오 i 오픈빌더 설정 체크리스트
 */
function printKakaoBuilderChecklist() {
  console.log('\n📋 4. 카카오 i 오픈빌더 설정 체크리스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('   🔧 다음 항목들을 카카오 i 오픈빌더에서 확인해주세요:');
  console.log('');
  
  console.log('   ✅ 봇 설정:');
  console.log('      □ 봇이 "활성화" 상태인가?');
  console.log('      □ 봇 이름이 "townly"인가?');
  console.log('      □ 봇 ID가 "68bef0501c4ef66e4f5d73be"인가?');
  console.log('');
  
  console.log('   ✅ 채널 연결:');
  console.log('      □ "채널 연결" 메뉴에서 Townly 채널이 연결되어 있는가?');
  console.log('      □ 연결 상태가 "정상" 또는 "연결됨"인가?');
  console.log('      □ 채널 연결을 해제하고 다시 연결해봤는가?');
  console.log('');
  
  console.log('   ✅ 시나리오 설정:');
  console.log('      □ "시나리오" > "폴백 블록"이 존재하는가?');
  console.log('      □ 폴백 블록에서 "스킬" 호출이 설정되어 있는가?');
  console.log('      □ 스킬 URL이 올바른가?');
  console.log(`         예상 URL: ${WEBHOOK_URL}`);
  console.log('      □ "기본 응답"이 폴백 블록으로 설정되어 있는가?');
  console.log('');
  
  console.log('   ✅ 스킬 설정:');
  console.log('      □ "스킬" 메뉴에서 웹훅 스킬이 등록되어 있는가?');
  console.log('      □ 스킬이 "활성화" 상태인가?');
  console.log('      □ 스킬 URL이 정확한가?');
  console.log('      □ 스킬 테스트가 성공하는가?');
  console.log('');
  
  console.log('   ✅ 배포 설정:');
  console.log('      □ 봇이 "배포" 상태인가?');
  console.log('      □ 최근 변경사항이 배포되었는가?');
  console.log('      □ 베타 테스트 단계를 거쳤는가?');
}

/**
 * 5. 카카오톡 채널 관리자센터 체크리스트
 */
function printChannelCenterChecklist() {
  console.log('\n📱 5. 카카오톡 채널 관리자센터 설정 체크리스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('   🔧 다음 항목들을 카카오톡 채널 관리자센터에서 확인해주세요:');
  console.log('');
  
  console.log('   ✅ 기본 설정:');
  console.log('      □ 채널이 "공개" 상태인가?');
  console.log('      □ 검색 허용이 활성화되어 있는가?');
  console.log('      □ 채널 URL이 정상 작동하는가?');
  console.log('         확인 URL: https://pf.kakao.com/_wcyDn');
  console.log('');
  
  console.log('   ✅ 챗봇 연결:');
  console.log('      □ "관리" > "채팅" > "챗봇 연결"이 활성화되어 있는가?');
  console.log('      □ 연결된 챗봇이 "townly"인가?');
  console.log('      □ 자동응답 설정이 "챗봇 우선" 또는 "챗봇 전용"인가?');
  console.log('      □ 상담원 연결 설정이 챗봇을 방해하지 않는가?');
  console.log('');
  
  console.log('   ✅ 메시지 설정:');
  console.log('      □ 일반 자동응답이 비활성화되어 있는가?');
  console.log('      □ 인사말 설정이 챗봇과 충돌하지 않는가?');
  console.log('      □ 키워드 자동응답이 비활성화되어 있는가?');
}

/**
 * 6. 진단 결과 및 권장사항
 */
function printRecommendations() {
  console.log('\n💡 6. 문제 해결 권장사항');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('   🎯 가장 가능성 높은 원인들:');
  console.log('');
  
  console.log('   1️⃣  카카오 i 오픈빌더에서 폴백 블록이 스킬을 호출하지 않음');
  console.log('      → 시나리오에서 폴백 블록 설정 확인');
  console.log('      → 모든 사용자 입력이 폴백 블록으로 가도록 설정');
  console.log('');
  
  console.log('   2️⃣  챗봇이 비활성화 상태이거나 배포되지 않음');
  console.log('      → 봇 상태를 "활성화"로 변경');
  console.log('      → 변경사항을 "배포"');
  console.log('');
  
  console.log('   3️⃣  카카오톡 채널에서 챗봇 연결이 제대로 되지 않음');
  console.log('      → 채널 관리자센터에서 챗봇 연결 해제 후 재연결');
  console.log('      → 자동응답을 "챗봇 우선"으로 설정');
  console.log('');
  
  console.log('   4️⃣  스킬 URL이 잘못되거나 접근할 수 없음');
  console.log('      → 스킬 URL 재확인 및 테스트');
  console.log('      → ngrok URL이 변경되었을 수 있음');
  console.log('');
  
  console.log('   🔧 즉시 시도할 수 있는 해결책:');
  console.log('      1. 카카오 i 오픈빌더에서 봇 비활성화 → 활성화');
  console.log('      2. 채널 연결 해제 → 재연결');
  console.log('      3. 스킬 URL 재등록');
  console.log('      4. 폴백 블록에서 스킬 호출 재설정');
  console.log('      5. 봇 재배포');
}

/**
 * 메인 진단 실행
 */
async function runDiagnosis() {
  const infrastructureOk = await checkInfrastructure();
  
  if (infrastructureOk) {
    await testKakaoSkillIntegration();
    await checkExternalAccess();
  }
  
  printKakaoBuilderChecklist();
  printChannelCenterChecklist();
  printRecommendations();
  
  console.log('\n🏁 진단 완료');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('위 체크리스트를 순서대로 확인한 후 다시 테스트해주세요.');
  console.log('문제가 지속되면 카카오 고객센터에 문의하거나');
  console.log('개발자 커뮤니티에서 도움을 요청하세요.');
}

// 스크립트 실행
if (require.main === module) {
  runDiagnosis().catch(error => {
    console.error('💥 진단 실행 중 오류:', error);
    process.exit(1);
  });
}
