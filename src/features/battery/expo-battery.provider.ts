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

export class ExpoBatteryTelemetryProvider implements BatteryTelemetryProvider {
  async getSnapshot(): Promise<BatterySnapshot> {
    const [levelResult, stateResult, lowPowerResult] = await Promise.allSettled([
      ExpoBattery.getBatteryLevelAsync(),
      ExpoBattery.getBatteryStateAsync(),
      ExpoBattery.isLowPowerModeEnabledAsync(),
    ]);

    const level = levelResult.status === 'fulfilled'
      ? normalizeBatteryLevel(levelResult.value)
      : null;
    const state = stateResult.status === 'fulfilled'
      ? stateResult.value
      : ExpoBattery.BatteryState.UNKNOWN;
    const lowPowerMode = lowPowerResult.status === 'fulfilled'
      ? lowPowerResult.value
      : null;

    const androidDiagnostics = await getAndroidBatteryDiagnostics();
    const capabilities = getInitialBatteryCapabilities();
    capabilities.batteryLevel = level === null ? 'unavailable' : 'available';
    capabilities.chargingState = isKnownBatteryState(state, ExpoBattery.BatteryState.UNKNOWN) ? 'available' : 'unavailable';
    capabilities.lowPowerMode = lowPowerMode === null ? 'unavailable' : 'available';
    if (androidDiagnostics) {
      capabilities.temperature = androidDiagnostics.temperatureCelsius === null ? 'unavailable' : 'available';
      capabilities.voltage = androidDiagnostics.voltageMilliVolts === null ? 'unavailable' : 'available';
      capabilities.batteryHealth = androidDiagnostics.health === null ? 'unavailable' : 'available';
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
        const level = normalizeBatteryLevel(batteryLevel);
        publish({
          level,
          source: current.androidDiagnostics !== null
            ? 'native'
            : level === null && current.state === ExpoBattery.BatteryState.UNKNOWN
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
          source: current.androidDiagnostics !== null
            ? 'native'
            : isKnownBatteryState(batteryState, ExpoBattery.BatteryState.UNKNOWN) || current.level !== null
              ? 'expo-battery'
              : current.source,
          capabilities: { ...current.capabilities, chargingState: isKnownBatteryState(batteryState, ExpoBattery.BatteryState.UNKNOWN) ? 'available' : 'unavailable' },
        });
      }));
    } catch {
      // The runtime may not expose charging-state events.
    }

    try {
      subscriptions.push(ExpoBattery.addLowPowerModeListener(({ lowPowerMode }) => {
        publish({
          lowPowerMode,
          source: current.androidDiagnostics !== null ? 'native' : 'expo-battery',
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
