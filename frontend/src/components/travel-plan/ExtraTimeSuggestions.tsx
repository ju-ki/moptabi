'use client';

import React from 'react';
import { Lightbulb } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStoreForPlanning } from '@/lib/plan';

interface ExtraTimeSuggestionsProps {
  date: string;
}

/**
 * 余裕時間に応じた提案メッセージを表示するコンポーネント
 * 設計書: ExtraTimeSuggestions
 *
 * 注: メッセージ生成は planning.ts で行い、
 * このコンポーネントは受け取ったメッセージの表示のみを行う
 */
export default function ExtraTimeSuggestions({ date }: ExtraTimeSuggestionsProps) {
  const fields = useStoreForPlanning();
  const result = fields.getPlanningResult(date);
  const extraTimeMinutes = result?.extraTimeMinutes ?? 0;
  const message = result?.extraTimeMessage;

  if (!extraTimeMinutes || !message) {
    return null;
  }

  return (
    <Card className="bg-blue-50 border-blue-200" data-testid="extra-time-suggestions">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          提案
          <Badge variant="outline" className="ml-auto">
            +{extraTimeMinutes}分
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
