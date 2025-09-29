'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/nextjs/server';
import { env } from '@/lib/env';
import { db } from '@/db';
import { userEmailSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  updateUserEmailSettingsSchema,
  UpdateUserEmailSettingsInput
} from '@/lib/schemas/email';
import { revalidatePath } from 'next/cache';

/**
 * 사용자 이메일 설정 조회 또는 생성
 */
export async function getUserEmailSettings() {
  const { userId } = await auth();
  const user = await currentUser();
  
  if (!userId || !user) {
    throw new Error('Unauthorized');
  }
  
  // 기존 설정 조회
  let settings = await db
    .select()
    .from(userEmailSettings)
    .where(eq(userEmailSettings.clerkUserId, userId));
  
  // 설정이 없으면 기본 설정으로 생성
  if (settings.length === 0) {
    const primaryEmail = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId);
    
    if (!primaryEmail) {
      throw new Error('사용자 이메일 주소를 찾을 수 없습니다');
    }
    
    const newSettings = {
      id: crypto.randomUUID(),
      clerkUserId: userId,
      email: primaryEmail.emailAddress,
      receiveWeatherEmails: true,
      receiveMorningEmail: true,
      receiveEveningEmail: true,
      preferredLanguage: 'ko',
      timezone: 'Asia/Seoul',
      isSubscribed: true,
      totalEmailsSent: 0,
    };
    
    await db.insert(userEmailSettings).values(newSettings);
    settings = [newSettings];
  }
  
  return settings[0];
}

/**
 * 사용자 이메일 설정 업데이트
 */
export async function updateUserEmailSettings(input: UpdateUserEmailSettingsInput) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  const validatedData = updateUserEmailSettingsSchema.parse(input);
  
  // 기존 설정 확인
  await getUserEmailSettings(); // 설정이 없으면 생성
  
  const result = await db
    .update(userEmailSettings)
    .set({
      ...validatedData,
      updatedAt: new Date(),
    })
    .where(eq(userEmailSettings.clerkUserId, userId));
  
  revalidatePath('/profile');
  return result;
}

/**
 * 이메일 구독 취소
 */
export async function unsubscribeFromEmails(reason?: string) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  const result = await db
    .update(userEmailSettings)
    .set({
      isSubscribed: false,
      receiveWeatherEmails: false,
      receiveMorningEmail: false,
      receiveEveningEmail: false,
      unsubscribedAt: new Date(),
      unsubscribeReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(userEmailSettings.clerkUserId, userId));
  
  revalidatePath('/profile');
  return result;
}

/**
 * 이메일 구독 재개
 */
export async function resubscribeToEmails() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  const result = await db
    .update(userEmailSettings)
    .set({
      isSubscribed: true,
      receiveWeatherEmails: true,
      receiveMorningEmail: true,
      receiveEveningEmail: true,
      unsubscribedAt: null,
      unsubscribeReason: null,
      updatedAt: new Date(),
    })
    .where(eq(userEmailSettings.clerkUserId, userId));
  
  revalidatePath('/profile');
  return result;
}

/**
 * 사용자별 이메일 발송 통계 업데이트
 */
export async function updateEmailSentStats(clerkUserId: string) {
  // 현재 발송 횟수 조회
  const currentStats = await db
    .select({ totalEmailsSent: userEmailSettings.totalEmailsSent })
    .from(userEmailSettings)
    .where(eq(userEmailSettings.clerkUserId, clerkUserId));

  const newCount = (currentStats[0]?.totalEmailsSent || 0) + 1;

  const result = await db
    .update(userEmailSettings)
    .set({
      totalEmailsSent: newCount,
      lastEmailSentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userEmailSettings.clerkUserId, clerkUserId));
  
  return result;
}

/**
 * 모든 구독자 목록 조회 (관리자용) - Clerk 사용자 포함
 */
export async function getAllSubscribers() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  // TODO: 관리자 권한 체크 추가 (Clerk roles 활용)
  
  try {
    // Clerk 클라이언트 생성
    const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
    
    // Clerk에서 모든 사용자 가져오기 (v6 방식)
    const clerkUsersResponse = await clerkClient.users.getUserList({
      limit: 100, // 필요에 따라 조정
    });
    
    console.log('Clerk API response:', JSON.stringify(clerkUsersResponse, null, 2));
    
    // Clerk v6에서는 응답이 { data: User[], totalCount: number } 형태
    const clerkUsers = clerkUsersResponse?.data || [];
    console.log('Extracted users count:', clerkUsers.length);
    
    // 데이터베이스에서 기존 이메일 설정 가져오기
    const existingSettings = await db
      .select()
      .from(userEmailSettings);
    
    // 설정을 userId로 인덱싱
    const settingsMap = new Map(
      existingSettings.map(setting => [setting.clerkUserId, setting])
    );
    
    // 사용자 배열이 유효한지 확인
    if (!Array.isArray(clerkUsers)) {
      console.error('clerkUsers is not an array:', clerkUsers);
      console.error('Returning empty array instead');
      return []; // 빈 배열 반환 (오류 대신)
    }
    
    if (clerkUsers.length === 0) {
      console.log('No users found in Clerk, creating mock user for testing');
      
      // 임시: 현재 로그인한 사용자의 정보를 사용
      const currentClerkUser = await currentUser();
      if (currentClerkUser) {
        const mockUsers = [{
          id: currentClerkUser.id,
          firstName: currentClerkUser.firstName,
          lastName: currentClerkUser.lastName,
          imageUrl: currentClerkUser.imageUrl,
          emailAddresses: currentClerkUser.emailAddresses,
          primaryEmailAddressId: currentClerkUser.primaryEmailAddressId,
          createdAt: currentClerkUser.createdAt,
          lastSignInAt: currentClerkUser.lastSignInAt,
        }];
        
        return mockUsers.map(user => {
          const primaryEmail = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId);
          return {
            clerkUserId: user.id,
            email: primaryEmail?.emailAddress || '',
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
            createdAt: user.createdAt,
            lastSignInAt: user.lastSignInAt,
            receiveWeatherEmails: true,
            receiveMorningEmail: true,
            receiveEveningEmail: true,
            isSubscribed: true,
            totalEmailsSent: 0,
            lastEmailSentAt: null,
            hasEmailSettings: false,
          };
        });
      }
      
      return [];
    }
    
    // Clerk 사용자와 이메일 설정을 매핑
    const allSubscribers = clerkUsers.map(user => {
      const userSetting = settingsMap.get(user.id);
      const primaryEmail = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId);
      
      return {
        clerkUserId: user.id,
        email: primaryEmail?.emailAddress || '',
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        // 이메일 설정 (기본값 또는 저장된 값)
        receiveWeatherEmails: userSetting?.receiveWeatherEmails ?? true,
        receiveMorningEmail: userSetting?.receiveMorningEmail ?? true,
        receiveEveningEmail: userSetting?.receiveEveningEmail ?? true,
        isSubscribed: userSetting?.isSubscribed ?? true,
        totalEmailsSent: userSetting?.totalEmailsSent ?? 0,
        lastEmailSentAt: userSetting?.lastEmailSentAt ?? null,
        hasEmailSettings: !!userSetting, // 이메일 설정이 DB에 있는지 여부
      };
    });
    
    // 생성일 순으로 정렬 (최신순)
    return allSubscribers.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
  } catch (error) {
    console.error('Failed to fetch all subscribers:', error);
    throw new Error('구독자 목록을 가져오는데 실패했습니다.');
  }
}

/**
 * 구독자 통계 조회 (관리자용)
 */
export async function getSubscriberStats() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  // TODO: 관리자 권한 체크 추가
  
  // 전체 사용자 수 조회
  const allUsers = await db.select().from(userEmailSettings);
  
  const stats = {
    totalUsers: allUsers.length,
    subscribedUsers: allUsers.filter(user => user.isSubscribed).length,
    weatherEmailUsers: allUsers.filter(user => user.receiveWeatherEmails).length,
    morningEmailUsers: allUsers.filter(user => user.receiveMorningEmail).length,
    eveningEmailUsers: allUsers.filter(user => user.receiveEveningEmail).length,
  };
  
  return stats;
}

/**
 * 특정 사용자의 이메일 설정 업데이트 (관리자용)
 */
export async function updateUserEmailSettingsAdmin(
  targetUserId: string, 
  settings: Partial<UpdateUserEmailSettingsInput>
) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  // TODO: 관리자 권한 체크 추가
  
  try {
    // 기존 설정 확인
    const existingSetting = await db
      .select()
      .from(userEmailSettings)
      .where(eq(userEmailSettings.clerkUserId, targetUserId))
      .limit(1);
    
    if (existingSetting.length > 0) {
      // 기존 설정 업데이트
      const result = await db
        .update(userEmailSettings)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(userEmailSettings.clerkUserId, targetUserId));
      
      revalidatePath('/admin/email-management');
      return result;
    } else {
      // 새 설정 생성 (Clerk 사용자 정보 가져오기)
      const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
      const clerkUser = await clerkClient.users.getUser(targetUserId);
      const primaryEmail = clerkUser.emailAddresses.find(
        email => email.id === clerkUser.primaryEmailAddressId
      );
      
      if (!primaryEmail) {
        throw new Error('사용자의 이메일 주소를 찾을 수 없습니다.');
      }
      
      const result = await db
        .insert(userEmailSettings)
        .values({
          id: crypto.randomUUID(),
          clerkUserId: targetUserId,
          email: primaryEmail.emailAddress,
          receiveWeatherEmails: settings.receiveWeatherEmails ?? true,
          receiveMorningEmail: settings.receiveMorningEmail ?? true,
          receiveEveningEmail: settings.receiveEveningEmail ?? true,
          isSubscribed: settings.isSubscribed ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      
      revalidatePath('/admin/email-management');
      return result;
    }
  } catch (error) {
    console.error('Failed to update user email settings:', error);
    throw new Error('사용자 이메일 설정 업데이트에 실패했습니다.');
  }
}

