import { createClerkClient } from '@clerk/nextjs/server';
import { env } from '@/lib/env';

/**
 * Clerk 클라이언트 싱글톤
 */
let clerkClientInstance: ReturnType<typeof createClerkClient> | null = null;

export function getClerkClient() {
  if (!clerkClientInstance) {
    clerkClientInstance = createClerkClient({ 
      secretKey: env.CLERK_SECRET_KEY 
    });
  }
  return clerkClientInstance;
}

/**
 * 모든 Clerk 사용자 조회
 */
export async function getAllClerkUsers(limit: number = 100) {
  try {
    const clerkClient = getClerkClient();
    const users = await clerkClient.users.getUserList({ limit });
    return users;
  } catch (error) {
    console.error('Failed to fetch Clerk users:', error);
    throw error;
  }
}

/**
 * 특정 Clerk 사용자 조회
 */
export async function getClerkUser(userId: string) {
  try {
    const clerkClient = getClerkClient();
    const user = await clerkClient.users.getUser(userId);
    return user;
  } catch (error) {
    console.error('Failed to fetch Clerk user:', error);
    throw error;
  }
}
