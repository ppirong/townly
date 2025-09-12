'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Filter, Search, CheckCheck, MessageSquare, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface MessageFiltersProps {
  totalMessages: number;
  unreadCount: number;
  onFilterChange: (filters: {
    isRead?: boolean;
    userKey?: string;
  }) => void;
  onRefresh: () => void;
  onMarkAllAsRead: () => void;
  isLoading?: boolean;
}

export function MessageFilters({ 
  totalMessages, 
  unreadCount, 
  onFilterChange, 
  onRefresh,
  onMarkAllAsRead,
  isLoading = false 
}: MessageFiltersProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchUserKey, setSearchUserKey] = useState('');

  const handleFilterChange = (filter: 'all' | 'unread' | 'read') => {
    setActiveFilter(filter);
    
    switch (filter) {
      case 'all':
        onFilterChange({});
        break;
      case 'unread':
        onFilterChange({ isRead: false });
        break;
      case 'read':
        onFilterChange({ isRead: true });
        break;
    }
  };

  const handleUserSearch = (userKey: string) => {
    setSearchUserKey(userKey);
    if (userKey.trim()) {
      onFilterChange({ userKey: userKey.trim() });
    } else {
      // 사용자 검색이 비어있으면 현재 읽음 상태 필터만 적용
      handleFilterChange(activeFilter);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            메시지 필터
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            title="수동으로 최신 메시지를 불러옵니다"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            수동 새로고침
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 통계 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
              <MessageSquare className="w-4 h-4" />
              <span>전체</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {totalMessages}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
              <Badge variant="destructive" className="w-3 h-3 rounded-full p-0" />
              <span>읽지 않음</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {unreadCount}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-1">
              <CheckCheck className="w-4 h-4" />
              <span>읽음</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {totalMessages - unreadCount}
            </div>
          </div>
        </div>

        <Separator />

        {/* 읽음 상태 필터 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">읽음 상태</label>
          <div className="flex gap-2">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('all')}
              disabled={isLoading}
            >
              전체
            </Button>
            <Button
              variant={activeFilter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('unread')}
              disabled={isLoading}
              className="relative"
            >
              읽지 않음
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeFilter === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('read')}
              disabled={isLoading}
            >
              읽음
            </Button>
          </div>
        </div>

        {/* 사용자 검색 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">사용자 검색</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="사용자 키로 검색..."
              value={searchUserKey}
              onChange={(e) => handleUserSearch(e.target.value)}
              className="pl-10"
              disabled={isLoading}
            />
          </div>
        </div>

        <Separator />

        {/* 일괄 작업 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">일괄 작업</label>
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAllAsRead}
            disabled={isLoading || unreadCount === 0}
            className="w-full"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            모든 메시지 읽음 처리
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
