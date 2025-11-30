"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

// 네비게이션 아이템 정의
const navItems: NavItem[] = [
  { href: "/", label: "대시보드" },
  { href: "/weather", label: "날씨" },
  { href: "/airquality-google", label: "미세먼지(구글)" },
  { href: "/admin/mart", label: "마트 관리", adminOnly: true },
  { href: "/admin/kakao", label: "카카오 관리", adminOnly: true },
  { href: "/admin/email-management", label: "이메일 관리", adminOnly: true },
  { href: "/admin/smart-ttl", label: "스마트 TTL", adminOnly: true },
];

/**
 * 사용자 역할 정보를 가져오는 커스텀 훅
 */
function useUserRole() {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 사용자 로그인 상태 확인 후 API 호출
    if (!isLoaded || !user?.id) {
      setIsLoading(false);
      return;
    }
    
    const checkUserRole = async () => {
      try {
        const response = await fetch("/api/user/type");
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin);
        }
      } catch (error) {
        console.error("사용자 역할 확인 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserRole();
  }, [user?.id, isLoaded]);

  return { isAdmin, isLoading };
}

/**
 * 역할 기반 네비게이션 컴포넌트
 */
export default function RoleBasedNavigation() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const { isAdmin, isLoading } = useUserRole();

  if (!isSignedIn || isLoading) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {navItems
        .filter(item => !item.adminOnly || (item.adminOnly && isAdmin))
        .map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-sm font-medium transition-colors duration-200 hover:text-yellow-400 px-3 py-2 rounded-md",
              pathname === item.href
                ? "text-yellow-400 bg-[#2D2D2D]"
                : "text-gray-300 hover:text-white hover:bg-[#2A2A2A]"
            )}
          >
            {item.label}
          </Link>
        ))}
    </nav>
  );
}