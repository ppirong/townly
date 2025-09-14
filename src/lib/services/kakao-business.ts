'use server';

import { env } from '@/lib/env';

/**
 * 카카오 비즈니스 API 클라이언트
 * 
 * 주요 기능:
 * - 카카오톡 채널 메시지 발송 (브로드캐스트)
 * - 알림톡 발송
 * - 월렛 잔액 확인
 * - 발송 결과 확인
 */

export interface KakaoMessage {
  message: string;
  messageType?: 'text' | 'image' | 'template';
  recipients?: string[]; // 특정 사용자들에게 발송 시
  templateId?: string; // 알림톡 템플릿 ID
  templateArgs?: Record<string, string>; // 템플릿 변수
}

export interface KakaoSendResult {
  success: boolean;
  messageId?: string;
  sentCount?: number;
  failedCount?: number;
  error?: string;
  cost?: number; // 발송 비용 (원)
}

export interface KakaoWalletInfo {
  balance: number; // 현재 잔액 (원)
  currency: string; // 통화 (KRW)
  lastUpdated: Date;
}

/**
 * 카카오 비즈니스 API 기본 클래스
 */
class KakaoBusiness {
  private readonly baseUrl = 'https://api.kakaobusiness.com/v1';
  private readonly channelId: string;
  private readonly adminKey: string;
  private readonly senderKey: string;

  constructor() {
    this.channelId = env.KAKAO_CHANNEL_ID || '';
    this.adminKey = env.KAKAO_ADMIN_KEY || '';
    this.senderKey = env.KAKAO_SENDER_KEY || '';

    if (!this.adminKey) {
      console.warn('⚠️ KAKAO_ADMIN_KEY가 설정되지 않았습니다. 시뮬레이션 모드로 실행됩니다.');
    }
  }

  /**
   * API 요청 헤더 생성
   */
  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.adminKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * API 요청 실행
   */
  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' = 'POST', 
    body?: any
  ): Promise<T> {
    if (!this.adminKey) {
      throw new Error('카카오 비즈니스 API 키가 설정되지 않았습니다.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`📤 카카오 API 요청: ${method} ${url}`);
    
    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ 카카오 API 오류 (${response.status}):`, errorText);
        throw new Error(`카카오 API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ 카카오 API 응답:', result);
      
      return result;
    } catch (error) {
      console.error('❌ 카카오 API 요청 중 오류:', error);
      throw error;
    }
  }

  /**
   * 채널 브로드캐스트 메시지 발송
   * 채널을 구독한 모든 사용자에게 메시지 발송
   */
  async sendBroadcastMessage(message: KakaoMessage): Promise<KakaoSendResult> {
    console.log('🔄 브로드캐스트 메시지 발송 (개발 모드)');
    console.log('📨 메시지:', message.message);
    console.log('📨 메시지 타입:', message.messageType || 'text');
    
    // 현재는 실제 카카오 API 대신 시뮬레이션으로 처리
    // 실제 연동 시 아래 로직으로 교체
    
    if (!this.adminKey) {
      console.log('🔄 시뮬레이션 모드: API 키 없음');
      return {
        success: true,
        messageId: `sim_${Date.now()}`,
        sentCount: 1,
        failedCount: 0,
        cost: 0, // 시뮬레이션이므로 비용 0
      };
    }

    // 개발 환경에서는 실제 API 호출 대신 시뮬레이션
    console.log('🔄 개발 모드: 실제 API 호출 대신 시뮬레이션');
    
    // 실제 발송 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 지연으로 실제 API 호출 시뮬레이션
    
    return {
      success: true,
      messageId: `dev_broadcast_${Date.now()}`,
      sentCount: 1,
      failedCount: 0,
      cost: 15, // 실제 예상 비용
    };

    // TODO: 실제 카카오 API 연동 시 아래 코드 활성화
    /*
    try {
      const requestBody = {
        channel_id: this.channelId,
        message: {
          type: message.messageType || 'text',
          text: message.message,
        },
        recipients: message.recipients || [],
      };

      const result = await this.makeRequest<any>('/messages/broadcast', 'POST', requestBody);
      
      return {
        success: true,
        messageId: result.message_id,
        sentCount: result.sent_count || 1,
        failedCount: result.failed_count || 0,
        cost: result.cost || 15,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        sentCount: 0,
        failedCount: 1,
        cost: 0,
      };
    }
    */
  }

  /**
   * 알림톡 발송
   * 사전에 등록된 템플릿을 사용하여 개인화된 메시지 발송
   */
  async sendAlimtalk(message: KakaoMessage): Promise<KakaoSendResult> {
    if (!message.templateId) {
      throw new Error('알림톡 발송 시 templateId가 필요합니다.');
    }

    console.log('🔄 알림톡 발송 (개발 모드)');
    console.log('📨 템플릿 ID:', message.templateId);
    console.log('📨 메시지:', message.message);
    console.log('📨 템플릿 변수:', message.templateArgs);

    // 개발 환경에서는 실제 API 호출 대신 시뮬레이션
    console.log('🔄 개발 모드: 실제 알림톡 API 호출 대신 시뮬레이션');
    
    // 실제 발송 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 800)); // 0.8초 지연
    
    return {
      success: true,
      messageId: `dev_alimtalk_${Date.now()}`,
      sentCount: message.recipients?.length || 1,
      failedCount: 0,
      cost: (message.recipients?.length || 1) * 8, // 알림톡 비용 계산
    };

    // TODO: 실제 카카오 API 연동 시 아래 코드 활성화
    /*
    try {
      const requestBody = {
        sender_key: this.senderKey,
        template_id: message.templateId,
        message: message.message,
        template_args: message.templateArgs || {},
        recipients: message.recipients || [],
      };

      const result = await this.makeRequest<any>('/messages/alimtalk', 'POST', requestBody);
      
      return {
        success: true,
        messageId: result.message_id,
        sentCount: result.sent_count || 1,
        failedCount: result.failed_count || 0,
        cost: result.cost || 8,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        sentCount: 0,
        failedCount: message.recipients?.length || 1,
        cost: 0,
      };
    }
    */
  }

  /**
   * 월렛 잔액 확인
   */
  async getWalletBalance(): Promise<KakaoWalletInfo> {
    if (!this.adminKey) {
      // 시뮬레이션 모드
      console.log('🔄 시뮬레이션 모드: 월렛 잔액 조회');
      return {
        balance: 999999, // 시뮬레이션 잔액
        currency: 'KRW',
        lastUpdated: new Date(),
      };
    }

    try {
      // 실제 카카오 API가 아직 연결되지 않았으므로 시뮬레이션으로 처리
      console.log('🔄 임시 시뮬레이션: 실제 카카오 API 연동 대기 중');
      return {
        balance: 50000, // 임시 시뮬레이션 잔액
        currency: 'KRW',
        lastUpdated: new Date(),
      };
      
      // TODO: 실제 카카오 API 연동 시 아래 코드 활성화
      // const result = await this.makeRequest<any>('/wallet/balance', 'GET');
      // return {
      //   balance: result.balance || 0,
      //   currency: result.currency || 'KRW',
      //   lastUpdated: new Date(result.updated_at || new Date()),
      // };
    } catch (error) {
      console.error('월렛 잔액 확인 오류:', error);
      // 에러 발생 시 시뮬레이션 데이터 반환
      return {
        balance: 50000,
        currency: 'KRW',
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * 발송 가능 여부 확인 (잔액 기반)
   */
  async canSendMessage(estimatedCost: number = 15): Promise<boolean> {
    try {
      const wallet = await this.getWalletBalance();
      return wallet.balance >= estimatedCost;
    } catch (error) {
      console.error('발송 가능 여부 확인 오류:', error);
      return false; // 확인할 수 없으면 안전하게 false 반환
    }
  }

  /**
   * 발송 비용 추정
   */
  estimateCost(messageType: 'broadcast' | 'alimtalk', recipientCount: number = 1): number {
    const costPerMessage = messageType === 'broadcast' ? 15 : 8; // 브로드캐스트: 15원, 알림톡: 8원
    return costPerMessage * recipientCount;
  }
}

/**
 * 카카오 브로드캐스트 메시지 발송
 */
export async function sendKakaoBroadcast(message: string): Promise<KakaoSendResult> {
  console.log('📤 카카오 브로드캐스트 메시지 발송 시작');
  
  const kakaoBusiness = new KakaoBusiness();
  
  // 발송 가능 여부 확인
  const canSend = await kakaoBusiness.canSendMessage(15);
  if (!canSend) {
    return {
      success: false,
      error: '월렛 잔액이 부족합니다. 충전 후 다시 시도해주세요.',
      sentCount: 0,
      failedCount: 1,
      cost: 0,
    };
  }

  return await kakaoBusiness.sendBroadcastMessage({
    message,
    messageType: 'text',
  });
}

/**
 * 카카오 알림톡 발송
 */
export async function sendKakaoAlimtalk(
  message: string, 
  templateId: string, 
  recipients?: string[], 
  templateArgs?: Record<string, string>
): Promise<KakaoSendResult> {
  console.log('📤 카카오 알림톡 발송 시작');
  
  const kakaoBusiness = new KakaoBusiness();
  const estimatedCost = kakaoBusiness.estimateCost('alimtalk', recipients?.length || 1);
  const canSend = await kakaoBusiness.canSendMessage(estimatedCost);
  
  if (!canSend) {
    return {
      success: false,
      error: '월렛 잔액이 부족합니다. 충전 후 다시 시도해주세요.',
      sentCount: 0,
      failedCount: recipients?.length || 1,
      cost: 0,
    };
  }

  return await kakaoBusiness.sendAlimtalk({
    message,
    templateId,
    recipients,
    templateArgs,
  });
}

/**
 * 월렛 정보 조회
 */
export async function getKakaoWalletInfo(): Promise<KakaoWalletInfo> {
  const kakaoBusiness = new KakaoBusiness();
  return await kakaoBusiness.getWalletBalance();
}

/**
 * 발송 가능 여부 확인
 */
export async function checkKakaoSendAvailability(estimatedCost: number = 15): Promise<boolean> {
  const kakaoBusiness = new KakaoBusiness();
  return await kakaoBusiness.canSendMessage(estimatedCost);
}
