'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Message {
  id: string;
  userKey: string;
  message: string;
  messageType: string | null;
  receivedAt: Date;
  isRead: boolean | null;
  createdAt: Date;
}

interface MessageCardProps {
  message: Message;
  onMarkAsRead?: (messageId: string) => void;
  isLoading?: boolean;
}

export function MessageCard({ message, onMarkAsRead, isLoading = false }: MessageCardProps) {
  const handleMarkAsRead = () => {
    if (onMarkAsRead && !message.isRead) {
      onMarkAsRead(message.id);
    }
  };

  const isUnread = !message.isRead;

  return (
    <Card className={`transition-all duration-200 ${
      message.isRead 
        ? 'bg-gray-50 border-gray-200' 
        : 'bg-white border-blue-200 shadow-md'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span className="font-mono">
                {message.userKey.slice(0, 8)}...
              </span>
            </div>
            {isUnread && (
              <Badge variant="destructive" className="text-xs">
                읽지 않음
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>
                {formatDistanceToNow(new Date(message.receivedAt), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
            </div>
            {isUnread && onMarkAsRead && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAsRead}
                disabled={isLoading}
                className="h-7 px-2 text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                읽음
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="bg-gray-50 rounded-lg p-3 border">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.message}
          </p>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          수신시간: {new Date(message.receivedAt).toLocaleString('ko-KR')}
        </div>
      </CardContent>
    </Card>
  );
}
