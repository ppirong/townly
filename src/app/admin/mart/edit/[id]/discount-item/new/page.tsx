import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { marts, martDiscounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { Toaster } from "sonner";
import DiscountItemForm from "@/components/admin/DiscountFlyer/DiscountItemForm";

// 페이지 컴포넌트를 분리하여 동적 파라미터 처리
async function NewDiscountItemContent({ 
  martId, 
  discountId 
}: { 
  martId: string; 
  discountId: string; 
}) {
  // 마트 정보 조회
  const mart = await db
    .select()
    .from(marts)
    .where(eq(marts.id, martId))
    .limit(1);

  if (!mart.length) {
    redirect("/admin/mart");
  }

  // 할인 전단지 정보 조회
  const martDiscount = await db
    .select()
    .from(martDiscounts)
    .where(eq(martDiscounts.id, discountId))
    .limit(1);

  if (!martDiscount.length) {
    redirect(`/admin/mart/edit/${martId}/discount-info`);
  }

  const martData = mart[0];
  const martDiscountData = martDiscount[0];

  return (
    <DiscountItemForm 
      martId={martId} 
      martName={martData.name} 
      martDiscount={martDiscountData}
      isNew={true}
    />
  );
}

// 메인 페이지 컴포넌트
export default async function NewDiscountItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ discountId?: string }>;
}) {
  // 인증 확인
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // params와 searchParams를 await하여 접근
  const { id: martId } = await params;
  const { discountId } = await searchParams;

  if (!discountId) {
    redirect(`/admin/mart/edit/${martId}/discount-info`);
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<div>로딩 중...</div>}>
        <NewDiscountItemContent martId={martId} discountId={discountId} />
      </Suspense>
      <Toaster position="top-right" />
    </div>
  );
}
