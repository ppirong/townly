'use client';

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import WelcomeDashboard from "@/components/WelcomeDashboard";
import { clerkDarkAppearance } from "@/lib/clerk-appearance";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative container mx-auto px-4 py-8">
        <SignedOut>
        {/* Hero Section - Premium Glass Design */}
        <div className="group relative mb-12">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 rounded-3xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-12 shadow-2xl hover:shadow-yellow-500/25 transition-all duration-500 hover:scale-[1.02]">
            <div className="text-center">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <div className="relative inline-block mb-6">
                    <div className="text-6xl mb-4 animate-bounce">🏘️</div>
                    <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-20 blur animate-ping"></div>
                  </div>
                  <h1 className="text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
                    <span className="bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                      훈남김밥이 제공하는 우리 동네 생활 정보를 
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                      카카오톡
                    </span>
                    <span className="bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent">으로</span>
                  </h1>
                  <p className="text-xl text-white/80 mb-8 leading-relaxed max-w-3xl mx-auto">
                    🌍 GPS 기반으로 당신의 지역에 맞춤화된 날씨, 미세먼지, 마트 할인 정보를 
                    <br className="hidden sm:block" />
                    🔔 실시간으로 받아보세요
                  </p>
                </div>
                
                {/* CTA Button - Enhanced */}
                <div className="mb-8">
                  <SignInButton mode="modal">
                    <button className="group relative bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 hover:from-yellow-300 hover:via-orange-400 hover:to-yellow-300 text-black font-bold text-lg px-10 py-5 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-yellow-500/50 active:scale-95">
                      <span className="relative z-10 flex items-center gap-3">
                        <span className="text-2xl">🔑</span>
                        카카오로 시작하기
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>
                  </SignInButton>
                  
                  <div className="mt-6 space-y-2">
                    <p className="text-sm text-white/70 font-medium flex items-center justify-center gap-4">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        30초만에 시작
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                        무료 서비스
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                        언제든 해지 가능
                      </span>
                    </p>
                    <p className="text-xs text-white/60">
                      가입 시 <Link href="/privacy-policy" className="text-blue-300 hover:text-blue-200 underline underline-offset-2 transition-colors">개인정보처리방침</Link>에 동의하는 것으로 간주됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
            
            {/* Feature Cards - Premium Glass Design */}
            <div className="grid md:grid-cols-3 gap-8">
              {/* Weather Card */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl hover:shadow-blue-500/25 transition-all duration-500 hover:scale-[1.05]">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                      🌤️
                    </div>
                    <h3 className="text-xl font-bold text-white">실시간 날씨 정보</h3>
                  </div>
                  <p className="text-white/80 leading-relaxed mb-6">
                    AccuWeather API로 정확한 날씨 예보와 
                    비가 오기 2시간 전 미리 알림
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-blue-200 font-medium">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                      시간별 날씨 예보
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-200 font-medium">
                      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                      강수 알림
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-200 font-medium">
                      <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span>
                      외출 추천
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Air Quality Card */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 via-emerald-400 to-green-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl hover:shadow-green-500/25 transition-all duration-500 hover:scale-[1.05]">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                      😷
                    </div>
                    <h3 className="text-xl font-bold text-white">미세먼지 농도</h3>
                  </div>
                  <p className="text-white/80 leading-relaxed mb-6">
                    구글 API로 실시간 미세먼지 농도와 
                    90시간 미세먼지 예보 제공
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-green-200 font-medium">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                      실시간 농도
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-200 font-medium">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                      야외 운동 가이드
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-200 font-medium">
                      <span className="w-1.5 h-1.5 bg-lime-400 rounded-full"></span>
                      외출 주의보
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Shopping Card */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 via-red-400 to-orange-600 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl hover:shadow-orange-500/25 transition-all duration-500 hover:scale-[1.05]">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                      🛒
                    </div>
                    <h3 className="text-xl font-bold text-white">마트 할인 정보</h3>
                  </div>
                  <p className="text-white/80 leading-relaxed mb-6">
                    우리 동네 주요 마트의 할인 정보를  
                    매일 아침 맞춤 제공
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-orange-200 font-medium">
                      <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                      할인 상품 알림
                    </div>
                    <div className="flex items-center gap-2 text-sm text-orange-200 font-medium">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                      가격 비교
                    </div>
                    <div className="flex items-center gap-2 text-sm text-orange-200 font-medium">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                      쇼핑 목록
                    </div>
                  </div>
                </div>
              </div>
            </div>

        {/* Benefits Section - Premium Glass Design */}
        <div className="group relative mb-16">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-violet-400 to-purple-600 rounded-3xl blur opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-16 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 hover:scale-[1.02]">
            <div className="max-w-6xl mx-auto text-center">
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                  ✨
                </div>
                <h2 className="text-4xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-violet-400 bg-clip-text text-transparent">
                  왜 Townly를 선택해야 할까요?
                </h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="group/card relative">
                  <div className="backdrop-blur-sm bg-white/10 border border-purple-300/30 rounded-xl p-6 hover:shadow-lg hover:shadow-purple-400/25 transition-all duration-300 hover:scale-105 h-full">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                        ⚡
                      </div>
                      <h4 className="font-bold text-white text-lg">실시간 알림</h4>
                      <p className="text-sm text-white/70 leading-relaxed">
                        중요한 정보를 놓치지 않도록 적시에 알림
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="group/card relative">
                  <div className="backdrop-blur-sm bg-white/10 border border-purple-300/30 rounded-xl p-6 hover:shadow-lg hover:shadow-purple-400/25 transition-all duration-300 hover:scale-105 h-full">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                        🎯
                      </div>
                      <h4 className="font-bold text-white text-lg">맞춤형 정보</h4>
                      <p className="text-sm text-white/70 leading-relaxed">
                        당신의 위치와 선호도에 맞춘 정보 제공
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="group/card relative">
                  <div className="backdrop-blur-sm bg-white/10 border border-purple-300/30 rounded-xl p-6 hover:shadow-lg hover:shadow-purple-400/25 transition-all duration-300 hover:scale-105 h-full">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                        🔒
                      </div>
                      <h4 className="font-bold text-white text-lg">안전한 서비스</h4>
                      <p className="text-sm text-white/70 leading-relaxed">
                        카카오 로그인으로 안전하게 이용
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="group/card relative">
                  <div className="backdrop-blur-sm bg-white/10 border border-purple-300/30 rounded-xl p-6 hover:shadow-lg hover:shadow-purple-400/25 transition-all duration-300 hover:scale-105 h-full">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                        💰
                      </div>
                      <h4 className="font-bold text-white text-lg">완전 무료</h4>
                      <p className="text-sm text-white/70 leading-relaxed">
                        모든 기능을 무료로 이용 가능
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <WelcomeDashboard />
      </SignedIn>
      </div>

      {/* 추가 CSS 애니메이션을 위한 스타일 */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
