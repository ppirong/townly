/**
 * 웹훅 테스트 스크립트
 * 카카오톡 챗봇 스킬 웹훅을 시뮬레이션하여 챗봇 응답을 테스트합니다.
 */

// 환경에 따른 웹훅 URL 설정
const WEBHOOK_URL = process.env.WEBHOOK_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://townly.vercel.app/api/kakao/webhook'
    : 'http://localhost:3000/api/kakao/webhook');

// 카카오톡 챗봇 스킬 테스트 메시지 데이터
const testMessages = [
  {
    name: '맛집 추천 테스트',
    data: {
      intent: {
        id: "test_intent_001",
        name: "맛집추천"
      },
      userRequest: {
        timezone: "Asia/Seoul",
        params: {
          ignoreMe: "true"
        },
        block: {
          id: "block_001",
          name: "시작 블록"
        },
        utterance: "파주시 야당역 맛집을 추천해줘",
        lang: null,
        user: {
          id: "test_user_001",
          type: "accountId",
          properties: {}
        }
      },
      bot: {
        id: "bot_001",
        name: "townly"
      },
      action: {
        name: "맛집추천",
        clientExtra: null,
        params: {},
        id: "action_001",
        detailParams: {}
      }
    }
  },
  {
    name: '카페 추천 테스트',
    data: {
      intent: {
        id: "test_intent_002",
        name: "카페추천"
      },
      userRequest: {
        timezone: "Asia/Seoul",
        params: {
          ignoreMe: "true"
        },
        block: {
          id: "block_002",
          name: "시작 블록"
        },
        utterance: "강남역 카페 추천해줘",
        lang: null,
        user: {
          id: "test_user_002",
          type: "accountId",
          properties: {}
        }
      },
      bot: {
        id: "bot_002",
        name: "townly"
      },
      action: {
        name: "카페추천",
        clientExtra: null,
        params: {},
        id: "action_002",
        detailParams: {}
      }
    }
  },
  {
    name: '인사 테스트',
    data: {
      intent: {
        id: "test_intent_003",
        name: "인사"
      },
      userRequest: {
        timezone: "Asia/Seoul",
        params: {
          ignoreMe: "true"
        },
        block: {
          id: "block_003",
          name: "시작 블록"
        },
        utterance: "안녕하세요",
        lang: null,
        user: {
          id: "test_user_003",
          type: "accountId",
          properties: {}
        }
      },
      bot: {
        id: "bot_003",
        name: "townly"
      },
      action: {
        name: "인사",
        clientExtra: null,
        params: {},
        id: "action_003",
        detailParams: {}
      }
    }
  },
  {
    name: '일반 질문 테스트',
    data: {
      intent: {
        id: "test_intent_004",
        name: "일반질문"
      },
      userRequest: {
        timezone: "Asia/Seoul",
        params: {
          ignoreMe: "true"
        },
        block: {
          id: "block_004",
          name: "시작 블록"
        },
        utterance: "주변에 뭐가 있을까?",
        lang: null,
        user: {
          id: "test_user_004",
          type: "accountId",
          properties: {}
        }
      },
      bot: {
        id: "bot_004",
        name: "townly"
      },
      action: {
        name: "일반질문",
        clientExtra: null,
        params: {},
        id: "action_004",
        detailParams: {}
      }
    }
  }
];

async function testWebhook(testCase) {
  try {
    console.log(`\n🧪 테스트: ${testCase.name}`);
    console.log(`📝 메시지: ${testCase.data.userRequest?.utterance || testCase.data.type}`);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.data)
    });
    
    const responseData = await response.json();
    
    console.log(`✅ 응답 상태: ${response.status}`);
    console.log(`📦 응답 데이터:`, JSON.stringify(responseData, null, 2));
    
    if (responseData.template?.outputs?.[0]?.simpleText?.text) {
      console.log(`🤖 챗봇 응답: "${responseData.template.outputs[0].simpleText.text}"`);
    }
    
  } catch (error) {
    console.error(`❌ 테스트 실패: ${testCase.name}`);
    console.error(`   오류:`, error.message);
  }
}

async function runAllTests() {
  console.log('🚀 웹훅 테스트 시작...\n');
  
  // 서버가 준비될 때까지 잠시 대기
  console.log('⏳ 서버 준비 대기 중...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  for (const testCase of testMessages) {
    await testWebhook(testCase);
    // 테스트 간 간격
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 모든 테스트 완료!');
}

// 스크립트 실행
runAllTests().catch(console.error);
