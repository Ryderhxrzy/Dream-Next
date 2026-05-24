import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface PaymentCancelScreenProps {
  isDarkMode?: boolean;
  onRetry?: () => void;
  onClose?: () => void;
}

export default function PaymentCancelScreen({
  isDarkMode = false,
  onRetry,
  onClose,
}: PaymentCancelScreenProps) {
  const colors = {
    bg: isDarkMode ? '#0f172a' : '#fef2f2',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={isDarkMode ? ['rgba(239,68,68,0.15)', 'rgba(31,41,55,0)'] : ['rgba(239,68,68,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.gradientBg]}
      >
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: '#ef444420' }]}>
            <Ionicons name="close-circle" size={80} color="#ef4444" />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Payment Cancelled
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSec }]}>
            Your payment was not completed. Your order is still pending payment.
          </Text>

          <View style={[styles.infoBox, { backgroundColor: colors.containerBg }]}>
            <View style={styles.infoRow}>
              <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Payment not received
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color={Colors.sky} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                You have 24 hours to complete payment
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="refresh-outline" size={16} color={Colors.sky} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Try payment again anytime
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Colors.sky }]}
              onPress={onRetry}
            >
              <Ionicons name="repeat" size={16} color={Colors.white} />
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: colors.textSec }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                Back to Orders
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBg: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  infoBox: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 32,
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 12,
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
