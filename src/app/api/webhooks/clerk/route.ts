/**
 * Clerk 웹훅 처리 API
 * 사용자 생성 시 역할 설정 등의 작업을 수행합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { setUserRole } from '@/lib/services/user-role-service';
import { env } from '@/lib/env';
// Debug imports removed for production

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('🔔 Clerk 웹훅 호출됨 - 시작', { timestamp: new Date().toISOString() });
  
  // Debug logging removed for production
  
  // Clerk 웹훅 시크릿 키 확인 (환경변수에서 직접 가져오기)
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    console.error('❌ CLERK_WEBHOOK_SECRET이 설정되지 않았습니다.');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }
  
  console.log('✅ 웹훅 시크릿 확인됨');

  // 요청 헤더 확인
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // 필수 헤더가 없으면 에러 반환
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  // 요청 본문 가져오기
  const payload = await req.json();
  const body = JSON.stringify(payload);
  
  console.log('📋 웹훅 페이로드:', {
    eventType: payload.type,
    userId: payload.data?.id,
    timestamp: new Date().toISOString()
  });
  
  // Debug logging removed for production

  // Svix 웹훅 인스턴스 생성 및 검증
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('❌ 웹훅 검증 실패:', err);
    console.error('헤더 정보:', { svix_id, svix_timestamp, svix_signature });
    
    // Debug logging removed for production
    
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  // 이벤트 타입에 따른 처리
  const eventType = evt.type;
  
  if (eventType === 'user.created') {
    const { id, email_addresses, created_at, external_id, external_accounts, first_name, last_name, image_url, phone_numbers } = evt.data;
    const userId = id;
    const email = email_addresses && email_addresses[0]?.email_address;
    const phoneNumber = phone_numbers && phone_numbers[0]?.phone_number;
    
    console.log(`사용자 생성됨: ${userId}, 이메일: ${email}, 전화번호: ${phoneNumber || '없음'}, 외부 ID: ${external_id || '없음'}`);
    console.log('외부 계정:', external_accounts);
    
    // 기본 역할 및 회원가입 방법
    let role = 'customer';
    let signupMethod: 'email' | 'kakao' = 'email';
    
    try {
      // 회원가입 방법 감지
      if (external_accounts && external_accounts.length > 0) {
        const kakaoAccount = external_accounts.find((account: any) => 
          String(account.provider) === 'oauth_kakao' || 
          String(account.provider) === 'kakao' ||
          String(account.provider_slug) === 'oauth_kakao' ||
          String(account.provider_slug) === 'kakao'
        );
        
        if (kakaoAccount) {
          signupMethod = 'kakao';
          console.log('카카오 회원가입 감지됨');
        }
      }
      
      // 1. 외부 ID에서 역할 확인 (가장 우선순위 높음)
      if (external_id && external_id.startsWith('role:')) {
        const roleFromExternalId = external_id.split(':')[1];
        if (roleFromExternalId === 'admin') {
          role = 'admin';
          console.log(`외부 ID에서 역할 확인: ${role}`);
        }
      }
      
      // 2. URL에서 역할 정보 확인 (리다이렉트 URL, 첫 번째 로그인 URL, 마지막 로그인 URL 순)
      if (role !== 'admin') {
        // 가입 시 사용한 리다이렉트 URL 확인 (타입 안전성을 위해 any로 캐스팅)
        const eventData = evt.data as any;
        if (eventData?.redirect_url) {
          try {
            const url = new URL(eventData.redirect_url);
            const roleParam = url.searchParams.get('role');
            if (roleParam === 'admin') {
              role = 'admin';
              console.log(`리다이렉트 URL에서 역할 확인: ${role}`);
            }
          } catch (e) {
            console.error('리다이렉트 URL 파싱 오류:', e);
          }
        }
        
        // 첫 번째 로그인 URL 확인
        if (role !== 'admin' && eventData?.first_sign_in_url) {
          try {
            const url = new URL(eventData.first_sign_in_url);
            const roleParam = url.searchParams.get('role');
            if (roleParam === 'admin') {
              role = 'admin';
              console.log(`첫 번째 로그인 URL에서 역할 확인: ${role}`);
            }
          } catch (e) {
            console.error('첫 번째 로그인 URL 파싱 오류:', e);
          }
        }
        
        // 마지막 로그인 URL 확인
        if (role !== 'admin' && eventData?.last_sign_in_url) {
          try {
            const url = new URL(eventData.last_sign_in_url);
            const roleParam = url.searchParams.get('role');
            if (roleParam === 'admin') {
              role = 'admin';
              console.log(`마지막 로그인 URL에서 역할 확인: ${role}`);
            }
          } catch (e) {
            console.error('마지막 로그인 URL 파싱 오류:', e);
          }
        }
      }
      
      console.log(`최종 역할 결정: ${role}, 회원가입 방법: ${signupMethod}, 사용자 ID: ${userId}`);
      
      // Debug logging removed for production
      
      // 사용자 역할 설정 (타입 안전성 확보)
      const validRole: "customer" | "admin" = role === 'admin' ? 'admin' : 'customer';
      await setUserRole(userId, validRole);
      console.log(`사용자 ${userId}의 역할이 ${role}로 설정되었습니다.`);
      
      // 사용자 프로필 생성
      if (email) {
        try {
          const { createUserProfile } = await import('@/db/queries/user-profiles');
          
          // first_name과 last_name을 name으로 통합
          let fullName: string | undefined = undefined;
          if (first_name || last_name) {
            const combinedName = [first_name, last_name].filter(Boolean).join(' ').trim();
            fullName = combinedName || undefined;
          }
          
          await createUserProfile({
            clerkUserId: userId,
            email,
            name: fullName,
            mobilePhone: phoneNumber || undefined,
            imageUrl: image_url || undefined,
            signupMethod,
          });
          console.log(`사용자 ${userId}의 프로필이 생성되었습니다.`);
          
          // Debug logging removed for production
          
        } catch (profileError) {
          console.error('❌ 사용자 프로필 생성 실패:', profileError);
          
          // Debug logging removed for production
          
          // 프로필 생성 실패해도 역할은 생성되었으므로 계속 진행
        }
      }
      
    } catch (error) {
      console.error('❌ 사용자 역할 설정 실패:', error);
      console.error('오류 상세:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // Debug logging removed for production
      
      // 실패해도 계속 진행 (기본값은 'customer')
    }
  }

  const endTime = Date.now();
  const processingTime = endTime - startTime;
  
  console.log('✅ Clerk 웹훅 처리 완료', { 
    processingTime: `${processingTime}ms`,
    timestamp: new Date().toISOString()
  });
  
  return NextResponse.json({ success: true });
}
