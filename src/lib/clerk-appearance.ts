/**
 * Clerk 다이얼로그 다크모드 appearance 설정
 * 홈 페이지와 동일한 컬러 스킴 적용
 */

// 한국어 로컬라이제이션
export const koKRLocalization = {
  locale: "ko-KR",
  
  // 로그인 관련
  signIn: {
    start: {
      title: "로그인",
      subtitle: "계정에 로그인하세요",
      actionText: "계정이 없으신가요?",
      actionLink: "회원가입"
    },
    password: {
      title: "비밀번호 입력",
      subtitle: "계속하려면 비밀번호를 입력하세요",
      actionText: "다른 방법 사용",
      actionLink: "다른 방법으로 로그인"
    },
    forgotPasswordAlternativeMethods: {
      title: "비밀번호를 잊으셨나요?",
      label: "이메일 주소",
      submitLabel: "재설정 링크 보내기",
      blockButton__emailLink: "이메일로 재설정 링크 받기"
    },
    alternativeMethods: {
      title: "다른 방법으로 로그인",
      actionLink: "뒤로 가기",
      blockButton__emailLink: "이메일로 로그인",
      blockButton__emailCode: "이메일 코드로 로그인",
      blockButton__phoneCode: "SMS 코드로 로그인",
      blockButton__password: "비밀번호로 로그인"
    }
  },
  
  // 회원가입 관련
  signUp: {
    start: {
      title: "회원가입",
      subtitle: "새 계정을 만드세요",
      actionText: "이미 계정이 있으신가요?",
      actionLink: "로그인"
    },
    emailCode: {
      title: "이메일 확인",
      subtitle: "{{applicationName}}에서 보낸 확인 코드를 입력하세요",
      formTitle: "확인 코드",
      formSubtitle: "이메일로 전송된 확인 코드를 입력하세요",
      resendButton: "코드 재전송"
    },
    phoneCode: {
      title: "휴대폰 번호 확인",
      subtitle: "{{applicationName}}에서 보낸 확인 코드를 입력하세요",
      formTitle: "확인 코드",
      formSubtitle: "SMS로 전송된 확인 코드를 입력하세요",
      resendButton: "코드 재전송"
    },
    continue: {
      title: "필수 정보 입력",
      subtitle: "계정 설정을 완료하세요",
      actionText: "이미 계정이 있으신가요?",
      actionLink: "로그인"
    }
  },
  
  // 사용자 프로필
  userProfile: {
    navbar: {
      title: "프로필",
      description: "계정 정보를 관리하세요"
    },
    start: {
      headerTitle__account: "계정",
      headerTitle__security: "보안"
    }
  },
  
  // 사용자 버튼
  userButton: {
    action__manageAccount: "계정 관리",
    action__signOut: "로그아웃",
    action__signOutAll: "모든 기기에서 로그아웃"
  },
  
  // 폼 필드 라벨
  formFieldLabel__emailAddress: "이메일 주소",
  formFieldLabel__emailAddresses: "이메일 주소",
  formFieldLabel__phoneNumber: "휴대폰 번호",
  formFieldLabel__username: "사용자명",
  formFieldLabel__password: "비밀번호",
  formFieldLabel__newPassword: "새 비밀번호",
  formFieldLabel__confirmPassword: "비밀번호 확인",
  formFieldLabel__firstName: "이름",
  formFieldLabel__lastName: "성",
  formFieldLabel__organizationName: "조직명",
  formFieldLabel__role: "역할",
  
  // 폼 버튼
  formButtonPrimary: "계속",
  formButtonPrimary__verify: "확인",
  formButtonPrimary__continue: "계속",
  formButtonPrimary__signIn: "로그인",
  formButtonPrimary__signUp: "회원가입",
  
  // 소셜 로그인 버튼
  socialButtonsBlockButton: "{{provider}}로 계속하기",
  
  // 기타 텍스트
  dividerText: "또는",
  footerActionLink__useAnotherMethod: "다른 방법 사용",
  
  // 배지
  badge__primary: "기본",
  badge__thisDevice: "이 기기",
  badge__userDevice: "사용자 기기",
  badge__otherImpersonatorDevice: "다른 대리 기기",
  
  // 폼 필드 액션
  formFieldAction__forgotPassword: "비밀번호를 잊으셨나요?",
  formFieldAction__togglePasswordVisibility: "비밀번호 표시/숨기기",
  
  // 힌트 텍스트
  formFieldHintText__optional: "(선택사항)",
  formFieldHintText__slug: "슬러그는 읽기 쉬운 ID입니다. 고유해야 하며 소문자, 숫자, 대시만 포함할 수 있습니다.",
  
  // 플레이스홀더
  formFieldInputPlaceholder__emailAddress: "이메일 주소를 입력하세요",
  formFieldInputPlaceholder__emailAddresses: "이메일 주소를 입력하거나 붙여넣으세요",
  formFieldInputPlaceholder__phoneNumber: "휴대폰 번호를 입력하세요",
  formFieldInputPlaceholder__username: "사용자명을 입력하세요",
  formFieldInputPlaceholder__password: "비밀번호를 입력하세요",
  formFieldInputPlaceholder__firstName: "이름을 입력하세요",
  formFieldInputPlaceholder__lastName: "성을 입력하세요",
  formFieldInputPlaceholder__organizationName: "조직명을 입력하세요",
  
  // 에러 메시지
  formFieldError__notMatchingPasswords: "비밀번호가 일치하지 않습니다.",
  formFieldError__matchingPasswords: "비밀번호가 일치합니다.",
  formFieldError__invalidEmailAddress: "유효하지 않은 이메일 주소입니다.",
  formFieldError__passwordTooShort: "비밀번호가 너무 짧습니다.",
  
  // 성공 메시지
  signUp__verify__emailAddress__formHint: "이메일 주소로 확인 링크를 보냈습니다.",
  signUp__verify__phoneNumber__formHint: "휴대폰 번호로 확인 코드를 보냈습니다.",
  
  // 기타
  unstable__errors: {
    identification_deletion_failed: "마지막 식별 정보는 삭제할 수 없습니다.",
    phone_number_exists: "이 휴대폰 번호는 이미 사용 중입니다.",
    form_identifier_not_found: "식별자를 찾을 수 없습니다.",
    captcha_unavailable: "보안 확인을 사용할 수 없습니다.",
    captcha_invalid: "보안 확인에 실패했습니다."
  }
};

export const clerkDarkAppearance = {
  baseTheme: undefined,
  variables: {
    colorPrimary: "#facc15", // yellow-400 - 홈 페이지 메인 CTA 버튼과 동일
    colorBackground: "#121212", // 홈 페이지 배경색과 동일
    colorInputBackground: "#1e1e1e", // 카드 배경색과 동일
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#9ca3af", // gray-400
    colorTextOnPrimaryBackground: "#000000", // 노란색 버튼 위의 검은 텍스트
    colorDanger: "#ef4444", // red-500
    colorSuccess: "#22c55e", // green-500
    colorWarning: "#f59e0b", // amber-500
    colorNeutral: "#6b7280", // gray-500
    borderRadius: "0.75rem", // rounded-xl과 동일
    fontFamily: "inherit",
    fontSize: "14px",
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  elements: {
    // 메인 카드 컨테이너
    card: {
      backgroundColor: "#1e1e1e", // 홈 페이지 카드 배경색과 동일
      border: "1px solid #2d2d2d", // 홈 페이지 카드 테두리와 동일
      borderRadius: "0.75rem",
      boxShadow: "none"
    },
    
    // 헤더 영역
    headerTitle: {
      color: "#ffffff",
      fontSize: "24px",
      fontWeight: "700"
    },
    
    headerSubtitle: {
      color: "#9ca3af", // gray-400
      fontSize: "14px"
    },
    
    // 소셜 로그인 버튼 (카카오 등)
    socialButtonsBlockButton: {
      backgroundColor: "#facc15", // yellow-400 - 홈 페이지 CTA 버튼과 동일
      color: "#000000",
      border: "none",
      borderRadius: "9999px", // rounded-full
      fontSize: "16px",
      fontWeight: "700",
      padding: "12px 24px",
      transition: "all 0.2s ease",
      "&:hover": {
        backgroundColor: "#fde047", // yellow-300 - 호버 효과
        transform: "translateY(-1px)"
      },
      "&:focus": {
        backgroundColor: "#fde047",
        boxShadow: "0 0 0 2px #facc15"
      }
    },
    
    socialButtonsBlockButtonText: {
      color: "#000000",
      fontSize: "16px",
      fontWeight: "700"
    },
    
    // 일반 폼 버튼
    formButtonPrimary: {
      backgroundColor: "#facc15", // yellow-400
      color: "#000000",
      border: "none",
      borderRadius: "9999px",
      fontSize: "16px",
      fontWeight: "700",
      padding: "12px 24px",
      "&:hover": {
        backgroundColor: "#fde047" // yellow-300
      }
    },
    
    // 입력 필드
    formFieldInput: {
      backgroundColor: "#1e1e1e",
      border: "1px solid #2d2d2d",
      borderRadius: "0.5rem",
      color: "#ffffff",
      fontSize: "14px",
      "&:focus": {
        borderColor: "#facc15",
        boxShadow: "0 0 0 2px rgba(250, 204, 21, 0.2)"
      }
    },
    
    formFieldLabel: {
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: "500"
    },
    
    // 링크
    footerActionLink: {
      color: "#60a5fa", // blue-400 - 홈 페이지 링크 색상과 유사
      "&:hover": {
        color: "#93c5fd" // blue-300
      }
    },
    
    // 구분선
    dividerLine: {
      backgroundColor: "#2d2d2d"
    },
    
    dividerText: {
      color: "#9ca3af" // gray-400
    },
    
    // 푸터
    footer: {
      backgroundColor: "transparent"
    },
    
    // 에러 메시지
    formFieldErrorText: {
      color: "#ef4444" // red-500
    },
    
    // 로딩 스피너
    spinner: {
      color: "#facc15" // yellow-400
    },
    
    // 닫기 버튼
    modalCloseButton: {
      color: "#9ca3af",
      "&:hover": {
        color: "#ffffff"
      }
    }
  }
};
