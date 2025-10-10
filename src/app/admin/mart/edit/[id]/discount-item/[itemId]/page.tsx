import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { marts, martDiscounts, martDiscountItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { Toaster } from "sonner";
import DiscountItemForm from "@/components/admin/DiscountFlyer/DiscountItemForm";

// 페이지 컴포넌트를 분리하여 동적 파라미터 처리
async function EditDiscountItemContent({ 
  martId, 
  itemId 
}: { 
  martId: string; 
  itemId: string; 
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

  // 날짜별 할인 정보 조회
  console.log(`[DEBUG] 날짜별 할인 정보 조회 시작: itemId=${itemId}`);
  const discountItem = await db
    .select()
    .from(martDiscountItems)
    .where(eq(martDiscountItems.id, itemId))
    .limit(1);

  console.log(`[DEBUG] 날짜별 할인 정보 조회 결과:`, discountItem);

  if (!discountItem.length) {
    console.log(`[DEBUG] 날짜별 할인 정보를 찾을 수 없어 리다이렉트합니다. (가설 1 확인)`);
    redirect(`/admin/mart/edit/${martId}/discount-info`);
  }

  // 할인 전단지 정보 조회
  console.log(`[DEBUG] 할인 전단지 정보 조회 시작: discountId=${discountItem[0].discountId}`);
  const martDiscount = await db
    .select()
    .from(martDiscounts)
    .where(eq(martDiscounts.id, discountItem[0].discountId))
    .limit(1);

  console.log(`[DEBUG] 할인 전단지 정보 조회 결과:`, martDiscount);

  if (!martDiscount.length) {
    console.log(`[DEBUG] 할인 전단지를 찾을 수 없어 리다이렉트합니다. (가설 2 확인)`);
    redirect(`/admin/mart/edit/${martId}/discount-info`);
  }

  const martData = mart[0];
  const martDiscountData = martDiscount[0];
  const discountItemData = discountItem[0];

  return (
    <DiscountItemForm 
      martId={martId} 
      martName={martData.name} 
      martDiscount={martDiscountData}
      discountItem={discountItemData}
      isNew={false}
    />
  );
}

// 메인 페이지 컴포넌트
export default async function EditDiscountItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  // 인증 확인
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // params를 await하여 동적 파라미터 접근
  const { id: martId, itemId } = await params;

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<div>로딩 중...</div>}>
        <EditDiscountItemContent martId={martId} itemId={itemId} />
      </Suspense>
      <Toaster position="top-right" />
    </div>
  );
}
