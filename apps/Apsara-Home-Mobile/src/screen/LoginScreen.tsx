import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/colors';
import Button from '../components/Button/PrimaryButton';
import { authService } from '../services/authService';
import BiometricUtils from '../utils/biometricUtils';
import { getFCMToken } from '../utils/fcmUtils';
import axios from 'axios';
import { API_CONFIG } from '../config/api';

WebBrowser.maybeCompleteAuthSession();

type AuthStep = 'login' | '2fa' | 'mfa';

export default function LoginScreen({
  onGoToSignup,
  onGoToIndex,
  onAuthenticated,
  onResetOnboarding,
}: {
  onGoToSignup?: () => void;
  onGoToIndex?: () => void;
  onAuthenticated?: (user?: { id: string; email: string; name: string; avatar_url?: string }, token?: string) => void;
  onResetOnboarding?: () => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [authStep, setAuthStep] = useState<AuthStep>('login');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [mfaPolling, setMfaPolling] = useState(false);
  const otpInputRef = useRef<TextInput | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [savedUser, setSavedUser] = useState<{ id: string; email: string; name: string; avatar_url?: string } | null>(null);
  const [showRememberedUserUI, setShowRememberedUserUI] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    loadSavedUser();
    checkBiometric();
  }, []);

  useEffect(() => {
    if (authStep === '2fa') {
      const timer = setTimeout(() => otpInputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [authStep]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onGoToIndex) {
        onGoToIndex();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [onGoToIndex]);

  async function loadSavedUser() {
    try {
      const saved = await AsyncStorage.getItem('rememberedUser');
      if (saved) {
        const user = JSON.parse(saved);
        setSavedUser(user);
        setShowRememberedUserUI(true);
      }
    } catch (error) {
      console.error('Failed to load saved user:', error);
    }
  }

  async function checkBiometric() {
    try {
      const hasCredential = await BiometricUtils.hasBiometricCredential();
      const available = await BiometricUtils.isBiometricAvailable();
      setBiometricAvailable(hasCredential && available);
    } catch (error) {
      console.error('[LoginScreen] Failed to check biometric:', error);
    }
  }

  async function saveUserCredentials(user: { id: string; email: string; name: string; avatar_url?: string }) {
    try {
      await AsyncStorage.setItem('rememberedUser', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  }

  async function clearSavedUser() {
    try {
      await AsyncStorage.removeItem('rememberedUser');
      setSavedUser(null);
      setShowRememberedUserUI(false);
      setPassword('');
      setEmail('');
      setErrors({});
    } catch (error) {
      console.error('Failed to clear saved user:', error);
    }
  }

  const player = useVideoPlayer(require('../../assets/login/afhome.mp4'), p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  function validate() {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = 'Username or email is required.';
    if (!password) next.password = 'Password is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSignIn() {
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      if (!response.user && !response.accessToken && !response.token) {
        Toast.show({ type: 'error', text1: 'Login failed', text2: 'Invalid credentials.' });
        return;
      }
      if (rememberMe && response.user) {
        await saveUserCredentials(response.user);
      }
      Toast.show({ type: 'success', text1: 'Login successful!' });
      setTimeout(() => onAuthenticated?.(response.user, response.token ?? response.accessToken), 700);
    } catch (error: any) {
      if (error.type === '2FA_REQUIRED') {
        setAuthToken(error.token);
        setAuthStep('2fa');
        Toast.show({ type: 'info', text1: 'OTP required', text2: error.message });
      } else if (error.type === 'MFA_APPROVAL_REQUIRED') {
        setAuthToken(error.token);
        setAuthStep('mfa');
        Toast.show({ type: 'info', text1: 'MFA approval required', text2: error.message });
        startMfaPolling();
      } else {
        Toast.show({ type: 'error', text1: 'Login failed', text2: error.message || 'Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRememberedUserLogin() {
    if (!password.trim()) {
      setErrors({ password: 'Password is required.' });
      return;
    }
    if (!savedUser?.email) return;
    setLoading(true);
    try {
      const response = await authService.login(savedUser.email, password);
      if (!response.user && !response.accessToken && !response.token) {
        Toast.show({ type: 'error', text1: 'Login failed', text2: 'Invalid credentials.' });
        return;
      }
      Toast.show({ type: 'success', text1: 'Login successful!' });
      setTimeout(() => onAuthenticated?.(response.user, response.token ?? response.accessToken), 700);
    } catch (error: any) {
      if (error.type === '2FA_REQUIRED') {
        setAuthToken(error.token);
        setAuthStep('2fa');
        Toast.show({ type: 'info', text1: 'OTP required', text2: error.message });
      } else if (error.type === 'MFA_APPROVAL_REQUIRED') {
        setAuthToken(error.token);
        setAuthStep('mfa');
        Toast.show({ type: 'info', text1: 'MFA approval required', text2: error.message });
        startMfaPolling();
      } else {
        Toast.show({ type: 'error', text1: 'Login failed', text2: error.message || 'Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
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
      const authenticated = await BiometricUtils.authenticate();
      if (!authenticated) {
        setBiometricLoading(false);
        return;
      }

      const credential = await BiometricUtils.getBiometricCredential();
      if (!credential) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Biometric credential not found. Please enable biometric login first.' });
        setBiometricLoading(false);
        return;
      }

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/auth/mobile/login-biometric`,
        {
          device_id: credential.device_id,
          credential_token: credential.credential_token,
        }
      );

      const user = response.data?.user ?? response.data?.data?.user;
      const token = response.data?.token ?? response.data?.data?.token;

      Toast.show({
        type: 'success',
        text1: 'Login Successful',
        text2: `Welcome, ${user?.name || user?.email || 'User'}!`,
        duration: 2000,
      });

      setTimeout(() => {
        onAuthenticated?.(user, token);
      }, 700);
    } catch (error: any) {
      console.error('[LoginScreen] Biometric login failed:', error);
      Toast.show({ type: 'error', text1: 'Login Error', text2: error.response?.data?.message || 'Biometric login failed. Please try again.' });
    } finally {
      setBiometricLoading(false);
    }
  }

  async function handle2FAVerify() {
    if (!otp.trim()) {
      setOtpError('Please enter the OTP code');
      return;
    }
    setLoading(true);
    setOtpError('');
    try {
      const twoFaResult = await authService.verify2FA(authToken!, otp);
      Toast.show({ type: 'success', text1: '2FA verification successful!' });
      setTimeout(() => {
        setAuthStep('login');
        setOtp('');
        setAuthToken(null);
        setOtpError('');
        onAuthenticated?.(twoFaResult.user, twoFaResult.token ?? twoFaResult.accessToken);
      }, 700);
    } catch (error: any) {
      setOtpError(error.message || '2FA verification failed');
      setOtp('');
      setTimeout(() => otpInputRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend2FA() {
    setLoading(true);
    try {
      await authService.resend2FA(authToken!);
      setOtpError('');
      Toast.show({ type: 'success', text1: 'OTP resent successfully' });
    } catch (error: any) {
      setOtpError(error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  }

  function startMfaPolling() {
    setMfaPolling(true);
    const interval = setInterval(async () => {
      try {
        const status = await authService.checkMFAStatus(authToken!);
        if (status.approved) {
          clearInterval(interval);
          setMfaPolling(false);
          Toast.show({ type: 'success', text1: 'MFA approved!', text2: 'Login successful.' });
          setTimeout(() => {
            setAuthStep('login');
            setAuthToken(null);
            onAuthenticated?.();
          }, 700);
        }
      } catch (error: any) {
        clearInterval(interval);
        setMfaPolling(false);
        Toast.show({ type: 'error', text1: 'MFA check failed', text2: error.message || 'Please try again.' });
      }
    }, 3000);
  }

  async function handleResendMFA() {
    setLoading(true);
    try {
      await authService.resendMFA(authToken!);
      Toast.show({ type: 'success', text1: 'MFA email resent' });
      startMfaPolling();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Failed to resend MFA', text2: error.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  }


  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -100 : 0}
      >
        <View style={styles.spacer} />
        <LinearGradient
          colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 1)']}
          locations={[0, 0.4, 1]}
          style={styles.gradient}
          pointerEvents="none"
        />
        <SafeAreaView style={styles.contentSection} edges={[]}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backButton} onPress={onGoToIndex}>
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </Pressable>
            <View style={styles.logoSection}>
              <Image
                source={require('../../assets/home_logo.png')}
                style={styles.homeLogoImage}
                resizeMode="contain"
              />
              <Text style={styles.homeLogoText}>Home</Text>
            </View>
          </View>

          <View style={styles.headingSection}>
            <Text style={styles.heading}>Welcome back!</Text>
            <Text style={styles.subheading}>Sign in to your AF Home account</Text>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {showRememberedUserUI && savedUser ? (
              <>
                <View style={styles.profileSection}>
                  {savedUser.avatar_url ? (
                    <Image source={{ uri: savedUser.avatar_url }} style={styles.profilePicture} />
                  ) : (
                    <View style={styles.profilePictureDefault}>
                      <Text style={styles.profilePictureDefaultText}>{savedUser.name?.charAt(0).toUpperCase() || '?'}</Text>
                    </View>
                  )}
                  <Text style={styles.profileName}>{savedUser.name}</Text>
                  <Text style={styles.profileEmail}>{savedUser.email}</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={[styles.passwordRow, errors.password ? styles.inputError : null]}>
                    <TextInput style={styles.passwordInput} value={password} onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: undefined })); }} placeholderTextColor={Colors.textSecondary} secureTextEntry={!showPassword} autoComplete="password" onSubmitEditing={handleRememberedUserLogin} />
                    <TouchableOpacity onPress={() => setShowPassword(v => !v)}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} /></TouchableOpacity>
                  </View>
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>
                <Button title="Sign in" onPress={handleRememberedUserLogin} loading={loading} style={styles.signInBtn} />
                <TouchableOpacity style={styles.notYouButton} onPress={clearSavedUser} disabled={loading}>
                  <Text style={styles.notYouText}>Not you? Use a different account</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Username or Email</Text>
                  <View style={[styles.emailRow, errors.email ? styles.inputError : null]}>
                    <TextInput style={styles.emailInput} value={email} onChangeText={t => { setEmail(t); setErrors(e => ({ ...e, email: undefined })); }} placeholderTextColor={Colors.textSecondary} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                    <TouchableOpacity onPress={handleBiometricLogin} disabled={biometricLoading}>
                      <Ionicons name="finger-print" size={20} color={biometricLoading ? Colors.textSecondary : Colors.sky} />
                    </TouchableOpacity>
                  </View>
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={[styles.passwordRow, errors.password ? styles.inputError : null]}>
                    <TextInput style={styles.passwordInput} value={password} onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: undefined })); }} placeholderTextColor={Colors.textSecondary} secureTextEntry={!showPassword} autoComplete="password" onSubmitEditing={handleSignIn} />
                    <TouchableOpacity onPress={() => setShowPassword(v => !v)}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} /></TouchableOpacity>
                  </View>
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>
                <View style={styles.rememberMeRow}>
                  <TouchableOpacity style={styles.checkboxRow} onPress={() => setRememberMe(v => !v)} activeOpacity={0.7}>
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe && <Ionicons name="checkmark" size={12} color={Colors.white} />}
                    </View>
                    <Text style={styles.rememberMeText}>Remember me</Text>
                  </TouchableOpacity>
                </View>
                <Button title="Sign in" onPress={handleSignIn} loading={loading} style={styles.signInBtn} />

                <View style={styles.signupLinkSection}>
                  <Text style={styles.signupText}>Don't have an account?{' '}</Text>
                  <TouchableOpacity onPress={onGoToSignup}>
                    <Text style={styles.signupLink}>Sign up</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <Modal visible={authStep === '2fa'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Two-Factor Authentication</Text>
            <Text style={styles.modalSubtitle}>Enter the OTP code sent to your email</Text>
            <TextInput
              ref={otpInputRef}
              style={styles.otpInput}
              value={otp}
              onChangeText={text => {
                setOtp(text);
                if (otpError) setOtpError('');
              }}
              placeholder="Enter OTP"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}
            <Button title="Verify" onPress={handle2FAVerify} loading={loading} style={styles.modalButton} />
            <TouchableOpacity style={styles.modalLink} onPress={handleResend2FA} disabled={loading}><Text style={styles.modalLinkText}>Resend OTP</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalLink} onPress={() => { setAuthStep('login'); setOtp(''); setAuthToken(null); setOtpError(''); }}><Text style={styles.modalLinkText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={authStep === 'mfa'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>MFA Approval Required</Text>
            <Text style={styles.modalSubtitle}>Check your email for the approval link</Text>
            {mfaPolling ? <Text style={styles.modalPolling}>Waiting for approval...</Text> : null}
            <TouchableOpacity style={styles.modalLink} onPress={handleResendMFA} disabled={loading}><Text style={styles.modalLinkText}>Resend Email</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalLink} onPress={() => { setAuthStep('login'); setAuthToken(null); setMfaPolling(false); setOtpError(''); }}><Text style={styles.modalLinkText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  container: { flex: 1, justifyContent: 'flex-end' },
  spacer: { flex: 1 },
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
    paddingBottom: 12,
    gap: 20,
    zIndex: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homeLogoImage: {
    width: 50,
    height: 50,
  },
  homeLogoText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.white,
    marginTop: 6,
  },
  headingSection: {
    gap: 4,
    alignItems: 'flex-start',
  },
  heading: { fontSize: 28, fontWeight: '700', fontStyle: 'italic', color: Colors.white, letterSpacing: 0.2, textAlign: 'left', textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  subheading: { fontSize: 18, fontWeight: '400', fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 18, textAlign: 'left' },
  scrollContent: {
    paddingBottom: 12,
  },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: 6 },
  input: { height: 48, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 10, paddingHorizontal: 14, fontSize: 15, color: Colors.white },
  emailRow: { flexDirection: 'row', alignItems: 'center', height: 48, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 10, paddingLeft: 14, paddingRight: 12 },
  emailInput: { flex: 1, fontSize: 15, color: Colors.white },
  inputError: { borderColor: Colors.error },
  errorText: { fontSize: 12, color: '#ff6b6b', marginTop: 5, marginLeft: 2 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', height: 48, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 10, paddingLeft: 14, paddingRight: 12 },
  passwordInput: { flex: 1, fontSize: 15, color: Colors.white },
  signInBtn: { borderRadius: 10 },
  profileSection: { alignItems: 'center', marginBottom: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.2)' },
  profilePicture: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  profilePictureDefault: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.sky, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profilePictureDefaultText: { fontSize: 32, fontWeight: '800', color: Colors.white },
  profileName: { fontSize: 18, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  profileEmail: { fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' },
  rememberMeRow: { marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  checkboxChecked: { backgroundColor: Colors.sky, borderColor: Colors.sky },
  rememberMeText: { fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500' },
  notYouButton: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  notYouText: { fontSize: 13, color: Colors.sky, fontWeight: '600' },
  signupLinkSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 16 },
  signupText: { fontSize: 14, fontWeight: '500', color: 'rgba(255, 255, 255, 0.8)' },
  signupLink: { fontSize: 14, fontWeight: '700', color: Colors.white, textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.white, borderRadius: 20, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20, textAlign: 'center' },
  modalPolling: { fontSize: 13, color: '#0ea5e9', marginBottom: 20 },
  otpInput: { width: '100%', height: 48, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.inputBorder, borderRadius: 10, paddingHorizontal: 16, fontSize: 18, color: Colors.text, textAlign: 'center', letterSpacing: 4, marginBottom: 16 },
  otpErrorText: { fontSize: 13, color: Colors.error, marginBottom: 12, textAlign: 'center' },
  modalButton: { width: '100%', marginBottom: 8, borderRadius: 10, height: 48 },
  modalLink: { paddingVertical: 8 },
  modalLinkText: { color: '#0ea5e9', fontWeight: '600' },
});
