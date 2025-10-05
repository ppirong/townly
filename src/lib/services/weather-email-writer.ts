/**
 * Claude Sonnet 3.5 날씨 안내 이메일 작성 서비스
 * 
 * 날씨 데이터를 기반으로 사용자에게 보낼 날씨 안내 이메일 내용을 작성합니다.
 */

import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

export interface WeatherData {
  locationName: string;
  userAddress: string;
  headline?: string;
  hourlyData: Array<{
    dateTime: Date;
    hour: number;
    temperature: number;
    conditions: string;
    rainProbability: number;
    precipitation: number;
    snowProbability?: number;
    snowfall?: number;
  }>;
  minTemp: number;
  maxTemp: number;
  sendTime: number; // 6 또는 18
  sendDate: string; // YYYY-MM-DD
  currentMonth: number; // 1-12
}

export interface WriterResponse {
  emailContent: string;
  tokensUsed: number;
}

export class WeatherEmailWriter {
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
   * 날씨 안내 이메일 내용을 작성합니다.
   */
  async writeEmail(weatherData: WeatherData, iteration: number): Promise<WriterResponse> {
    const prompt = this.buildPrompt(weatherData, iteration);

    const message = await this.client.messages.create({
      model: 'claude-sonnet-3-5-20250219',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    const emailContent = content.type === 'text' ? content.text : '';

    return {
      emailContent,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    };
  }

  /**
   * 날씨 안내 이메일 작성을 위한 프롬프트를 생성합니다.
   */
  private buildPrompt(weatherData: WeatherData, iteration: number): string {
    const {
      locationName,
      userAddress,
      headline,
      hourlyData,
      minTemp,
      maxTemp,
      sendTime,
      sendDate,
      currentMonth,
    } = weatherData;

    const isWinterMonth = [12, 1, 2].includes(currentMonth);
    const timeRange =
      sendTime === 6 ? '6시부터 18시까지' : '18시부터 다음 날 6시까지';

    // 강우/적설 확률 70% 이상인 시간 추출
    const rainTimes = hourlyData.filter((h) => h.rainProbability >= 70);
    const snowTimes = hourlyData.filter((h) => (h.snowProbability || 0) >= 70);

    const promptParts: string[] = [];

    promptParts.push('당신은 날씨 안내 이메일을 작성하는 전문가입니다.');
    promptParts.push('아래 날씨 안내 작성 규칙을 엄격히 준수하여 이메일 내용을 작성해주세요.');
    promptParts.push('');
    promptParts.push('## 날씨 안내 작성 규칙');
    promptParts.push('');
    promptParts.push('### 1. 제목');
    promptParts.push(
      '- 제목 헤더에 "[Townly 날씨 안내]"를 넣습니다.'
    );
    promptParts.push('- 날씨 안내를 발송하는 날짜와 날씨 안내 범위를 표시합니다.');
    promptParts.push(`- 작성 예시: "[Townly 날씨 안내] ${sendDate} ${timeRange} 날씨 안내"`);
    promptParts.push('');
    promptParts.push('### 2. 날씨 헤드라인');
    if (headline) {
      promptParts.push(`- AccuWeather 헤드라인: "${headline}"`);
    } else {
      promptParts.push('- AccuWeather 헤드라인이 제공되지 않았습니다.');
    }
    promptParts.push('');
    promptParts.push('### 3. 사용자 위치');
    promptParts.push(`- 사용자 위치: ${userAddress}`);
    promptParts.push('');
    promptParts.push('### 4. 기온');
    promptParts.push(
      `- 날씨 안내 범위 시간의 최저 온도와 최고 온도를 제공합니다.`
    );
    promptParts.push(`- 기온: ${minTemp}도 ~ ${maxTemp}도`);
    promptParts.push('');
    promptParts.push('### 5. 비가 내리는 시간');
    promptParts.push(
      '- 날씨 안내 범위에 포함된 시간 중에서 강우 확률이 70% 이상인 시간에 대해 강우량과 강우확률을 제공합니다.'
    );
    promptParts.push('- 작성 형식: "시간: 강우량, 강우확률"');
    if (rainTimes.length > 0) {
      promptParts.push('- 강우 확률 70% 이상인 시간:');
      rainTimes.forEach((t) => {
        promptParts.push(
          `  - ${t.hour}시: 강우량 ${t.precipitation}mm, 강우 확률 ${t.rainProbability}%`
        );
      });
    } else {
      promptParts.push('- 비가 내릴 확률이 70% 이상인 시간이 없습니다.');
    }
    promptParts.push('');
    promptParts.push('### 6. 눈이 내리는 시간');
    if (isWinterMonth) {
      promptParts.push(
        '- 겨울철(12월, 1월, 2월)이므로 눈이 내릴 확률이 70% 이상인 시간이 없어도 항상 제공합니다.'
      );
    } else {
      promptParts.push(
        '- 겨울철이 아니므로 눈이 내릴 확률이 70% 이상인 시간이 있을 때만 제공합니다.'
      );
    }
    promptParts.push('- 작성 형식: "시간: 적설량, 적설확률"');
    if (snowTimes.length > 0) {
      promptParts.push('- 적설 확률 70% 이상인 시간:');
      snowTimes.forEach((t) => {
        promptParts.push(
          `  - ${t.hour}시: 적설량 ${t.snowfall}mm, 적설 확률 ${t.snowProbability}%`
        );
      });
    } else {
      if (isWinterMonth) {
        promptParts.push('- 눈이 내릴 확률이 70% 이상인 시간이 없습니다.');
      }
    }
    promptParts.push('');
    promptParts.push('### 7. 비와 눈이 내리는 시간');
    if (rainTimes.length > 0 && snowTimes.length > 0) {
      promptParts.push(
        '- 비와 눈이 내릴 확률이 70% 이상인 시간이 둘 다 섞여서 있으므로 시간 순서대로 정렬해서 정보를 제공합니다.'
      );
      const allPrecipitation = [
        ...rainTimes.map((t) => ({ ...t, type: 'rain' })),
        ...snowTimes.map((t) => ({ ...t, type: 'snow' })),
      ].sort((a, b) => a.hour - b.hour);
      promptParts.push('- 시간순 정렬:');
      allPrecipitation.forEach((t) => {
        if (t.type === 'rain') {
          promptParts.push(
            `  - ${t.hour}시: 강우량 ${t.precipitation}mm, 강우 확률 ${t.rainProbability}%`
          );
        } else {
          promptParts.push(
            `  - ${t.hour}시: 적설량 ${t.snowfall}mm, 적설 확률 ${t.snowProbability}%`
          );
        }
      });
    }
    promptParts.push('');
    promptParts.push('### 8. 주의 사항');
    promptParts.push(
      '- 날씨 안내 메일을 발송하는 시간과 날씨에 따라 사용자에게 꼭 필요한 주의사항을 제공합니다.'
    );
    promptParts.push(
      '- 밤(18시 - 다음 날 6시)에 비가 올 확률이 70% 이상인 시간이 있는 경우: 창문을 잘 닫고 자야 한다는 주의사항'
    );
    promptParts.push(
      '- 낮(6시 - 18시)에 비가 올 확률이 70% 이상인 시간이 있는 경우: 우산을 가지고 출근해야 한다는 주의사항'
    );
    promptParts.push(
      '- 아침 출근 시간(6시 - 10시)에 눈이 올 확률이 70% 이상인 시간이 있는 경우: 평소 보다 일찍 출근하는 것이 좋다는 주의사항을 전날 18시에 발송하는 날씨 안내 이메일에 제공'
    );
    promptParts.push(
      '- 바람이 강하게 부는 날, 태풍 영향권에 있는 날, 온도가 35도 이상인 경우, 온도가 -10도 이하인 경우 등 기상 특보가 있는 경우 적절한 주의사항 제공'
    );
    promptParts.push('');
    promptParts.push('### 9. 날씨 정보 확인 주소');
    promptParts.push('- https://townly.vercel.app/weather');
    promptParts.push('');
    promptParts.push('### 10. 날씨 안내 생성 방법 소개');
    promptParts.push(
      '- "날씨 안내 정보를 Claude 4.5 sonnet을 이용해서 작성했습니다"'
    );
    promptParts.push('');
    promptParts.push('## 중요 주의사항');
    promptParts.push(
      '- 모든 시간은 KST (한국 표준시) 기준입니다. 데이터베이스에 저장된 모든 시간은 KST 시간입니다.'
    );
    promptParts.push('- 날씨 안내 항목 사이에 적절한 빈 라인을 제공해서 가독성을 높입니다.');
    promptParts.push('- 날씨 안내 항목 여러 개가 한 줄로 연결되어서 제공되면 안 됩니다.');
    promptParts.push(
      '- 강우 확률 70% 이상인 시간을 모두 제공해야 합니다.'
    );
    promptParts.push(
      '- 적설 확률 70% 이상인 시간을 모두 제공해야 합니다.'
    );
    promptParts.push('');

    if (iteration > 1) {
      promptParts.push(
        `## 이번 작성 시도: ${iteration}회차`
      );
      promptParts.push(
        '이전 작성에서 검토자가 지적한 사항들을 반영하여 개선된 내용을 작성해주세요.'
      );
      promptParts.push('');
    }

    promptParts.push('## 날씨 데이터');
    promptParts.push(`- 발송 날짜: ${sendDate}`);
    promptParts.push(`- 발송 시간: ${sendTime}시`);
    promptParts.push(`- 현재 월: ${currentMonth}월`);
    promptParts.push(`- 위치: ${locationName}`);
    promptParts.push(`- 사용자 주소: ${userAddress}`);
    if (headline) {
      promptParts.push(`- 헤드라인: ${headline}`);
    }
    promptParts.push(`- 최저/최고 기온: ${minTemp}도 ~ ${maxTemp}도`);
    promptParts.push('');
    promptParts.push('위 규칙을 모두 준수하여 날씨 안내 이메일 내용을 작성해주세요.');

    return promptParts.join('\n');
  }
}
