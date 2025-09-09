import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';

export default async function ProfilePage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId) {
    redirect('/sign-in');
    return;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">프로필 관리</h1>
          <p className="text-gray-600">계정 정보와 설정을 관리하세요</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="text-center">
                <Image 
                  src={user?.imageUrl || '/default-avatar.png'} 
                  alt="프로필 이미지"
                  width={96}
                  height={96}
                  className="rounded-full mx-auto mb-4"
                />
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {user?.firstName || '사용자'}님
                </h2>
                <p className="text-gray-600 mb-4">
                  {user?.emailAddresses[0]?.emailAddress}
                </p>
                
                {/* Quick Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">가입일</span>
                    <span className="font-medium">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">마지막 로그인</span>
                    <span className="font-medium">
                      {user?.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString('ko-KR') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">알림 수신</span>
                    <span className="font-medium text-green-600">활성</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 mt-6">
              <h3 className="font-bold mb-4">빠른 작업</h3>
              <div className="space-y-3">
                <button className="w-full text-left p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <div className="flex items-center">
                    <span className="text-xl mr-3">🔔</span>
                    <span className="font-medium">알림 설정</span>
                  </div>
                </button>
                
                <button className="w-full text-left p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <div className="flex items-center">
                    <span className="text-xl mr-3">📍</span>
                    <span className="font-medium">위치 설정</span>
                  </div>
                </button>
                
                <button className="w-full text-left p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                  <div className="flex items-center">
                    <span className="text-xl mr-3">💬</span>
                    <span className="font-medium">카카오톡 연동</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* 프로필 관리 폼 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-bold mb-6">계정 정보</h3>
              
              <div className="space-y-6">
                {/* 기본 정보 섹션 */}
                <div>
                  <h4 className="font-semibold mb-4 text-gray-900">기본 정보</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        이름
                      </label>
                      <input
                        type="text"
                        value={user?.firstName || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        성
                      </label>
                      <input
                        type="text"
                        value={user?.lastName || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        이메일
                      </label>
                      <input
                        type="email"
                        value={user?.emailAddresses[0]?.emailAddress || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 서비스 설정 섹션 */}
                <div>
                  <h4 className="font-semibold mb-4 text-gray-900">서비스 설정</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h5 className="font-medium">날씨 알림</h5>
                        <p className="text-sm text-gray-600">비가 오기 전 알림을 받습니다</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h5 className="font-medium">미세먼지 알림</h5>
                        <p className="text-sm text-gray-600">미세먼지 농도가 높을 때 알림을 받습니다</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h5 className="font-medium">마트 할인 알림</h5>
                        <p className="text-sm text-gray-600">주변 마트 할인 정보를 받습니다</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 계정 관리 섹션 */}
                <div>
                  <h4 className="font-semibold mb-4 text-gray-900">계정 관리</h4>
                  <div className="space-y-3">
                    <button className="w-full text-left p-4 border border-yellow-200 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-yellow-800">비밀번호 변경</h5>
                          <p className="text-sm text-yellow-600">계정 보안을 위해 정기적으로 변경하세요</p>
                        </div>
                        <span className="text-yellow-600">→</span>
                      </div>
                    </button>
                    
                    <button className="w-full text-left p-4 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-red-800">계정 삭제</h5>
                          <p className="text-sm text-red-600">모든 데이터가 영구적으로 삭제됩니다</p>
                        </div>
                        <span className="text-red-600">→</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
