import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { marts, martDiscounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { Toaster } from "sonner";
import DiscountItemsListManager from "@/components/admin/DiscountFlyer/DiscountItemsListManager";
import { getDiscountItems } from "@/actions/mart-discounts";

// 페이지 컴포넌트를 분리하여 동적 파라미터 처리
async function DiscountEditContent({ martId, discountId }: { martId: string; discountId: string }) {
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

  // 날짜별 할인 정보 조회
  const discountItemsResult = await getDiscountItems(discountId);
  const initialDiscountItems = discountItemsResult.success ? discountItemsResult.data : [];

  const martData = mart[0];
  const martDiscountData = martDiscount[0];

  return (
    <DiscountItemsListManager 
      martId={martId} 
      martName={martData.name} 
      martDiscount={martDiscountData}
      initialDiscountItems={initialDiscountItems}
    />
  );
}

// 메인 페이지 컴포넌트
export default async function DiscountEditPage({
  params,
}: {
  params: Promise<{ id: string; discountId: string }>;
}) {
  // 인증 확인
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // params를 await하여 동적 파라미터 접근
  const { id: martId, discountId } = await params;

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<div>로딩 중...</div>}>
        <DiscountEditContent martId={martId} discountId={discountId} />
      </Suspense>
      <Toaster position="top-right" />
    </div>
  );
}
