import { useAuth } from '@clerk/nextjs';

export const useFetcher = () => {
  const { getToken } = useAuth();

  const getFetcher = async (url: string) => {
    const token = await getToken();

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: 'GET',
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
    const token = await getToken();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        // 'Content-Type': 'application/json',
      },
      method: 'POST',
      body: arg.isMulti ? arg.data : JSON.stringify(arg.data),
    });

    if (!response.ok) {
      // APIからのエラーメッセージを取得
      const errorMessage = await response.text();
      throw new Error(errorMessage || 'エラーが発生しました');
    }

    return response.json();
  };

  const deleteFetcher = async (url: string, { arg }: { arg: { id: number } }) => {
    const token = await getToken();
    const response = await fetch(`${url}/${arg.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'DELETE',
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
