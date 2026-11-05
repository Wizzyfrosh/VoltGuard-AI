import { useCallback, useEffect, useRef, useState } from 'react';
import { getBatteryTrendReport } from './battery.history';
import type { BatteryTrendPeriod, BatteryTrendReport } from './battery.trends';

export function useBatteryTrends() {
  const [period, setPeriod] = useState<BatteryTrendPeriod>('week');
  const [report, setReport] = useState<BatteryTrendReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const next = await getBatteryTrendReport(period);
      if (currentRequest === requestId.current) setReport(next);
    } catch (reason) {
      if (currentRequest === requestId.current) {
        setReport(null);
        setError(reason instanceof Error ? reason.message : 'Battery trends could not be loaded.');
      }
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void refresh();
    return () => { requestId.current += 1; };
  }, [refresh]);

  return { period, setPeriod, report, isLoading, error, refresh };
}
