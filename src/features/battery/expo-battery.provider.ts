import * as ExpoBattery from 'expo-battery';
import {
  getBatteryPlatform,
  getInitialBatteryCapabilities,
} from './battery.capabilities';
import { normalizeBatteryLevel, isKnownBatteryState } from './battery.normalization';
import { getAndroidBatteryDiagnostics } from './android-battery.provider';
import type {
  BatterySnapshot,
  BatteryTelemetryProvider,
  BatterySnapshotListener,
} from './battery.types';

function batteryStateFromAndroidStatus(status: string | null): ExpoBattery.BatteryState {
  switch (status) {
    case 'charging': return ExpoBattery.BatteryState.CHARGING;
    case 'full': return ExpoBattery.BatteryState.FULL;
    case 'discharging':
    case 'not-charging': return ExpoBattery.BatteryState.UNPLUGGED;
    default: return ExpoBattery.BatteryState.UNKNOWN;
  }
}

export class ExpoBatteryTelemetryProvider implements BatteryTelemetryProvider {
  async getSnapshot(): Promise<BatterySnapshot> {
    const [levelResult, stateResult, lowPowerResult, androidDiagnostics] = await Promise.all([
      ExpoBattery.getBatteryLevelAsync().then(value => ({ status: 'fulfilled' as const, value })).catch(() => ({ status: 'rejected' as const })),
      ExpoBattery.getBatteryStateAsync().then(value => ({ status: 'fulfilled' as const, value })).catch(() => ({ status: 'rejected' as const })),
      ExpoBattery.isLowPowerModeEnabledAsync().then(value => ({ status: 'fulfilled' as const, value })).catch(() => ({ status: 'rejected' as const })),
      getAndroidBatteryDiagnostics(),
    ]);

    const expoLevel = levelResult.status === 'fulfilled'
      ? normalizeBatteryLevel(levelResult.value)
      : null;
    // Android BatteryManager is the fallback when Expo Battery cannot report a level.
    const level = expoLevel ?? (
      androidDiagnostics?.capacityPercent !== null && androidDiagnostics?.capacityPercent !== undefined
        ? androidDiagnostics.capacityPercent / 100
        : null
    );
    const expoState = stateResult.status === 'fulfilled'
      ? stateResult.value
      : ExpoBattery.BatteryState.UNKNOWN;
    const nativeState = batteryStateFromAndroidStatus(androidDiagnostics?.status ?? null);
    const state = isKnownBatteryState(expoState, ExpoBattery.BatteryState.UNKNOWN)
      ? expoState
      : nativeState;
    const lowPowerMode = lowPowerResult.status === 'fulfilled' ? lowPowerResult.value : null;

    const capabilities = getInitialBatteryCapabilities();
    capabilities.batteryLevel = level === null ? 'unavailable' : 'available';
    capabilities.chargingState = isKnownBatteryState(state, ExpoBattery.BatteryState.UNKNOWN) ? 'available' : 'unavailable';
    capabilities.lowPowerMode = lowPowerMode === null ? 'unavailable' : 'available';
    if (androidDiagnostics) {
      capabilities.temperature = androidDiagnostics.temperatureCelsius === null ? 'unavailable' : 'available';
      capabilities.voltage = androidDiagnostics.voltageMilliVolts === null ? 'unavailable' : 'available';
      capabilities.batteryHealth = androidDiagnostics.health === null ? 'unavailable' : 'available';
      capabilities.cycleCount = androidDiagnostics.cycleCount !== null
        ? 'available'
        : (androidDiagnostics.apiLevel !== null && androidDiagnostics.apiLevel >= 34 ? 'unavailable' : 'not-implemented');
    }

    return {
      platform: getBatteryPlatform(),
      level,
      state,
      lowPowerMode,
      observedAt: new Date().toISOString(),
      source: androidDiagnostics !== null
        ? 'native'
        : level !== null || isKnownBatteryState(state, ExpoBattery.BatteryState.UNKNOWN) || lowPowerMode !== null
          ? 'expo-battery'
          : 'unavailable',
      capabilities,
      androidDiagnostics,
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
      androidDiagnostics: null,
    };

    const publish = (patch: Partial<BatterySnapshot>) => {
      current = { ...current, ...patch, observedAt: new Date().toISOString() };
      listener(current);
    };

    const subscriptions: Array<{ remove: () => void }> = [];
    try {
      subscriptions.push(ExpoBattery.addBatteryLevelListener(({ batteryLevel }) => {
        const level = normalizeBatteryLevel(batteryLevel);
        publish({
          level,
          source: current.androidDiagnostics !== null ? 'native' : level === null && current.state === ExpoBattery.BatteryState.UNKNOWN ? 'unavailable' : 'expo-battery',
          capabilities: { ...current.capabilities, batteryLevel: level === null ? 'unavailable' : 'available' },
        });
      }));
    } catch {}
    try {
      subscriptions.push(ExpoBattery.addBatteryStateListener(({ batteryState }) => {
        publish({
          state: batteryState,
          source: current.androidDiagnostics !== null ? 'native' : isKnownBatteryState(batteryState, ExpoBattery.BatteryState.UNKNOWN) || current.level !== null ? 'expo-battery' : current.source,
          capabilities: { ...current.capabilities, chargingState: isKnownBatteryState(batteryState, ExpoBattery.BatteryState.UNKNOWN) ? 'available' : 'unavailable' },
        });
      }));
    } catch {}
    try {
      subscriptions.push(ExpoBattery.addLowPowerModeListener(({ lowPowerMode }) => {
        publish({
          lowPowerMode,
          source: current.androidDiagnostics !== null ? 'native' : 'expo-battery',
          capabilities: { ...current.capabilities, lowPowerMode: 'available' },
        });
      }));
    } catch {}

    return () => subscriptions.forEach(subscription => subscription.remove());
  }
}

export const batteryTelemetryProvider = new ExpoBatteryTelemetryProvider();
