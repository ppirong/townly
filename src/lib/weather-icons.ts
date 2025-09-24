/**
 * AccuWeather 아이콘 번호를 기반으로 날씨 아이콘을 반환하는 유틸리티
 * AccuWeather API 문서: https://developer.accuweather.com/weather-icons
 */

export function getWeatherIcon(iconNumber: number | null | undefined, conditions?: string): string {
  if (!iconNumber) {
    // AccuWeather 아이콘이 없는 경우, 텍스트 기반으로 이모지 반환
    return getIconByConditions(conditions || '');
  }

  // AccuWeather 아이콘 번호별 매핑
  const iconMap: { [key: number]: string } = {
    // 맑음 (Sunny/Clear)
    1: '☀️',  // Sunny
    2: '🌤️',  // Mostly Sunny
    3: '⛅',  // Partly Sunny
    4: '☁️',  // Intermittent Clouds
    5: '🌥️',  // Hazy Sunshine
    6: '⛅',  // Mostly Cloudy
    7: '☁️',  // Cloudy
    8: '☁️',  // Dreary (Overcast)
    
    // 안개
    11: '🌫️', // Fog
    
    // 비
    12: '🌦️', // Showers
    13: '🌦️', // Mostly Cloudy w/ Showers
    14: '🌦️', // Partly Sunny w/ Showers
    15: '⛈️',  // T-Storms
    16: '🌦️', // Mostly Cloudy w/ T-Storms
    17: '🌦️', // Partly Sunny w/ T-Storms
    18: '🌧️', // Rain
    19: '❄️',  // Flurries
    20: '🌨️', // Mostly Cloudy w/ Flurries
    21: '🌨️', // Partly Sunny w/ Flurries
    22: '🌨️', // Snow
    23: '🌨️', // Mostly Cloudy w/ Snow
    24: '🌨️', // Ice
    25: '🌨️', // Sleet
    26: '🌧️', // Freezing Rain
    
    // 밤 시간
    32: '🌙', // Clear (night)
    33: '🌙', // Mostly Clear (night)
    34: '☁️', // Partly Cloudy (night)
    35: '☁️', // Intermittent Clouds (night)
    36: '🌥️', // Hazy Moonlight (night)
    37: '☁️', // Mostly Cloudy (night)
    38: '☁️', // Partly Cloudy w/ Showers (night)
    39: '🌦️', // Mostly Cloudy w/ Showers (night)
    40: '🌦️', // Partly Cloudy w/ T-Storms (night)
    41: '⛈️', // Mostly Cloudy w/ T-Storms (night)
    42: '🌨️', // Mostly Cloudy w/ Flurries (night)
    43: '🌨️', // Mostly Cloudy w/ Snow (night)
  };

  return iconMap[iconNumber] || getIconByConditions(conditions || '');
}

/**
 * 날씨 상태 텍스트를 기반으로 이모지 아이콘 반환 (fallback)
 */
function getIconByConditions(conditions: string): string {
  const lowerConditions = conditions.toLowerCase();
  
  // 비 관련
  if (lowerConditions.includes('rain') || lowerConditions.includes('비')) {
    return '🌧️';
  }
  
  // 뇌우/천둥번개
  if (lowerConditions.includes('thunder') || lowerConditions.includes('storm') || 
      lowerConditions.includes('천둥') || lowerConditions.includes('번개')) {
    return '⛈️';
  }
  
  // 소나기
  if (lowerConditions.includes('shower') || lowerConditions.includes('소나기')) {
    return '🌦️';
  }
  
  // 눈 관련
  if (lowerConditions.includes('snow') || lowerConditions.includes('눈') ||
      lowerConditions.includes('flurr') || lowerConditions.includes('sleet')) {
    return '🌨️';
  }
  
  // 맑음
  if (lowerConditions.includes('sunny') || lowerConditions.includes('clear') ||
      lowerConditions.includes('맑')) {
    return '☀️';
  }
  
  // 부분적으로 맑음
  if (lowerConditions.includes('partly') || lowerConditions.includes('부분')) {
    return '⛅';
  }
  
  // 흐림
  if (lowerConditions.includes('cloudy') || lowerConditions.includes('overcast') ||
      lowerConditions.includes('흐림') || lowerConditions.includes('구름')) {
    return '☁️';
  }
  
  // 안개
  if (lowerConditions.includes('fog') || lowerConditions.includes('mist') ||
      lowerConditions.includes('안개')) {
    return '🌫️';
  }
  
  // 바람
  if (lowerConditions.includes('wind') || lowerConditions.includes('바람')) {
    return '💨';
  }
  
  // 기본값: 구름
  return '☁️';
}

/**
 * AccuWeather 아이콘 이미지 URL 생성 (선택적으로 사용)
 */
export function getAccuWeatherIconUrl(iconNumber: number, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const sizeMap = {
    small: 25,
    medium: 50,
    large: 100
  };
  
  const iconSize = sizeMap[size];
  const paddedIconNumber = String(iconNumber).padStart(2, '0');
  
  return `https://developer.accuweather.com/sites/default/files/${paddedIconNumber}-s.png`;
}
