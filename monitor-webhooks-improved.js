#!/usr/bin/env node

/**
 * 개선된 카카오 웹훅 실시간 모니터링 도구
 * 
 * GitHub 참조 코드의 패턴을 적용하여 더 상세한 모니터링을 제공합니다.
 * 
 * 기능:
 * - 실시간 웹훅 모니터링  
 * - 메시지 타입 분석
 * - 응답 시간 측정
 * - 에러 패턴 분석
 * - 사용자 패턴 추적
 * - 통계 대시보드
 * 
 * 사용법:
 * node monitor-webhooks-improved.js [--detailed] [--stats]
 */

const http = require('http');

// 설정
const DEBUG_API_URL = 'http://localhost:3000/api/debug/messages';
const NGROK_API_URL = 'http://localhost:4040/api/requests/http';
const CHECK_INTERVAL = 2000; // 2초마다 체크

// 통계 데이터
const stats = {
  totalRequests: 0,
  successRequests: 0,
  errorRequests: 0,
  realCustomers: new Set(),
  testUsers: new Set(),
  messageTypes: {},
  averageResponseTime: 0,
  responseTimes: [],
  startTime: new Date(),
  lastActivity: null
};

// 옵션 파싱
const args = process.argv.slice(2);
const isDetailed = args.includes('--detailed');
const showStats = args.includes('--stats');

let lastTimestamp = new Date().toISOString();

/**
 * 메시지 타입 분석
 */
function analyzeMessageType(message) {
  if (!message) return 'unknown';
  
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('안녕') || lowerMessage.includes('처음')) {
    return 'greeting';
  }
  
  if (lowerMessage.includes('맛집') || lowerMessage.includes('음식')) {
    return 'restaurant_query';
  }
  
  if (lowerMessage.includes('도움') || lowerMessage.includes('help')) {
    return 'help_request';
  }
  
  if (lowerMessage.includes('고마') || lowerMessage.includes('감사')) {
    return 'gratitude';
  }
  
  if (lowerMessage.match(/\d{2,3}-\d{3,4}-\d{4}/)) {
    return 'phone_number';
  }
  
  if (lowerMessage.includes('@') && lowerMessage.includes('.')) {
    return 'email';
  }
  
  if (lowerMessage.includes('http')) {
    return 'url';
  }
  
  return 'general_text';
}

/**
 * 사용자 타입 분석
 */
function analyzeUserType(userId) {
  if (!userId) return 'unknown';
  
  if (userId.includes('test_') || userId.includes('cursor_')) {
    return 'test_user';
  }
  
  if (userId.includes('simulation') || userId.includes('load_test')) {
    return 'automated_test';
  }
  
  // 실제 카카오 사용자 ID는 보통 긴 영숫자 조합
  if (userId.length > 20) {
    return 'real_customer';
  }
  
  return 'unknown_user';
}

/**
 * 통계 업데이트
 */
function updateStats(log) {
  stats.totalRequests++;
  stats.lastActivity = new Date();
  
  if (log.isSuccessful) {
    stats.successRequests++;
  } else {
    stats.errorRequests++;
  }
  
  // 응답 시간 추적
  if (log.processingTime) {
    const timeMs = parseInt(log.processingTime.replace('ms', ''));
    if (!isNaN(timeMs)) {
      stats.responseTimes.push(timeMs);
      if (stats.responseTimes.length > 100) {
        stats.responseTimes.shift(); // 최근 100개만 유지
      }
      stats.averageResponseTime = Math.round(
        stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length
      );
    }
  }
  
  // 사용자 분석
  if (log.requestBody) {
    try {
      const request = JSON.parse(log.requestBody);
      const userId = request.userRequest?.user?.id;
      const userMessage = request.userRequest?.utterance;
      
      if (userId) {
        const userType = analyzeUserType(userId);
        if (userType === 'real_customer') {
          stats.realCustomers.add(userId);
        } else if (userType === 'test_user') {
          stats.testUsers.add(userId);
        }
      }
      
      if (userMessage) {
        const messageType = analyzeMessageType(userMessage);
        stats.messageTypes[messageType] = (stats.messageTypes[messageType] || 0) + 1;
      }
    } catch (e) {
      // JSON 파싱 실패는 무시
    }
  }
}

/**
 * 통계 대시보드 출력
 */
function printStats() {
  const uptime = Math.round((Date.now() - stats.startTime.getTime()) / 1000);
  const successRate = stats.totalRequests > 0 
    ? Math.round((stats.successRequests / stats.totalRequests) * 100)
    : 0;
  
  console.clear();
  console.log('📊 Townly 웹훅 모니터링 대시보드');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🕐 가동시간: ${uptime}초`);
  console.log(`📡 총 요청수: ${stats.totalRequests}`);
  console.log(`✅ 성공: ${stats.successRequests} (${successRate}%)`);
  console.log(`❌ 실패: ${stats.errorRequests}`);
  console.log(`⚡ 평균 응답시간: ${stats.averageResponseTime}ms`);
  console.log(`👥 실제 고객: ${stats.realCustomers.size}명`);
  console.log(`🧪 테스트 사용자: ${stats.testUsers.size}명`);
  
  if (stats.lastActivity) {
    const timeSinceLastActivity = Math.round((Date.now() - stats.lastActivity.getTime()) / 1000);
    console.log(`🔔 마지막 활동: ${timeSinceLastActivity}초 전`);
  }
  
  // 메시지 타입 통계
  if (Object.keys(stats.messageTypes).length > 0) {
    console.log('\n💬 메시지 타입 분포:');
    Object.entries(stats.messageTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([type, count]) => {
        const percentage = Math.round((count / stats.totalRequests) * 100);
        console.log(`   ${type}: ${count}회 (${percentage}%)`);
      });
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('실시간 모니터링 중... (Ctrl+C로 종료)');
}

/**
 * 새로운 웹훅 체크
 */
async function checkNewWebhooks() {
  try {
    const response = await fetch(DEBUG_API_URL);
    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ API 응답 실패:', data.error);
      return;
    }
    
    const newLogs = data.data.webhookLogs.filter(log => log.timestamp > lastTimestamp);
    
    if (newLogs.length > 0) {
      newLogs.forEach((log, index) => {
        updateStats(log);
        
        if (!showStats) {
          console.log(`\n🔔 새로운 웹훅 #${index + 1}:`);
          console.log(`   시간: ${new Date(log.timestamp).toLocaleString('ko-KR')}`);
          console.log(`   상태: ${log.method} ${log.statusCode} (${log.isSuccessful ? '✅' : '❌'})`);
          console.log(`   처리시간: ${log.processingTime}`);
        }
        
        if (log.requestBody) {
          try {
            const request = JSON.parse(log.requestBody);
            const userMessage = request.userRequest?.utterance;
            const userId = request.userRequest?.user?.id;
            
            if (userMessage && userId) {
              const userType = analyzeUserType(userId);
              const messageType = analyzeMessageType(userMessage);
              
              if (!showStats) {
                console.log(`   👤 사용자: ${userId}`);
                console.log(`   💬 메시지: "${userMessage}"`);
                console.log(`   🏷️  타입: ${messageType}`);
                
                if (userType === 'real_customer') {
                  console.log(`   🎯 실제 카카오 고객 메시지 감지!`);
                  console.log(`   📧 고객 정보: ${userId}`);
                  
                  // 실제 고객 메시지는 별도로 강조 표시
                  console.log('\n🚨 REAL CUSTOMER MESSAGE 🚨');
                  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                  console.log(`시간: ${new Date(log.timestamp).toLocaleString('ko-KR')}`);
                  console.log(`사용자 ID: ${userId}`);
                  console.log(`메시지: "${userMessage}"`);
                  console.log(`메시지 타입: ${messageType}`);
                  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
                }
              }
              
              if (isDetailed && !showStats) {
                console.log(`   📋 상세 정보:`);
                console.log(`      - 봇 ID: ${request.bot?.id}`);
                console.log(`      - 인텐트: ${request.intent?.name}`);
                console.log(`      - 블록: ${request.userRequest?.block?.name}`);
              }
            }
          } catch (e) {
            if (!showStats) {
              console.log(`   📄 요청 본문: ${log.requestBody.substring(0, 100)}...`);
            }
          }
        }
        
        if (log.errorMessage && !showStats) {
          console.log(`   ⚠️  에러: ${log.errorMessage}`);
        }
        
        if (log.responseBody && isDetailed && !showStats) {
          try {
            const response = JSON.parse(log.responseBody);
            const responseText = response.template?.outputs?.[0]?.simpleText?.text;
            if (responseText) {
              const shortResponse = responseText.length > 100
                ? responseText.substring(0, 100) + '...'
                : responseText;
              console.log(`   🤖 응답: "${shortResponse}"`);
            }
          } catch (e) {
            // 응답 파싱 실패는 무시
          }
        }
      });
      
      lastTimestamp = newLogs[newLogs.length - 1].timestamp;
    }
    
    // 통계 모드에서는 대시보드 새로고침
    if (showStats) {
      printStats();
    }
    
  } catch (error) {
    console.error('❌ 모니터링 오류:', error.message);
  }
}

/**
 * ngrok 요청 모니터링 (추가 기능)
 */
async function checkNgrokRequests() {
  try {
    const response = await fetch(NGROK_API_URL);
    const data = await response.json();
    
    // ngrok 요청 분석 로직을 여기에 추가할 수 있음
    // 현재는 기본 웹훅 모니터링에 집중
    
  } catch (error) {
    // ngrok API 접근 실패는 무시 (선택적 기능)
  }
}

/**
 * 메인 모니터링 루프
 */
async function startMonitoring() {
  console.log('🚀 Townly 웹훅 모니터링 시작');
  console.log(`📡 API URL: ${DEBUG_API_URL}`);
  console.log(`🔍 모드: ${showStats ? '통계 대시보드' : '실시간 로그'}`);
  console.log(`📊 상세 정보: ${isDetailed ? '활성화' : '비활성화'}`);
  console.log(`⏱️  체크 간격: ${CHECK_INTERVAL}ms`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 초기 통계 화면 표시
  if (showStats) {
    printStats();
  }
  
  // 주기적 체크
  setInterval(async () => {
    await checkNewWebhooks();
    
    // ngrok 모니터링도 함께 수행
    if (isDetailed) {
      await checkNgrokRequests();
    }
  }, CHECK_INTERVAL);
  
  // 프로세스 종료 시 통계 출력
  process.on('SIGINT', () => {
    console.log('\n\n📊 모니터링 종료 - 최종 통계:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`총 실행시간: ${Math.round((Date.now() - stats.startTime.getTime()) / 1000)}초`);
    console.log(`총 웹훅 요청: ${stats.totalRequests}개`);
    console.log(`성공률: ${stats.totalRequests > 0 ? Math.round((stats.successRequests / stats.totalRequests) * 100) : 0}%`);
    console.log(`실제 고객 수: ${stats.realCustomers.size}명`);
    console.log(`평균 응답시간: ${stats.averageResponseTime}ms`);
    
    if (stats.realCustomers.size > 0) {
      console.log('\n🎯 실제 고객 ID 목록:');
      Array.from(stats.realCustomers).forEach(id => {
        console.log(`   - ${id}`);
      });
    }
    
    console.log('\n👋 모니터링이 종료되었습니다.');
    process.exit(0);
  });
}

// 스크립트 실행
if (require.main === module) {
  startMonitoring().catch(error => {
    console.error('💥 모니터링 시작 실패:', error);
    process.exit(1);
  });
}
