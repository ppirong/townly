/**
 * 터미널에서 실행하는 실시간 웹훅 모니터링 스크립트
 * 로그아웃 상태에서도 웹훅을 모니터링할 수 있습니다.
 */

const EventSource = require('eventsource');

console.log('🔍 실시간 웹훅 모니터링 시작');
console.log('=====================================');
console.log('');

// 통계 추적
let stats = {
  totalEvents: 0,
  webhookCalls: 0,
  successCount: 0,
  errorCount: 0,
  startTime: Date.now()
};

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// 이벤트 타입별 아이콘과 색상
function getEventDisplay(type) {
  switch (type) {
    case 'webhook_called':
      return { icon: '⚡', color: colors.blue, name: '웹훅 호출' };
    case 'webhook_success':
      return { icon: '✅', color: colors.green, name: '웹훅 성공' };
    case 'webhook_error':
      return { icon: '❌', color: colors.red, name: '웹훅 오류' };
    case 'user_signup':
      return { icon: '👤', color: colors.magenta, name: '사용자 가입' };
    case 'connection_established':
      return { icon: '🔗', color: colors.cyan, name: '연결 시작' };
    default:
      return { icon: '📡', color: colors.gray, name: '알 수 없음' };
  }
}

// 통계 출력
function printStats() {
  const duration = Math.floor((Date.now() - stats.startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  console.log('');
  console.log(`${colors.bright}📊 통계 (${minutes}분 ${seconds}초)${colors.reset}`);
  console.log(`   총 이벤트: ${colors.blue}${stats.totalEvents}${colors.reset}`);
  console.log(`   웹훅 호출: ${colors.magenta}${stats.webhookCalls}${colors.reset}`);
  console.log(`   성공: ${colors.green}${stats.successCount}${colors.reset}`);
  console.log(`   오류: ${colors.red}${stats.errorCount}${colors.reset}`);
  console.log('=====================================');
}

// 주기적으로 통계 출력
setInterval(printStats, 30000); // 30초마다

// Server-Sent Events 연결
const eventSource = new EventSource('http://localhost:3000/api/public/webhook-stream');

eventSource.onopen = function() {
  console.log(`${colors.green}✅ 실시간 모니터링 연결됨${colors.reset}`);
  console.log('');
};

eventSource.onmessage = function(event) {
  try {
    const webhookEvent = JSON.parse(event.data);
    const display = getEventDisplay(webhookEvent.type);
    const timestamp = new Date(webhookEvent.timestamp).toLocaleTimeString('ko-KR');
    
    // 통계 업데이트
    stats.totalEvents++;
    if (webhookEvent.type === 'webhook_called') stats.webhookCalls++;
    if (webhookEvent.type === 'webhook_success') stats.successCount++;
    if (webhookEvent.type === 'webhook_error') stats.errorCount++;
    
    // 이벤트 출력
    console.log(`${display.color}${display.icon} ${display.name}${colors.reset} ${colors.gray}[${timestamp}]${colors.reset}`);
    
    // 상세 정보 출력
    if (webhookEvent.data.email) {
      console.log(`   📧 이메일: ${webhookEvent.data.email}`);
    }
    if (webhookEvent.data.userId) {
      console.log(`   👤 사용자 ID: ${webhookEvent.data.userId.substring(0, 20)}...`);
    }
    if (webhookEvent.data.signupMethod) {
      console.log(`   🔐 가입 방법: ${webhookEvent.data.signupMethod}`);
    }
    if (webhookEvent.data.processingTime) {
      console.log(`   ⏱️ 처리 시간: ${webhookEvent.data.processingTime}ms`);
    }
    if (webhookEvent.data.step) {
      console.log(`   📍 단계: ${webhookEvent.data.step}`);
    }
    if (webhookEvent.data.error) {
      console.log(`   ${colors.red}❌ 오류: ${webhookEvent.data.error}${colors.reset}`);
    }
    if (webhookEvent.data.isTest) {
      console.log(`   ${colors.yellow}🧪 테스트 이벤트${colors.reset}`);
    }
    
    console.log('');
    
  } catch (error) {
    console.error(`${colors.red}❌ 이벤트 파싱 실패:${colors.reset}`, error.message);
  }
};

eventSource.onerror = function(error) {
  console.error(`${colors.red}❌ 연결 오류:${colors.reset}`, error);
  console.log(`${colors.yellow}⏳ 재연결 시도 중...${colors.reset}`);
};

// 종료 처리
process.on('SIGINT', function() {
  console.log('');
  console.log(`${colors.yellow}⏹️ 모니터링 중지됨${colors.reset}`);
  printStats();
  eventSource.close();
  process.exit(0);
});

console.log(`${colors.cyan}💡 사용 방법:${colors.reset}`);
console.log('1. 이 터미널을 열어둔 채로');
console.log('2. 브라우저에서 카카오 회원가입을 진행하세요');
console.log('3. 실시간으로 웹훅 호출 과정을 확인할 수 있습니다');
console.log('');
console.log(`${colors.gray}Ctrl+C를 눌러 종료할 수 있습니다${colors.reset}`);
console.log('');
