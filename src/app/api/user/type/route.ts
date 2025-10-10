import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/services/user-role-service";

/**
 * 현재 로그인한 사용자의 역할 정보를 반환하는 API
 */
export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user?.id) {
      return NextResponse.json({ isAdmin: false, role: "customer" }, { status: 200 });
    }
    
    const { isAdmin, role } = await getUserRole(user.id);
    
    return NextResponse.json({ isAdmin, role }, { status: 200 });
  } catch (error) {
    console.error("사용자 역할 확인 API 오류:", error);
    return NextResponse.json({ isAdmin: false, role: "customer" }, { status: 200 });
  }
}
