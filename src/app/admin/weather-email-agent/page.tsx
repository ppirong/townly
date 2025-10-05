/**
 * 날씨 안내 이메일 작성 에이전트 관리 페이지
 */

import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import WeatherEmailAgentDemo from '@/components/admin/WeatherEmailAgentDemo';

export default async function WeatherEmailAgentPage() {
  // 인증 확인
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            날씨 안내 이메일 작성 에이전트
          </h1>
          <p className="text-gray-600">
            Claude Sonnet 3.5 (작성자)와 Claude Sonnet 4.5 (검토자)가 협업하여
            고품질의 날씨 안내 이메일을 생성합니다.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-3 text-blue-900">
            🤖 에이전트 작동 방식
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>
              <strong>Claude Sonnet 3.5</strong>가 날씨 데이터를 기반으로 이메일
              내용을 작성합니다.
            </li>
            <li>
              <strong>Claude Sonnet 4.5</strong>가 작성된 내용을 검토하고 개선
              방향을 제시합니다.
            </li>
            <li>
              검토 결과에 따라 Claude Sonnet 3.5가 내용을 수정합니다.
            </li>
            <li>
              이 과정을 <strong>최대 5회</strong> 반복하여 최종 이메일을
              확정합니다.
            </li>
          </ol>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-3 text-yellow-900">
            📋 평가 기준
          </h2>
          <ul className="list-disc list-inside space-y-2 text-yellow-800">
            <li>강우 확률 70% 이상인 시간을 모두 제공 (형식: 시간: 강우량, 강우확률)</li>
            <li>적설 확률 70% 이상인 시간을 모두 제공 (형식: 시간: 적설량, 적설확률)</li>
            <li>모든 시간 표시는 KST 기준</li>
            <li>발송 시간과 날씨에 따른 적절한 주의사항 제공</li>
            <li>항목 사이에 적절한 빈 라인으로 가독성 확보</li>
            <li>필수 항목 모두 포함 (제목, 위치, 기온, 날씨 정보 등)</li>
          </ul>
        </div>

        <Suspense
          fallback={
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-4 text-gray-600">로딩 중...</p>
            </div>
          }
        >
          <WeatherEmailAgentDemo />
        </Suspense>
      </div>
    </div>
  );
}
