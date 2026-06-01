import { RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

import { useStoreForPlanning } from '@/lib/plan';
import { Button } from '@/components/ui/button';

/**
 * 日付単位でプラン整合性状態を表示し、前回プランニング結果への復元操作を提供する。
 */
const PlanConsistencyAction = ({ date }: { date: string }) => {
  const fields = useStoreForPlanning();

  const planningResult = fields.getPlanningResult(date);
  if (!planningResult) {
    return null;
  }

  const isDirty = fields.isPlanningDirty(date);

  return (
    <div
      className={`rounded-lg border p-4 ${isDirty ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}
      data-testid={`plan-consistency-action-${date}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-semibold text-sm">整合性チェック</p>
          {isDirty ? (
            <p
              className="text-sm text-amber-800 flex items-center gap-2"
              data-testid={`plan-consistency-dirty-${date}`}
            >
              <AlertTriangle className="w-4 h-4" />
              スポット情報が変更されています。保存前に再プランニングまたは復元を実行してください。
            </p>
          ) : (
            <p
              className="text-sm text-emerald-800 flex items-center gap-2"
              data-testid={`plan-consistency-clean-${date}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              現在のプランニング結果は最新です。
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => fields.restorePlannedSpots(date)}
          data-testid={`plan-consistency-restore-${date}`}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          前回のプランニング結果に戻す
        </Button>
      </div>
    </div>
  );
};

export default PlanConsistencyAction;
