'use client';

import React from 'react';
import { ChevronDown, ChevronUp, Route, AlertTriangle, Info } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useStoreForPlanning } from '@/lib/plan';
import { TransportNodeType } from '@/types/plan';

interface PlanningWarningListProps {
  date: string;
}

export default function PlanningWarningList({ date }: PlanningWarningListProps) {
  const fields = useStoreForPlanning();
  const result = fields.getPlanningResult(date);
  const messages = result?.messages ?? [];
  const departureData = fields.getDepartureAndDestination(date, TransportNodeType.DEPARTURE);
  const destinationData = fields.getDepartureAndDestination(date, TransportNodeType.DESTINATION);
  const [isOpen, setIsOpen] = React.useState(true);

  if (messages.length === 0) {
    return null;
  }

  const routeSummary = [departureData?.name, destinationData?.name].filter(Boolean).join(' → ');

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} data-testid="planning-message-list">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-orange-500">⚠️</span>
              警告メッセージ一覧
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 px-2" aria-label="警告メッセージ一覧">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {isOpen ? '閉じる' : '開く'}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isOpen ? (
            messages.map((message, index) => (
              <Alert
                key={`${message.segmentKey}-${index}`}
                variant={message.level === 'WARNING' ? 'destructive' : 'default'}
                className={message.level === 'INFO' ? 'border-blue-200 bg-blue-50' : ''}
                data-testid={`planning-message-${message.level.toLowerCase()}`}
              >
                <div className="flex items-start gap-3">
                  {message.level === 'WARNING' ? (
                    <AlertTriangle className="h-5 w-5 shrink-0 text-orange-500 mt-0.5" />
                  ) : (
                    <Info className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertDescription className="text-sm">{message.message}</AlertDescription>
                  </div>
                </div>
              </Alert>
            ))
          ) : (
            <div
              className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3"
              data-testid="planning-route-summary"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Route className="h-4 w-4 text-muted-foreground" />
                ルート情報
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{routeSummary || 'ルート情報がありません'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </Collapsible>
  );
}
