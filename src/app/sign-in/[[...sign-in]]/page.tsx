import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50">
      <div className="flex items-center justify-center min-h-screen px-4 py-12">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="mx-auto h-20 w-20 bg-yellow-400 rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl">🏘️</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Townly
            </h1>
            <h2 className="text-xl text-gray-700 mb-2">
              다시 오신 것을 환영합니다!
            </h2>
            <p className="text-gray-600">
              카카오 계정으로 간편하게 로그인하세요
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <SignIn 
              appearance={{
                elements: {
                  card: "shadow-none border-none",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: {
                    backgroundColor: "#FEE500",
                    color: "#000000",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "16px",
                    fontWeight: "600",
                    padding: "14px 20px",
                    "&:hover": {
                      backgroundColor: "#FDD800",
                      transform: "translateY(-1px)"
                    }
                  },
                  formButtonPrimary: "hidden",
                  dividerRow: "hidden",
                  footer: "hidden",
                  socialButtonsBlockButtonText: "text-black font-semibold"
                },
                variables: {
                  colorPrimary: "#FEE500",
                  borderRadius: "12px"
                }
              }}
              routing="hash"
              signUpUrl="/sign-up"
            />
            
            {/* Features Highlight */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                실시간 날씨 & 미세먼지 알림
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                우리 동네 마트 할인 정보
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="text-green-500 mr-2">✓</span>
                카카오톡으로 편리한 알림
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              아직 계정이 없으신가요?{' '}
              <Link href="/sign-up" className="text-yellow-600 hover:text-yellow-700 font-semibold">
                회원가입하기
              </Link>
            </p>
            
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
              <a href="#" className="hover:text-yellow-600 transition-colors">
                이용약관
              </a>
              <span>•</span>
              <a href="#" className="hover:text-yellow-600 transition-colors">
                개인정보처리방침
              </a>
              <span>•</span>
              <a href="#" className="hover:text-yellow-600 transition-colors">
                고객지원
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
