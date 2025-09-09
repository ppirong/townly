import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Townly - 하이퍼 로컬 정보 에이전트",
  description: "위치 기반 생활 밀착형 정보를 카카오톡으로 제공하는 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="border-b bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <Link href="/" className="flex items-center">
                  <span className="text-2xl mr-2">🏘️</span>
                  <h1 className="text-xl font-bold text-gray-900">Townly</h1>
                </Link>
                
                <nav className="hidden md:flex space-x-6">
                  <Link 
                    href="/dashboard" 
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    대시보드
                  </Link>
                  <Link 
                    href="/profile" 
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    프로필
                  </Link>
                </nav>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                  데모 모드
                </div>
                <button className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-2 px-4 rounded-lg transition-colors">
                  카카오로 로그인 (데모)
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
