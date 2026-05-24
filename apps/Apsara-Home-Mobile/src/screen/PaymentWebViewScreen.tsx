import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { Colors } from '../constants/colors';
import Toast from 'react-native-toast-message';

interface PaymentWebViewScreenProps {
  checkoutUrl: string;
  onBack?: () => void;
  onPaymentSuccess?: () => void;
  isDarkMode?: boolean;
}

export default function PaymentWebViewScreen({
  checkoutUrl,
  onBack,
  onPaymentSuccess,
  isDarkMode = false,
}: PaymentWebViewScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleNavigationStateChange = async (navState: any) => {
    const url = navState.url;
    console.log('[PaymentWebViewScreen] Navigation state changed:', url);

    // Track if we can go back in webview history
    setCanGoBack(navState.canGoBack);

    // Check if user has returned to success page
    if (url.includes('success') || url.includes('payment_success')) {
      console.log('[PaymentWebViewScreen] Success detected, calling onPaymentSuccess');
      setLoading(false);
      onPaymentSuccess?.();
      return;
    }
  };

  const handleBackPress = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    // If can't go back in webview, call the navigation back
    onBack?.();
    return true;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [canGoBack]);

  const handleShouldStartLoadWithRequest = (event: any) => {
    const { url } = event;
    console.log('[PaymentWebViewScreen] Trying to navigate to:', url);

    // List of deep link schemes that should be opened externally
    const deepLinkSchemes = ['gcash://', 'maya://', 'gcashios://', 'mayaios://', 'paymaya://', 'tel:', 'sms:', 'mailto:'];
    const isDeepLink = deepLinkSchemes.some(scheme => url.toLowerCase().startsWith(scheme));

    if (isDeepLink) {
      console.log('[PaymentWebViewScreen] Attempting to open deep link:', url);
      Linking.openURL(url).catch(error => {
        console.log('[PaymentWebViewScreen] Could not open app, payment gateway will show QR code');
      });
      return false; // Don't navigate in WebView - let native side handle it
    }

    // Allow normal web navigation
    return true;
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }]}>
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['rgba(59,130,246,0.15)', 'rgba(31,41,55,0)'] : ['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1f2937' : Colors.white, borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' }]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back-outline" size={24} color={isDarkMode ? '#e5e7eb' : Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>
          Payment
        </Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.sky} />
          <Text style={[styles.loadingText, { color: Colors.textSecondary }]}>
            Loading payment page...
          </Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: checkoutUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadEnd={() => setLoading(false)}
        style={{ opacity: loading ? 0 : 1 }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.sky} />
          </View>
        )}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        originWhitelist={['*']}
        scalesPageToFit={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
});
