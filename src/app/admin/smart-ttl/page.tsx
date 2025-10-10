import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/services/user-role-service";

export default async function SmartTTLPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  // 사용자 역할 확인
  const { isAdmin } = await getUserRole(userId);
  
  if (!isAdmin) {
    redirect("/"); // 관리자가 아니면 홈으로 리디렉션
  }
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">스마트 TTL 관리</h1>
      <p className="mb-6 text-muted-foreground">
        스마트 TTL 시스템을 관리하는 페이지입니다. 이 페이지는 관리자만 접근할 수 있습니다.
      </p>
      
      <div className="p-6 border rounded-lg bg-card">
        <h2 className="text-xl font-semibold mb-4">스마트 TTL 대시보드</h2>
        <p>스마트 TTL 기능이 곧 구현될 예정입니다.</p>
      </div>
    </div>
  );
}