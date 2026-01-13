'use client';

import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

import { useUserList } from '@/hooks/use-user-list';
import { useNotificationList } from '@/hooks/use-notification-list';
import { useAdminData } from '@/hooks/use-admin';
import { Card, CardContent } from '@/components/ui/card';

import AdminSidebar, { AdminNavItem } from './components/AdminSidebar';
import Dashboard from './components/Dashboard';
import UserListContainer from './components/UserListContainer';
import NotificationManagementContainer from './components/NotificationManagementContainer';

/**
 * 管理画面
 * 左側にナビゲーション、右側に各種管理コンポーネントを表示
 * 各リストコンポーネントは独自のデータフェッチとローディング状態を持つ
 */
const AdminPage = () => {
  const [activeNav, setActiveNav] = useState<AdminNavItem>('dashboard');

  // ユーザーリスト専用のフック（リスト部分のみのローディング）
  const {
    users,
    pagination: userPagination,
    query: userQuery,
    isLoading: userLoading,
    error: userError,
    handlePageChange: handleUserPageChange,
    executeSearch: executeUserSearch,
    handleSortChange: handleUserSortChange,
  } = useUserList();

  // お知らせリスト専用のフック（リスト部分のみのローディング）
  const {
    notifications,
    pagination: notificationPagination,
    query: notificationQuery,
    isLoading: notificationLoading,
    error: notificationError,
    handlePageChange: handleNotificationPageChange,
    executeSingleFilter,
    handleSortChange: handleNotificationSortChange,
    mutate: mutateNotifications,
  } = useNotificationList();

  // CRUD操作とダッシュボード用
  const {
    postNotification,
    updateNotification,
    deleteNotification,
    dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useAdminData();

  /**
   * ローディング表示（ダッシュボード用）
   */
  const LoadingState = () => (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-2 text-muted-foreground">データを読み込み中...</span>
    </div>
  );

  /**
   * エラー表示
   */
  const ErrorState = ({ message }: { message: string }) => (
    <Card className="border-destructive bg-destructive/10">
      <CardContent className="flex items-center gap-2 p-4">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">エラー</p>
          <p className="text-sm text-destructive/80">{message}</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    switch (activeNav) {
      case 'dashboard':
        if (dashboardLoading) {
          return <LoadingState />;
        }
        if (dashboardError) {
          return <ErrorState message="ダッシュボードデータの取得に失敗しました。" />;
        }
        return dashboardData ? <Dashboard stats={dashboardData} /> : <LoadingState />;

      case 'users':
        if (userError) {
          return <ErrorState message="ユーザーリストの取得に失敗しました。" />;
        }
        return (
          <UserListContainer
            users={users}
            pagination={userPagination}
            sortBy={userQuery.sortBy}
            sortOrder={userQuery.sortOrder}
            isLoading={userLoading}
            currentSearch={userQuery.search}
            onPageChange={handleUserPageChange}
            onSearchExecute={executeUserSearch}
            onSortChange={handleUserSortChange}
          />
        );

      case 'notifications':
        if (notificationError) {
          return <ErrorState message="お知らせリストの取得に失敗しました。" />;
        }
        return (
          <NotificationManagementContainer
            notificationList={notifications}
            pagination={notificationPagination}
            sortBy={notificationQuery.sortBy}
            sortOrder={notificationQuery.sortOrder}
            isLoading={notificationLoading}
            currentFilter={{
              title: notificationQuery.title,
              type: notificationQuery.type,
              publishedFrom: notificationQuery.publishedFrom,
              publishedTo: notificationQuery.publishedTo,
            }}
            onPageChange={handleNotificationPageChange}
            onFilterExecute={executeSingleFilter}
            onSortChange={handleNotificationSortChange}
            onCreateNotification={async (data) => {
              await postNotification(data);
              mutateNotifications();
            }}
            onUpdateNotification={async (data) => {
              await updateNotification(data);
              mutateNotifications();
            }}
            onDeleteNotification={async (id) => {
              await deleteNotification(id);
              mutateNotifications();
            }}
          />
        );

      default:
        if (dashboardLoading) {
          return <LoadingState />;
        }
        return dashboardData ? <Dashboard stats={dashboardData} /> : <LoadingState />;
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* 左側: ナビゲーション */}
      <AdminSidebar activeNav={activeNav} onNavChange={setActiveNav} />

      {/* 右側: コンテンツエリア */}
      <main className="flex-1 p-8 bg-gray-50">{renderContent()}</main>
    </div>
  );
};

export default AdminPage;
