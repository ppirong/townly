'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageFilters } from './MessageFilters';
import { ChatView } from './ChatView';
import { WebhookDebugPanel } from './WebhookDebugPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, MessageSquare, Activity } from 'lucide-react';
import { 
  getKakaoMessages, 
  markMessageAsRead, 
  markAllMessagesAsRead,
  getUnreadMessageCount 
} from '@/actions/kakao';

interface Message {
  id: string;
  userKey: string;
  message: string;
  messageType: string | null;
  receivedAt: Date;
  isRead: boolean | null;
  createdAt: Date;
}

interface Filters {
  isRead?: boolean;
  userKey?: string;
}

export function KakaoAdminDashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Filters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'debug'>('messages');

  const LIMIT = 20;

  // 메시지 불러오기
  const loadMessages = useCallback(async (offset = 0, filters: Filters = {}, append = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getKakaoMessages({
        limit: LIMIT,
        offset,
        ...filters,
      });
      
      if (append) {
        setMessages(prev => [...prev, ...result.messages]);
      } else {
        setMessages(result.messages);
      }
      
      setTotalMessages(result.total);
      setHasMore(result.hasMore);
      setCurrentOffset(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : '메시지를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 읽지 않은 메시지 수 불러오기
  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadMessageCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('읽지 않은 메시지 수 조회 오류:', err);
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    loadMessages(0, currentFilters);
    loadUnreadCount();
  }, [loadMessages, loadUnreadCount, currentFilters]);

  // 필터 변경 핸들러
  const handleFilterChange = (filters: Filters) => {
    setCurrentFilters(filters);
    setCurrentOffset(0);
    loadMessages(0, filters, false);
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    loadMessages(0, currentFilters, false);
    loadUnreadCount();
  };

  // 더 불러오기 핸들러
  const handleLoadMore = () => {
    const newOffset = currentOffset + LIMIT;
    loadMessages(newOffset, currentFilters, true);
  };

  // 단일 메시지 읽음 처리
  const handleMarkAsRead = async (messageId: string) => {
    try {
      await markMessageAsRead({ messageId });
      
      // 로컬 상태 업데이트
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isRead: true }
            : msg
        )
      );
      
      // 읽지 않은 메시지 수 업데이트
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      setSuccessMessage('메시지를 읽음으로 처리했습니다.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '메시지 상태 업데이트 중 오류가 발생했습니다.');
    }
  };

  // 모든 메시지 읽음 처리
  const handleMarkAllAsRead = async () => {
    try {
      await markAllMessagesAsRead();
      
      // 로컬 상태 업데이트
      setMessages(prev => 
        prev.map(msg => ({ ...msg, isRead: true }))
      );
      
      setUnreadCount(0);
      
      setSuccessMessage('모든 메시지를 읽음으로 처리했습니다.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '메시지 상태 업데이트 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 성공/에러 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* 탭 네비게이션 */}
      <div className="border-b">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('messages')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'messages'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              메시지 관리
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {unreadCount}
                </span>
              )}
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('debug')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'debug'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              웹훅 디버깅
            </div>
          </button>
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'messages' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 왼쪽: 필터 */}
          <div className="lg:col-span-1">
            <MessageFilters
              totalMessages={totalMessages}
              unreadCount={unreadCount}
              onFilterChange={handleFilterChange}
              onRefresh={handleRefresh}
              onMarkAllAsRead={handleMarkAllAsRead}
              isLoading={isLoading}
            />
          </div>

          {/* 오른쪽: 채팅창 */}
          <div className="lg:col-span-3">
            <ChatView
              messages={messages}
              totalMessages={totalMessages}
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={handleLoadMore}
              onMarkAsRead={handleMarkAsRead}
              onRefresh={handleRefresh}
            />
          </div>
        </div>
      ) : (
        <WebhookDebugPanel />
      )}
    </div>
  );
}
