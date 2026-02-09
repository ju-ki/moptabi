import { useSession } from 'next-auth/react';

export const useFetcher = () => {
  const { data: session } = useSession();

  // ユーザーIDを取得してヘッダーに付与
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {};
    if (session?.user?.id) {
      headers['X-User-Id'] = session.user.id;
    }
    if (session?.user?.email) {
      headers['X-User-Email'] = session.user.email;
    }
    if (session?.user?.name) {
      // 日本語などの非ASCII文字をエンコード
      headers['X-User-Name'] = encodeURIComponent(session.user.name);
    }
    if (session?.user?.image) {
      headers['X-User-Image'] = session.user.image;
    }
    return headers;
  };

  const getFetcher = async (url: string) => {
    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
      },
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      // APIからのエラーメッセージを取得
      const errorMessage = await response.text();
      throw new Error(errorMessage || 'エラーが発生しました');
    }

    return response.json();
  };
  // あくまで共通化しているので型指定はしない
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postFetcher = async (url: string, { arg }: { arg: { data: any; isMulti: boolean } }) => {
    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
      },
      method: 'POST',
      body: arg.isMulti ? arg.data : JSON.stringify(arg.data),
      credentials: 'include',
    });

    if (!response.ok) {
      // APIからのエラーメッセージを取得
      const errorMessage = await response.text();
      throw new Error(errorMessage || 'エラーが発生しました');
    }

    return response.json();
  };

  const deleteFetcher = async (url: string, { arg }: { arg: { id: number } }) => {
    const response = await fetch(`${url}/${arg.id}`, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      // APIからのエラーメッセージを取得
      const errorMessage = await response.text();
      throw new Error(errorMessage || 'エラーが発生しました');
    }

    return response.json();
  };

  return { getFetcher, postFetcher, deleteFetcher };
};
