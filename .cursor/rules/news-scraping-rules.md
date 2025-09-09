# 신문 기사 스크래핑 규칙

## 선택 요약 기능 스크래핑 규칙

### 1. 단축 URL 처리
- 신문 기사 원문의 웹사이트 주소가 단축 URL인 경우 실제 URL로 이동하여 신문 기사 본문 내용을 스크래핑한다.

### 2. 웹사이트별 Selector 규칙
신문 기사 원문 웹사이트 주소에 따라 아래에 명시된 selector에 있는 기사 본문 내용을 가져온다:

#### 네이버뉴스
- **URL 패턴**: `n.news.naver.com/article/`
- **Selector**: `#newsct_article`

#### 중앙일보
- **URL 패턴**: `www.joongang.co.kr/article/`
- **Selector**: `#article_body`

#### 매일경제 모바일
- **URL 패턴**: `m.mk.co.kr/news/`
- **Selector**: `#container > section > div.news_detail_body_group > section > div > div.sec_body > div.news_cnt_detail_wrap`

### 3. 일반 웹사이트 처리
명시된 selector가 없는 경우에는 신문 기사에 포함된 아래 항목들을 제거하고 기사 본문 내용만 지능적으로 가져온다:

- 헤더 (header)
- 푸터 (footer)  
- 이미지
- 사이드바 (sidebar)
- 관련 기사
- 광고
- 네비게이션
- 기타 불필요한 UI 요소

### 4. 구현 위치
이 규칙은 `@scrapped-articles-list.tsx`의 선택 요약 기능에서 적용되어야 한다.

### 5. 주의사항
- 스크래핑 실패 시 적절한 에러 처리
- 본문 내용이 없거나 추출에 실패한 경우 사용자에게 알림
- 로봇 배제 표준(robots.txt) 준수
- 각 웹사이트의 이용약관 준수