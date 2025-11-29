import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";
import Link from "next/link";
import RoleBasedNavigation from "@/components/RoleBasedNavigation";
import AuthButtons from "@/components/AuthButtons";
import { clerkDarkAppearance } from "@/lib/clerk-appearance";
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
    <ClerkProvider 
      appearance={clerkDarkAppearance}
      localization={koKR}
    >
      <html lang="ko">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#121212] text-white`}
        >
          <header className="border-b bg-[#1E1E1E] border-[#2D2D2D]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-8">
                  <Link href="/" className="flex items-center">
                    <span className="text-2xl mr-2">🏘️</span>
                    <h1 className="text-xl font-bold text-white">Towny</h1>
                  </Link>
                  
                  <SignedIn>
                    <RoleBasedNavigation />
                  </SignedIn>
                </div>
                
                <div className="flex items-center space-x-4">
                  <AuthButtons />
                </div>
              </div>
            </div>
          </header>
          <main className="min-h-screen bg-[#121212]">
            {children}
          </main>
          <footer className="bg-[#1E1E1E] border-t border-[#2D2D2D] py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🏘️</span>
                  <span className="text-lg font-semibold text-white">Townly</span>
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  <Link 
                    href="/privacy-policy" 
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    개인정보처리방침
                  </Link>
                  <span className="text-gray-500">|</span>
                  <span className="text-gray-500">© 2025 Townly. All rights reserved.</span>
                </div>
              </div>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}