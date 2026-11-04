# VoltGuard Android battery module

This local Expo module reads Android's public `BatteryManager` properties and the sticky `ACTION_BATTERY_CHANGED` intent.

## Exposed readings

- Battery voltage (mV)
- Battery temperature (tenths of °C, normalized in TypeScript)
- Battery health and charging status
- Plugged power source
- Capacity percentage
- Instantaneous and average current (µA)
- Charge counter (µAh)
- Energy counter (nWh), when supported by the device

## Important limitations

Android OEMs vary in which values they expose. Unsupported or sentinel values are returned as null and must be displayed as unavailable. Current readings may be signed and fluctuate rapidly. These are OS-reported electrical measurements, not calibrated laboratory measurements.

Cycle count is deliberately not implemented because availability and API support vary by Android version and manufacturer. Per-app power consumption is not exposed by this module. The module cannot stop charging or control the charging circuit.

A custom development/production build is required. Expo Go does not contain this project-specific native module. Verify readings on physical Android devices from multiple manufacturers before advertising them as generally supported.
