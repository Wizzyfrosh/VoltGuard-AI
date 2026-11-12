import React, { useRef, useEffect } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { MessageBubble } from '../src/components/ai/MessageBubble';
import { ChevronLeft, Sparkles, Bot } from 'lucide-react-native';

const messages = [
  {
    id: 'service-unavailable',
    text: 'The VoltGuard AI service is not connected yet. I cannot analyse your battery readings or provide personalized diagnostics at this stage. The assistant will become available after the secure AI service is implemented.',
    sender: 'ai' as const,
    timestamp: new Date(),
  },
];

export default function AIChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: false });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <ChevronLeft size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={[styles.headerIconBox, { backgroundColor: colors.primary }]}>
            <Sparkles size={16} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Volt Assistant</Text>
            <Text style={[styles.headerStatus, { color: colors.warning }]}>Not connected</Text>
          </View>
        </View>
      </View>
      <KeyboardAvoidingView style={styles.chatArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.listContent}
        />
        <View style={[styles.disabledNotice, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Bot size={18} color={colors.textSecondary} />
          <Text style={[styles.disabledText, { color: colors.textSecondary }]}>
            AI chat is temporarily unavailable while the secure service is being built.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backButton: { padding: 8, marginRight: 8 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerIconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerStatus: { fontSize: 12, fontWeight: '600' },
  chatArea: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 12, flexGrow: 1, justifyContent: 'flex-end' },
  disabledNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  disabledText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
