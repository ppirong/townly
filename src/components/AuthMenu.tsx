"use client"

/**
 * 인증 관련 메뉴 컴포넌트
 * 로그인, 회원가입, 관리자 회원가입 버튼을 제공합니다.
 */

import { useState } from 'react';
import Link from 'next/link';
import { SignInButton } from '@clerk/nextjs';
import { ChevronDown, LogIn, UserPlus, ShieldCheck } from 'lucide-react';

export function AuthMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="flex items-center space-x-1 bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-2 px-4 rounded-lg transition-colors"
      >
        <span>로그인/회원가입</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <SignInButton mode="modal">
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
              >
                <LogIn className="mr-2 h-4 w-4" />
                로그인
              </button>
            </SignInButton>
            
            <Link href="/sign-up?role=customer">
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
                onClick={() => setIsMenuOpen(false)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                회원가입
              </button>
            </Link>
            
            <Link href="/sign-up?role=admin">
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                role="menuitem"
                onClick={() => setIsMenuOpen(false)}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                관리자 회원가입
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
