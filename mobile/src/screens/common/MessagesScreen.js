import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { Card, IconButton, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MessagesScreen = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'John Doe',
      preview: 'Hi, did you complete the assignment?',
      timestamp: new Date(Date.now() - 300000),
      unread: true,
    },
    {
      id: 2,
      sender: 'Jane Smith',
      preview: 'Thanks for your help earlier',
      timestamp: new Date(Date.now() - 3600000),
      unread: true,
    },
    {
      id: 3,
      sender: 'Dr. Wilson',
      preview: 'Please check the updated syllabus',
      timestamp: new Date(Date.now() - 86400000),
      unread: false,
    },
  ]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');

  const handleSendReply = () => {
    if (replyText.trim() && selectedMessage) {
      // Handle sending reply
      setReplyText('');
    }
  };

  const renderMessageItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.messageItem,
        item.unread && styles.messageItemUnread,
        selectedMessage?.id === item.id && styles.messageItemSelected,
      ]}
      onPress={() => setSelectedMessage(item)}
    >
      <View style={styles.messageIcon}>
        <MaterialCommunityIcons
          name="account-circle"
          size={40}
          color="#3b82f6"
        />
      </View>

      <View style={styles.messageInfo}>
        <Text
          style={[
            styles.messageSender,
            item.unread && styles.messageSenderUnread,
          ]}
        >
          {item.sender}
        </Text>
        <Text
          style={styles.messagePreview}
          numberOfLines={1}
        >
          {item.preview}
        </Text>
        <Text style={styles.messageTime}>
          {item.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {item.unread && <View style={styles.unreadBadge} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {!selectedMessage ? (
        <FlatList
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messageList}
        />
      ) : (
        <View style={styles.conversationContainer}>
          <View style={styles.conversationHeader}>
            <TouchableOpacity onPress={() => setSelectedMessage(null)}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color="#1f2937"
              />
            </TouchableOpacity>
            <Text style={styles.conversationTitle}>
              {selectedMessage.sender}
            </Text>
            <MaterialCommunityIcons
              name="information-outline"
              size={24}
              color="#6b7280"
            />
          </View>

          <ScrollView style={styles.messageThread}>
            <Card style={styles.receivedMessage}>
              <Card.Content>
                <Text style={styles.receivedText}>
                  {selectedMessage.preview}
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.sentMessage}>
              <Card.Content>
                <Text style={styles.sentText}>
                  Thanks for the message!
                </Text>
              </Card.Content>
            </Card>
          </ScrollView>

          <View style={styles.replyContainer}>
            <TextInput
              placeholder="Type your message..."
              value={replyText}
              onChangeText={setReplyText}
              style={styles.replyInput}
              right={
                <TextInput.Icon
                  icon="send"
                  onPress={handleSendReply}
                />
              }
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  messageList: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  messageItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  messageItemUnread: {
    backgroundColor: '#eff6ff',
  },
  messageItemSelected: {
    backgroundColor: '#dbeafe',
  },
  messageIcon: {
    marginRight: 12,
  },
  messageInfo: {
    flex: 1,
  },
  messageSender: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  messageSenderUnread: {
    color: '#1f2937',
    fontWeight: '600',
  },
  messagePreview: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  conversationContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  messageThread: {
    flex: 1,
    padding: 16,
  },
  receivedMessage: {
    marginBottom: 12,
    backgroundColor: '#f3f4f6',
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  receivedText: {
    fontSize: 14,
    color: '#1f2937',
  },
  sentMessage: {
    marginBottom: 12,
    backgroundColor: '#dbeafe',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  sentText: {
    fontSize: 14,
    color: '#1f2937',
  },
  replyContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  replyInput: {
    backgroundColor: '#f9fafb',
  },
});

export default MessagesScreen;
