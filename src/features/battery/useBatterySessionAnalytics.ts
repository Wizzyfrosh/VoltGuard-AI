import { useCallback, useEffect, useRef, useState } from 'react';
import { getChargingSessions, isBatteryHistoryEnabled } from './battery.history';
import { compareChargingSessions, type ChargingSessionComparison } from './battery.session.analytics';

export function useBatterySessionAnalytics() {
  const [comparison, setComparison] = useState<ChargingSessionComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      if (!(await isBatteryHistoryEnabled())) {
        if (currentRequest === requestId.current) setComparison(null);
        return;
      }
      const sessions = await getChargingSessions(200);
      if (currentRequest === requestId.current) setComparison(compareChargingSessions(sessions));
    } catch (reason) {
      if (currentRequest === requestId.current) {
        setComparison(null);
        setError(reason instanceof Error ? reason.message : 'Charging session analytics are unavailable.');
      }
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => { requestId.current += 1; };
  }, [refresh]);
  return { comparison, isLoading, error, refresh };
}
