"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

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
  { href: "/api-usage", label: "API 사용량", adminOnly: true },
  { href: "/admin/mart", label: "마트 관리", adminOnly: true },
  { href: "/admin/kakao", label: "카카오 관리", adminOnly: true },
  { href: "/admin/email-management", label: "이메일 관리", adminOnly: true },
  { href: "/admin/smart-ttl", label: "스마트 TTL", adminOnly: true },
];


/**
 * 역할 기반 네비게이션 컴포넌트
 */
export default function RoleBasedNavigation() {
  const pathname = usePathname();
  const { isAdmin, isLoading, isSignedIn } = useUserRole();

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