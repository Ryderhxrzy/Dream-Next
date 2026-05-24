import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  SafeAreaView,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/colors';
import GoogleSignInService from '../services/googleSignInService';
import { getFCMToken } from '../utils/fcmUtils';
import BiometricUtils from '../utils/biometricUtils';
import axios from 'axios';
import { API_CONFIG } from '../config/api';

export default function IndexScreen({
  onGoToLogin,
  onGoToSignup,
  onAuthenticated,
  onShowAffiliateScreen,
}: {
  onGoToLogin?: () => void;
  onGoToSignup?: () => void;
  onAuthenticated?: (user?: any, token?: string) => void;
  onShowAffiliateScreen?: () => void;
}) {
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const player = useVideoPlayer(require('../../assets/login/afhome.mp4'), p => {
    p.loop = true;
    p.muted = true;
    p.rate = 1.0;
    p.play();
  });

  // Initialize Google Sign-In and check biometric
  useEffect(() => {
    const initializeGoogleSignIn = async () => {
      try {
        const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

        if (!googleClientId) {
          console.error('[IndexScreen] Google Client ID not configured in .env');
          return;
        }

        // Configure Google Sign-In with Web Client ID
        await GoogleSignInService.initialize({
          webClientId: googleClientId,
        });
        console.log('[IndexScreen] Google Sign-In initialized successfully');
      } catch (error) {
        console.error('[IndexScreen] Failed to initialize Google Sign-In:', error);
      }
    };

    const checkBiometric = async () => {
      try {
        const hasCredential = await BiometricUtils.hasBiometricCredential();
        const available = await BiometricUtils.isBiometricAvailable();
        setBiometricAvailable(hasCredential && available);
      } catch (error) {
        console.error('[IndexScreen] Failed to check biometric:', error);
      }
    };

    initializeGoogleSignIn();
    checkBiometric();
  }, []);

  React.useEffect(() => {
    if (player) {
      player.play();
    }
  }, [player]);

  // Ensure video keeps playing when Alert appears
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (player && !player.playing) {
        player.play();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [player]);

  const handleBiometricLogin = async () => {
    if (biometricLoading) return;

    if (!biometricAvailable) {
      Alert.alert(
        'Enable Biometric Login',
        'Go to Profile > Security > Enable Biometric to use fingerprint login',
        [{ text: 'OK', onPress: () => {} }]
      );
      return;
    }

    setBiometricLoading(true);
    try {
      console.log('[IndexScreen] Starting biometric login');

      // Authenticate with biometric
      const authenticated = await BiometricUtils.authenticate();
      if (!authenticated) {
        console.log('[IndexScreen] Biometric authentication cancelled');
        setBiometricLoading(false);
        return;
      }

      // Get credential from keychain
      const credential = await BiometricUtils.getBiometricCredential();
      if (!credential) {
        Alert.alert('Error', 'Biometric credential not found. Please enable biometric login first.');
        setBiometricLoading(false);
        return;
      }

      // Send biometric login request
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/auth/mobile/login-biometric`,
        {
          device_id: credential.device_id,
          credential_token: credential.credential_token,
        }
      );

      const user = response.data?.user ?? response.data?.data?.user;
      const token = response.data?.token ?? response.data?.data?.token;

      console.log('[IndexScreen] Biometric login successful:', {
        email: user?.email,
        name: user?.name,
        hasToken: !!token,
        rawResponseKeys: Object.keys(response.data ?? {}),
      });

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: `Welcome, ${user?.name || user?.email || 'User'}!`,
        duration: 2000,
      });

      // Trigger the authenticated callback
      setTimeout(() => {
        onAuthenticated?.(user, token);
      }, 700);
    } catch (error: any) {
      console.error('[IndexScreen] Biometric login failed:', error);
      const errorMessage = error.response?.data?.message || 'Biometric login failed. Please try again.';

      Alert.alert('Login Error', errorMessage, [
        {
          text: 'OK',
          onPress: () => {},
        },
      ]);

      return;
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (googleLoading) return;

    setGoogleLoading(true);
    try {
      console.log('[IndexScreen] Starting Google login flow');

      // Get FCM token for push notifications (optional)
      const fcmToken = await getFCMToken();
      console.log('[IndexScreen] FCM token obtained:', fcmToken ? 'Yes' : 'No');

      // Perform Google login with FCM token
      const response = await GoogleSignInService.handleGoogleLogin(fcmToken || undefined);

      console.log('[IndexScreen] Google login successful:', response.user?.email);

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: `Welcome, ${response.user?.name || 'User'}!`,
        duration: 2000,
      });

      // Trigger the authenticated callback to navigate to authenticated screens
      setTimeout(() => {
        onAuthenticated?.(response.user, response.token);
      }, 700);
    } catch (error: any) {
      // Handle specific error types
      const errorMessage = error.message || 'Failed to sign in with Google. Please try again.';

      if (error.code === 'SIGN_IN_CANCELLED') {
        // Don't show alert for cancellation
        return;
      }

      // Show error using Alert instead of Toast for better readability
      Alert.alert(
        'Login Error',
        errorMessage,
        [
          {
            text: 'OK',
            onPress: () => {},
          },
        ],
      );

      return;
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleOpenUrl = (url: string) => {
    Linking.openURL(url).catch(err =>
      console.error('Failed to open URL:', err)
    );
  };

  return (
    <View style={styles.root}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.overlay} />
      <View style={styles.container}>
          {/* Spacer to push content to bottom */}
          <View style={styles.spacer} />

          {/* Bottom Gradient - extends to bottom navigation */}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 1)']}
            locations={[0, 0.4, 1]}
            style={styles.gradient}
            pointerEvents="none"
          />

          {/* Bottom Content Section */}
          <SafeAreaView style={styles.contentSection} edges={['bottom']}>
            {/* Logo and Text Section */}
          <View style={styles.textWithLogoSection}>
              <View style={styles.logoWithTextRow}>
                <Image
                  source={require('../../assets/home_logo.png')}
                  style={styles.homeLogoImage}
                  resizeMode="contain"
                />
                <Text style={styles.homeLogoText}>Home</Text>
              </View>
              <View style={styles.headingSection}>
                <Text style={styles.heading}>Share. Earn. Enjoy</Text>
                <Text style={styles.subheading} numberOfLines={1}>
                  Start your affiliate journey today
                </Text>
              </View>
            </View>

          {/* Login Buttons */}
          <View style={styles.buttonSection}>
            {/* Top section */}
            <Pressable
              style={styles.loginButton}
              onPress={onGoToLogin}
              disabled={biometricLoading || googleLoading}
            >
              <Ionicons name="mail-outline" size={18} color={Colors.white} />
              <Text style={styles.loginButtonText}>Login with Email/Username</Text>
            </Pressable>

            {/* Line separator */}
            <View style={styles.separatorRow}>
              <View style={styles.separatorLine} />
              <View style={styles.separatorOrContainer}>
                <Text style={styles.separatorOrText}>or</Text>
              </View>
              <View style={styles.separatorLine} />

            </View>


            {/* Bottom section */}
            <Pressable
              style={[styles.biometricButton, biometricLoading && styles.disabledButton]}
              onPress={handleBiometricLogin}
              disabled={biometricLoading || googleLoading}
            >
              {biometricLoading ? (
                <>
                  <ActivityIndicator color={Colors.white} style={styles.buttonLoader} />
                  <Text style={styles.biometricButtonText}>Authenticating...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="finger-print" size={18} color={Colors.white} />
                  <Text style={styles.biometricButtonText}>Login with Biometric</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.googleButton, googleLoading && styles.disabledButton]}
              onPress={handleGoogleLogin}
              disabled={biometricLoading || googleLoading}
            >
              {googleLoading ? (
                <>
                  <ActivityIndicator color={Colors.white} style={styles.buttonLoader} />
                  <Text style={styles.googleButtonText}>Signing in...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color={Colors.white} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Signup Link */}
          <View style={styles.signupLinkSection}>
            <Text style={styles.signupText}>Don't have an account?{' '}</Text>
            <TouchableOpacity onPress={onGoToSignup}>
              <Text style={styles.signupLink}>Signup</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Text */}
          <View style={styles.footerSection}>
            <View style={styles.footerLinksRow}>
              <TouchableOpacity style={styles.whatIsAfHomeSection} onPress={onShowAffiliateScreen}>
                <Text style={styles.whatIsAfHomeText}>AF Home Affiliate Program</Text>
              </TouchableOpacity>
              <Text style={styles.footerBullet}>•</Text>
              <TouchableOpacity style={styles.howToEarnSection} onPress={onShowAffiliateScreen}>
                <Text style={styles.howToEarnText}>How to Earn?</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.footerText}>
              By creating account and signing in you agree to our{' '}
              <Text
                style={styles.footerLink}
                onPress={() => handleOpenUrl('https://example.com/terms')}
              >
                terms & conditions
              </Text>
              {' '}and{' '}
              <Text
                style={styles.footerLink}
                onPress={() => handleOpenUrl('https://example.com/privacy')}
              >
                privacy policy
              </Text>
            </Text>
          </View>
        </SafeAreaView>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  spacer: {
    flex: 1,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    zIndex: 1,
  },
  contentSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 24,
    zIndex: 2,
  },
  homeLogoImage: {
    width: 50,
    height: 50,
  },
  logoWithTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  homeLogoText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.white,
    marginTop: 6,
  },
  textWithLogoSection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  sideLogoImage: {
    width: 48,
    height: 48,
    opacity: 0.6,
    marginBottom: -15,
    backgroundColor: 'transparent',
  },
  headingSection: {
    gap: 4,
    alignItems: 'flex-start',
    marginTop: -5,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    fontStyle: 'italic',
    color: Colors.white,
    letterSpacing: 0.2,
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '400',
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
    textAlign: 'left',
  },
  buttonSection: {
    gap: 12,
    marginTop: -16,
  },
  loginButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: Colors.sky,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  googleButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },


  disabledButton: {
    opacity: 0.6,
  },
  buttonLoader: {
    marginRight: 4,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  passkeyButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  passkeyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  howToEarnSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  howToEarnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff9500',
    textDecorationLine: 'underline',
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  footerBullet: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  whatIsAfHomeSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatIsAfHomeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff9500',
    textDecorationLine: 'underline',
  },
  signupLinkSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  signupText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    textDecorationLine: 'underline',
  },
  footerSection: {
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textDecorationLine: 'underline',
  },
  biometricButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#f97316',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },

  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 6,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  separatorOrContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separatorOrText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
});
