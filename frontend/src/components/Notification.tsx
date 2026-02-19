'use client';
import { BellIcon } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

import { useNotification } from '@/hooks/use-notification';

import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';

const Notification = () => {
  const [isOpen, setIsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, hasMoreUnread, isLoading, markAsRead, markAllAsRead } = useNotification();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * お知らせをクリックした時の処理
   */
  const handleNotificationClick = async (id: number, isRead: boolean) => {
    if (!isRead) {
      try {
        await markAsRead(id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  /**
   * すべて既読にするボタンをクリックした時の処理
   */
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  return (
    <div className="relative" ref={notificationRef}>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="relative rounded-full">
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <div
            data-testid="unread-badge"
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-lg min-w-[20px] h-5 flex items-center justify-center px-1"
          >
            {hasMoreUnread ? '99+' : unreadCount}
          </div>
        )}
      </Button>

      {isOpen && (
        <Card className="fixed right-4 top-16 w-80 shadow-lg z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>通知</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  すべて既読にする
                </Button>
              )}
            </div>
          </CardHeader>
          <ScrollArea className="h-[400px]">
            <CardContent>
              {isLoading ? (
                <div data-testid="notification-loading" className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      data-testid={`notification-item-${notification.id}`}
                      onClick={() => handleNotificationClick(notification.id, notification.isRead)}
                      className={`space-y-2 p-3 rounded-lg cursor-pointer ${
                        notification.isRead ? 'bg-background' : 'bg-blue-50'
                      } hover:bg-accent transition-colors`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-sm flex-1 text-foreground">{notification.title}</h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(notification.publishedAt), 'M月d日 HH:mm', { locale: ja })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notification.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">通知はありません</p>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};

export default Notification;
