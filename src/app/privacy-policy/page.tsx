import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Towny - 개인정보처리방침',
  description: 'Towny 서비스의 개인정보처리방침입니다.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">개인정보처리방침</h1>
        <p className="text-gray-400">
          Towny 서비스 이용 시 개인정보 처리에 관한 사항을 안내드립니다.
        </p>
      </div>

      <Card className="bg-[#1E1E1E] border-[#2D2D2D]">
        <CardContent className="p-8">
          <ScrollArea className="h-[80vh]">
            <div className="space-y-8">
              
              {/* 제1조 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4">제1조 (본 방침의 공개)</h2>
                <div className="text-gray-300 space-y-3">
                  <p>
                    1. 회사는 이용자가 언제든지 쉽게 본 방침을 확인할 수 있도록 회사 홈페이지 첫 화면 또는 첫 화면과의 연결화면을 통해 본 방침을 공개하고 있습니다.
                  </p>
                  <p>
                    2. 회사는 제1항에 따라 본 방침을 공개하는 경우 글자 크기, 색상 등을 활용하여 이용자가 본 방침을 쉽게 확인할 수 있도록 합니다.
                  </p>
                </div>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 제2조 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4">제2조 (본 방침의 변경)</h2>
                <div className="text-gray-300 space-y-3">
                  <p>
                    1. 본 방침은 개인정보 관련 법령, 지침, 고시 또는 정부나 회사 서비스의 정책이나 내용의 변경에 따라 개정될 수 있습니다.
                  </p>
                  <p>
                    2. 회사는 제1항에 따라 본 방침을 개정하는 경우 다음 각 호 하나 이상의 방법으로 공지합니다.
                  </p>
                  <div className="ml-4">
                    <p>가. 회사가 운영하는 인터넷 홈페이지의 첫 화면의 공지사항란 또는 별도의 창을 통하여 공지하는 방법</p>
                    <p>나. 서면·모사전송·전자우편 또는 이와 비슷한 방법으로 이용자에게 공지하는 방법</p>
                  </div>
                  <p>
                    3. 회사는 제2항의 공지는 본 방침 개정의 시행일로부터 최소 7일 이전에 공지합니다. 다만, 이용자 권리의 중요한 변경이 있을 경우에는 최소 30일 전에 공지합니다.
                  </p>
                </div>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 제3조 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4">제3조 (회원 가입을 위한 정보)</h2>
                <div className="text-gray-300 space-y-3">
                  <p>
                    회사는 이용자의 회사 서비스에 대한 회원가입을 위하여 다음과 같은 정보를 수집합니다.
                  </p>
                  <p>
                    1. 필수 수집 정보: 이메일 주소, 이름 및 휴대폰 번호
                  </p>
                </div>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 제4조 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4">제4조 (본인 인증을 위한 정보)</h2>
                <div className="text-gray-300 space-y-3">
                  <p>
                    회사는 이용자의 본인인증을 위하여 다음과 같은 정보를 수집합니다.
                  </p>
                  <p>
                    1. 필수 수집 정보: 휴대폰 번호, 이메일 주소 및 이름
                  </p>
                </div>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 제5조 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4">제5조 (결제 서비스를 위한 정보)</h2>
                <div className="text-gray-300 space-y-3">
                  <p>
                    회사는 이용자에게 회사의 결제 서비스 제공을 위하여 다음과 같은 정보를 수집합니다.
                  </p>
                  <p>
                    1. 필수 수집 정보: 카드번호, 카드비밀번호, 유효기간, 생년월일 6자리(yy/mm/dd), 은행명 및 계좌번호
                  </p>
                </div>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 제6조 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4">제6조 (개인정보 수집 방법)</h2>
                <div className="text-gray-300 space-y-3">
                  <p>
                    회사는 다음과 같은 방법으로 이용자의 개인정보를 수집합니다.
                  </p>
                  <p>
                    1. 이용자가 회사의 홈페이지에 자신의 개인정보를 입력하는 방식
                  </p>
                  <p>
                    2. 어플리케이션 등 회사가 제공하는 홈페이지 외의 서비스를 통해 이용자가 자신의 개인정보를 입력하는 방식
                  </p>
                  <p>
                    3. 이용자가 회사가 발송한 이메일을 수신받아 개인정보를 입력하는 방식
                  </p>
                  <p>
                    4. 이용자가 고객센터의 상담, 게시판에서의 활동 등 회사의 서비스를 이용하는 과정에서 이용자가 입력하는 방식
                  </p>
                </div>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 제7조 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4">제7조 (개인정보의 이용)</h2>
                <div className="text-gray-300 space-y-3">
                  <p>
                    회사는 개인정보를 다음 각 호의 경우에 이용합니다.
                  </p>
                  <p>
                    1. 공지사항의 전달 등 회사운영에 필요한 경우
                  </p>
                  <p>
                    2. 이용문의에 대한 회신, 불만의 처리 등 이용자에 대한 서비스 개선을 위한 경우
                  </p>
                  <p>
                    3. 회사의 서비스를 제공하기 위한 경우
                  </p>
                  <p>
                    4. 법령 및 회사 약관을 위반하는 회원에 대한 이용 제한 조치, 부정 이용 행위를 포함하여 서비스의 원활한 운영에 지장을 주는 행위에 대한 방지 및 제재를 위한 경우
                  </p>
                  <p>
                    5. 신규 서비스 개발을 위한 경우
                  </p>
                </div>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 제8조 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4">제8조 (개인정보의 보유 및 이용기간)</h2>
                <div className="text-gray-300 space-y-3">
                  <p>
                    1. 회사는 이용자의 개인정보에 대해 개인정보의 수집·이용 목적 달성을 위한 기간 동안 개인정보를 보유 및 이용합니다.
                  </p>
                  <p>
                    2. 전항에도 불구하고 회사는 내부 방침에 의해 서비스 부정이용기록은 부정 가입 및 이용 방지를 위하여 회원 탈퇴 시점으로부터 최대 1년간 보관합니다.
                  </p>
                </div>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 제9조 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4">제9조 (법령에 따른 개인정보의 보유 및 이용기간)</h2>
                <div className="text-gray-300 space-y-3">
                  <p>
                    회사는 관계법령에 따라 다음과 같이 개인정보를 보유 및 이용합니다.
                  </p>
                  <div className="ml-4 space-y-2">
                    <p>1. 전자상거래 등에서의 소비자보호에 관한 법령에 따른 보유정보 및 보유기간</p>
                    <div className="ml-4">
                      <p>가. 계약또는철회등에관한기록: 5년</p>
                      <p>나. 대금결제및재화등의공급에관한기록: 5년</p>
                      <p>다. 소비자의불만또는분쟁처리에관한기록: 3년</p>
                      <p>라. 표시·광고에관한기록: 6개월</p>
                    </div>
                    <p>2. 통신비밀보호법에따른보유정보및보유기간</p>
                    <div className="ml-4">
                      <p>가. 웹사이트로그기록자료: 3개월</p>
                    </div>
                    <p>3. 전자금융거래법에따른보유정보및보유기간</p>
                    <div className="ml-4">
                      <p>가. 전자금융거래에관한기록: 5년</p>
                    </div>
                    <p>4. 위치정보의보호및이용등에관한법률</p>
                    <div className="ml-4">
                      <p>가. 개인위치정보에관한기록: 6개월</p>
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 제10조 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4">제10조 (개인정보의 파기원칙)</h2>
                <div className="text-gray-300 space-y-3">
                  <p>
                    회사는 원칙적으로 이용자의 개인정보 처리 목적 달성, 보유·이용기간의 경과 등 개인정보가 필요하지 않을 경우에는 지체없이 해당정보를 파기합니다.
                  </p>
                </div>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 제11조 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4">제11조 (개인정보 파기절차)</h2>
                <div className="text-gray-300 space-y-3">
                  <p>
                    1. 이용자가 회원가입등을 위해 입력한 정보는 개인정보 처리 목적이 달성된 후 별도의 DB로 옮겨져(종이의 경우 별도의 서류함) 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라(보유 및 이용기간 참조) 일정기간 저장된 후 파기됩니다.
                  </p>
                  <p>
                    2. 회사는 파기사유가 발생한 개인정보를 개인정보보호책임자의 승인절차를 거쳐 파기합니다.
                  </p>
                </div>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 제12조 */}
              <section>
                <h2 className="text-xl font-bold text-white mb-4">제12조 (개인정보 파기방법)</h2>
                <div className="text-gray-300 space-y-3">
                  <p>
                    회사는 전자적파일형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제하며, 종이로 출력된 개인정보는 분쇄기로 분쇄하거나 소각등을 통하여 파기합니다.
                  </p>
                </div>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 개인정보보호책임자 */}
              <section className="bg-[#2A2A2A] p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">개인정보보호 책임자</h2>
                <div className="text-gray-300 space-y-2">
                  <p><strong className="text-yellow-400">성명:</strong> 박지수</p>
                  <p><strong className="text-yellow-400">직책:</strong> 관리자</p>
                  <p><strong className="text-yellow-400">전화번호:</strong> 010-6779-4728</p>
                  <p><strong className="text-yellow-400">이메일:</strong> ppirong@gmail.com</p>
                </div>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 시행일 */}
              <section className="text-center">
                <p className="text-gray-400">
                  본 방침은 <strong className="text-white">2025년 11월 30일</strong>부터 시행됩니다.
                </p>
              </section>

              <Separator className="bg-[#2D2D2D]" />

              {/* 홈으로 버튼 */}
              <div className="flex justify-center mt-8">
                <Link 
                  href="/"
                  className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-6 py-3 rounded-lg transition-colors duration-200"
                >
                  홈으로 돌아가기
                </Link>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
