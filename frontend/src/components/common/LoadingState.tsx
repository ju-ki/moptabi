import { Loader2 } from 'lucide-react';
import React from 'react';

import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

const LoadingState = ({ isLoading, error }: { isLoading: boolean; error: boolean }) => {
  // ローディング状態
  if (isLoading) {
    return (
      <div
        className="container mx-auto px-4 py-8 max-w-2xl flex flex-col items-center justify-center min-h-[50vh]"
        data-testid="mypage-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl" data-testid="error-state">
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">データの取得に失敗しました</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              再読み込み
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return <div></div>;
};

export default LoadingState;
