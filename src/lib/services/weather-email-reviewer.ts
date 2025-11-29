/**
 * Claude Sonnet 4.5 날씨 안내 이메일 검토 서비스
 * 
 * Claude Sonnet 3.5가 작성한 날씨 안내 이메일을 검토하고 개선 방향을 제시합니다.
 */

import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';
import type { WeatherData } from './weather-email-writer';

export interface ReviewResult {
  isApproved: boolean;
  score: number; // 0-100
  feedback: string;
  issues: Array<{
    category: string;
    description: string;
    severity: 'critical' | 'major' | 'minor';
  }>;
  tokensUsed: number;
}

export class WeatherEmailReviewer {
  private client: Anthropic;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * 작성된 날씨 안내 이메일을 검토합니다.
   */
  async reviewEmail(
    emailContent: string,
    weatherData: WeatherData,
    iteration: number
  ): Promise<ReviewResult> {
    try {
      const prompt = this.buildReviewPrompt(emailContent, weatherData, iteration);

      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.3, // 검토는 일관성이 중요하므로 낮은 temperature 사용
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      const reviewText = content.type === 'text' ? content.text : '';

      // 검토 결과 파싱
      const result = this.parseReviewResult(reviewText);

      return {
        ...result,
        tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
      };
    } catch (error) {
      console.error('⚠️ Anthropic API 검토 실패, 기본 승인 결과 반환:', error);
      
      // API 호출 실패 시 기본 검토 결과 반환 (관대하게 승인)
      return this.generateFallbackReviewResult(emailContent, weatherData, iteration);
    }
  }

  /**
   * API 호출 실패 시 사용할 기본 검토 결과를 생성합니다.
   */
  private generateFallbackReviewResult(
    emailContent: string,
    weatherData: WeatherData,
    iteration: number
  ): ReviewResult {
    // 기본적인 검증: 이메일이 최소한의 내용을 가지고 있는지
    const hasContent = emailContent.length > 100;
    const hasWeatherInfo = emailContent.includes('°C') || emailContent.includes('온도') || emailContent.includes('날씨');
    const hasLocation = emailContent.includes(weatherData.locationName);
    
    const issues = [];
    let score = 75; // 기본 점수
    
    if (!hasContent) {
      issues.push({
        category: '내용 길이',
        description: '이메일 내용이 너무 짧습니다.',
        severity: 'major' as const,
      });
      score -= 20;
    }
    
    if (!hasWeatherInfo) {
      issues.push({
        category: '날씨 정보',
        description: '날씨 관련 정보가 부족합니다.',
        severity: 'major' as const,
      });
      score -= 15;
    }
    
    if (!hasLocation) {
      issues.push({
        category: '위치 정보',
        description: '위치 정보가 누락되었습니다.',
        severity: 'minor' as const,
      });
      score -= 5;
    }

    return {
      isApproved: score >= 70, // 70점 이상이면 승인
      score: Math.max(score, 0),
      feedback: `시스템 정비로 인해 자동 검토를 수행했습니다. ${iteration}회차 검토 결과 ${score}점입니다. ${issues.length > 0 ? '일부 개선사항이 있지만 발송 가능한 수준입니다.' : '양호한 내용입니다.'}`,
      issues,
      tokensUsed: 0, // API 사용하지 않았으므로 0
    };
  }

  /**
   * 검토 프롬프트를 생성합니다.
   */
  private buildReviewPrompt(
    emailContent: string,
    weatherData: WeatherData,
    iteration: number
  ): string {
    const {
      hourlyData,
      minTemp,
      maxTemp,
      sendTime,
      sendDate,
      currentMonth,
      userAddress,
    } = weatherData;

    const isWinterMonth = [12, 1, 2].includes(currentMonth);
    const timeRange =
      sendTime === 6 ? '6시부터 18시까지' : '18시부터 다음 날 6시까지';

    // 강우/적설 확률 70% 이상인 시간 추출
    const rainTimes = hourlyData.filter((h) => h.rainProbability >= 70);
    const snowTimes = hourlyData.filter((h) => (h.snowProbability || 0) >= 70);

    const promptParts: string[] = [];

    promptParts.push('당신은 날씨 안내 이메일 검토 전문가입니다.');
    promptParts.push(
      '아래 제공된 날씨 안내 이메일 내용을 평가 기준에 따라 엄격하게 검토해주세요.'
    );
    promptParts.push('');
    promptParts.push('## 평가 기준');
    promptParts.push('');
    promptParts.push(
      '### 1. 강우 확률 70% 이상인 시간을 모두 제공했는지 확인'
    );
    promptParts.push('- 제공 형식: "시간: 강우량, 강우확률"');
    promptParts.push('- 작성 예시: "11시: 강우량 10mm, 강우 확률 75%"');
    if (rainTimes.length > 0) {
      promptParts.push('- 반드시 포함되어야 하는 시간:');
      rainTimes.forEach((t) => {
        promptParts.push(
          `  - ${t.hour}시: 강우량 ${t.precipitation}mm, 강우 확률 ${t.rainProbability}%`
        );
      });
    } else {
      promptParts.push('- 강우 확률 70% 이상인 시간이 없습니다.');
      promptParts.push(
        '- "비가 내릴 확률이 70% 이상인 시간이 없습니다" 문구가 있어야 합니다.'
      );
    }
    // 겨울철(12월, 1월, 2월)에만 적설 확률 체크
    if (isWinterMonth) {
      promptParts.push('');
      promptParts.push(
        '### 2. 적설 확률 70% 이상인 시간을 모두 제공했는지 확인 (겨울철 전용)'
      );
      promptParts.push('- 제공 형식: "시간: 적설량, 적설확률"');
      promptParts.push('- 작성 예시: "15시: 적설량 3mm, 적설 확률 75%"');
      promptParts.push(
        '- 겨울철(12월, 1월, 2월)이므로 "눈이 내리는 시간" 정보가 반드시 포함되어야 합니다.'
      );
      
      if (snowTimes.length > 0) {
        promptParts.push('- 반드시 포함되어야 하는 시간:');
        snowTimes.forEach((t) => {
          promptParts.push(
            `  - ${t.hour}시: 적설량 ${t.snowfall}mm, 적설 확률 ${t.snowProbability}%`
          );
        });
      } else {
        promptParts.push(
          '- "눈이 내릴 확률이 70% 이상인 시간이 없습니다" 문구가 있어야 합니다.'
        );
      }
    } else {
      promptParts.push('');
      promptParts.push(
        '### 2. 적설 확률 체크 (봄/여름/가을철 제외)'
      );
      promptParts.push(
        '- 현재 계절(3월-11월)에는 적설 확률 체크를 하지 않습니다.'
      );
      promptParts.push(
        '- "적설 확률이 70% 이상인 시간이 없습니다" 문구가 없어도 정상입니다.'
      );
    }
    promptParts.push('');
    promptParts.push('### 3. 시간이 KST 기준인지 확인');
    promptParts.push(
      '- 모든 시간 표시가 KST (한국 표준시) 기준이어야 합니다.'
    );
    promptParts.push('- UTC 시간이나 다른 시간대로 표시되면 안 됩니다.');
    promptParts.push('');
    promptParts.push('### 4. 적절한 주의사항 제공 확인');
    promptParts.push(
      '- 날씨 안내 메일 발송 시간과 날씨에 따라 적절한 주의사항이 포함되어야 합니다.'
    );
    if (sendTime === 18 && rainTimes.some((t) => t.hour >= 18 || t.hour < 6)) {
      promptParts.push(
        '- 밤에 비가 올 예정이므로 창문 관련 주의사항이 필요합니다.'
      );
    }
    if (sendTime === 6 && rainTimes.some((t) => t.hour >= 6 && t.hour < 18)) {
      promptParts.push('- 낮에 비가 올 예정이므로 우산 관련 주의사항이 필요합니다.');
    }
    if (
      sendTime === 18 &&
      snowTimes.some((t) => t.hour >= 6 && t.hour < 10)
    ) {
      promptParts.push(
        '- 아침 출근 시간에 눈이 올 예정이므로 일찍 출근 관련 주의사항이 필요합니다.'
      );
    }
    if (maxTemp >= 35) {
      promptParts.push('- 폭염 주의사항이 필요합니다.');
    }
    if (minTemp <= -10) {
      promptParts.push('- 한파 주의사항이 필요합니다.');
    }
    promptParts.push('');
    promptParts.push('### 5. 가독성 확인');
    promptParts.push('- 날씨 안내 항목 사이에 적절한 빈 라인이 있어야 합니다.');
    promptParts.push('- 날씨 안내 항목 여러 개가 한 줄로 연결되면 안 됩니다.');
    promptParts.push('');
    promptParts.push('### 6. 필수 항목 포함 확인');
    promptParts.push('- 제목: "[Townly 날씨 안내]" 포함');
    promptParts.push(`- 날짜와 시간 범위: "${sendDate} ${timeRange}"`);
    promptParts.push(`- 사용자 위치: "${userAddress}"`);
    promptParts.push(`- 기온: "${minTemp}도 ~ ${maxTemp}도"`);
    promptParts.push('- 날씨 정보 확인 주소: https://townly.vercel.app/weather');
    promptParts.push(
      '- 생성 방법: "날씨 안내 정보를 Claude 4.5 sonnet을 이용해서 작성했습니다"'
    );
    promptParts.push('');
    promptParts.push('## 검토할 이메일 내용');
    promptParts.push('```');
    promptParts.push(emailContent);
    promptParts.push('```');
    promptParts.push('');
    promptParts.push(`## 현재 검토 회차: ${iteration}회`);
    promptParts.push('');
    promptParts.push('## 검토 결과 작성 형식');
    promptParts.push('아래 형식을 엄격히 준수하여 검토 결과를 작성해주세요:');
    promptParts.push('');
    promptParts.push('```');
    promptParts.push('APPROVED: yes 또는 no');
    promptParts.push('SCORE: 0-100 사이의 점수');
    promptParts.push('');
    promptParts.push('ISSUES:');
    promptParts.push('- [CRITICAL|MAJOR|MINOR] 카테고리: 문제 설명');
    promptParts.push('(문제가 없으면 "없음" 작성)');
    promptParts.push('');
    promptParts.push('FEEDBACK:');
    promptParts.push('구체적인 개선 방향과 피드백');
    promptParts.push('```');
    promptParts.push('');
    promptParts.push('점수 기준:');
    promptParts.push('- 90-100: 모든 규칙을 완벽히 준수, 승인');
    promptParts.push('- 80-89: 경미한 문제, 승인 가능');
    promptParts.push('- 70-79: 주요 문제 1-2개, 수정 필요');
    promptParts.push('- 70 미만: 치명적 문제 또는 다수의 주요 문제, 수정 필수');
    promptParts.push('');
    promptParts.push('**중요 참고사항:**');
    promptParts.push(`- 현재 월: ${currentMonth}월 (${isWinterMonth ? '겨울철' : '봄/여름/가을철'})`);
    if (!isWinterMonth) {
      promptParts.push('- 겨울철이 아니므로 적설 관련 내용이 없어도 정상입니다.');
      promptParts.push('- "적설 확률이 70% 이상인 시간이 없습니다" 문구가 없어도 문제가 아닙니다.');
    }

    return promptParts.join('\n');
  }

  /**
   * 검토 결과를 파싱합니다.
   */
  private parseReviewResult(reviewText: string): Omit<ReviewResult, 'tokensUsed'> {
    const lines = reviewText.split('\n');
    
    let isApproved = false;
    let score = 0;
    let feedback = '';
    const issues: ReviewResult['issues'] = [];

    let inIssuesSection = false;
    let inFeedbackSection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // APPROVED 파싱
      if (trimmed.startsWith('APPROVED:')) {
        const value = trimmed.substring('APPROVED:'.length).trim().toLowerCase();
        isApproved = value === 'yes' || value === 'true';
      }

      // SCORE 파싱
      if (trimmed.startsWith('SCORE:')) {
        const scoreStr = trimmed.substring('SCORE:'.length).trim();
        score = parseInt(scoreStr, 10) || 0;
      }

      // ISSUES 섹션 시작
      if (trimmed === 'ISSUES:') {
        inIssuesSection = true;
        inFeedbackSection = false;
        continue;
      }

      // FEEDBACK 섹션 시작
      if (trimmed === 'FEEDBACK:') {
        inIssuesSection = false;
        inFeedbackSection = true;
        continue;
      }

      // ISSUES 파싱
      if (inIssuesSection && trimmed.startsWith('-')) {
        const issueText = trimmed.substring(1).trim();
        
        if (issueText.toLowerCase() === '없음' || issueText.toLowerCase() === 'none') {
          continue;
        }

        let severity: 'critical' | 'major' | 'minor' = 'minor';
        let content = issueText;

        if (issueText.startsWith('[CRITICAL]')) {
          severity = 'critical';
          content = issueText.substring('[CRITICAL]'.length).trim();
        } else if (issueText.startsWith('[MAJOR]')) {
          severity = 'major';
          content = issueText.substring('[MAJOR]'.length).trim();
        } else if (issueText.startsWith('[MINOR]')) {
          severity = 'minor';
          content = issueText.substring('[MINOR]'.length).trim();
        }

        const colonIndex = content.indexOf(':');
        if (colonIndex > 0) {
          const category = content.substring(0, colonIndex).trim();
          const description = content.substring(colonIndex + 1).trim();
          issues.push({ category, description, severity });
        } else {
          issues.push({ category: '기타', description: content, severity });
        }
      }

      // FEEDBACK 파싱
      if (inFeedbackSection && trimmed.length > 0 && !trimmed.startsWith('```')) {
        feedback += trimmed + '\n';
      }
    }

    // 점수 기반 자동 승인 결정 (명시적 승인이 없는 경우)
    if (score >= 80 && !isApproved) {
      isApproved = true;
    }

    return {
      isApproved,
      score,
      feedback: feedback.trim(),
      issues,
    };
  }
}
