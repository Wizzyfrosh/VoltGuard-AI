import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';

type Section = { heading: string; paragraphs: string[] };
const documents: Record<string, { title: string; sections: Section[] }> = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      { heading: 'Information handled by VoltGuard', paragraphs: [
        'VoltGuard reads battery and device information exposed by your operating system so it can display battery status, charging state and supported diagnostics.',
        'If you enable battery history on Android or iOS, supported readings and charging-session records are stored in the app’s local database on your device. Battery history is not available in the web build. You can turn history off or clear saved records in Settings.',
        'If you enable Android app-usage insights, Android Usage Access is used to read app foreground-time information. This is not a measurement of an app’s battery energy use.',
        'Notification preferences and scheduled reminder identifiers are stored locally so your selected alerts can work.'
      ]},
      { heading: 'Permissions and choices', paragraphs: [
        'You control optional battery history, app-usage access and notifications through the app and your device settings. Revoking a permission can disable the related feature.',
        'VoltGuard does not need an account to provide its local battery-monitoring features.'
      ]},
      { heading: 'Storage and retention', paragraphs: [
        'On Android and iOS, battery history is retained for up to 30 days. Turning history off deletes saved battery samples and charging-session records. Clearing history deletes those records but does not necessarily reset other app preferences. On web, battery history is unavailable; supported preferences are stored separately in browser storage.',
        'Device and Android versions may expose different diagnostic fields. Unsupported readings are not replaced with invented values.'
      ]},
      { heading: 'Policy updates', paragraphs: [
        'This policy must be reviewed whenever data collection, analytics, network services or third-party SDKs change. The effective date should be published with the production release.'
      ]}
    ]
  },
  permissions: {
    title: 'Permissions & Data Use',
    sections: [
      { heading: 'Notifications', paragraphs: ['Used for charging-target alerts and battery-care reminders that you enable. You can manage notification permission and channel settings in your device settings.'] },
      { heading: 'Background operation', paragraphs: ['Android foreground-service access is used only while the charging-target monitor is enabled. Android displays an ongoing notification while that service runs.'] },
      { heading: 'Usage Access (Android)', paragraphs: ['Optional access provides app foreground-time information for the usage insights screen. It does not provide reliable per-app battery energy measurements. You can revoke this access at any time in Android Settings.'] },
      { heading: 'Battery and device readings', paragraphs: ['The app reads battery status and supported hardware diagnostics provided by the operating system. Availability varies by device and operating-system version.'] }
    ]
  },
  terms: {
    title: 'Terms of Use',
    sections: [
      { heading: 'Using VoltGuard', paragraphs: ['VoltGuard provides battery status, charging notifications and device information for general informational purposes. Use the app in accordance with your device manufacturer’s guidance and applicable law.'] },
      { heading: 'No charging control', paragraphs: ['Charging-target alerts are reminders. VoltGuard does not disconnect power, stop charging or replace built-in battery protection.'] },
      { heading: 'Accuracy and availability', paragraphs: ['Diagnostic availability and accuracy depend on information exposed by your device and operating system. Do not rely on the app as the sole basis for safety-critical decisions.'] },
      { heading: 'Changes', paragraphs: ['These terms must be reviewed and finalized with the publisher’s legal and support contact details before public distribution.'] }
    ]
  },
  about: {
    title: 'About VoltGuard AI',
    sections: [
      { heading: 'VoltGuard AI', paragraphs: ['Battery monitoring and battery-care insights for supported Android, iOS and web environments.'] },
      { heading: 'Product information', paragraphs: ['Version 1.0.0. Features and diagnostic availability vary by platform and device.'] },
      { heading: 'Third-party software', paragraphs: ['VoltGuard uses open-source libraries. Their licence notices must be included with the distributed app build.'] }
    ]
  }
};

export default function LegalDocumentScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const document = documents[slug ?? ''];
  return (
    <>
      <Stack.Screen options={{ title: document?.title ?? 'Page not found', headerShown: true }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingTop: 18, paddingBottom: insets.bottom + 28 }]}>
        <Text style={[styles.title, { color: colors.text }]}>{document?.title ?? 'Page not found'}</Text>
        {document ? document.sections.map(section => (
          <React.Fragment key={section.heading}>
            <Text style={[styles.heading, { color: colors.text }]}>{section.heading}</Text>
            {section.paragraphs.map((paragraph, index) => (
              <Text key={index} style={[styles.paragraph, { color: colors.textSecondary }]}>{paragraph}</Text>
            ))}
          </React.Fragment>
        )) : (
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>The requested legal page could not be found.</Text>
        )}
      </ScrollView>
    </>
  );
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 12 },
  title: { fontSize: 23, fontWeight: '800', marginBottom: 6 },
  heading: { fontSize: 15, fontWeight: '700', marginTop: 8 },
  paragraph: { fontSize: 13, lineHeight: 20 },
});
