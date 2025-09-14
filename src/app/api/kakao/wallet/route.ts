import { NextRequest, NextResponse } from 'next/server';
import { getKakaoWalletInfo, checkKakaoSendAvailability } from '@/lib/services/kakao-business';
import { auth } from '@clerk/nextjs/server';

/**
 * 카카오 월렛 정보 조회 API
 * GET /api/kakao/wallet
 */
export async function GET(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('💰 카카오 월렛 정보 조회 요청');

    // 월렛 정보 조회
    const walletInfo = await getKakaoWalletInfo();
    
    // 발송 가능 여부 확인 (브로드캐스트 기준)
    const canSendBroadcast = await checkKakaoSendAvailability(15);
    const canSendAlimtalk = await checkKakaoSendAvailability(8);

    // 예상 발송 가능 건수 계산
    const maxBroadcastCount = Math.floor(walletInfo.balance / 15);
    const maxAlimtalkCount = Math.floor(walletInfo.balance / 8);

    console.log('✅ 월렛 정보 조회 성공:', {
      balance: walletInfo.balance,
      canSendBroadcast,
      canSendAlimtalk
    });

    return NextResponse.json({
      success: true,
      wallet: {
        balance: walletInfo.balance,
        currency: walletInfo.currency,
        lastUpdated: walletInfo.lastUpdated,
        formattedBalance: `${walletInfo.balance.toLocaleString()} ${walletInfo.currency}`
      },
      availability: {
        canSendBroadcast,
        canSendAlimtalk,
        maxBroadcastCount,
        maxAlimtalkCount,
        estimatedCosts: {
          broadcast: 15,
          alimtalk: 8
        }
      },
      recommendations: {
        lowBalance: walletInfo.balance < 1000,
        recommendedMinBalance: 10000,
        message: walletInfo.balance < 1000 
          ? '월렛 잔액이 부족합니다. 충전을 권장합니다.' 
          : walletInfo.balance < 10000 
            ? '월렛 잔액이 낮습니다. 여유분 충전을 권장합니다.'
            : '월렛 잔액이 충분합니다.'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 월렛 정보 조회 중 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * 발송 가능 여부 확인 API
 * POST /api/kakao/wallet
 */
export async function POST(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageType, recipientCount } = await request.json();

    if (!messageType || !['broadcast', 'alimtalk'].includes(messageType)) {
      return NextResponse.json({
        error: 'messageType은 "broadcast" 또는 "alimtalk"이어야 합니다.'
      }, { status: 400 });
    }

    const count = recipientCount || 1;
    const costPerMessage = messageType === 'broadcast' ? 15 : 8;
    const totalCost = costPerMessage * count;

    console.log(`💰 발송 가능 여부 확인: ${messageType} ${count}건 (${totalCost}원)`);

    // 월렛 정보 조회
    const walletInfo = await getKakaoWalletInfo();
    
    // 발송 가능 여부 확인
    const canSend = await checkKakaoSendAvailability(totalCost);

    return NextResponse.json({
      success: true,
      check: {
        messageType,
        recipientCount: count,
        costPerMessage,
        totalCost,
        canSend,
        currentBalance: walletInfo.balance,
        remainingBalance: walletInfo.balance - totalCost,
        shortage: canSend ? 0 : totalCost - walletInfo.balance
      },
      recommendation: canSend 
        ? '발송 가능합니다.'
        : `잔액이 부족합니다. ${totalCost - walletInfo.balance}원을 충전해주세요.`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 발송 가능 여부 확인 중 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
