'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCard } from './MessageCard';
import { MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Message {
  id: string;
  userKey: string;
  message: string;
  messageType: string | null;
  receivedAt: Date;
  isRead: boolean | null;
  createdAt: Date;
}

interface ChatViewProps {
  messages: Message[];
  totalMessages: number;
  hasMore: boolean;
  isLoading?: boolean;
  onLoadMore: () => void;
  onMarkAsRead: (messageId: string) => void;
  onRefresh: () => void;
}

export function ChatView({ 
  messages, 
  totalMessages, 
  hasMore, 
  isLoading = false,
  onLoadMore,
  onMarkAsRead,
  onRefresh 
}: ChatViewProps) {
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  const handleMarkAsRead = async (messageId: string) => {
    setMarkingAsRead(messageId);
    try {
      await onMarkAsRead(messageId);
    } finally {
      setMarkingAsRead(null);
    }
  };

  // 자동 새로고침 제거 - 수동 새로고침 버튼만 사용
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (!isLoading) {
  //       onRefresh();
  //     }
  //   }, 30000);
  //   return () => clearInterval(interval);
  // }, [isLoading, onRefresh]);

  return (
    <Card className="h-[800px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            실시간 채팅창
            <Badge variant="secondary">
              {totalMessages}건
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            title="최신 메시지를 수동으로 불러옵니다 (자동 새로고침 안함)"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            수동 새로고침
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500">
                  아직 수신된 메시지가 없습니다.
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  카카오 채널로 메시지가 들어오면 여기에 표시됩니다.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onMarkAsRead={handleMarkAsRead}
                    isLoading={markingAsRead === message.id}
                  />
                ))}
                
                {/* 더 불러오기 버튼 */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={onLoadMore}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          불러오는 중...
                        </>
                      ) : (
                        '이전 메시지 더 보기'
                      )}
                    </Button>
                  </div>
                )}
                
                {/* 로딩 상태 */}
                {isLoading && messages.length === 0 && (
                  <div className="flex justify-center py-8">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      메시지를 불러오는 중...
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
        
        {/* 자동 새로고침 상태 표시 */}
        <div className="px-6 py-2 border-t bg-gray-50 text-xs text-gray-500 text-center">
          30초마다 자동으로 새로운 메시지를 확인합니다
        </div>
      </CardContent>
    </Card>
  );
}
