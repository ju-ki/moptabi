import useSWR from 'swr';
import { DEFAULT_USER_LIMITS, UserLimitType } from '@shared/user/types';

import { useFetcher } from '@/hooks/use-fetcher';

export function useUserLimits(): {
  limits: UserLimitType;
  isLoading: boolean;
  error: Error | undefined;
  retry: () => void;
} {
  const { getFetcher, isAuthenticated, isSessionLoading } = useFetcher();

  const shouldFetch = isAuthenticated && !isSessionLoading;

  const { data, error, isLoading, mutate } = useSWR<UserLimitType>(
    shouldFetch ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/user/limits` : null,
    getFetcher,
  );

  return {
    limits: data ?? { ...DEFAULT_USER_LIMITS },
    isLoading: isLoading || isSessionLoading,
    error,
    retry: () => {
      void mutate();
    },
  };
}
