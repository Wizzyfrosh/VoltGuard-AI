import * as ExpoBattery from 'expo-battery';
import {
  getBatteryPlatform,
  getInitialBatteryCapabilities,
} from './battery.capabilities';
import type {
  BatterySnapshot,
  BatteryTelemetryProvider,
  BatterySnapshotListener,
} from './battery.types';

function normalizeLevel(value: number): number | null {
  if (!Number.isFinite(value) || value < 0 || value > 1) return null;
  return value;
}

function isKnownState(state: ExpoBattery.BatteryState): boolean {
  return state !== ExpoBattery.BatteryState.UNKNOWN;
}

export class ExpoBatteryTelemetryProvider implements BatteryTelemetryProvider {
  async getSnapshot(): Promise<BatterySnapshot> {
    const [levelResult, stateResult, lowPowerResult] = await Promise.allSettled([
      ExpoBattery.getBatteryLevelAsync(),
      ExpoBattery.getBatteryStateAsync(),
      ExpoBattery.isLowPowerModeEnabledAsync(),
    ]);

    const level = levelResult.status === 'fulfilled'
      ? normalizeLevel(levelResult.value)
      : null;
    const state = stateResult.status === 'fulfilled'
      ? stateResult.value
      : ExpoBattery.BatteryState.UNKNOWN;
    const lowPowerMode = lowPowerResult.status === 'fulfilled'
      ? lowPowerResult.value
      : null;

    const capabilities = getInitialBatteryCapabilities();
    capabilities.batteryLevel = level === null ? 'unavailable' : 'available';
    capabilities.chargingState = isKnownState(state) ? 'available' : 'unavailable';
    capabilities.lowPowerMode = lowPowerMode === null ? 'unavailable' : 'available';

    return {
      platform: getBatteryPlatform(),
      level,
      state,
      lowPowerMode,
      observedAt: new Date().toISOString(),
      source: level !== null || isKnownState(state) || lowPowerMode !== null
        ? 'expo-battery'
        : 'unavailable',
      capabilities,
    };
  }

  subscribe(listener: BatterySnapshotListener): () => void {
    let current: BatterySnapshot = {
      platform: getBatteryPlatform(),
      level: null,
      state: ExpoBattery.BatteryState.UNKNOWN,
      lowPowerMode: null,
      observedAt: new Date().toISOString(),
      source: 'unavailable',
      capabilities: getInitialBatteryCapabilities(),
    };

    const publish = (patch: Partial<BatterySnapshot>) => {
      current = {
        ...current,
        ...patch,
        observedAt: new Date().toISOString(),
      };
      listener(current);
    };

    const subscriptions: Array<{ remove: () => void }> = [];

    try {
      subscriptions.push(ExpoBattery.addBatteryLevelListener(({ batteryLevel }) => {
        const level = normalizeLevel(batteryLevel);
        publish({
          level,
          source: level === null && current.state === ExpoBattery.BatteryState.UNKNOWN
            ? 'unavailable'
            : 'expo-battery',
          capabilities: { ...current.capabilities, batteryLevel: level === null ? 'unavailable' : 'available' },
        });
      }));
    } catch {
      // The runtime may not expose battery-level events.
    }

    try {
      subscriptions.push(ExpoBattery.addBatteryStateListener(({ batteryState }) => {
        publish({
          state: batteryState,
          source: isKnownState(batteryState) || current.level !== null ? 'expo-battery' : current.source,
          capabilities: { ...current.capabilities, chargingState: isKnownState(batteryState) ? 'available' : 'unavailable' },
        });
      }));
    } catch {
      // The runtime may not expose charging-state events.
    }

    try {
      subscriptions.push(ExpoBattery.addLowPowerModeListener(({ lowPowerMode }) => {
        publish({
          lowPowerMode,
          source: 'expo-battery',
          capabilities: { ...current.capabilities, lowPowerMode: 'available' },
        });
      }));
    } catch {
      // The runtime may not expose low-power-mode events.
    }

    return () => subscriptions.forEach((subscription) => subscription.remove());
  }
}

export const batteryTelemetryProvider = new ExpoBatteryTelemetryProvider();
