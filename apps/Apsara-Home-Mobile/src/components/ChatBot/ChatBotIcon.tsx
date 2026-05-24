import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  TextInput,
  FlatList,
  Pressable,
  Image,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { storageService } from '../../services/storageService';

interface ChatBotIconProps {
  onPress?: () => void;
  position?: 'bottom-right' | 'bottom-left';
  visible?: boolean;
  isDarkMode?: boolean;
}

interface CollapsedTabStyle {
  [key: string]: number | string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const SHEET_OFFSET = 300;

const BUBBLE_MESSAGES = [
  "Hi, I'm your AI Assistant",
  "Need help? Chat with us!",
  "Ask me anything",
  "How can I assist you?",
  "Let's chat!",
];

const SUGGESTED_QUESTIONS = [
  "What products do you have?",
  "How do I place an order?",
  "What's your return policy?",
  "Do you offer free shipping?",
  "How can I track my order?",
];

export default function ChatBotIcon({ onPress, position = 'bottom-right', visible = true, isDarkMode = false }: ChatBotIconProps) {
  const insets = useSafeAreaInsets();
  const [chatVisible, setChatVisible] = useState(false);
  const [isIconHidden, setIsIconHidden] = useState(false);
  const [bubbleMessageIndex, setBubbleMessageIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'bot',
      text: 'Hello! How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(SHEET_OFFSET)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const headNodAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const hideSlideAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(0);

  // Load saved icon hidden state on mount
  useEffect(() => {
    const loadIconState = async () => {
      try {
        const savedState = await storageService.getChatbotHidden();
        setIsIconHidden(savedState);
        // Instantly set animation value without animating on mount
        hideSlideAnim.setValue(savedState ? 100 : 0);
      } catch (error) {
        console.error('Error loading chatbot state:', error);
      }
    };
    loadIconState();
  }, []);

  // Save icon hidden state whenever it changes
  useEffect(() => {
    const saveIconState = async () => {
      try {
        await storageService.setChatbotHidden(isIconHidden);
      } catch (error) {
        console.error('Error saving chatbot state:', error);
      }
    };
    saveIconState();
  }, [isIconHidden]);

  // Vertical Floating Animation
  useEffect(() => {
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: -8,
          duration: 1700,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 1700,
          useNativeDriver: true,
        }),
      ])
    );

    floatingAnimation.start();

    return () => {
      floatingAnimation.stop();
    };
  }, [floatingAnim]);

  // Head Nodding Animation
  useEffect(() => {
    const nodAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(headNodAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(headNodAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
      ])
    );

    nodAnimation.start();

    return () => {
      nodAnimation.stop();
    };
  }, [headNodAnim]);

  // Glow/Shine Animation (thinking indicator)
  useEffect(() => {
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
      ])
    );

    glowAnimation.start();

    return () => {
      glowAnimation.stop();
    };
  }, [glowAnim]);

  // Rotate bubble message every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setBubbleMessageIndex(prev => (prev + 1) % BUBBLE_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const bounceAnimation = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.15,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const openChat = () => {
    setChatVisible(true);
    bounceAnimation();
    onPress?.();
  };

  const closeChat = () => {
    setChatVisible(false);
  };

  const hideIcon = () => {
    setIsIconHidden(true);
    Animated.timing(hideSlideAnim, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const showIcon = () => {
    Animated.timing(hideSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsIconHidden(false);
    });
  };

  useEffect(() => {
    if (chatVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_OFFSET,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [chatVisible, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => scrollY.current === 0,
      onMoveShouldSetPanResponder: (_, g) => {
        if (scrollY.current > 0) return false;
        return g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx);
      },
      onPanResponderMove: (_, g) => {
        if (scrollY.current === 0 && g.dy > 0) {
          slideAnim.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (scrollY.current === 0 && g.dy > 100) {
          closeChat();
          return;
        }
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 60,
        }).start();
      },
    })
  ).current;

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: inputText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Simulate bot response after a short delay
    setTimeout(() => {
      const botResponses = [
        'Thanks for your message! Our support team will assist you shortly.',
        'I\'m here to help! Can you provide more details?',
        'Great question! Let me find that information for you.',
        'I understand. How else can I help you?',
        'Feel free to browse our product categories while we connect you with an agent.',
      ];

      const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];

      const botMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        text: randomResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 800);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View
      style={[
        styles.messageContainer,
        item.type === 'user' ? styles.userMessageContainer : styles.botMessageContainer,
      ]}
    >
      {item.type === 'bot' && (
        <Image
          source={require('../../../assets/sir.png')}
          style={styles.botAvatarImage}
          resizeMode="contain"
        />
      )}
      <View
        style={[
          styles.messageBubble,
          item.type === 'user' ? styles.userMessage : styles.botMessage,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.type === 'user' ? styles.userMessageText : styles.botMessageText,
          ]}
        >
          {item.text}
        </Text>
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <View style={styles.chatBotContainer}>
      {/* Floating Message Bubble */}
      {!chatVisible && !isIconHidden && (
        <View
          style={[
            styles.messageBubbleContainer,
            {
              [position === 'bottom-right' ? 'right' : 'left']: 16,
            },
          ]}
        >
          <View style={[styles.floatingMessageBubble, isDarkMode && styles.floatingMessageBubbleDark]}>
            <Text style={[styles.messageBubbleText, isDarkMode && styles.messageBubbleTextDark]}>
              {BUBBLE_MESSAGES[bubbleMessageIndex]}
            </Text>
          </View>
          <View
            style={[
              styles.bubblePointer,
              position === 'bottom-right' ? styles.bubblePointerRight : styles.bubblePointerLeft,
              isDarkMode && styles.bubblePointerDark,
            ]}
          />
        </View>
      )}

      {/* Floating Chat Button with Animations */}
      <Animated.View
        style={[
          styles.floatingButton,
          {
            transform: [
              { rotate: headNodAnim.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: ['0deg', '-13deg', '12deg', '-10deg', '0deg'],
              })},
              { translateX: hideSlideAnim.interpolate({
                inputRange: [0, 100],
                outputRange: [0, position === 'bottom-right' ? 100 : -100],
              })},
            ],
            [position === 'bottom-right' ? 'right' : 'left']: 16,
            opacity: hideSlideAnim.interpolate({
              inputRange: [0, 100],
              outputRange: [1, 0],
            }),
          },
        ]}
        pointerEvents={isIconHidden ? 'none' : 'auto'}
      >
        <TouchableOpacity
          style={[styles.chatButton, isDarkMode && styles.chatButtonDark]}
          onPress={openChat}
          activeOpacity={0.8}
          onLongPress={hideIcon}
        >
          <Image
            source={require('../../../assets/sir.png')}
            style={styles.chatButtonImage}
            resizeMode="contain"
          />
          {messages.length > 1 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>{messages.length - 1}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.hideButton}
          onPress={hideIcon}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Hidden Icon Tab */}
      <Animated.View
        style={[
          styles.collapsedTab,
          {
            [position === 'bottom-right' ? 'right' : 'left']: 0,
            transform: [
              { translateX: hideSlideAnim.interpolate({
                inputRange: [0, 100],
                outputRange: [position === 'bottom-right' ? 100 : -100, 0],
              })},
            ],
            opacity: hideSlideAnim.interpolate({
              inputRange: [0, 100],
              outputRange: [0, 1],
            }),
          },
          isDarkMode && styles.collapsedTabDark,
        ]}
        pointerEvents={isIconHidden ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.collapsedTabButton}
          onPress={showIcon}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../../assets/sir.png')}
            style={styles.collapsedTabIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Modal */}
      <Modal
        visible={chatVisible}
        transparent
        animationType="none"
        onRequestClose={closeChat}
      >
        <Pressable style={styles.modalOverlay} onPress={closeChat}>
          <Animated.View style={[styles.chatModalContainer, isDarkMode && styles.chatModalContainerDark, { transform: [{ translateY: slideAnim }] }]} {...panResponder.panHandlers}>
            {/* Chat Header */}
            <View style={[styles.sheetHandleArea, isDarkMode && styles.sheetHandleAreaDark]}>
              <View style={[styles.sheetHandle, isDarkMode && styles.sheetHandleDark]} />
            </View>
            <View style={[styles.chatHeader, isDarkMode && styles.chatHeaderDark]}>
              <View style={styles.headerContent}>
                <Image
                  source={require('../../../assets/sir.png')}
                  style={styles.headerImage}
                  resizeMode="contain"
                />
                <View style={styles.headerTextContainer}>
                  <Text style={[styles.chatTitle, isDarkMode && styles.chatTitleDark]}>AF Home Shop AI</Text>
                  <Text style={[styles.onlineStatus, isDarkMode && styles.onlineStatusDark]}>Online • Always here to help</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={hideIcon}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-down" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Messages List */}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesListContent}
              scrollEnabled={true}
              onScroll={(event) => { scrollY.current = event.nativeEvent.contentOffset.y; }}
              scrollEventThrottle={16}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Loading Indicator */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingDots}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              </View>
            )}

            {/* Suggested Questions */}
            {messages.length === 1 && (
              <View style={[styles.questionsContainer, isDarkMode && styles.questionsContainerDark]}>
                <Text style={[styles.questionsTitle, isDarkMode && styles.questionsTitleDark]}>Popular questions:</Text>
                <View style={styles.questionsList}>
                  {SUGGESTED_QUESTIONS.map((question, index) => (
                    <Pressable
                      key={index}
                      style={[styles.questionTag, isDarkMode && styles.questionTagDark]}
                      onPress={() => setInputText(question)}
                    >
                      <Text style={[styles.questionTagText, isDarkMode && styles.questionTagTextDark]}>{question}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Input Area */}
            <View style={[styles.inputContainer, isDarkMode && styles.inputContainerDark, { paddingBottom: insets.bottom + 12 }]}>
              <TextInput
                style={[styles.textInput, isDarkMode && styles.textInputDark]}
                placeholder="Type your message..."
                placeholderTextColor={isDarkMode ? '#9ca3af' : Colors.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                editable={!isLoading}
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={(!inputText.trim() || isLoading) ? Colors.textSecondary : Colors.white}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  chatBotContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    top: 0,
    pointerEvents: 'box-none',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    zIndex: 999,
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: Colors.sky,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatButtonImage: {
    width: 56,
    height: 56,
  },
  aiGlow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.sky,
    zIndex: -1,
  },
  messageBubbleContainer: {
    position: 'absolute',
    bottom: 90,
    zIndex: 998,
    flexDirection: 'column',
    paddingHorizontal: 16,
  },
  floatingMessageBubble: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: 200,
    borderWidth: 2,
    borderColor: Colors.sky,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'visible',
  },
  messageBubbleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 18,
  },
  messageBubbleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bubblePointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.sky,
    marginTop: -2,
  },
  bubblePointerLeft: {
    alignSelf: 'flex-start',
    marginLeft: 24,
    marginTop: -1,
  },
  bubblePointerRight: {
    alignSelf: 'flex-end',
    marginRight: 24,
    marginTop: -1,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  chatModalContainer: {
    height: '85%',
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  sheetHandleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 2,
    backgroundColor: Colors.white,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
  },
  chatHeader: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.sky,
    opacity: 0.8,
  },
  headerTextContainer: {
    flex: 1,
    gap: 2,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  onlineStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  botAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: Colors.sky,
    opacity: 0.8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  userMessage: {
    backgroundColor: Colors.sky,
    borderBottomRightRadius: 4,
  },
  botMessage: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: Colors.white,
    fontWeight: '500',
  },
  botMessageText: {
    color: Colors.text,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.sky,
  },
  dot1: {
    opacity: 1,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: Colors.white,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.sky,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  questionsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  questionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  questionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  questionTag: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.sky,
    marginBottom: 8,
  },
  questionTagText: {
    fontSize: 12,
    color: Colors.sky,
    fontWeight: '500',
  },
  // Dark mode styles
  floatingMessageBubbleDark: {
    backgroundColor: '#374151',
    borderColor: '#0284c7',
  },
  messageBubbleTextDark: {
    color: '#f8fafc',
  },
  bubblePointerDark: {
    borderTopColor: '#0284c7',
  },
  chatButtonDark: {
    backgroundColor: '#374151',
    borderColor: '#0284c7',
  },
  chatModalContainerDark: {
    backgroundColor: '#1f2937',
  },
  sheetHandleAreaDark: {
    backgroundColor: '#1f2937',
  },
  sheetHandleDark: {
    backgroundColor: '#4b5563',
  },
  chatHeaderDark: {
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  chatTitleDark: {
    color: '#f8fafc',
  },
  onlineStatusDark: {
    color: '#9ca3af',
  },
  questionsContainerDark: {
    backgroundColor: '#111827',
    borderTopColor: '#374151',
  },
  questionsTitleDark: {
    color: '#9ca3af',
  },
  questionTagDark: {
    backgroundColor: '#374151',
    borderColor: '#0284c7',
  },
  questionTagTextDark: {
    color: '#38bdf8',
  },
  inputContainerDark: {
    backgroundColor: '#1f2937',
    borderTopColor: '#374151',
  },
  textInputDark: {
    backgroundColor: '#374151',
    color: '#f8fafc',
    borderColor: '#4b5563',
  },
  hideButton: {
    position: 'absolute',
    right: -12,
    top: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  collapsedTab: {
    position: 'absolute',
    bottom: 24,
    width: 48,
    height: 48,
    zIndex: 998,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.sky,
    borderRightWidth: 0,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: -3, height: 3 },
  },
  collapsedTabDark: {
    backgroundColor: '#374151',
    borderColor: '#0284c7',
  },
  collapsedTabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsedTabIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  },
});

