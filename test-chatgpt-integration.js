/**
 * 카카오톡 ChatGPT 연동 테스트 스크립트
 */

const fs = require('fs');
const path = require('path');

// 테스트할 메시지들
const testMessages = [
  "안녕하세요",
  "강남역 맛집 추천해줘",
  "홍대 카페 어디가 좋을까?",
  "파주시 야당역 맛집 알려줘",
  "교통 정보 알려줘",
  "도움말"
];

async function testChatGPTIntegration() {
  const testUrl = 'http://localhost:3000/api/kakao/webhook';
  
  console.log('🚀 카카오톡 ChatGPT 연동 테스트 시작');
  console.log('=' .repeat(50));
  
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`\n📱 테스트 ${i + 1}/${testMessages.length}: "${message}"`);
    
    // 카카오톡 챗봇 스킬 요청 형식
    const skillRequest = {
      "intent": {
        "id": "test_intent",
        "name": "블록 이름"
      },
      "userRequest": {
        "timezone": "Asia/Seoul",
        "params": {
          "ignoreMe": "true"
        },
        "block": {
          "id": "test_block",
          "name": "블록 이름"
        },
        "utterance": message,
        "lang": null,
        "user": {
          "id": `test_user_${Date.now()}`,
          "type": "accountId",
          "properties": {}
        }
      },
      "bot": {
        "id": "68bef0501c4ef66e4f5d73be",
        "name": "Townly"
      },
      "action": {
        "name": "townly_response",
        "clientExtra": null,
        "params": {},
        "id": "test_action",
        "detailParams": {}
      }
    };
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'KakaoTalk-Test/1.0'
        },
        body: JSON.stringify(skillRequest)
      });
      
      const responseTime = Date.now() - startTime;
      const result = await response.json();
      
      if (response.ok) {
        const botResponse = result.template?.outputs?.[0]?.simpleText?.text || '응답 없음';
        console.log(`✅ 성공 (${responseTime}ms)`);
        console.log(`🤖 응답: ${botResponse}`);
        
        // 응답 길이 체크
        if (botResponse.length > 1000) {
          console.log(`⚠️ 긴 응답 (${botResponse.length}자)`);
        }
      } else {
        console.log(`❌ 실패 (${response.status}): ${response.statusText}`);
        console.log('응답:', result);
      }
      
    } catch (error) {
      console.log(`❌ 에러: ${error.message}`);
    }
    
    // 요청 간 간격
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 테스트 완료');
}

// 환경변수 체크
function checkEnvironment() {
  console.log('🔍 환경 설정 체크');
  
  const envFile = path.join(__dirname, '.env.local');
  
  if (!fs.existsSync(envFile)) {
    console.log('❌ .env.local 파일이 없습니다. 먼저 환경변수를 설정해주세요.');
    console.log('\n필요한 환경변수:');
    console.log('- OPENAI_API_KEY: OpenAI API 키');
    console.log('- DATABASE_URL: 데이터베이스 연결 URL');
    console.log('- CLERK_SECRET_KEY: Clerk 비밀 키');
    return false;
  }
  
  const envContent = fs.readFileSync(envFile, 'utf8');
  const hasOpenAI = envContent.includes('OPENAI_API_KEY=') && !envContent.includes('OPENAI_API_KEY=your_');
  
  if (!hasOpenAI) {
    console.log('❌ OPENAI_API_KEY가 설정되지 않았습니다.');
    console.log('OpenAI API 키를 .env.local 파일에 설정해주세요.');
    return false;
  }
  
  console.log('✅ 환경 설정 확인 완료');
  return true;
}

// 서버 상태 체크
async function checkServer() {
  console.log('🌐 서버 상태 체크');
  
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('✅ 서버가 실행 중입니다.');
      return true;
    } else {
      console.log('❌ 서버 응답 오류:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ 서버에 연결할 수 없습니다. Next.js 서버가 실행 중인지 확인해주세요.');
    console.log('서버 시작: npm run dev');
    return false;
  }
}

// 메인 실행
async function main() {
  console.log('🏘️ Townly 카카오톡 ChatGPT 연동 테스트');
  console.log('시간:', new Date().toLocaleString('ko-KR'));
  console.log('');
  
  // 환경 체크
  if (!checkEnvironment()) {
    process.exit(1);
  }
  
  // 서버 체크
  if (!await checkServer()) {
    process.exit(1);
  }
  
  console.log('');
  
  // 테스트 실행
  await testChatGPTIntegration();
}

// 에러 핸들링
process.on('unhandledRejection', (error) => {
  console.error('처리되지 않은 Promise 거부:', error);
  process.exit(1);
});

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}
