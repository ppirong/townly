import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { scheduledMessages } from '@/db/schema';
import { eq } from 'drizzle-orm';

// DELETE: 예약 메시지 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: messageId } = await params;

    // 메시지 존재 확인
    const [existingMessage] = await db
      .select()
      .from(scheduledMessages)
      .where(eq(scheduledMessages.id, messageId));

    if (!existingMessage) {
      return NextResponse.json({ error: '메시지를 찾을 수 없습니다' }, { status: 404 });
    }

    // 메시지 삭제
    await db
      .delete(scheduledMessages)
      .where(eq(scheduledMessages.id, messageId));

    return NextResponse.json({
      success: true,
      message: '메시지가 성공적으로 삭제되었습니다',
    });
  } catch (error) {
    console.error('예약 메시지 삭제 오류:', error);
    return NextResponse.json(
      { error: '메시지 삭제 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

