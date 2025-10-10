"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MartCard from "./MartCard";
import { type Mart } from "@/db/schema";
import Link from "next/link";

interface MartManagementDashboardProps {
  marts: Mart[];
}

export default function MartManagementDashboard({ marts }: MartManagementDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [region, setRegion] = useState("all");
  
  // 검색 및 필터링 로직
  const filteredMarts = marts.filter(mart => {
    const matchesSearch = mart.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (mart.description && mart.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRegion = region === "all" || (mart.region && mart.region.includes(region));
    return matchesSearch && matchesRegion;
  });
  
  // 지역 목록 (중복 제거)
  const regions = ["all", ...Array.from(new Set(marts.map(mart => mart.region?.split(" ")[0] || "").filter(Boolean)))];
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg shadow-sm">
        <div className="flex-1">
          <Input
            placeholder="마트 이름 또는 설명으로 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-800"
          />
        </div>
        <div className="w-full md:w-48">
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="bg-white dark:bg-slate-800">
              <SelectValue placeholder="지역 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 지역</SelectItem>
              {regions.filter(r => r !== "all").map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Link href="/admin/mart/register">
          <Button className="bg-primary hover:bg-primary/90 text-white">
            마트 등록
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMarts.map(mart => (
          <MartCard key={mart.id} mart={mart} />
        ))}
      </div>
      
      {filteredMarts.length === 0 && (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium">검색 결과가 없습니다</h3>
          <p className="text-muted-foreground">다른 검색어나 필터를 시도해보세요</p>
        </div>
      )}
    </div>
  );
}
