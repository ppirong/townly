import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MartManagementDashboard from "@/components/admin/MartManagementDashboard";
import { getMartList } from "@/actions/mart";

export default async function MartManagementPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }
  
  // 마트 목록 데이터 가져오기
  const { success, data: marts, message } = await getMartList();
  
  if (!success) {
    console.error("마트 목록 조회 실패:", message);
  }
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6 text-center">우리 동네 마트</h1>
      <p className="text-center text-muted-foreground mb-8">할인 전단지 정보를 제공하는 마트입니다</p>
      <MartManagementDashboard marts={marts || []} />
    </div>
  );
}
