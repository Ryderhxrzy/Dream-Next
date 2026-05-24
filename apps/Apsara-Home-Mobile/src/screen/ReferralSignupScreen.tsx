import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/colors';
import Button from '../components/Button/PrimaryButton';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';

interface ReferralSignupScreenProps {
  referrerUsername: string;
  isDarkMode?: boolean;
  pendingOtpEmail?: string;
  pendingOtpToken?: string;
  onBack: () => void;
  onContinueToOtp?: (email: string, verificationToken: string) => void;
  onResumOtp?: () => void;
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <View style={[{
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: met ? '#22c55e' : '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
      }]}>
        {met && <Ionicons name="checkmark" size={14} color={Colors.white} />}
      </View>
      <Text style={{ color: met ? '#22c55e' : Colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
        {label}
      </Text>
    </View>
  );
}

export default function ReferralSignupScreen({
  referrerUsername,
  isDarkMode = false,
  pendingOtpEmail,
  pendingOtpToken,
  onBack,
  onContinueToOtp,
  onResumOtp,
}: ReferralSignupScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [termsScrolledToEnd, setTermsScrolledToEnd] = useState(false);
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    email: '',
    username: '',
    referralCode: referrerUsername,
    password: '',
    passwordConfirmation: '',
  });

  const passwordRequirements = {
    minLength: signupData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(signupData.password),
    hasLowercase: /[a-z]/.test(signupData.password),
    hasNumber: /\d/.test(signupData.password),
    passwordsMatch: signupData.password === signupData.passwordConfirmation && signupData.password.length > 0,
  };

  const allPasswordRequirementsMet = Object.values(passwordRequirements).every(v => v);

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fbff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
  };

  // Load saved form data from storage on component mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const saved = await storageService.getItem('referral_signup_draft');
        if (saved && saved.trim() !== '') {
          const parsed = JSON.parse(saved);
          setSignupData(prev => ({
            firstName: parsed.firstName || '',
            lastName: parsed.lastName || '',
            mobileNumber: parsed.mobileNumber || '',
            email: parsed.email || '',
            username: parsed.username || '',
            referralCode: referrerUsername || parsed.referralCode || '',
            password: parsed.password || '',
            passwordConfirmation: parsed.passwordConfirmation || '',
          }));
        } else if (referrerUsername) {
          // Only set referral code if no saved data
          setSignupData(prev => ({
            ...prev,
            referralCode: referrerUsername,
          }));
        }
      } catch (error) {
        console.log('Could not load saved form data');
      }
    };
    loadSavedData();
  }, []);

  // Save form data to storage whenever it changes
  useEffect(() => {
    const saveDraft = async () => {
      try {
        await storageService.setItem('referral_signup_draft', JSON.stringify(signupData));
      } catch (error) {
        console.log('Could not save form draft');
      }
    };
    saveDraft();
  }, [signupData]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => backHandler.remove();
  }, [onBack]);

  function formatPhoneNumber(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  }

  function validate() {
    const next: Record<string, string> = {};
    const phoneDigits = signupData.mobileNumber.replace(/\D/g, '');
    if (!signupData.firstName.trim()) next.firstName = 'First name is required.';
    if (!signupData.lastName.trim()) next.lastName = 'Last name is required.';
    if (!signupData.email.trim()) next.email = 'Email is required.';
    if (!signupData.username.trim()) next.username = 'Username is required.';
    if (phoneDigits.length !== 11) next.mobileNumber = 'Use 11 digits only.';
    if (signupData.password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (signupData.passwordConfirmation !== signupData.password) next.passwordConfirmation = 'Passwords do not match.';
    if (!acceptedTerms) next.terms = 'Please agree to the Terms and Conditions.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        first_name: signupData.firstName,
        last_name: signupData.lastName,
        middle_name: '',
        name: `${signupData.firstName} ${signupData.lastName}`.trim(),
        email: signupData.email,
        username: signupData.username,
        phone: signupData.mobileNumber,
        birth_date: '2000-01-01',
        gender: 'male',
        occupation: 'Not specified',
        work_location: 'local',
        country: 'Philippines',
        referred_by: signupData.referralCode,
        password: signupData.password,
        password_confirmation: signupData.passwordConfirmation,
        address: 'Not specified',
        barangay: 'Not specified',
        city: 'Not specified',
        province: 'Not specified',
        region: 'Not specified',
        zip_code: '0000',
      };
      const response = await authService.mobileRegister(payload);
      if (response.requires_otp && response.verification_token) {
        // Clear saved draft after successful registration
        await storageService.setItem('referral_signup_draft', '');
        Toast.show({
          type: 'success',
          text1: response.message || 'Registration successful',
          text2: 'A 4-digit verification code has been sent to your email.',
        });
        setTimeout(() => {
          onContinueToOtp?.(response.email, response.verification_token);
        }, 900);
      }
    } catch (error: any) {
      setErrors({ form: error.message || 'Registration failed' });
      Toast.show({
        type: 'error',
        text1: 'Registration failed',
        text2: error.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  function openTermsModal() {
    setTermsScrolledToEnd(false);
    setTermsModalVisible(true);
  }

  function handleTermsScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 24) {
      setTermsScrolledToEnd(true);
    }
  }

  const fields: Array<{ key: keyof typeof signupData; label: string; half?: boolean; keyboard?: any; disabled?: boolean }> = [
    { key: 'firstName', label: 'First Name', half: true },
    { key: 'lastName', label: 'Last Name', half: true },
    { key: 'mobileNumber', label: 'Mobile Number', keyboard: 'phone-pad', half: true },
    { key: 'email', label: 'Email Address', keyboard: 'email-address', half: true },
    { key: 'username', label: 'Username', half: true },
    { key: 'referralCode', label: 'Referral Code', half: true, disabled: !!referrerUsername },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['rgba(59,130,246,0.15)', 'rgba(31,41,55,0)'] : ['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.containerBg }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerGreeting, { color: colors.text }]}>
              Register
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSec }]}>
              Complete your registration
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {Array.from({ length: Math.ceil(fields.length / 2) }).map((_, rowIndex) => {
            const field1 = fields[rowIndex * 2];
            const field2 = fields[rowIndex * 2 + 1];
            return (
              <View key={`row-${rowIndex}`} style={styles.fieldRow}>
                {field1 && (
                  <View style={[styles.fieldWrap, field1.half && styles.halfField]}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {field1.label} <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { color: colors.text, borderColor: colors.border, backgroundColor: field1.disabled ? colors.border : 'transparent' },
                        errors[field1.key] ? styles.inputError : null,
                      ]}
                      value={signupData[field1.key]}
                      onChangeText={t => {
                        const formatted = field1.key === 'mobileNumber' ? formatPhoneNumber(t) : t;
                        setSignupData(v => ({ ...v, [field1.key]: formatted }));
                      }}
                      placeholderTextColor={colors.textSec}
                      keyboardType={field1.keyboard}
                      autoCapitalize={field1.key === 'email' || field1.key === 'username' ? 'none' : 'words'}
                      editable={!field1.disabled}
                    />
                    {field1.key === 'mobileNumber' ? <Text style={[styles.hint, { color: colors.textSec }]}>Use 11 digits only. Format 0929-226-0447.</Text> : null}
                    {field1.key === 'username' ? <Text style={[styles.hint, { color: colors.textSec }]}>Letters and numbers only, no spaces or symbols.</Text> : null}
                    {field1.key === 'referralCode' ? <Text style={[styles.hint, { color: colors.textSec }]}>{referrerUsername ? 'Pre-filled from your referral link.' : 'Optional - Enter referral code if you have one.'}</Text> : null}
                    {errors[field1.key] ? <Text style={styles.errorText}>{errors[field1.key]}</Text> : null}
                  </View>
                )}
                {field2 && (
                  <View style={[styles.fieldWrap, field2.half && styles.halfField]}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      {field2.label} <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { color: colors.text, borderColor: colors.border, backgroundColor: field2.disabled ? colors.border : 'transparent' },
                        errors[field2.key] ? styles.inputError : null,
                      ]}
                      value={signupData[field2.key]}
                      onChangeText={t => {
                        const formatted = field2.key === 'mobileNumber' ? formatPhoneNumber(t) : t;
                        setSignupData(v => ({ ...v, [field2.key]: formatted }));
                      }}
                      placeholderTextColor={colors.textSec}
                      keyboardType={field2.keyboard}
                      autoCapitalize={field2.key === 'email' || field2.key === 'username' ? 'none' : 'words'}
                      editable={!field2.disabled}
                    />
                    {field2.key === 'mobileNumber' ? <Text style={[styles.hint, { color: colors.textSec }]}>Use 11 digits only. Format 0929-226-0447.</Text> : null}
                    {field2.key === 'username' ? <Text style={[styles.hint, { color: colors.textSec }]}>Letters and numbers only, no spaces or symbols.</Text> : null}
                    {errors[field2.key] ? <Text style={styles.errorText}>{errors[field2.key]}</Text> : null}
                  </View>
                )}
              </View>
            );
          })}

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.text }]}>Password <Text style={styles.required}>*</Text></Text>
            <View style={[styles.passwordRow, { borderColor: colors.border }, errors.password ? styles.inputError : null]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                value={signupData.password}
                onChangeText={t => setSignupData(v => ({ ...v, password: t }))}
                secureTextEntry={!showPassword}
                placeholderTextColor={colors.textSec}
                autoComplete="new-password"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSec} />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.text }]}>Password Confirmation <Text style={styles.required}>*</Text></Text>
            <View style={[styles.passwordRow, { borderColor: colors.border }, errors.passwordConfirmation ? styles.inputError : null]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                value={signupData.passwordConfirmation}
                onChangeText={t => setSignupData(v => ({ ...v, passwordConfirmation: t }))}
                secureTextEntry={!showConfirmPassword}
                placeholderTextColor={colors.textSec}
                autoComplete="new-password"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)}>
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSec} />
              </TouchableOpacity>
            </View>
            {errors.passwordConfirmation ? <Text style={styles.errorText}>{errors.passwordConfirmation}</Text> : null}
          </View>

          {/* Password Requirements */}
          <View style={[styles.requirementsBox, { borderColor: colors.border, backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.08)' }]}>
            <View style={styles.requirementsGrid}>
              <View style={styles.requirementLine}>
                <Text style={[styles.requirementCheck, { color: passwordRequirements.minLength ? '#22c55e' : '#9ca3af' }]}>
                  {passwordRequirements.minLength ? '✓' : '○'}
                </Text>
                <Text style={[styles.requirementText, { color: passwordRequirements.minLength ? '#22c55e' : colors.textSec }]}>
                  At least 8 chars
                </Text>
              </View>
              <Text style={[styles.separator, { color: colors.border }]}>•</Text>
              <View style={styles.requirementLine}>
                <Text style={[styles.requirementCheck, { color: passwordRequirements.hasUppercase ? '#22c55e' : '#9ca3af' }]}>
                  {passwordRequirements.hasUppercase ? '✓' : '○'}
                </Text>
                <Text style={[styles.requirementText, { color: passwordRequirements.hasUppercase ? '#22c55e' : colors.textSec }]}>
                  At least one Uppercase
                </Text>
              </View>
              <Text style={[styles.separator, { color: colors.border }]}>•</Text>
              <View style={styles.requirementLine}>
                <Text style={[styles.requirementCheck, { color: passwordRequirements.hasLowercase ? '#22c55e' : '#9ca3af' }]}>
                  {passwordRequirements.hasLowercase ? '✓' : '○'}
                </Text>
                <Text style={[styles.requirementText, { color: passwordRequirements.hasLowercase ? '#22c55e' : colors.textSec }]}>
                  At least one Lowercase
                </Text>
              </View>
              <Text style={[styles.separator, { color: colors.border }]}>•</Text>
              <View style={styles.requirementLine}>
                <Text style={[styles.requirementCheck, { color: passwordRequirements.hasNumber ? '#22c55e' : '#9ca3af' }]}>
                  {passwordRequirements.hasNumber ? '✓' : '○'}
                </Text>
                <Text style={[styles.requirementText, { color: passwordRequirements.hasNumber ? '#22c55e' : colors.textSec }]}>
                  At least one Number
                </Text>
              </View>
              <Text style={[styles.separator, { color: colors.border }]}>•</Text>
              <View style={styles.requirementLine}>
                <Text style={[styles.requirementCheck, { color: passwordRequirements.passwordsMatch ? '#22c55e' : '#9ca3af' }]}>
                  {passwordRequirements.passwordsMatch ? '✓' : '○'}
                </Text>
                <Text style={[styles.requirementText, { color: passwordRequirements.passwordsMatch ? '#22c55e' : colors.textSec }]}>
                  Should be Match
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.termsBox, { borderColor: colors.border }]}>
            <TouchableOpacity style={styles.checkboxRow} onPress={openTermsModal} activeOpacity={0.7}>
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && <Ionicons name="checkmark" size={11} color={Colors.white} />}
              </View>
              <Text style={[styles.termsText, { color: colors.text }]}>
                I have read and agree to the <Text style={styles.linkText}>Terms and Conditions</Text>.
              </Text>
            </TouchableOpacity>
          </View>

          {errors.form ? <Text style={styles.errorText}>{errors.form}</Text> : null}

          {pendingOtpEmail && pendingOtpToken ? (
            <>
              <Button
                title="CONTINUE VERIFICATION"
                onPress={onResumOtp}
                style={[styles.signUpBtn, { backgroundColor: Colors.sky }]}
              />
              <Button
                title="START OVER"
                onPress={() => {
                  setSignupData({
                    firstName: '',
                    lastName: '',
                    mobileNumber: '',
                    email: '',
                    username: '',
                    referralCode: referrerUsername,
                    password: '',
                    passwordConfirmation: '',
                  });
                  setAcceptedTerms(false);
                }}
                style={styles.signUpBtn}
              />
            </>
          ) : (
            <Button
              title="SIGN UP"
              onPress={handleRegister}
              loading={loading}
              disabled={!acceptedTerms}
              style={styles.signUpBtn}
            />
          )}

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={termsModalVisible} transparent animationType="fade" onRequestClose={() => setTermsModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.termsModalContent, { backgroundColor: colors.containerBg }]}>
            <View style={styles.termsModalHeader}>
              <Text style={[styles.termsModalTitle, { color: colors.text }]}>Terms and Conditions</Text>
              <TouchableOpacity onPress={() => setTermsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.termsModalSubtitle, { color: colors.textSec }]}>The following are the latest Terms and Conditions of AF Home.</Text>
            <ScrollView
              style={styles.termsModalScroll}
              contentContainerStyle={styles.termsModalScrollContent}
              showsVerticalScrollIndicator
              onScroll={handleTermsScroll}
              scrollEventThrottle={16}
            >
              <Text style={[styles.termsParagraphTitle, { color: colors.text }]}>1. Independent Distributor Agreement</Text>
              <Text style={[styles.termsParagraph, { color: colors.textSec }]}>By becoming a distributor of our company, you agree to be bound by the terms and conditions outlined in this agreement. You acknowledge that you are an independent contractor and not an employee, partner, or agent of the company.</Text>

              <Text style={[styles.termsParagraphTitle, { color: colors.text }]}>2. Distributor Obligations</Text>
              <Text style={[styles.termsParagraph, { color: colors.textSec }]}>As a distributor, you agree to adhere to all applicable laws, regulations, and ethical guidelines in promoting and selling our products and services, represent the company honestly and accurately, maintain a positive and professional image, and attend company-provided training and development programs.</Text>

              <Text style={[styles.termsParagraphTitle, { color: colors.text }]}>3. Compensation Plan</Text>
              <Text style={[styles.termsParagraph, { color: colors.textSec }]}>Our company uses a compensation plan that rewards distributors for sales and building a network. The details of the compensation plan, including commission structure, bonus eligibility, and qualification criteria, are outlined in a separate document, which is an integral part of these terms and conditions.</Text>

              <Text style={[styles.termsParagraphTitle, { color: colors.text }]}>4. Product Purchase Requirements</Text>
              <Text style={[styles.termsParagraph, { color: colors.textSec }]}>To remain an active distributor and qualify for commissions and bonuses, you are required to meet monthly or quarterly product purchase requirements. These requirements may include personal consumption and or retail sales requirements. Failure to meet these requirements may result in the loss of commissions and bonuses.</Text>

              <Text style={[styles.termsParagraphTitle, { color: colors.text }]}>5. Downline Structure</Text>
              <Text style={[styles.termsParagraph, { color: colors.textSec }]}>You may build and manage a network of distributors, commonly referred to as your downline. You understand that your commissions and bonuses may be based on the sales performance and activities of your downline. However, you are responsible for training, supporting, and motivating your downline members.</Text>

              <Text style={[styles.termsParagraphTitle, { color: colors.text }]}>6. Termination and Resignation</Text>
              <Text style={[styles.termsParagraph, { color: colors.textSec }]}>Either party may terminate this agreement at any time with written notice. You understand that in the event of termination or resignation, you will no longer be eligible to receive commissions, bonuses, or other benefits associated with the MLM business.</Text>

              <Text style={[styles.termsParagraphTitle, { color: colors.text }]}>7. Intellectual Property</Text>
              <Text style={[styles.termsParagraph, { color: colors.textSec }]}>All trademarks, logos, copyrighted materials, and other intellectual property owned by the company are protected and may not be used without written permission. Any unauthorized use of company intellectual property may result in legal action.</Text>

              <Text style={[styles.termsParagraphTitle, { color: colors.text }]}>8. Non-Disparagement</Text>
              <Text style={[styles.termsParagraph, { color: colors.textSec }]}>During and after the term of this agreement, you agree not to make any disparaging or defamatory statements about the company, its products, or other distributors. Violation of this clause may result in termination and legal consequences.</Text>

              <Text style={[styles.termsParagraphTitle, { color: colors.text }]}>9. Product Returns and Refunds</Text>
              <Text style={[styles.termsParagraph, { color: colors.textSec }]}>Our company has a product return policy that allows customers to request refunds or exchanges within a specified time frame. You understand that you are responsible for handling customer returns and refunds, and any costs associated with the process.</Text>

              <Text style={[styles.termsParagraphTitle, { color: colors.text }]}>10. Governing Law and Jurisdiction</Text>
              <Text style={[styles.termsParagraph, { color: colors.textSec }]}>This agreement shall be governed by and construed in accordance with the laws of the Philippines. Any disputes arising from this agreement shall be subject to the exclusive jurisdiction of the courts of the Philippines.</Text>
              <Text style={[styles.termsParagraph, { color: colors.textSec }]}>By signing below or by accepting these terms and conditions electronically, you acknowledge that you have read, understood, and agreed to abide by the terms and conditions of AF Home.</Text>
              <Text style={[styles.termsParagraph, { color: colors.textSec }]}>Need clarification? Reach us anytime through the Contact Us page.</Text>
            </ScrollView>
            <View style={[styles.termsModalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={[styles.termsCloseBtn, { borderColor: colors.border }]} onPress={() => setTermsModalVisible(false)}>
                <Text style={[styles.termsCloseBtnText, { color: colors.text }]}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.termsAcceptBtn, !termsScrolledToEnd && styles.termsAcceptBtnDisabled]}
                disabled={!termsScrolledToEnd}
                onPress={() => {
                  setAcceptedTerms(true);
                  setTermsModalVisible(false);
                }}
              >
                <Text style={styles.termsAcceptBtnText}>{termsScrolledToEnd ? 'I Agree' : 'Scroll to enable'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerGreeting: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 900,
    marginHorizontal: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  spacer: {
    height: 40,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    width: '100%',
  },
  fieldWrap: {
    flex: 1,
    width: '100%',
  },
  halfField: {
    flex: 0.5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 4,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  hint: {
    fontSize: 12,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 4,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
  },
  termsBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.sky,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.sky,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  linkText: {
    color: Colors.sky,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signUpBtn: {
    marginTop: 12,
    marginBottom: 16,
  },
  spacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  termsModalContent: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    overflow: 'hidden',
    flex: 1,
    flexDirection: 'column',
  },
  termsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  termsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  termsModalSubtitle: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  termsModalScroll: {
    flex: 1,
  },
  termsModalScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  termsParagraphTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  termsParagraph: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  termsModalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  termsCloseBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsCloseBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  termsAcceptBtn: {
    flex: 1,
    height: 48,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsAcceptBtnDisabled: {
    opacity: 0.5,
  },
  termsAcceptBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  requirementsBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  requirementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  requirementLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requirementCheck: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 16,
  },
  requirementText: {
    fontSize: 11,
    fontWeight: '500',
  },
  separator: {
    fontSize: 10,
    fontWeight: '400',
  },
});
