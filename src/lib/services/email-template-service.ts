import { WeatherSummaryResponse } from '@/lib/schemas/weather-summary';

/**
 * 이메일 템플릿 서비스
 */
export class EmailTemplateService {
  /**
   * 날씨 안내 이메일 HTML 템플릿 생성
   */
  generateWeatherEmailHTML(options: {
    recipientName?: string;
    location: string;
    timeOfDay: 'morning' | 'evening';
    weatherSummary: WeatherSummaryResponse;
    unsubscribeUrl?: string;
  }): string {
    const { recipientName, location, timeOfDay, weatherSummary, unsubscribeUrl } = options;
    
    const timeText = timeOfDay === 'morning' ? '아침' : '저녁';
    const greeting = recipientName ? `${recipientName}님` : '안녕하세요';
    
    const alertLevelColor = this.getAlertLevelColor(weatherSummary.alertLevel);
    const alertLevelText = this.getAlertLevelText(weatherSummary.alertLevel);

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${location} ${timeText} 날씨 안내</title>
    <style>
        body {
            font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .header h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 24px;
        }
        .header .subtitle {
            color: #6c757d;
            margin-top: 5px;
            font-size: 14px;
        }
        .alert-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 10px;
        }
        .summary-section {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
        }
        .summary-text {
            font-size: 16px;
            font-weight: 500;
            color: #2c3e50;
            margin: 0;
        }
        .key-points {
            margin-bottom: 25px;
        }
        .key-points h3 {
            color: #495057;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .key-point {
            background-color: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 0 8px 8px 0;
        }
        .recommendations {
            margin-bottom: 25px;
        }
        .recommendations h3 {
            color: #495057;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .recommendation {
            background-color: #f1f8e9;
            border-left: 4px solid #4caf50;
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 0 8px 8px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
        }
        .footer a {
            color: #007bff;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .time-info {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 20px;
            font-size: 14px;
            text-align: center;
        }
        
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            .container {
                padding: 20px;
            }
            .header h1 {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌤️ ${location} ${timeText} 날씨 안내</h1>
            <div class="subtitle">${new Date().toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}</div>
            <div class="alert-badge" style="background-color: ${alertLevelColor}; color: white;">
                ${alertLevelText}
            </div>
        </div>

        <div class="time-info">
            📅 예보 기간: ${weatherSummary.forecastPeriod}
        </div>

        <div class="summary-section">
            <p class="summary-text">${greeting}, ${weatherSummary.summary}</p>
        </div>

        <div class="key-points">
            <h3>🔍 주요 날씨 정보</h3>
            ${weatherSummary.keyPoints.map(point => `
                <div class="key-point">${point}</div>
            `).join('')}
        </div>

        <div class="recommendations">
            <h3>💡 추천 사항</h3>
            ${weatherSummary.recommendations.map(rec => `
                <div class="recommendation">${rec}</div>
            `).join('')}
        </div>

        <div class="footer">
            <p>
                이 날씨 안내는 AI가 분석한 정보입니다.<br>
                정확한 기상 정보는 <a href="https://www.weather.go.kr" target="_blank">기상청</a>을 참고하세요.
            </p>
            <p>
                생성 시간: ${weatherSummary.generatedAt.toLocaleString('ko-KR')}
            </p>
            ${unsubscribeUrl ? `
                <p>
                    <a href="${unsubscribeUrl}">이메일 수신 거부</a>
                </p>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 날씨 안내 이메일 텍스트 템플릿 생성
   */
  generateWeatherEmailText(options: {
    recipientName?: string;
    location: string;
    timeOfDay: 'morning' | 'evening';
    weatherSummary: WeatherSummaryResponse;
    unsubscribeUrl?: string;
  }): string {
    const { recipientName, location, timeOfDay, weatherSummary, unsubscribeUrl } = options;
    
    const timeText = timeOfDay === 'morning' ? '아침' : '저녁';
    const greeting = recipientName ? `${recipientName}님` : '안녕하세요';
    const alertLevelText = this.getAlertLevelText(weatherSummary.alertLevel);

    return `
${location} ${timeText} 날씨 안내
${new Date().toLocaleDateString('ko-KR', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  weekday: 'long'
})}

경고 수준: ${alertLevelText}
예보 기간: ${weatherSummary.forecastPeriod}

${greeting}, ${weatherSummary.summary}

주요 날씨 정보:
${weatherSummary.keyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}

추천 사항:
${weatherSummary.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

---
이 날씨 안내는 AI가 분석한 정보입니다.
정확한 기상 정보는 기상청(https://www.weather.go.kr)을 참고하세요.

생성 시간: ${weatherSummary.generatedAt.toLocaleString('ko-KR')}
${unsubscribeUrl ? `\n이메일 수신 거부: ${unsubscribeUrl}` : ''}
`;
  }

  /**
   * 테스트 이메일 템플릿 생성
   */
  generateTestEmailHTML(testMessage: string): string {
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>이메일 발송 테스트</title>
    <style>
        body {
            font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .test-badge {
            background-color: #17a2b8;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 10px;
            display: inline-block;
        }
        .message {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 25px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 이메일 발송 테스트</h1>
            <div class="test-badge">TEST EMAIL</div>
        </div>
        
        <div class="message">
            <p>${testMessage}</p>
            <p><strong>발송 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 경고 수준별 색상 반환
   */
  private getAlertLevelColor(alertLevel: 'low' | 'medium' | 'high'): string {
    switch (alertLevel) {
      case 'low':
        return '#28a745';
      case 'medium':
        return '#ffc107';
      case 'high':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  }

  /**
   * 경고 수준별 텍스트 반환
   */
  private getAlertLevelText(alertLevel: 'low' | 'medium' | 'high'): string {
    switch (alertLevel) {
      case 'low':
        return '안전';
      case 'medium':
        return '주의';
      case 'high':
        return '경고';
      default:
        return '알 수 없음';
    }
  }
}

// 싱글톤 인스턴스 생성
export const emailTemplateService = new EmailTemplateService();

