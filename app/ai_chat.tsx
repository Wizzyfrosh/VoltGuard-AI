import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  FlatList, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity,
  Text
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { MessageBubble } from '../src/components/ai/MessageBubble';
import { TypingIndicator } from '../src/components/ai/TypingIndicator';
import { Send, Mic, ChevronLeft, Sparkles } from 'lucide-react-native';

export default function AIChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Hello! I'm VoltGuard AI. I've noticed your battery efficiency has dropped slightly over the last week. How can I help you optimize it?",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg as any]);
    setInputText('');
    setIsTyping(true);

    // Mock AI Response (Replace with Gemini API later)
    setTimeout(() => {
      setIsTyping(false);
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        text: "That's a great question. Based on your usage logs, screen brightness is the #1 drain factor. Try enabling 'Auto-Brightness' in your system settings.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg as any]);
    }, 2000);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerIconBox}>
             <Sparkles size={16} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Volt Assistant</Text>
            <Text style={[styles.headerStatus, { color: colors.success }]}>● Online</Text>
          </View>
        </View>
      </View>

      {/* Chat Area */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item as any} />}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={isTyping ? <TypingIndicator /> : null}
      />

      {/* Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.border }]}>
            <Mic size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Ask about battery health..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: colors.primary }]}
            onPress={handleSend}
          >
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6', // Purple
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    paddingBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  iconButton: {
    padding: 10,
    borderRadius: 24,
  },
  sendButton: {
    padding: 10,
    borderRadius: 24,
    transform: [{ rotate: '-45deg' }],
    paddingLeft: 12, // Visual adjustment for send icon
  },
});