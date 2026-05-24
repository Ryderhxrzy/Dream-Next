import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface FAQsScreenProps {
  onBack: () => void;
  isDarkMode: boolean;
}

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: 'How can I place an order?',
    answer: 'To place an order, simply browse through our website, select the desired furniture item, choose any customization options if available, and add it to your shopping cart. Proceed to the checkout page, provide your shipping and payment details, and confirm the order. You will receive an order confirmation via email.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept various payment methods, including major credit cards (Visa, Mastercard, American Express), debit cards, PayPal, and bank transfers. Choose the payment option that suits you best during the checkout process.',
  },
  {
    question: 'Can I customize my furniture order?',
    answer: 'Yes, we offer customization options for specific furniture items. You can often choose from different colors, materials, sizes, or configurations to meet your specific requirements. The available customization options will be indicated on the product page.',
  },
  {
    question: 'How long does it take to manufacture and deliver furniture orders?',
    answer: 'The manufacturing and delivery time can vary depending on the product and customization options. Typically, it takes around 1-2 days for laminated furniture and metal furniture and 3-5 days for sofa and upholstered furniture. However, please note that these timeframes may vary based on factors such as product availability and your location.',
  },
  {
    question: 'Do you provide international shipping?',
    answer: 'Currently, we are not shipping products outside the Philippines.',
  },
  {
    question: 'What is your return and refund policy?',
    answer: 'Returns: Our policy lasts 1 week. If 1 week has gone by since your purchase, unfortunately we can\'t offer you a refund or exchange. To be eligible for a return, your item must be unused and in the same condition as you received it, in original packaging.\n\nPartial Refunds: Any item not in original condition, damaged, or missing parts for reasons not due to our error. Any item returned more than 30 days after delivery.\n\nRefunds: Once received and inspected, we\'ll send you an email. If approved, the refund will be processed within a certain timeframe.\n\nSale items: Only regular priced items can be refunded.\n\nExchanges: We only replace defective or damaged items.\n\nGifts: Gift certificates will be mailed for returned gifts.\n\nShipping: You\'re responsible for return shipping costs, which are non-refundable.',
  },
  {
    question: 'How can I track my order?',
    answer: 'You can track your order by visiting our Track Order page. Enter your order details to see the current status of your shipment.',
  },
  {
    question: 'Do you offer assembly services?',
    answer: 'While some furniture items may require minimal assembly, we do provide professional assembly services. We include detailed assembly instructions with each item to make the process as easy as possible for you. Check our AF Home Assembly Service Pricelist for more details.',
  },
  {
    question: 'Can I cancel or modify my order after it has been placed?',
    answer: 'If you wish to cancel or modify your order, please contact our customer service as soon as possible. We will do our best to accommodate your request if the order has not entered the manufacturing or shipping process. However, once manufacturing has started, cancellations or modifications may not be possible.',
  },
  {
    question: 'What should I do if my furniture arrives damaged or defective?',
    answer: 'If you receive damaged or defective furniture, please notify our customer service immediately. Provide relevant details and, if possible, attach photos of the damage. We will work with you to resolve the issue promptly, either by arranging for a replacement or initiating a refund.',
  },
];

export default function FAQsScreen({ onBack, isDarkMode }: FAQsScreenProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = React.useRef(new Animated.Value(100)).current;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
  };

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => backHandler.remove();
  }, [onBack]);

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 100],
                outputRange: [0, 100],
              }),
            },
          ],
        },
      ]}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={[]}>
        <LinearGradient
          colors={isDarkMode ? ['rgba(59,130,246,0.15)', 'rgba(31,41,55,0)'] : ['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.header, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1f2937' : Colors.white, borderBottomColor: colors.border }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#f8fafc' : Colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>FAQs</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tagline */}
          <View style={[styles.taglineContainer, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.tagline, { color: colors.text }]}>Frequently Asked Questions</Text>
            <Text style={[styles.subtitle, { color: colors.textSec }]}>Find answers to common questions about AF Home</Text>
          </View>

          {/* FAQ Items */}
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.faqCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}
              onPress={() => toggleFAQ(index)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQuestion, { color: colors.text, flex: 1 }]}>{faq.question}</Text>
                <Ionicons
                  name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={Colors.sky}
                />
              </View>

              {expandedIndex === index && (
                <Text style={[styles.faqAnswer, { color: colors.textSec }]}>
                  {faq.answer}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  headerTitleDark: {
    color: '#f8fafc',
  },
  content: {
    padding: 8,
    gap: 12,
    paddingBottom: 32,
  },
  taglineContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  faqCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
});
