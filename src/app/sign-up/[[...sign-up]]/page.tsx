import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignUpPage() {
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
              하이퍼 로컬 정보 서비스 시작하기
            </h2>
            <p className="text-gray-600">
              30초만에 가입하고 우리 동네 정보를 받아보세요
            </p>
          </div>

          {/* Signup Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <SignUp 
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
              signInUrl="/sign-in"
            />
            
            {/* Benefits */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">가입하면 이런 혜택이!</h4>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="text-blue-500 mr-2">🌤️</span>
                  비 오기 2시간 전 미리 알림
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-2">😷</span>
                  미세먼지 나쁨 시 마스크 알림
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="text-orange-500 mr-2">🛒</span>
                  우리 동네 마트 특가 정보
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="text-yellow-500 mr-2">📱</span>
                  카카오톡으로 편리한 알림
                </div>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link href="/sign-in" className="text-yellow-600 hover:text-yellow-700 font-semibold">
                로그인하기
              </Link>
            </p>
            
            <div className="text-xs text-gray-500 leading-relaxed">
              가입하면 Townly의{' '}
              <a href="#" className="text-yellow-600 hover:text-yellow-700 underline">
                이용약관
              </a>
              {' '}및{' '}
              <a href="#" className="text-yellow-600 hover:text-yellow-700 underline">
                개인정보처리방침
              </a>
              에 동의하는 것으로 간주됩니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
