import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import Button from '../components/Button/PrimaryButton';
import { authService } from '../services/authService';

export default function OtpScreen({
  email,
  verificationToken,
  onBackToSignup,
  onSuccess,
}: {
  email: string;
  verificationToken: string;
  onBackToSignup?: () => void;
  onSuccess?: () => void;
}) {
  const [code, setCode] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resendSeconds, setResendSeconds] = useState(50);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const player = useVideoPlayer(require('../../assets/login/home-login.mp4'), p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const maskedEmail = useMemo(() => {
    if (!email) return 'jd***@gmail.com';
    const [name, domain] = email.split('@');
    const maskedName = name ? `${name.slice(0, 2)}***` : 'jd***';
    return `${maskedName}@${domain || 'gmail.com'}`;
  }, [email]);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendSeconds(seconds => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  function updateCode(index: number, value: string) {
    const digits = value.replace(/\D/g, '');
    const next = [...code];

    if (digits.length > 1) {
      const chars = digits.slice(0, 4).split('');
      for (let i = 0; i < 4; i += 1) {
        next[i] = chars[i] || '';
      }
      setCode(next);
      const focusIndex = Math.min(chars.length, 3);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    next[index] = digits.slice(-1);
    setCode(next);

    if (digits && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleResend() {
    setResendSeconds(50);
    setMessage('A new verification code has been sent.');
  }

  async function handleVerify() {
    const otp = code.join('');
    if (otp.length !== 4) {
      setMessage('Please enter the 4-digit code.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await authService.verifyRegisterOtp(verificationToken, otp);
      onSuccess?.();
    } catch (error: any) {
      setMessage(error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={styles.tabs}>
                <Pressable style={styles.tab}>
                  <Text style={styles.tabText}>Sign In</Text>
                </Pressable>
                <Pressable style={[styles.tab, styles.tabActive]}>
                  <Text style={[styles.tabText, styles.tabTextActive]}>Sign Up</Text>
                </Pressable>
              </View>

              <Text style={styles.heading}>Let&apos;s Get Started!</Text>
              <Text style={styles.subheading}>Enter the 4-digit code we sent to your email to finish your registration.</Text>

              <View style={styles.iconWrap}>
                <View style={styles.iconCircle}>
                  <Ionicons name="mail-outline" size={30} color="#0ea5e9" />
                </View>
              </View>

              <Text style={styles.centerTitle}>Check your Email</Text>
              <Text style={styles.centerSubtitle}>We sent a 4-digit verification code to</Text>
              <Text style={styles.emailText}>{maskedEmail}</Text>

              <View style={styles.codeRow}>
                {code.map((value, index) => (
                  <TextInput
                    key={index}
                    ref={ref => { inputRefs.current[index] = ref; }}
                    style={styles.codeInput}
                    value={value}
                    onChangeText={text => updateCode(index, text)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    autoFocus={index === 0}
                  />
                ))}
              </View>

              {message ? <Text style={styles.messageText}>{message}</Text> : null}

              <Button title="VERIFY CODE" onPress={handleVerify} loading={loading} style={styles.verifyBtn} />

              <View style={styles.bottomRow}>
                <TouchableOpacity onPress={onBackToSignup}>
                  <Text style={styles.backText}>Back to sign up</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleResend} disabled={resendSeconds > 0}>
                  <Text style={[styles.resendText, resendSeconds > 0 && styles.resendDisabled]}>
                    {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fbff' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(248, 251, 255, 0.72)' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 820, backgroundColor: Colors.white, borderRadius: 18, padding: 24, borderWidth: 1, borderColor: '#e5e7eb' },
  tabs: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 14, padding: 4, marginBottom: 32 },
  tab: { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#0ea5e9' },
  tabText: { fontSize: 15, fontWeight: '700', color: '#4b5563' },
  tabTextActive: { color: Colors.white },
  heading: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  subheading: { fontSize: 14, color: Colors.textSecondary, marginBottom: 26 },
  iconWrap: { alignItems: 'center', marginBottom: 18 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#dff3ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#9bd8ff' },
  centerTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  centerSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  emailText: { fontSize: 13, color: '#0ea5e9', textAlign: 'center', marginTop: 4, fontWeight: '700' },
  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 32, marginBottom: 20, flexWrap: 'wrap' },
  codeInput: { width: 56, height: 56, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.inputBorder, backgroundColor: Colors.white, fontSize: 22, fontWeight: '700', color: Colors.text },
  messageText: { textAlign: 'center', color: Colors.error, marginBottom: 12 },
  verifyBtn: { borderRadius: 10 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, flexWrap: 'wrap', gap: 10 },
  backText: { fontSize: 13, color: Colors.textSecondary },
  resendText: { fontSize: 13, color: '#0ea5e9' },
  resendDisabled: { color: Colors.textSecondary },
});
