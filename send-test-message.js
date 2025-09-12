#!/usr/bin/env node
/**
 * 카카오 채널 테스트 메시지 전송 스크립트
 * 사용법: node send-test-message.js "메시지 내용"
 */

const message = process.argv[2] || "커서에서 보내는 기본 테스트 메시지입니다";

async function sendTestMessage(messageText) {
  try {
    console.log(`📤 메시지 전송 시작: "${messageText}"`);
    
    const response = await fetch('http://localhost:3000/api/kakao/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: messageText,
        recipient: 'townly_channel'
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ 메시지 전송 성공!');
      console.log(`📝 전송된 메시지: "${result.sentMessage}"`);
      console.log(`⏰ 전송 시간: ${new Date(result.timestamp).toLocaleString('ko-KR')}`);
      
      if (result.webhookResponse?.template?.outputs?.[0]?.simpleText?.text) {
        console.log('\n🤖 챗봇 응답:');
        console.log(result.webhookResponse.template.outputs[0].simpleText.text);
      }
      
      console.log('\n💡 확인 방법:');
      console.log('1. 디버깅 페이지: http://localhost:3000/debug/messages');
      console.log('2. 관리자 페이지: http://localhost:3000/admin/kakao (로그인 필요)');
      console.log('3. 실시간 모니터링: 현재 실행 중인 monitor-webhooks.js 확인');
      
    } else {
      console.error('❌ 메시지 전송 실패:', result.error);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

// 스크립트 실행
sendTestMessage(message);
