/**
 * 실시간 웹훅 모니터링 스크립트
 * 새로운 웹훅 요청을 실시간으로 감지합니다.
 */

let lastTimestamp = new Date().toISOString();

async function checkNewWebhooks() {
  try {
    const response = await fetch('http://localhost:3000/api/debug/messages');
    const data = await response.json();
    
    if (!data.success) {
      console.error('API 응답 실패:', data.error);
      return;
    }
    
    const newLogs = data.data.webhookLogs.filter(log => log.timestamp > lastTimestamp);
    
    if (newLogs.length > 0) {
      console.log(`\n🔔 새로운 웹훅 ${newLogs.length}개 감지!`);
      
      newLogs.forEach((log, index) => {
        console.log(`\n📡 웹훅 #${index + 1}:`);
        console.log(`   시간: ${new Date(log.timestamp).toLocaleString('ko-KR')}`);
        console.log(`   상태: ${log.method} ${log.statusCode} (${log.isSuccessful ? '✅' : '❌'})`);
        console.log(`   처리시간: ${log.processingTime}`);
        
        if (log.requestBody) {
          try {
            const request = JSON.parse(log.requestBody);
            const userMessage = request.userRequest?.utterance;
            const userId = request.userRequest?.user?.id;
            
            if (userMessage && userId) {
              console.log(`   👤 사용자: ${userId}`);
              console.log(`   💬 메시지: "${userMessage}"`);
              
              // 실제 고객인지 확인
              if (!userId.startsWith('test_user_') && !userId.startsWith('real_kakao_user_')) {
                console.log(`   🎯 실제 카카오 고객 메시지 감지!`);
                console.log(`   📧 고객 정보: ${userId}`);
              }
            }
          } catch (e) {
            console.log(`   📄 요청 본문: ${log.requestBody.substring(0, 100)}...`);
          }
        }
        
        if (log.errorMessage) {
          console.log(`   ❌ 오류: ${log.errorMessage}`);
        }
      });
      
      // 마지막 타임스탬프 업데이트
      lastTimestamp = newLogs[0].timestamp;
    } else {
      process.stdout.write('.');
    }
    
  } catch (error) {
    console.error('\n❌ 모니터링 오류:', error.message);
  }
}

console.log('🔍 실시간 웹훅 모니터링 시작...');
console.log('💡 이제 실제 카카오 채널에서 메시지를 보내보세요!');
console.log('⏹️  종료하려면 Ctrl+C를 누르세요\n');

// 3초마다 체크
const interval = setInterval(checkNewWebhooks, 3000);

// 프로세스 종료 시 정리
process.on('SIGINT', () => {
  console.log('\n\n👋 모니터링 종료');
  clearInterval(interval);
  process.exit(0);
});
