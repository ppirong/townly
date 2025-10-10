import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { setUserRole } from "@/lib/services/user-role-service";
import { redirect } from "next/navigation";

/**
 * 관리자 회원가입 완료 후 자동으로 호출되는 API
 * 사용자 역할을 관리자로 설정하고 홈페이지로 리디렉션
 */
export async function GET(request: NextRequest) {
  console.log("🔷 관리자 등록 API 호출됨");
  
  try {
    const { userId } = await auth();
    console.log("🔷 인증된 사용자 ID:", userId);
    
    if (!userId) {
      console.log("❌ 인증되지 않은 사용자");
      return NextResponse.redirect(new URL("/", request.url));
    }
    
    // 관리자 역할 설정
    console.log("🔷 관리자 역할 설정 시작");
    await setUserRole(userId, "admin");
    console.log("✅ 관리자 역할 설정 완료");
    
    // 홈페이지로 리디렉션
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("❌ 관리자 등록 API 오류:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
