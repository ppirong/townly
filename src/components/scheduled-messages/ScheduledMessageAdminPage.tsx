'use client';

import { useState, useRef } from 'react';
import { ScheduledMessageDashboard } from './ScheduledMessageDashboard';
import { CreateScheduledMessageForm } from './CreateScheduledMessageForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ScheduledMessageAdminPage() {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateMessage = () => {
    setIsCreateFormOpen(true);
  };

  const handleFormClose = () => {
    setIsCreateFormOpen(false);
  };

  const handleFormSuccess = () => {
    setIsCreateFormOpen(false);
    // 대시보드를 새로고침하기 위해 트리거 변경
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <ScheduledMessageDashboard 
        onCreateMessage={handleCreateMessage} 
        refreshTrigger={refreshTrigger}
      />
      
      {/* 새 스케줄 생성 다이얼로그 */}
      <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 예약 메시지 만들기</DialogTitle>
          </DialogHeader>
          <CreateScheduledMessageForm 
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
