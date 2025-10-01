#!/usr/bin/env node

/**
 * 이메일 스케줄 생성 테스트 스크립트
 */

const BASE_URL = 'http://localhost:3000';

async function testCreateEmailSchedules() {
  try {
    console.log('🔄 이메일 스케줄 생성 API 테스트 중...');
    
    const response = await fetch(`${BASE_URL}/api/admin/create-email-schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 실제 환경에서는 인증 헤더 필요
      },
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ 이메일 스케줄 생성 성공!');
      console.log(`📧 생성된 스케줄: ${result.created.length}개`);
      console.log(`⏭️  건너뛴 스케줄: ${result.skipped.length}개`);
      console.log(`📋 총 스케줄: ${result.totalSchedules}개`);
      
      console.log('\n📅 스케줄 목록:');
      result.schedules.forEach(schedule => {
        console.log(`   - ${schedule.title}: ${schedule.scheduleTime} (${schedule.isActive ? '활성' : '비활성'})`);
        console.log(`     다음 발송: ${new Date(schedule.nextSendAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
      });
    } else {
      console.error('❌ 이메일 스케줄 생성 실패:', result.error);
    }

  } catch (error) {
    console.error('❌ API 호출 중 오류:', error.message);
  }
}

async function testGetEmailSchedules() {
  try {
    console.log('\n🔍 현재 이메일 스케줄 조회 중...');
    
    const response = await fetch(`${BASE_URL}/api/admin/create-email-schedules`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ 이메일 스케줄 조회 성공!');
      console.log(`📋 총 스케줄: ${result.schedules.length}개`);
      
      console.log('\n📅 현재 스케줄 목록:');
      result.schedules.forEach(schedule => {
        console.log(`   - ${schedule.title}: ${schedule.scheduleTime} (${schedule.isActive ? '활성' : '비활성'})`);
        console.log(`     다음 발송: ${new Date(schedule.nextSendAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
        console.log(`     총 발송 횟수: ${schedule.totalSentCount}회`);
      });
    } else {
      console.error('❌ 이메일 스케줄 조회 실패:', result.error);
    }

  } catch (error) {
    console.error('❌ API 호출 중 오류:', error.message);
  }
}

// 스크립트 실행
async function main() {
  console.log('📧 이메일 스케줄 관리 테스트 시작\n');
  
  // 먼저 현재 스케줄 조회
  await testGetEmailSchedules();
  
  // 새 스케줄 생성 시도
  await testCreateEmailSchedules();
  
  console.log('\n✅ 테스트 완료');
}

main().catch(console.error);
