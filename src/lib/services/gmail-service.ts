import { google } from 'googleapis';
import { env } from '@/lib/env';

/**
 * Gmail API 이메일 발송 서비스
 */
export class GmailService {
  private gmail: any;
  private auth: any;

  constructor() {
    this.initializeAuth();
  }

  /**
   * Gmail API 인증 초기화
   */
  private initializeAuth() {
    this.auth = new google.auth.OAuth2(
      env.GMAIL_CLIENT_ID,
      env.GMAIL_CLIENT_SECRET,
      env.GMAIL_REDIRECT_URI
    );

    // 리프레시 토큰 설정
    if (env.GMAIL_REFRESH_TOKEN) {
      this.auth.setCredentials({
        refresh_token: env.GMAIL_REFRESH_TOKEN,
        access_token: env.GMAIL_ACCESS_TOKEN,
      });
    }

    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
  }

  /**
   * 인증 재초기화 (환경변수 변경 시 사용)
   */
  private reinitializeAuth() {
    console.log('🔄 Gmail 인증 재초기화 중...');
    this.initializeAuth();
  }

  /**
   * 이메일 발송
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    threadId?: string;
    error?: string;
  }> {
    try {
      const { to, subject, htmlContent, textContent } = options;

      // 제목 인코딩 로깅 (디버깅용)
      const encodedSubject = this.encodeSubject(subject);
      console.log(`📧 이메일 발송 - 받는이: ${to}`);
      console.log(`📧 제목 원본: ${subject}`);
      console.log(`📧 제목 인코딩: ${encodedSubject}`);

      // 이메일 메시지 구성
      const message = this.createEmailMessage({
        from: env.GMAIL_FROM_EMAIL,
        to,
        subject,
        htmlContent,
        textContent: textContent || this.htmlToText(htmlContent),
      });

      // Gmail API로 이메일 발송
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message,
        },
      });

      console.log(`✅ 이메일 발송 성공 - ID: ${response.data.id}`);

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId,
      };
    } catch (error: any) {
      console.error('❌ Gmail 발송 오류:', error);
      
      return {
        success: false,
        error: error.message || '이메일 발송 중 오류가 발생했습니다',
      };
    }
  }

  /**
   * 대량 이메일 발송 (배치 처리)
   */
  async sendBulkEmails(emails: Array<{
    to: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
  }>): Promise<{
    totalCount: number;
    successCount: number;
    failureCount: number;
    results: Array<{
      email: string;
      success: boolean;
      messageId?: string;
      threadId?: string;
      error?: string;
    }>;
  }> {
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // 배치 크기 설정 (Gmail API 할당량 고려)
    const batchSize = 10;
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      // 병렬 처리
      const batchPromises = batch.map(async (emailData) => {
        const result = await this.sendEmail(emailData);
        
        const resultData = {
          email: emailData.to,
          success: result.success,
          messageId: result.messageId,
          threadId: result.threadId,
          error: result.error,
        };

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }

        return resultData;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // API 할당량 보호를 위한 지연
      if (i + batchSize < emails.length) {
        await this.delay(1000); // 1초 대기
      }
    }

    return {
      totalCount: emails.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * 이메일 메시지 생성 (RFC 2822 형식)
   */
  private createEmailMessage(options: {
    from: string;
    to: string;
    subject: string;
    htmlContent: string;
    textContent: string;
  }): string {
    const { from, to, subject, htmlContent, textContent } = options;

    // 제목에 한글이 포함된 경우 RFC 2047 방식으로 인코딩
    const encodedSubject = this.encodeSubject(subject);

    const messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="boundary-12345"',
      '',
      '--boundary-12345',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      textContent,
      '',
      '--boundary-12345',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      htmlContent,
      '',
      '--boundary-12345--',
    ];

    const message = messageParts.join('\n');
    
    // Base64 URL-safe 인코딩
    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * 이메일 제목 인코딩 (RFC 2047 방식으로 한글 인코딩)
   */
  private encodeSubject(subject: string): string {
    // ASCII만 포함된 경우 인코딩 불필요
    if (/^[\x20-\x7F]*$/.test(subject)) {
      return subject;
    }

    // 한글이나 다른 멀티바이트 문자가 포함된 경우 RFC 2047 방식으로 인코딩
    // =?charset?encoding?encoded-text?= 형식
    const encoded = Buffer.from(subject, 'utf8').toString('base64');
    return `=?UTF-8?B?${encoded}?=`;
  }

  /**
   * HTML을 텍스트로 변환 (간단한 변환)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/&nbsp;/g, ' ') // HTML 엔티티 변환
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // 연속된 공백 제거
      .trim();
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 액세스 토큰 갱신
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      const { credentials } = await this.auth.refreshAccessToken();
      this.auth.setCredentials(credentials);
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Gmail API 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch (error) {
      console.error('Gmail connection test failed:', error);
      
      // 환경변수가 변경되었을 수 있으므로 재초기화 시도
      this.reinitializeAuth();
      
      try {
        await this.gmail.users.getProfile({ userId: 'me' });
        console.log('✅ Gmail 재초기화 후 연결 성공');
        return true;
      } catch (reinitError) {
        console.error('Gmail connection test failed after reinit:', reinitError);
        
        // 토큰 갱신 시도
        const refreshSuccess = await this.refreshAccessToken();
        if (refreshSuccess) {
          try {
            await this.gmail.users.getProfile({ userId: 'me' });
            return true;
          } catch (retryError) {
            console.error('Gmail connection test failed after token refresh:', retryError);
            return false;
          }
        }
        
        return false;
      }
    }
  }

  /**
   * 한글 제목 인코딩 테스트 (디버깅용)
   */
  testSubjectEncoding(subject: string): string {
    console.log(`🧪 제목 인코딩 테스트:`);
    console.log(`  원본: ${subject}`);
    const encoded = this.encodeSubject(subject);
    console.log(`  인코딩: ${encoded}`);
    return encoded;
  }
}

// 싱글톤 인스턴스 생성
export const gmailService = new GmailService();

