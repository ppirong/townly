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

export async function POST(req: NextRequest) {
  // Clerk 웹훅 시크릿 키 확인 (환경변수에서 직접 가져오기)
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET이 설정되지 않았습니다.');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

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
    console.error('웹훅 검증 실패:', err);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  // 이벤트 타입에 따른 처리
  const eventType = evt.type;
  
  if (eventType === 'user.created') {
    const { id, email_addresses, created_at, external_id } = evt.data;
    const userId = id;
    const email = email_addresses && email_addresses[0]?.email_address;
    
    console.log(`사용자 생성됨: ${userId}, 이메일: ${email}, 외부 ID: ${external_id || '없음'}`);
    
    // 기본 역할
    let role = 'customer';
    
    try {
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
      
      console.log(`최종 역할 결정: ${role}, 사용자 ID: ${userId}`);
      
      // 사용자 역할 설정 (타입 안전성 확보)
      const validRole: "customer" | "admin" = role === 'admin' ? 'admin' : 'customer';
      await setUserRole(userId, validRole);
      console.log(`사용자 ${userId}의 역할이 ${role}로 설정되었습니다.`);
    } catch (error) {
      console.error('사용자 역할 설정 실패:', error);
      // 실패해도 계속 진행 (기본값은 'customer')
    }
  }

  return NextResponse.json({ success: true });
}
