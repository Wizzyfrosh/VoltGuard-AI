import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput, View, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, ShieldAlert, ShieldCheck, LockKeyhole } from 'lucide-react-native';
import { useTheme } from '../src/context/ThemeContext';
import {
  armAntiTheft, disarmAntiTheft, getAntiTheftStatus, setAntiTheftPin,
  type AntiTheftMode, type AntiTheftStatus
} from '../modules/voltguard-battery';

type DialogMode = 'setup' | 'disarm' | null;

export default function AntiTheftScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [status, setStatus] = useState<AntiTheftStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [mode, setMode] = useState<AntiTheftMode>('one_time');

  const refresh = useCallback(() => {
    if (Platform.OS !== 'android') {
      setStatus(null);
      setLoading(false);
      return;
    }
    try {
      const next = getAntiTheftStatus();
      setStatus(next);
      if (next) setMode(next.mode);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    refresh();
    return undefined;
  }, [refresh]));

  const openDialog = (kind: DialogMode) => {
    setPin('');
    setConfirmPin('');
    setDialog(kind);
  };

  const submit = async () => {
    if (pin.length < 6 || pin.length > 12 || !/^\d+$/.test(pin)) {
      Alert.alert('Invalid PIN', 'Use 6 to 12 digits.');
      return;
    }
    if (dialog === 'setup' && pin !== confirmPin) {
      Alert.alert('PINs do not match', 'Enter the same PIN in both fields.');
      return;
    }
    setBusy(true);
    try {
      if (dialog === 'setup') {
        await setAntiTheftPin(pin);
        Alert.alert('PIN saved', 'Your Anti-Theft PIN is configured. You can now arm protection.');
      } else {
        await disarmAntiTheft(pin);
        Alert.alert('Protection disarmed', 'Anti-Theft monitoring and its alarm have been stopped.');
      }
      setDialog(null);
      refresh();
    } catch (error) {
      Alert.alert('Unable to continue', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const arm = (selectedMode: AntiTheftMode) => {
    try {
      armAntiTheft(selectedMode);
      setMode(selectedMode);
      refresh();
    } catch (error) {
      Alert.alert('Could not arm Anti-Theft', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 18 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Anti-Theft</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>Charger-disconnect protection is available in the Android app.</Text>
      </View>
    );
  }

  const armed = status?.armed === true;
  const alarmActive = status?.alarmActive === true;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <ArrowLeft size={21} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Settings</Text>
        </Pressable>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: alarmActive ? colors.warning + '20' : colors.primary + '15' }]}>
            {alarmActive ? <ShieldAlert size={30} color={colors.warning} /> : <ShieldCheck size={30} color={colors.primary} />}
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Anti-Theft Protection</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Detect unexpected charger disconnection and trigger your device alarm.
          </Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {loading ? <ActivityIndicator color={colors.primary} /> : (
            <>
              <View style={styles.statusRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Protection status</Text>
                <Text style={[styles.statusPill, { color: alarmActive ? colors.warning : armed ? colors.success : colors.textSecondary }]}>
                  {alarmActive ? 'ALARM ACTIVE' : armed ? 'ARMED' : 'DISARMED'}
                </Text>
              </View>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                {alarmActive ? 'The charger was disconnected. Enter your PIN to silence the alarm and disarm.' :
                  armed ? (status?.mode === 'always' ? 'Always mode is monitoring the charger connection.' : 'One-Time mode is waiting for a charging session.') :
                  'Protection is currently off.'}
              </Text>
            </>
          )}
        </View>

        {!status?.pinConfigured && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LockKeyhole size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Secure your protection</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>Create a 6–12 digit PIN. You will need it to disarm Anti-Theft.</Text>
            <Pressable onPress={() => openDialog('setup')} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryText}>Set Anti-Theft PIN</Text>
            </Pressable>
          </View>
        )}

        {status?.pinConfigured && !armed && !alarmActive && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose protection mode</Text>
            <Pressable onPress={() => setMode('one_time')} style={[styles.mode, { borderColor: mode === 'one_time' ? colors.primary : colors.border, backgroundColor: mode === 'one_time' ? colors.primary + '12' : 'transparent' }]}>
              <Text style={[styles.modeTitle, { color: colors.text }]}>One-Time</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Protect the next charging session. After an unplug event, the alarm triggers and protection disarms.</Text>
            </Pressable>
            <Pressable onPress={() => setMode('always')} style={[styles.mode, { borderColor: mode === 'always' ? colors.primary : colors.border, backgroundColor: mode === 'always' ? colors.primary + '12' : 'transparent' }]}>
              <Text style={[styles.modeTitle, { color: colors.text }]}>Always</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Remain armed across charging sessions until you disarm with your PIN.</Text>
            </Pressable>
            <Pressable onPress={() => arm(mode)} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryText}>Arm Protection</Text>
            </Pressable>
          </View>
        )}

        {(armed || alarmActive) && (
          <Pressable onPress={() => openDialog('disarm')} style={[styles.primaryButton, { backgroundColor: colors.warning }]}>
            <Text style={styles.primaryText}>{alarmActive ? 'Silence alarm & disarm' : 'Disarm with PIN'}</Text>
          </Pressable>
        )}

        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          Anti-Theft requires an active Android monitoring service and notification access. Android force-stop, power-off, device restrictions and manufacturer battery policies can interrupt monitoring. Alarm sound is subject to notification, volume and Do Not Disturb settings.
        </Text>
      </ScrollView>

      <Modal visible={dialog !== null} transparent animationType="fade" onRequestClose={() => setDialog(null)}>
        <View style={styles.scrim}>
          <View style={[styles.dialog, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{dialog === 'setup' ? 'Create Anti-Theft PIN' : 'Enter Anti-Theft PIN'}</Text>
            <TextInput
              value={pin}
              onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 12))}
              placeholder="6–12 digit PIN"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={12}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              accessibilityLabel="Anti-Theft PIN"
            />
            {dialog === 'setup' && (
              <TextInput
                value={confirmPin}
                onChangeText={value => setConfirmPin(value.replace(/\D/g, '').slice(0, 12))}
                placeholder="Confirm PIN"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={12}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                accessibilityLabel="Confirm Anti-Theft PIN"
              />
            )}
            <View style={styles.dialogActions}>
              <Pressable onPress={() => setDialog(null)} style={styles.cancelButton}><Text style={{ color: colors.text }}>Cancel</Text></Pressable>
              <Pressable onPress={() => { void submit(); }} disabled={busy} style={[styles.primaryButton, { backgroundColor: colors.primary, flex: 1 }]}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{dialog === 'setup' ? 'Save PIN' : 'Disarm'}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32, gap: 14 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  backText: { fontSize: 14, fontWeight: '600' },
  header: { alignItems: 'center', gap: 9, paddingVertical: 12 },
  iconWrap: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 23, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 19 },
  statusCard: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  statusPill: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  card: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  mode: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 5 },
  modeTitle: { fontSize: 14, fontWeight: '700' },
  primaryButton: { minHeight: 46, borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  caption: { fontSize: 11, lineHeight: 17 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 22 },
  dialog: { borderRadius: 18, padding: 18, gap: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontSize: 16 },
  dialogActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  cancelButton: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 10 },
});
