/**
 * 9월 28일 날씨 질문에 대한 RAG 기반 완벽한 답변 생성 데모
 */

export function generate928WeatherRAGResponse(): string {
  return `📅 **9월 28일 (일요일) 서울 날씨**

🌧️ **주요 특징**: 하루 종일 소나기가 예상됩니다

🌡️ **기온**: 17°C ~ 22°C
📊 **평균 기온**: 19°C
☁️ **날씨**: 소나기
🌧️ **강수확률**: 100%

**🕐 시간대별 예보**
☀️ **낮**: 소나기 (강수 100%)
🌙 **밤**: 약간 흐림 (강수 3%)

💡 **생활 정보**
👕 **옷차림**: 선선한 날씨입니다. 가벼운 외투나 긴팔 옷을 준비하세요.
☂️ **우산 필수**: 하루 종일 비가 올 예정이니 우산을 꼭 챙기세요!
🏃‍♂️ **야외활동**: 실내 활동을 권장드립니다.

📰 **기상청 특보**
"토요일 심야부터 일요일 아침까지 비가 내릴 예정"

🧠 **AI 분석**: 9월 28일은 서울에 소나기가 예상되는 날입니다. 외출 시 우산을 반드시 준비하시고, 야외 활동보다는 실내 활동을 계획하시는 것이 좋겠습니다.

📊 *AccuWeather 제공 정보 | 벡터 검색 기반 RAG 응답*`;
}

export function generate928WeatherKakaoResponse() {
  return {
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: generate928WeatherRAGResponse()
          }
        }
      ],
      quickReplies: [
        {
          label: "9월 29일은?",
          action: "message",
          messageText: "9월 29일 날씨는 어때?"
        },
        {
          label: "우산 필요할까?",
          action: "message", 
          messageText: "9월 28일 우산 가져가야 할까?"
        },
        {
          label: "옷차림 추천",
          action: "message",
          messageText: "9월 28일 뭐 입을까?"
        },
        {
          label: "다른 지역",
          action: "message",
          messageText: "부산 9월 28일 날씨"
        }
      ]
    },
    context: {
      values: [
        {
          name: "user_preferred_location",
          lifeSpan: 5,
          params: {
            location: "서울"
          }
        },
        {
          name: "rag_conversation",
          lifeSpan: 3,
          params: {
            conversationId: `rag_${Date.now()}`,
            tokensUsed: 0,
            contextCount: 1,
            specificDate: "2025-09-28"
          }
        }
      ]
    }
  };
}
