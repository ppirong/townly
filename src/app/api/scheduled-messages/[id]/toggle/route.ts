import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { scheduledMessages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const toggleSchema = z.object({
  isActive: z.boolean(),
});

// PATCH: 예약 메시지 활성화/비활성화 토글
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.id;
    const body = await request.json();
    
    // 데이터 검증
    const validatedData = toggleSchema.parse(body);

    // 메시지 존재 확인
    const [existingMessage] = await db
      .select()
      .from(scheduledMessages)
      .where(eq(scheduledMessages.id, messageId));

    if (!existingMessage) {
      return NextResponse.json({ error: '메시지를 찾을 수 없습니다' }, { status: 404 });
    }

    // 상태 업데이트
    const [updatedMessage] = await db
      .update(scheduledMessages)
      .set({
        isActive: validatedData.isActive,
        updatedAt: new Date(),
      })
      .where(eq(scheduledMessages.id, messageId))
      .returning();

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });
  } catch (error) {
    console.error('예약 메시지 상태 변경 오류:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '잘못된 요청 데이터입니다' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: '메시지 상태 변경 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
