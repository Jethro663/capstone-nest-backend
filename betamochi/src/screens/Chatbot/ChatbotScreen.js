import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import useSound from '../../utils/useSound';
import { useSfx } from '../../context/SfxContext';

// Click sound asset (added to project at assets/sounds/click.wav)
const clickSoundAsset = require('../../../assets/sounds/click.wav');

const initialMessages = [
  { id: '1', from: 'bot', text: 'Hi! I am your study assistant. How can I help today?' },
];

const ChatbotScreen = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const flatRef = useRef(null);
  const { play: playClick } = useSound(clickSoundAsset);
  const { enabled } = useSfx();

  useEffect(() => {
    // scroll to bottom when new message arrives
    if (flatRef.current) {
      flatRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = () => {
    if (!text.trim()) return;
    const userMsg = { id: String(Date.now()), from: 'user', text: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setText('');

    // play click SFX (non-blocking)
    try {
      if (enabled) playClick();
    } catch (e) {
      // ignore
    }

    // mock AI response after a short delay
    setTimeout(() => {
      const botReply = {
        id: String(Date.now() + 1),
        from: 'bot',
        text: `AI: I received "${userMsg.text}" — try asking for a summary, examples, or practice questions.`,
      };
      setMessages((m) => [...m, botReply]);
    }, 700);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.msgRow, item.from === 'user' ? styles.msgUser : styles.msgBot]}>
      <Text style={item.from === 'user' ? styles.msgTextUser : styles.msgTextBot}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.container}>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Ask the AI..."
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} activeOpacity={0.8}>
            <MaterialCommunityIcons name="send" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 12, paddingBottom: 24 },
  msgRow: { maxWidth: '80%', marginBottom: 10, padding: 10, borderRadius: 12 },
  msgUser: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderTopRightRadius: 4 },
  msgBot: { alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.secondaryLight },
  msgTextUser: { color: colors.white },
  msgTextBot: { color: colors.textPrimary },
  inputRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: colors.secondaryLight, backgroundColor: colors.white, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 40, maxHeight: 120, padding: 10, color: colors.textPrimary },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});

export default ChatbotScreen;
