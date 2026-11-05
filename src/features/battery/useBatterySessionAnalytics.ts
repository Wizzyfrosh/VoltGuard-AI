import { useCallback, useEffect, useState } from 'react';
import { getChargingSessions, isBatteryHistoryEnabled } from './battery.history';
import { compareChargingSessions, type ChargingSessionComparison } from './battery.session.analytics';

export function useBatterySessionAnalytics() {
  const [comparison, setComparison] = useState<ChargingSessionComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!(await isBatteryHistoryEnabled())) {
        setComparison(null);
        return;
      }
      const sessions = await getChargingSessions(200);
      setComparison(compareChargingSessions(sessions));
    } catch (reason) {
      setComparison(null);
      setError(reason instanceof Error ? reason.message : 'Charging session analytics are unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { comparison, isLoading, error, refresh };
}
