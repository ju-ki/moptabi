'use client';

import { AlertTriangle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { useState } from 'react';

import { useStoreForPlanning } from '@/lib/plan';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

type ArrivalTimeWarningProps = {
  date: string;
};

/**
 * 到着時間超過警告コンポーネント
 */
function ArrivalTimeWarning({ date }: ArrivalTimeWarningProps) {
  const fields = useStoreForPlanning();
  const warning = fields.getPlanningResult(date)?.arrivalWarning;
  const [isOpen, setIsOpen] = useState<boolean>(true);

  if (!warning) {
    return null;
  }

  return (
    <Card className="relative border-red-500 bg-red-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          到着時間を超過しています
          <Badge variant="destructive" className="font-normal">
            {warning.exceededMinutes}分超過
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">予想到着が目標時刻を超えています。調整案を確認してください。</p>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 p-0 h-auto mb-2">
              <Lightbulb className="h-4 w-4" />
              改善の提案
              {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2">
            <div className="rounded-lg bg-white/60 p-3">
              <p className="text-sm font-medium">推奨出発時刻</p>
              <p className="text-sm text-muted-foreground">
                <span data-testid="suggested-departure-time">{warning.suggestedDepartureTime || '---'}</span>
              </p>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
              <span className="text-lg">⏰</span>
              <div>
                <p className="text-sm font-medium">出発時間を早める</p>
                <p className="text-sm text-muted-foreground">出発時間を {warning.exceededMinutes}分 早めてください</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
              <span className="text-lg">⏱️</span>
              <div>
                <p className="text-sm font-medium">滞在時間を短縮する</p>
                <p className="text-sm text-muted-foreground">
                  各スポットの滞在時間を合計 {warning.suggestedStayReductionMinutes}分 短縮してください
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
              <span className="text-lg">📍</span>
              <div>
                <p className="text-sm font-medium">訪問スポットを減らす</p>
                <p className="text-sm text-muted-foreground">一部のスポットを別の日に移動することを検討してください</p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default ArrivalTimeWarning;
