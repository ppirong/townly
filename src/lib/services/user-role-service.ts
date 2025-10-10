import { db } from "@/db";
import { userRoles } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * 사용자 역할 정보를 조회합니다.
 * @param userId Clerk 사용자 ID
 * @returns 사용자 역할 정보 객체
 */
export async function getUserRole(userId: string) {
  if (!userId) {
    return { role: "customer", isAdmin: false };
  }

  try {
    const result = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.clerkUserId, userId))
      .limit(1);

    const userRole = result[0];

    return {
      role: userRole?.role || "customer",
      isAdmin: userRole?.role === "admin",
    };
  } catch (error) {
    console.error("사용자 역할 조회 실패:", error);
    return { role: "customer", isAdmin: false };
  }
}

/**
 * 사용자 역할을 설정합니다.
 * @param userId Clerk 사용자 ID
 * @param role 역할 ('customer' 또는 'admin')
 */
export async function setUserRole(userId: string, role: "customer" | "admin") {
  console.log("🟠 setUserRole 함수 호출됨:", { userId, role });
  
  if (!userId) {
    console.log("❌ 사용자 ID가 없음");
    throw new Error("사용자 ID가 필요합니다.");
  }

  try {
    // 기존 역할 확인
    console.log("🟠 기존 역할 확인 중...");
    const existingRole = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.clerkUserId, userId))
      .limit(1);

    console.log("🟠 기존 역할 조회 결과:", existingRole);

    if (existingRole.length > 0) {
      // 기존 역할 업데이트
      console.log("🟠 기존 역할 업데이트 중...");
      const result = await db
        .update(userRoles)
        .set({
          role,
          updatedAt: new Date(),
        })
        .where(eq(userRoles.clerkUserId, userId))
        .returning();
      
      console.log("🟠 역할 업데이트 결과:", result);
    } else {
      // 새 역할 생성
      console.log("🟠 새 역할 생성 중...");
      const result = await db.insert(userRoles).values({
        clerkUserId: userId,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      console.log("🟠 새 역할 생성 결과:", result);
    }

    console.log("✅ setUserRole 완료");
    return { success: true };
  } catch (error) {
    console.error("❌ 사용자 역할 설정 실패:", error);
    throw new Error(`사용자 역할 설정 중 오류가 발생했습니다: ${error}`);
  }
}