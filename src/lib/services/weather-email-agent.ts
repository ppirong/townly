/**
 * 날씨 안내 이메일 작성 에이전트 오케스트레이터
 * 
 * Claude Sonnet 3.5 (작성자)와 Claude Sonnet 4.5 (검토자) 사이의
 * 순환 프로세스를 관리하여 고품질의 날씨 안내 이메일을 생성합니다.
 */

import { WeatherEmailWriter, type WeatherData } from './weather-email-writer';
import { WeatherEmailReviewer, type ReviewResult } from './weather-email-reviewer';

export interface AgentResult {
  finalEmail: string;
  iterations: number;
  finalScore: number;
  isApproved: boolean;
  totalTokensUsed: number;
  history: Array<{
    iteration: number;
    emailContent: string;
    review: ReviewResult;
  }>;
  executionTime: number; // ms
}

export class WeatherEmailAgent {
  private writer: WeatherEmailWriter;
  private reviewer: WeatherEmailReviewer;
  private maxIterations: number;
  private minApprovalScore: number;

  constructor(options?: { maxIterations?: number; minApprovalScore?: number }) {
    this.writer = new WeatherEmailWriter();
    this.reviewer = new WeatherEmailReviewer();
    this.maxIterations = options?.maxIterations || 3; // 검토 회수를 3회로 제한
    this.minApprovalScore = options?.minApprovalScore || 80;
  }

  /**
   * 날씨 안내 이메일을 작성하고 검토하는 순환 프로세스를 실행합니다.
   */
  async generateEmail(weatherData: WeatherData): Promise<AgentResult> {
    const startTime = Date.now();
    let totalTokensUsed = 0;
    const history: AgentResult['history'] = [];

    let currentEmail = '';
    let currentReview: ReviewResult | null = null;
    let iteration = 0;

    console.log('🚀 날씨 안내 이메일 작성 에이전트 시작');
    console.log(`📍 위치: ${weatherData.locationName}`);
    console.log(`📅 발송 시간: ${weatherData.sendDate} ${weatherData.sendTime}시`);
    console.log(`🔄 최대 순환 횟수: ${this.maxIterations}`);

    // 순환 프로세스 시작
    while (iteration < this.maxIterations) {
      iteration++;
      console.log(`\n📝 [${iteration}회차] 이메일 작성 시작...`);

      try {
        // Claude Sonnet 3.5: 이메일 작성
        const writerResponse = await this.writer.writeEmail(weatherData, iteration);
        currentEmail = writerResponse.emailContent;
        totalTokensUsed += writerResponse.tokensUsed;

        console.log(`✅ [${iteration}회차] 작성 완료 (토큰: ${writerResponse.tokensUsed})`);
        console.log(`📄 이메일 길이: ${currentEmail.length}자`);

        // Claude Sonnet 4.5: 검토
        console.log(`🔍 [${iteration}회차] 검토 시작...`);
        currentReview = await this.reviewer.reviewEmail(
          currentEmail,
          weatherData,
          iteration
        );
        totalTokensUsed += currentReview.tokensUsed;

        console.log(`✅ [${iteration}회차] 검토 완료 (토큰: ${currentReview.tokensUsed})`);
        console.log(`📊 점수: ${currentReview.score}/100`);
        console.log(`✔️ 승인: ${currentReview.isApproved ? 'YES' : 'NO'}`);
        console.log(`⚠️ 문제: ${currentReview.issues.length}개`);

        if (currentReview.issues.length > 0) {
          console.log('📋 발견된 문제:');
          currentReview.issues.forEach((issue, idx) => {
            console.log(
              `   ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.description}`
            );
          });
        }

        // 히스토리 기록
        history.push({
          iteration,
          emailContent: currentEmail,
          review: currentReview,
        });

        // 승인 조건 확인
        if (
          currentReview.isApproved &&
          currentReview.score >= this.minApprovalScore
        ) {
          console.log(`\n✅ [${iteration}회차] 승인! 최종 이메일 확정`);
          break;
        }

        // 마지막 회차 체크
        if (iteration >= this.maxIterations) {
          console.log(`\n⚠️ 최대 순환 횟수(${this.maxIterations}회) 도달`);
          console.log(`현재 최고 점수: ${currentReview.score}/100`);
          break;
        }

        // 다음 회차를 위한 피드백 출력
        console.log(`\n💬 검토자 피드백:`);
        console.log(currentReview.feedback);
        console.log(`\n🔄 다음 회차로 진행...`);
      } catch (error) {
        console.error(`❌ [${iteration}회차] 오류 발생:`, error);
        throw error;
      }
    }

    const executionTime = Date.now() - startTime;

    console.log('\n🎉 날씨 안내 이메일 작성 완료!');
    console.log(`⏱️ 소요 시간: ${(executionTime / 1000).toFixed(2)}초`);
    console.log(`🔄 총 순환 횟수: ${iteration}회`);
    console.log(`💰 총 토큰 사용량: ${totalTokensUsed}`);
    console.log(`📊 최종 점수: ${currentReview?.score || 0}/100`);

    return {
      finalEmail: currentEmail,
      iterations: iteration,
      finalScore: currentReview?.score || 0,
      isApproved: currentReview?.isApproved || false,
      totalTokensUsed,
      history,
      executionTime,
    };
  }

  /**
   * 에이전트 실행 결과를 요약한 리포트를 생성합니다.
   */
  generateReport(result: AgentResult): string {
    const reportParts: string[] = [];

    reportParts.push('='.repeat(60));
    reportParts.push('날씨 안내 이메일 작성 에이전트 실행 리포트');
    reportParts.push('='.repeat(60));
    reportParts.push('');
    reportParts.push(`총 순환 횟수: ${result.iterations}회`);
    reportParts.push(`최종 점수: ${result.finalScore}/100`);
    reportParts.push(`승인 여부: ${result.isApproved ? '✅ 승인' : '⚠️ 미승인'}`);
    reportParts.push(`총 토큰 사용량: ${result.totalTokensUsed.toLocaleString()}`);
    reportParts.push(`실행 시간: ${(result.executionTime / 1000).toFixed(2)}초`);
    reportParts.push('');
    reportParts.push('-'.repeat(60));
    reportParts.push('순환 과정 상세');
    reportParts.push('-'.repeat(60));

    result.history.forEach(({ iteration, review }) => {
      reportParts.push('');
      reportParts.push(`[${iteration}회차]`);
      reportParts.push(`  점수: ${review.score}/100`);
      reportParts.push(`  승인: ${review.isApproved ? 'YES' : 'NO'}`);
      reportParts.push(`  문제: ${review.issues.length}개`);
      
      if (review.issues.length > 0) {
        review.issues.forEach((issue, idx) => {
          reportParts.push(
            `    ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.description}`
          );
        });
      }
      
      if (review.feedback) {
        reportParts.push(`  피드백: ${review.feedback.substring(0, 100)}...`);
      }
    });

    reportParts.push('');
    reportParts.push('='.repeat(60));
    reportParts.push('최종 이메일 내용');
    reportParts.push('='.repeat(60));
    reportParts.push('');
    reportParts.push(result.finalEmail);
    reportParts.push('');
    reportParts.push('='.repeat(60));

    return reportParts.join('\n');
  }
}
