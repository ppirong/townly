import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import Link from "next/link";
import RoleBasedNavigation from "@/components/RoleBasedNavigation";
import AuthButtons from "@/components/AuthButtons";
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
    <ClerkProvider>
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
                    <h1 className="text-xl font-bold text-gray-900">Towny</h1>
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
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}