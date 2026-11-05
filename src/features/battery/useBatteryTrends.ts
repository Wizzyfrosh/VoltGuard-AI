import { useCallback, useEffect, useState } from 'react';
import { getBatteryTrendReport } from './battery.history';
import type { BatteryTrendPeriod, BatteryTrendReport } from './battery.trends';

export function useBatteryTrends() {
  const [period, setPeriod] = useState<BatteryTrendPeriod>('week');
  const [report, setReport] = useState<BatteryTrendReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await getBatteryTrendReport(period);
      setReport(next);
    } catch (reason) {
      setReport(null);
      setError(reason instanceof Error ? reason.message : 'Battery trends could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { period, setPeriod, report, isLoading, error, refresh };
}
