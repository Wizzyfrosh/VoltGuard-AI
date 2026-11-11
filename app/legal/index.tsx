import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, FileText, ShieldCheck, Info, Scale } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';

const pages = [
  { slug: 'privacy', title: 'Privacy Policy', subtitle: 'How VoltGuard handles device and app data', icon: ShieldCheck },
  { slug: 'permissions', title: 'Permissions & Data Use', subtitle: 'Why app permissions are requested', icon: FileText },
  { slug: 'terms', title: 'Terms of Use', subtitle: 'Terms for using VoltGuard', icon: Scale },
  { slug: 'about', title: 'About VoltGuard AI', subtitle: 'App version and product information', icon: Info },
];

export default function LegalIndexScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: 30 }]}>
      <Text style={[styles.title, { color: colors.text }]}>Privacy & Legal</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Policies and information about VoltGuard AI.</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {pages.map(({ slug, title, subtitle, icon: Icon }) => (
          <Pressable key={slug} accessibilityRole="button" onPress={() => router.push(('/legal/' + slug) as never)}
            style={[styles.row, { borderBottomColor: colors.border }]}>
            <Icon size={21} color={colors.primary} />
            <View style={styles.copy}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 12 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 19 },
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, marginTop: 8 },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  copy: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSubtitle: { fontSize: 12 },
});
