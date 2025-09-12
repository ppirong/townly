#!/usr/bin/env node

/**
 * 로컬 개발용 웹훅 테스트 스크립트
 * 카카오톡 챗봇 스킬 요청을 시뮬레이션합니다.
 */

// Node.js 18+ 에서는 fetch가 내장되어 있습니다
const fetch = globalThis.fetch || require('node-fetch');

// 카카오톡 챗봇 스킬 요청 형식 시뮬레이션
function createKakaoSkillRequest(userMessage) {
  return {
    intent: {
      id: "test_intent",
      name: "테스트 인텐트",
      extra: {}
    },
    userRequest: {
      timezone: "Asia/Seoul",
      params: {},
      block: {
        id: "test_block",
        name: "테스트 블록"
      },
      utterance: userMessage,
      lang: "ko",
      user: {
        id: "test_user_" + Date.now(),
        type: "accountId",
        properties: {}
      }
    },
    bot: {
      id: "68bef0501c4ef66e4f5d73be",
      name: "townly_test"
    },
    action: {
      name: "test_action",
      clientExtra: {},
      params: {},
      id: "test_action_id",
      detailParams: {}
    }
  };
}

async function testLocalWebhook(message, port = 3000) {
  const webhookUrl = `http://localhost:${port}/api/kakao/webhook`;
  const skillRequest = createKakaoSkillRequest(message);
  
  console.log(`🚀 로컬 웹훅 테스트 시작`);
  console.log(`📍 URL: ${webhookUrl}`);
  console.log(`💬 메시지: "${message}"`);
  console.log('🔄 요청 전송 중...\n');
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'kakaotalk-test-client',
      },
      body: JSON.stringify(skillRequest),
    });
    
    const responseData = await response.json();
    
    console.log(`✅ 응답 상태: ${response.status}`);
    console.log(`📤 응답 내용:`);
    console.log(JSON.stringify(responseData, null, 2));
    
    // 카카오톡 챗봇 응답에서 텍스트 추출
    if (responseData.template?.outputs?.[0]?.simpleText?.text) {
      console.log(`\n🤖 챗봇 응답: "${responseData.template.outputs[0].simpleText.text}"`);
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 해결방법:');
      console.log('1. npm run dev 명령어로 개발 서버를 실행하세요');
      console.log('2. http://localhost:3000 이 정상 작동하는지 확인하세요');
    }
  }
}

// 명령줄 인수 처리
const args = process.argv.slice(2);
const message = args[0] || '안녕하세요';
const port = args[1] || 3000;

console.log('🏘️ Townly 로컬 웹훅 테스터\n');

// 테스트 실행
testLocalWebhook(message, port).then(() => {
  console.log('\n✨ 테스트 완료');
}).catch(console.error);

// 사용법 출력
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
사용법:
  node scripts/test-local-webhook.js "테스트 메시지" [포트번호]
  
예시:
  node scripts/test-local-webhook.js "강남역 맛집 추천해줘"
  node scripts/test-local-webhook.js "안녕하세요" 3000
  
옵션:
  --help, -h    이 도움말 표시
  `);
}
