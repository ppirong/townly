import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { marts } from "@/db/schema";
import { eq } from "drizzle-orm";
import DiscountFlyerManager from "@/components/admin/DiscountFlyer/DiscountFlyerManager";
import { Toaster } from "sonner";
import { Suspense } from "react";

// 페이지 컴포넌트를 분리하여 동적 파라미터 처리
async function DiscountFlyerContent({ martId }: { martId: string }) {
  // 마트 정보 조회
  const mart = await db
    .select()
    .from(marts)
    .where(eq(marts.id, martId))
    .limit(1);

  if (!mart.length) {
    redirect("/admin/mart");
  }

  const martData = mart[0];

  return (
    <DiscountFlyerManager 
      martId={martId} 
      martName={martData.name} 
    />
  );
}

// 메인 페이지 컴포넌트
export default async function DiscountFlyersPage({
  params,
}: {
  params: Promise<{ martId: string }>;
}) {
  // 인증 확인
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // params를 await하여 동적 파라미터 접근
  const { martId } = await params;

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<div>로딩 중...</div>}>
        <DiscountFlyerContent martId={martId} />
      </Suspense>
      <Toaster position="top-right" />
    </div>
  );
}
