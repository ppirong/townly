"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { type AdminMart } from "@/lib/dto/mart-dto-mappers";

interface MartCardProps {
  mart: AdminMart;
}

export default function MartCard({ mart }: MartCardProps) {
  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-[#18212e] flex items-center justify-center text-white shadow-sm">
              {mart.logoUrl ? (
                <img
                  src={mart.logoUrl}
                  alt={mart.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold">{mart.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{mart.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{mart.region}</p>
            </div>
          </div>
          <div className="flex space-x-1">
            {mart.isVerified && (
              <Badge className="bg-[#00a141]/20 text-[#31fa96] border border-[#00c34e]/30 hover:bg-[#00a141]/30">인증</Badge>
            )}
            {mart.isFastResponse && (
              <Badge className="bg-[#0047b2]/20 text-[#52afff] border border-[#0042a6]/30 hover:bg-[#0047b2]/30">로켓응답</Badge>
            )}
            {mart.isBusinessRegistered && (
              <Badge className="bg-[#c08e00]/20 text-[#ffce1b] border border-[#b78700]/30 hover:bg-[#c08e00]/30">사업자</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 bg-white dark:bg-slate-900">
        <p className="text-sm mb-4 text-slate-600 dark:text-slate-300">{mart.description || "설명이 없습니다."}</p>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-slate-700 dark:text-slate-300">{mart.address || mart.region}</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-slate-700 dark:text-slate-300">{mart.phone || "연락처 없음"}</span>
          </div>
        </div>
        
        <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
          <div className="flex flex-col items-center p-2 bg-[#18212e]/5 dark:bg-[#18212e]/50 rounded-lg">
            <span className="font-medium text-slate-900 dark:text-slate-100">{mart.hireCount}회</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">고용 횟수</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-[#18212e]/5 dark:bg-[#18212e]/50 rounded-lg">
            <span className="font-medium text-slate-900 dark:text-slate-100">{mart.responseTime}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">평균 응답</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-[#18212e]/5 dark:bg-[#18212e]/50 rounded-lg">
            <span className="font-medium text-slate-900 dark:text-slate-100">{mart.portfolioCount}개</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">포트폴리오</span>
          </div>
        </div>
        
        {(mart.photoCount > 0) && (
          <div className="mt-4 p-3 bg-[#18212e]/5 dark:bg-[#18212e]/50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#fb61b4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-[#fb61b4]">최근 작업 사진</span>
            </div>
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {[...Array(Math.min(mart.photoCount, 3))].map((_, i) => (
                <div key={i} className="w-16 h-16 flex-shrink-0 bg-[#18212e] rounded-md"></div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between gap-2">
        <Link href={`/admin/mart/${mart.id}/discount-flyers`}>
          <Button 
            variant="outline" 
            size="sm"
            className="text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            할인 전단지 관리
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/admin/mart/edit/${mart.id}`}>
            <Button 
              variant="outline"
              size="sm"
              className="bg-[#0047b2]/10 text-[#52afff] border-[#0042a6]/30 hover:bg-[#0047b2]/20"
            >
              정보 수정
            </Button>
          </Link>
          <Link href={`/admin/mart/register?mode=edit&id=${mart.id}`}>
            <Button 
              size="sm"
              className="bg-[#181a1b] hover:bg-[#181a1b]/90 text-white"
            >
              프로필 보기
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
