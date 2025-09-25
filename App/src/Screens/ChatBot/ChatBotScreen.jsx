import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/client';

const ChatBotScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);
  const [userId, setUserId] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    
    const dimensionsListener = Dimensions.addEventListener('change', ({ window }) => {
      setScreenHeight(window.height);
    });
    
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
      dimensionsListener?.remove();
    };
  }, []);

  // Get user ID from storage
  useEffect(() => {
    const getUserId = async () => {
      try {
        const token = await AsyncStorage.getItem('user_token');
        const userInfo = await AsyncStorage.getItem('user_info');
        if (userInfo) {
          const user = JSON.parse(userInfo);
          setUserId(user.id || user.user_id);
        }
      } catch (error) {
        console.error('Failed to get user info:', error);
      }
    };
    getUserId();
  }, []);

  // Load previous chat messages
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!userId) return;
      
      try {
        const token = await AsyncStorage.getItem('user_token');
        if (!token) return;

        const response = await apiClient.get(`/chat/history/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.success) {
          const formattedMessages = response.data.messages.map(msg => ({
            id: msg.id,
            text: msg.message,
            isUser: msg.sender === 'user',
            timestamp: new Date(msg.created_at),
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    };

    loadChatHistory();
  }, [userId]);

  // Initial greeting message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          text: '👋 Hi! I\'m your SmartBus assistant. I can help you with bus routes, timings, and general transport queries. What would you like to know?',
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    }
  }, []);


  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText.trim();
    setInputText('');
    setIsTyping(true);
    setLoading(true);
    
    // Scroll to bottom after adding user message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Send to external chatbot API with correct format
      const requestBody = {
        user_id: parseInt(userId) || 1,
        message: currentInput,
      };
      
      console.log('Sending to chatbot API:', requestBody);
      
      const chatbotResponse = await fetch('https://transport-bot-8651.onrender.com/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Chatbot API response status:', chatbotResponse.status);
      
      if (!chatbotResponse.ok) {
        const errorText = await chatbotResponse.text();
        console.log('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${chatbotResponse.status} - ${errorText}`);
      }
      
      const chatbotData = await chatbotResponse.json();
      console.log('Chatbot API response data:', chatbotData);
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: chatbotData.bot_response || chatbotData.response || chatbotData.message || 'Sorry, I couldn\'t process your request right now. Please try again later.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Scroll to bottom after adding bot message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Save chat to database
      if (userId) {
        try {
          const token = await AsyncStorage.getItem('user_token');
          if (token) {
            await apiClient.post('/chat/save', {
              user_id: userId,
              user_message: currentInput,
              bot_response: botMessage.text,
            }, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        } catch (dbError) {
          console.error('Failed to save chat to database:', dbError);
        }
      }

    } catch (error) {
      console.error('Chatbot API error:', error);
      
      let errorText = '🚫 Sorry, I\'m having trouble connecting right now.';
      
      if (error.message.includes('422')) {
        errorText = '🚫 API format error. The chatbot service couldn\'t process the request format.';
      } else if (error.message.includes('HTTP error')) {
        errorText = '🚫 The chatbot service is currently unavailable. Please try again later.';
      } else if (error.message.includes('Network')) {
        errorText = '🚫 Network error. Please check your internet connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorText = '🚫 Connection timeout. Please try again.';
      }
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Scroll to bottom after adding error message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear the chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setMessages([{
              id: '1',
              text: '👋 Hi! I\'m your SmartBus assistant. I can help you with bus routes, timings, and general transport queries. What would you like to know?',
              isUser: false,
              timestamp: new Date(),
            }]);
          }
        },
      ]
    );
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessageContainer : styles.botMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userMessage : styles.botMessage
      ]}>
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userMessageText : styles.botMessageText
        ]}>
          {item.text}
        </Text>
        <Text style={[
          styles.messageTime,
          item.isUser ? styles.userMessageTime : styles.botMessageTime
        ]}>
          {item.timestamp.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#8E4DFF" />
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.botAvatar}>
            <Icon name="robot" size={20} color="#8E4DFF" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>SmartBus Assistant</Text>
            <Text style={styles.headerSubtitle}>Online</Text>
          </View>
        </View>
        <TouchableOpacity onPress={clearChat}>
          <Icon name="delete-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Chat Messages */}
      <View style={styles.chatContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={[
            styles.messagesList,
            {
              marginBottom: keyboardHeight > 0 ? 10 : 0,
            }
          ]}
          contentContainerStyle={[
            styles.messagesContentContainer,
            {
              paddingBottom: keyboardHeight > 0 ? 20 : 10,
            }
          ]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color="#8E4DFF" />
              <Text style={styles.typingText}>Assistant is typing...</Text>
            </View>
          </View>
        )}

        {/* Input Area */}
        <View style={[
          styles.inputContainer,
          {
            paddingBottom: keyboardHeight > 0 ? 20 : 12,
            marginBottom: keyboardHeight > 0 ? 10 : 0,
            backgroundColor: '#FFFFFF',
          }
        ]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask about bus routes, timings..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#8E4DFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#E8D5FF',
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messagesContentContainer: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  botMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userMessage: {
    backgroundColor: '#8E4DFF',
    borderBottomRightRadius: 4,
  },
  botMessage: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  botMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: '#E8D5FF',
    textAlign: 'right',
  },
  botMessageTime: {
    color: '#999',
    textAlign: 'left',
  },
  typingContainer: {
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typingText: {
    fontSize: 14,
    color: '#8E4DFF',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8E4DFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
});

export default ChatBotScreen;