import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { setUserRole } from "@/lib/services/user-role-service";

/**
 * 사용자 역할을 설정하는 API
 * 관리자 회원가입 시 사용됨
 */
export async function POST(request: NextRequest) {
  console.log("🟣 /api/user/role POST 요청 받음");
  
  try {
    const { userId } = await auth();
    console.log("🟣 인증된 사용자 ID:", userId);
    
    if (!userId) {
      console.log("❌ 인증되지 않은 사용자");
      return NextResponse.json(
        { error: "인증되지 않은 사용자입니다." },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    console.log("🟣 요청 본문:", body);
    const { role } = body;
    
    if (!role || (role !== "admin" && role !== "customer")) {
      console.log("❌ 유효하지 않은 역할:", role);
      return NextResponse.json(
        { error: "유효하지 않은 역할입니다." },
        { status: 400 }
      );
    }
    
    console.log("🟣 사용자 역할 설정 시작:", { userId, role });
    await setUserRole(userId, role);
    console.log("✅ 사용자 역할 설정 완료");
    
    return NextResponse.json(
      { success: true, role, userId },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ 사용자 역할 설정 API 오류:", error);
    return NextResponse.json(
      { error: "사용자 역할 설정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}