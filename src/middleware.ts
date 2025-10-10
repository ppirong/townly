import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserRole } from "./lib/services/user-role-service";

// 보호된 경로 정의
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/admin(.*)',
  '/airquality(.*)',
  '/weather(.*)',
]);

// 관리자 전용 경로 정의
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  
  // 보호된 경로에 대한 인증 체크
  if (isProtectedRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // 관리자 전용 경로에 대한 권한 체크
  if (isAdminRoute(req) && userId) {
    try {
      const { isAdmin } = await getUserRole(userId);
      
      if (!isAdmin) {
        // 관리자가 아닌 경우 홈으로 리디렉션
        const homeUrl = new URL('/', req.url);
        return NextResponse.redirect(homeUrl);
      }
    } catch (error) {
      console.error("미들웨어에서 사용자 역할 확인 실패:", error);
      // 오류 발생 시 안전하게 홈으로 리디렉션
      const homeUrl = new URL('/', req.url);
      return NextResponse.redirect(homeUrl);
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};