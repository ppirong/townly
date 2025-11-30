"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  const [isOpen, setIsOpen] = useState(false);

  if (!isSignedIn || isLoading) {
    return null;
  }

  const filteredNavItems = navItems.filter(item => !item.adminOnly || (item.adminOnly && isAdmin));

  const NavLink = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onClick}
      className={cn(
        "text-sm font-medium transition-colors duration-200 hover:text-yellow-400 px-3 py-2 rounded-md",
        pathname === item.href
          ? "text-yellow-400 bg-[#2D2D2D]"
          : "text-gray-300 hover:text-white hover:bg-[#2A2A2A]"
      )}
    >
      {item.label}
    </Link>
  );

  return (
    <>
      {/* 데스크톱 네비게이션 */}
      <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
        {filteredNavItems.map(item => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* 모바일 햄버거 메뉴 */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-[#2A2A2A]"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">메뉴 열기</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] bg-[#1E1E1E] border-[#2D2D2D]">
            <SheetHeader>
              <SheetTitle className="text-left text-white">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🏘️</span>
                  <span className="text-xl font-bold">Towny</span>
                </div>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col space-y-2 mt-6">
              {filteredNavItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "text-sm font-medium transition-colors duration-200 hover:text-yellow-400 px-3 py-3 rounded-md text-left",
                    pathname === item.href
                      ? "text-yellow-400 bg-[#2D2D2D]"
                      : "text-gray-300 hover:text-white hover:bg-[#2A2A2A]"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}