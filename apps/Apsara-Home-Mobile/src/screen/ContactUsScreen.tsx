import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, Animated, Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface ContactUsScreenProps {
  onBack: () => void;
  isDarkMode: boolean;
}

export default function ContactUsScreen({ onBack, isDarkMode }: ContactUsScreenProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = React.useRef(new Animated.Value(100)).current;

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

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
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
            <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>Contact Us</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <ScrollView style={[styles.scroll, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tagline */}
          <View style={[styles.taglineContainer, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.tagline, { color: colors.text }]}>We're here to help.</Text>
            <Text style={[styles.subtitle, { color: colors.textSec }]}>Share your questions, project ideas, or concerns and our team will get back to you as soon as possible.</Text>
          </View>

          {/* Response Time */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Response Time</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>Within 24 hours</Text>
          </View>

          {/* Get In Touch */}
          <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Get In Touch</Text>
            <Text style={[styles.bodyText, { color: colors.textSec }]}>
              Tell us what you need. Send a quick message and we'll reply with the best next step. For urgent concerns, call a branch directly.
            </Text>
          </View>

          {/* Locations */}
          <View>
            <Text style={[styles.locationsTitle, { color: colors.text }]}>AF Home Locations</Text>

            {/* Meycauayan */}
            <View style={[styles.locationCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <View style={styles.locationHeader}>
                <Ionicons name="location" size={20} color={Colors.sky} />
                <Text style={[styles.locationName, { color: colors.text }]}>Meycauayan - Main Office</Text>
              </View>
              <Text style={[styles.locationAddress, { color: colors.textSec }]}>50 altoveros St., Corner Bagbaguin Road, Meycauayan, Bulacan</Text>
              <TouchableOpacity onPress={() => handleCall('09176388535')} style={styles.contactAction}>
                <Ionicons name="call" size={16} color={Colors.sky} />
                <Text style={[styles.contactActionText, { color: Colors.sky }]}>0917 638 8535</Text>
              </TouchableOpacity>
            </View>

            {/* Antipolo */}
            <View style={[styles.locationCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <View style={styles.locationHeader}>
                <Ionicons name="location" size={20} color={Colors.sky} />
                <Text style={[styles.locationName, { color: colors.text }]}>Antipolo Factory Outlet</Text>
              </View>
              <Text style={[styles.locationAddress, { color: colors.textSec }]}>9023 Joyous Heights Subd New York Street Hinapao Barangay San Jose Antipolo City.</Text>
              <TouchableOpacity onPress={() => handleCall('09670550854')} style={styles.contactAction}>
                <Ionicons name="call" size={16} color={Colors.sky} />
                <Text style={[styles.contactActionText, { color: Colors.sky }]}>0967 055 0854</Text>
              </TouchableOpacity>
            </View>

            {/* SM City North EDSA */}
            <View style={[styles.locationCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <View style={styles.locationHeader}>
                <Ionicons name="location" size={20} color={Colors.sky} />
                <Text style={[styles.locationName, { color: colors.text }]}>SM City North EDSA</Text>
              </View>
              <Text style={[styles.locationAddress, { color: colors.textSec }]}>Interior Zone, SM City North EDSA, Bagong Pag-asa, Quezon City, Metro Manila</Text>
              <TouchableOpacity onPress={() => handleCall('09171281921')} style={styles.contactAction}>
                <Ionicons name="call" size={16} color={Colors.sky} />
                <Text style={[styles.contactActionText, { color: Colors.sky }]}>0917 128 1921</Text>
              </TouchableOpacity>
            </View>

            {/* San Pedro, Laguna */}
            <View style={[styles.locationCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <View style={styles.locationHeader}>
                <Ionicons name="location" size={20} color={Colors.sky} />
                <Text style={[styles.locationName, { color: colors.text }]}>San Pedro, Laguna</Text>
              </View>
              <Text style={[styles.locationAddress, { color: colors.textSec }]}>KM 29 MMG Fojas Compound Brgy. San Antonio, San Pedro, Philippines</Text>
              <TouchableOpacity onPress={() => handleCall('09171281921')} style={styles.contactAction}>
                <Ionicons name="call" size={16} color={Colors.sky} />
                <Text style={[styles.contactActionText, { color: Colors.sky }]}>0917 128 1921</Text>
              </TouchableOpacity>
            </View>

            {/* SM Dasmarinas */}
            <View style={[styles.locationCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <View style={styles.locationHeader}>
                <Ionicons name="location" size={20} color={Colors.sky} />
                <Text style={[styles.locationName, { color: colors.text }]}>SM Dasmarinas</Text>
              </View>
              <Text style={[styles.locationAddress, { color: colors.textSec }]}>KM 29 MMG Fojas Compound Brgy. San Antonio, San Pedro, Philippines</Text>
              <TouchableOpacity onPress={() => handleCall('09171281921')} style={styles.contactAction}>
                <Ionicons name="call" size={16} color={Colors.sky} />
                <Text style={[styles.contactActionText, { color: Colors.sky }]}>0917 128 1921</Text>
              </TouchableOpacity>
            </View>

            {/* La Loma */}
            <View style={[styles.locationCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <View style={styles.locationHeader}>
                <Ionicons name="location" size={20} color={Colors.sky} />
                <Text style={[styles.locationName, { color: colors.text }]}>La Loma, Quezon City</Text>
              </View>
              <Text style={[styles.locationAddress, { color: colors.textSec }]}>KM 29 MMG Fojas Compound Brgy. San Antonio, San Pedro, Philippines</Text>
              <TouchableOpacity onPress={() => handleCall('09171281921')} style={styles.contactAction}>
                <Ionicons name="call" size={16} color={Colors.sky} />
                <Text style={[styles.contactActionText, { color: Colors.sky }]}>0917 128 1921</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Support Contacts */}
          <View>
            <Text style={[styles.supportTitle, { color: colors.text }]}>Support Contacts</Text>
            <Text style={[styles.supportSubtitle, { color: colors.textSec }]}>Pick the right contact for faster help.</Text>

            {/* General Support */}
            <View style={[styles.supportCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <Text style={[styles.supportName, { color: colors.text }]}>General Support</Text>
              <TouchableOpacity onPress={() => handleEmail('afhome.team@gmail.com')} style={styles.contactAction}>
                <Ionicons name="mail" size={16} color={Colors.sky} />
                <Text style={[styles.contactActionText, { color: Colors.sky }]}>afhome.team@gmail.com</Text>
              </TouchableOpacity>
              <Text style={[styles.supportNote, { color: colors.textSec }]}>We typically respond within 24 hours.</Text>
            </View>

            {/* Interior Projects & Business */}
            <View style={[styles.supportCard, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
              <Text style={[styles.supportName, { color: colors.text }]}>Interior Projects & Business</Text>
              <TouchableOpacity onPress={() => handleEmail('corpsol.apsara@gmail.com')} style={styles.contactAction}>
                <Ionicons name="mail" size={16} color={Colors.sky} />
                <Text style={[styles.contactActionText, { color: Colors.sky }]}>corpsol.apsara@gmail.com</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleCall('09171623056')} style={styles.contactAction}>
                <Ionicons name="call" size={16} color={Colors.sky} />
                <Text style={[styles.contactActionText, { color: Colors.sky }]}>0917 162 3056</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleCall('09171282559')} style={styles.contactAction}>
                <Ionicons name="call" size={16} color={Colors.sky} />
                <Text style={[styles.contactActionText, { color: Colors.sky }]}>0917 128 2559</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    gap: 16,
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
  section: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  locationsTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  locationCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  locationAddress: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  supportSubtitle: {
    fontSize: 12,
    marginBottom: 12,
    paddingHorizontal: 8,
    lineHeight: 18,
  },
  supportCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  supportName: {
    fontSize: 13,
    fontWeight: '700',
  },
  supportNote: {
    fontSize: 11,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  contactAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
