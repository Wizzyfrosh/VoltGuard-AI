import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { Bot, User } from 'lucide-react-native';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const { colors } = useTheme();
  const isUser = message.sender === 'user';

  return (
    <Animated.View 
      entering={isUser ? FadeInRight : FadeInUp}
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer
      ]}
    >
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Bot size={16} color="#fff" />
        </View>
      )}

      <View style={[
        styles.bubble,
        { 
          backgroundColor: isUser ? colors.primary : colors.card,
          borderBottomRightRadius: isUser ? 4 : 20,
          borderBottomLeftRadius: isUser ? 20 : 4,
        }
      ]}>
        <Text style={[
          styles.text, 
          { color: isUser ? '#fff' : colors.text }
        ]}>
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiContainer: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 2, // Align with top of bubble
  },
  bubble: {
    padding: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
});