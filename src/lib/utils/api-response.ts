/**
 * API 응답 표준화 유틸리티
 * 마스터 규칙: API는 반드시 createSuccessResponse / createErrorResponse 사용
 */

import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T = any> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: any;
}

/**
 * 성공 응답 생성
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

/**
 * 에러 응답 생성
 */
export function createErrorResponse(
  error: string,
  status: number = 500,
  details?: any
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
    },
    { status }
  );
}
