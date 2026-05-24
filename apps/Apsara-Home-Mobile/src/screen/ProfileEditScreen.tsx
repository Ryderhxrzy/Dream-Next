import React, { useState, useEffect, useRef } from 'react';
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
  FlatList,
  Animated,
  PanResponder,
  Pressable,
  Dimensions,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import axios from 'axios';
import { Colors } from '../constants/colors';
import { API_CONFIG } from '../config/api';
import Button from '../components/Button/PrimaryButton';

interface LocationData {
  code: string;
  name: string;
  zipCode?: string;
}

interface ProfileEditScreenProps {
  user: any;
  onBack: () => void;
  onSave?: (data: any) => Promise<void>;
  isDarkMode?: boolean;
}

const GENDERS = ['Male', 'Female', 'Other'];
const WORK_LOCATIONS = ['Local', 'Overseas'];
const COUNTRIES = ['Philippines', 'United States', 'Canada', 'Australia', 'United Kingdom', 'Other'];

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.6;

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= 1950; i--) {
    years.push(i);
  }
  return years;
};

export default function ProfileEditScreen({
  user,
  onBack,
  onSave,
  isDarkMode = false,
}: ProfileEditScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.first_name || user?.name || '',
    middleName: user?.middle_name || '',
    birthDate: user?.birth_date || '2000-01-01',
    gender: user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1).toLowerCase() : 'Male',
    occupation: user?.occupation || '',
    workLocation: user?.work_location === 'overseas' ? 'Overseas' : 'Local',
    country: user?.country || 'Philippines',
    streetAddress: user?.address || '',
    zipCode: user?.zip_code || '',
    phone: user?.phone || '',
  });

  const [selectedRegion, setSelectedRegion] = useState<LocationData | null>(
    user?.region && user.region !== 'Not specified' ? { code: user.region, name: user.region } : null
  );
  const [selectedProvince, setSelectedProvince] = useState<LocationData | null>(
    user?.province && user.province !== 'Not specified' ? { code: user.province, name: user.province } : null
  );
  const [selectedCity, setSelectedCity] = useState<LocationData | null>(
    user?.city && user.city !== 'Not specified' ? { code: user.city, name: user.city } : null
  );
  const [selectedBarangay, setSelectedBarangay] = useState<LocationData | null>(
    user?.barangay && user.barangay !== 'Not specified' ? { code: user.barangay, name: user.barangay } : null
  );

  const [regions, setRegions] = useState<LocationData[]>([]);
  const [provinces, setProvinces] = useState<LocationData[]>([]);
  const [cities, setCities] = useState<LocationData[]>([]);
  const [barangays, setBarangays] = useState<LocationData[]>([]);

  const [selectedDropdown, setSelectedDropdown] = useState<string | null>(null);
  const [dropdownOptions, setDropdownOptions] = useState<LocationData[]>([]);
  const [dropdownTitle, setDropdownTitle] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'year' | 'month' | 'day'>('year');
  const [tempYear, setTempYear] = useState(2000);
  const [tempMonth, setTempMonth] = useState(0);
  const [tempDay, setTempDay] = useState(1);
  const [isNCRRegion, setIsNCRRegion] = useState(false);

  const modalTranslateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          modalTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100) {
          Animated.timing(modalTranslateY, {
            toValue: MODAL_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => setSelectedDropdown(null));
        } else {
          Animated.spring(modalTranslateY, {
            toValue: 0,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (selectedDropdown) {
      Animated.spring(modalTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }).start();
    } else {
      modalTranslateY.setValue(MODAL_HEIGHT);
    }
  }, [selectedDropdown, modalTranslateY]);

  useEffect(() => {
    fetchRegions();
    const parsedDate = new Date(profileData.birthDate);
    if (!isNaN(parsedDate.getTime())) {
      setTempYear(parsedDate.getFullYear());
      setTempMonth(parsedDate.getMonth());
      setTempDay(parsedDate.getDate());
    }
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => backHandler.remove();
  }, [onBack]);

  const fetchRegions = async () => {
    try {
      setLoadingLocations(true);
      try {
        const url = `${API_CONFIG.BASE_URL}/address/regions`;
        const response = await axios.get(url);
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          const formattedData = response.data.data.map((item: any) => ({
            code: item.code || item.id,
            name: item.name,
          }));
          setRegions(formattedData);
          return;
        }
      } catch (error) {
        console.log('Backend regions failed, trying PSGC');
      }

      const psgcUrl = 'https://psgc.gitlab.io/api/regions/';
      const response = await axios.get(psgcUrl);
      if (response.data && Array.isArray(response.data)) {
        const formattedData = response.data.map((item: any) => ({
          code: item.code,
          name: item.name,
        }));
        setRegions(formattedData);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load regions',
      });
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchProvinces = async (regionCode: string) => {
    try {
      setLoadingLocations(true);
      try {
        const url = `${API_CONFIG.BASE_URL}/address/provinces?region_code=${regionCode}`;
        const response = await axios.get(url);
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          const formattedData = response.data.data.map((item: any) => ({
            code: item.code || item.id,
            name: item.name,
          }));
          setProvinces(formattedData);
          return;
        }
      } catch (error) {
        console.log('Backend provinces failed, trying PSGC');
      }

      const psgcUrl = `https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`;
      const response = await axios.get(psgcUrl);
      if (response.data && Array.isArray(response.data)) {
        const formattedData = response.data.map((item: any) => ({
          code: item.code,
          name: item.name,
        }));
        setProvinces(formattedData);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load provinces',
      });
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchCities = async (provinceCode: string) => {
    try {
      setLoadingLocations(true);
      try {
        const queryParam = isNCRRegion ? 'region_code' : 'province_code';
        const url = `${API_CONFIG.BASE_URL}/address/cities?${queryParam}=${provinceCode}`;
        const response = await axios.get(url);
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          const formattedData = response.data.data.map((item: any) => ({
            code: item.code || item.id,
            name: item.name,
          }));
          setCities(formattedData);
          return;
        }
      } catch (error) {
        console.log('Backend cities failed, trying PSGC');
      }

      const psgcPath = isNCRRegion
        ? `https://psgc.gitlab.io/api/regions/${provinceCode}/cities-municipalities/`
        : `https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`;
      const response = await axios.get(psgcPath);
      if (response.data && Array.isArray(response.data)) {
        const formattedData = response.data.map((item: any) => ({
          code: item.code,
          name: item.name,
        }));
        setCities(formattedData);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load cities',
      });
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchBarangays = async (cityCode: string) => {
    try {
      setLoadingLocations(true);
      try {
        const url = `${API_CONFIG.BASE_URL}/address/barangays?city_code=${cityCode}`;
        const response = await axios.get(url);
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          const formattedData = response.data.data.map((item: any) => ({
            code: item.code || item.id,
            name: item.name,
          }));
          setBarangays(formattedData);
          return;
        }
      } catch (error) {
        console.log('Backend barangays failed, trying PSGC');
      }

      const psgcUrl = `https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`;
      const response = await axios.get(psgcUrl);
      if (response.data && Array.isArray(response.data)) {
        const formattedData = response.data.map((item: any) => ({
          code: item.code,
          name: item.name,
        }));
        setBarangays(formattedData);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load barangays',
      });
    } finally {
      setLoadingLocations(false);
    }
  };

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fbff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
  };

  const openDropdown = (field: string, options: string[] | LocationData[], title: string) => {
    setSelectedDropdown(field);
    const formattedOptions = Array.isArray(options) && typeof options[0] === 'string'
      ? (options as string[]).map(opt => ({ code: opt, name: opt }))
      : options as LocationData[];
    setDropdownOptions(formattedOptions);
    setDropdownTitle(title);
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDatePickerNext = () => {
    if (datePickerMode === 'year') {
      setDatePickerMode('month');
    } else if (datePickerMode === 'month') {
      setDatePickerMode('day');
    }
  };

  const handleDatePickerPrev = () => {
    if (datePickerMode === 'month') {
      setDatePickerMode('year');
    } else if (datePickerMode === 'day') {
      setDatePickerMode('month');
    }
  };

  const handleDatePickerConfirm = () => {
    const formattedDate = formatDate(tempYear, tempMonth, tempDay);
    setProfileData(prev => ({ ...prev, birthDate: formattedDate }));
    setShowDatePicker(false);
    setDatePickerMode('year');
  };

  const selectDropdownOption = (value: LocationData | string) => {
    if (selectedDropdown === 'gender') {
      setProfileData(prev => ({ ...prev, gender: typeof value === 'string' ? value : value.name }));
    } else if (selectedDropdown === 'workLocation') {
      setProfileData(prev => ({ ...prev, workLocation: typeof value === 'string' ? value : value.name }));
    } else if (selectedDropdown === 'country') {
      setProfileData(prev => ({ ...prev, country: typeof value === 'string' ? value : value.name }));
    } else if (selectedDropdown === 'region') {
      const region = typeof value === 'string' ? value : value;
      setSelectedRegion(typeof region === 'string' ? null : region);
      if (typeof region !== 'string') {
        if (region.name.toUpperCase().includes('NATIONAL CAPITAL') || region.name.toUpperCase() === 'NCR') {
          setIsNCRRegion(true);
          setProvinces([{ code: 'NCR', name: 'National Capital Region' }]);
          setSelectedProvince(null);
          setCities([]);
          setBarangays([]);
          setSelectedCity(null);
          setSelectedBarangay(null);
        } else {
          setIsNCRRegion(false);
          fetchProvinces(region.code);
          setSelectedProvince(null);
          setSelectedCity(null);
          setSelectedBarangay(null);
          setCities([]);
          setBarangays([]);
        }
      } else {
        setIsNCRRegion(false);
        setSelectedProvince(null);
        setSelectedCity(null);
        setSelectedBarangay(null);
        setProvinces([]);
        setCities([]);
        setBarangays([]);
      }
    } else if (selectedDropdown === 'province') {
      const province = typeof value === 'string' ? value : value;
      setSelectedProvince(typeof province === 'string' ? null : province);
      if (typeof province !== 'string') {
        if (isNCRRegion && selectedRegion) {
          fetchCities(selectedRegion.code);
        } else {
          fetchCities(province.code);
        }
      }
      setSelectedCity(null);
      setSelectedBarangay(null);
      setCities([]);
      setBarangays([]);
    } else if (selectedDropdown === 'city') {
      const city = typeof value === 'string' ? value : value;
      setSelectedCity(typeof city === 'string' ? null : city);
      if (typeof city !== 'string') {
        fetchBarangays(city.code);
      }
      setSelectedBarangay(null);
      setBarangays([]);
    } else if (selectedDropdown === 'barangay') {
      const barangay = typeof value === 'string' ? value : value;
      setSelectedBarangay(typeof barangay === 'string' ? null : barangay);
    }
    setSelectedDropdown(null);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (onSave) {
        const completeData = {
          ...profileData,
          region: selectedRegion?.name || '',
          province: selectedProvince?.name || '',
          city: selectedCity?.name || '',
          barangay: selectedBarangay?.name || '',
        };
        console.log('[ProfileEdit] Calling onSave with data:', completeData);
        await onSave(completeData);
        console.log('[ProfileEdit] onSave completed successfully');
      } else {
        console.log('[ProfileEdit] No onSave callback provided');
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Cannot save profile - no callback provided',
        });
      }
    } catch (error: any) {
      console.log('[ProfileEdit] Error in handleSave:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to update profile',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
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
          scrollEnabled={true}
        >
          {/* Profile Picture */}
          {/* Complete Information Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Complete Information</Text>

          {/* Middle Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Middle Name</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: 'transparent' }]}
              value={profileData.middleName}
              onChangeText={text => setProfileData(prev => ({ ...prev, middleName: text }))}
              placeholderTextColor={colors.textSec}
              placeholder="Middle name"
            />
          </View>

          {/* Birth Date */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Birth Date *</Text>
            <TouchableOpacity
              style={[styles.input, { borderColor: colors.border, backgroundColor: 'transparent' }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.inputText, { color: colors.text }]}>{profileData.birthDate}</Text>
              <Ionicons name="calendar" size={20} color={colors.textSec} />
            </TouchableOpacity>
          </View>

          {/* Gender */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Gender *</Text>
            <TouchableOpacity
              style={[styles.input, { borderColor: colors.border, backgroundColor: 'transparent' }]}
              onPress={() => openDropdown('gender', GENDERS, 'Gender')}
            >
              <Text style={[styles.inputText, { color: colors.text }]}>{profileData.gender}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSec} />
            </TouchableOpacity>
          </View>

          {/* Occupation */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Occupation *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: 'transparent' }]}
              value={profileData.occupation}
              onChangeText={text => setProfileData(prev => ({ ...prev, occupation: text }))}
              placeholderTextColor={colors.textSec}
              placeholder="Occupation"
            />
          </View>

          {/* Work Location */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Work Location *</Text>
            <TouchableOpacity
              style={[styles.input, { borderColor: colors.border, backgroundColor: 'transparent' }]}
              onPress={() => openDropdown('workLocation', WORK_LOCATIONS, 'Work Location')}
            >
              <Text style={[styles.inputText, { color: colors.text }]}>{profileData.workLocation}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSec} />
            </TouchableOpacity>
          </View>

          {/* Country */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Country *</Text>
            <TouchableOpacity
              style={[styles.input, { borderColor: colors.border, backgroundColor: 'transparent' }]}
              onPress={() => openDropdown('country', COUNTRIES, 'Country')}
            >
              <Text style={[styles.inputText, { color: colors.text }]}>{profileData.country}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSec} />
            </TouchableOpacity>
          </View>

          {/* Address Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Address</Text>

          {/* Street / House No */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Street / House No. *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: 'transparent' }]}
              value={profileData.streetAddress}
              onChangeText={text => setProfileData(prev => ({ ...prev, streetAddress: text }))}
              placeholderTextColor={colors.textSec}
              placeholder="Street / House No."
            />
          </View>

          {/* Region */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Region *</Text>
            <TouchableOpacity
              style={[styles.input, { borderColor: colors.border, backgroundColor: 'transparent' }]}
              onPress={() => openDropdown('region', regions, 'Region')}
            >
              <Text style={[styles.inputText, { color: colors.text }]}>{selectedRegion?.name || 'Select Region'}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSec} />
            </TouchableOpacity>
          </View>

          {/* Province */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Province *</Text>
            <TouchableOpacity
              style={[styles.input, { borderColor: colors.border, backgroundColor: 'transparent' }]}
              onPress={() => openDropdown('province', provinces, 'Province')}
            >
              <Text style={[styles.inputText, { color: colors.text }]}>{selectedProvince?.name || 'Select Province'}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSec} />
            </TouchableOpacity>
          </View>

          {/* City / Municipality */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>City / Municipality *</Text>
            <TouchableOpacity
              style={[styles.input, { borderColor: colors.border, backgroundColor: 'transparent' }]}
              onPress={() => openDropdown('city', cities, 'City / Municipality')}
            >
              <Text style={[styles.inputText, { color: colors.text }]}>{selectedCity?.name || 'Select City / Municipality'}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSec} />
            </TouchableOpacity>
          </View>

          {/* Barangay */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Barangay *</Text>
            <TouchableOpacity
              style={[styles.input, { borderColor: colors.border, backgroundColor: 'transparent' }]}
              onPress={() => openDropdown('barangay', barangays, 'Barangay')}
            >
              <Text style={[styles.inputText, { color: colors.text }]}>{selectedBarangay?.name || 'Select Barangay'}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSec} />
            </TouchableOpacity>
          </View>

          {/* ZIP Code */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>ZIP Code *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: 'transparent' }]}
              value={profileData.zipCode}
              onChangeText={text => setProfileData(prev => ({ ...prev, zipCode: text }))}
              placeholderTextColor={colors.textSec}
              placeholder="0000"
              keyboardType="number-pad"
            />
          </View>

        </ScrollView>

        {/* Save Button - Fixed at Bottom */}
        <View style={[styles.buttonContainer, { backgroundColor: colors.bg, paddingBottom: insets.bottom }]}>
          <Button
            title="SAVE CHANGES"
            onPress={handleSave}
            loading={loading}
            style={styles.saveBtn}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Dropdown Modal */}
      <Modal
        visible={selectedDropdown !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedDropdown(null)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setSelectedDropdown(null)}
          />
          <Animated.View
            style={[
              styles.dropdownModal,
              { backgroundColor: colors.containerBg },
              {
                transform: [{ translateY: modalTranslateY }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            {/* Handle Bar */}
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{dropdownTitle}</Text>
            </View>

            {/* List */}
            <ScrollView
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            >
              {dropdownOptions.map((item, index) => {
                const isSelected =
                  (selectedDropdown === 'gender' && item.name === profileData.gender) ||
                  (selectedDropdown === 'workLocation' && item.name === profileData.workLocation) ||
                  (selectedDropdown === 'region' && item.name === selectedRegion?.name) ||
                  (selectedDropdown === 'province' && item.name === selectedProvince?.name) ||
                  (selectedDropdown === 'city' && item.name === selectedCity?.name) ||
                  (selectedDropdown === 'barangay' && item.name === selectedBarangay?.name);

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.modalItem,
                      { borderBottomColor: colors.border },
                      index === dropdownOptions.length - 1 && styles.modalItemLast,
                      isSelected && { backgroundColor: isDarkMode ? '#1f2937' : '#eff6ff' },
                    ]}
                    onPress={() => {
                      selectDropdownOption(item);
                    }}
                  >
                    <View style={styles.modalItemContent}>
                      <Text
                        style={[
                          styles.modalItemText,
                          { color: colors.text },
                          isSelected && { fontWeight: '700', color: Colors.sky },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark" size={20} color={Colors.sky} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowDatePicker(false)}
          />
          <View style={[styles.dropdownModal, { backgroundColor: colors.containerBg }]}>
            {/* Handle Bar */}
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {datePickerMode === 'year' ? 'Select Year' : datePickerMode === 'month' ? 'Select Month' : 'Select Day'}
              </Text>
            </View>

            {/* Date Picker Content */}
            <View style={styles.datePickerContent}>
              <ScrollView
                style={styles.datePickerList}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
              >
                {datePickerMode === 'year' && (
                  <>
                    {generateYears().map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.datePickerItem,
                          { borderBottomColor: colors.border },
                          tempYear === year && { backgroundColor: isDarkMode ? '#1f2937' : '#eff6ff' },
                        ]}
                        onPress={() => {
                          setTempYear(year);
                          handleDatePickerNext();
                        }}
                      >
                        <Text
                          style={[
                            styles.datePickerItemText,
                            { color: colors.text },
                            tempYear === year && { fontWeight: '700', color: Colors.sky },
                          ]}
                        >
                          {year}
                        </Text>
                        {tempYear === year && (
                          <Ionicons name="checkmark" size={20} color={Colors.sky} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {datePickerMode === 'month' && (
                  <>
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                      <TouchableOpacity
                        key={month}
                        style={[
                          styles.datePickerItem,
                          { borderBottomColor: colors.border },
                          tempMonth === idx && { backgroundColor: isDarkMode ? '#1f2937' : '#eff6ff' },
                        ]}
                        onPress={() => {
                          setTempMonth(idx);
                          handleDatePickerNext();
                        }}
                      >
                        <Text
                          style={[
                            styles.datePickerItemText,
                            { color: colors.text },
                            tempMonth === idx && { fontWeight: '700', color: Colors.sky },
                          ]}
                        >
                          {month}
                        </Text>
                        {tempMonth === idx && (
                          <Ionicons name="checkmark" size={20} color={Colors.sky} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {datePickerMode === 'day' && (
                  <>
                    {Array.from({ length: getDaysInMonth(tempYear, tempMonth) }, (_, i) => i + 1).map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.datePickerItem,
                          { borderBottomColor: colors.border },
                          tempDay === day && { backgroundColor: isDarkMode ? '#1f2937' : '#eff6ff' },
                        ]}
                        onPress={() => setTempDay(day)}
                      >
                        <Text
                          style={[
                            styles.datePickerItemText,
                            { color: colors.text },
                            tempDay === day && { fontWeight: '700', color: Colors.sky },
                          ]}
                        >
                          {day}
                        </Text>
                        {tempDay === day && (
                          <Ionicons name="checkmark" size={20} color={Colors.sky} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            </View>

            {/* Action Buttons */}
            <View style={[styles.datePickerActions, { borderTopColor: colors.border }]}>
              {datePickerMode !== 'year' && (
                <TouchableOpacity style={styles.datePickerBtn} onPress={handleDatePickerPrev}>
                  <Text style={[styles.datePickerBtnText, { color: Colors.sky }]}>Back</Text>
                </TouchableOpacity>
              )}
              {datePickerMode !== 'day' && (
                <TouchableOpacity style={styles.datePickerBtn} onPress={handleDatePickerNext}>
                  <Text style={[styles.datePickerBtnText, { color: Colors.sky }]}>Next</Text>
                </TouchableOpacity>
              )}
              {datePickerMode === 'day' && (
                <TouchableOpacity style={styles.datePickerBtn} onPress={handleDatePickerConfirm}>
                  <Text style={[styles.datePickerBtnText, { color: Colors.sky }]}>Confirm</Text>
                </TouchableOpacity>
              )}
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  keyboardView: {
    flex: 1,
    flexDirection: 'column',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20,
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePictureButton: {
    position: 'relative',
    marginBottom: 8,
  },
  profilePictureContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePictureDefault: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profilePictureText: {
    fontSize: 12,
    color: '#666',
  },
  profilePictureHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 12,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 13,
    flex: 1,
  },
  dateText: {
    fontSize: 13,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalOverlay: {
    flex: 1,
  },
  dropdownModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: MODAL_HEIGHT,
    width: '100%',
    paddingBottom: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  modalList: {
    paddingHorizontal: 0,
    flex: 1,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemLast: {
    borderBottomWidth: 0,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  checkmark: {
    marginLeft: 12,
  },
  datePickerContent: {
    flex: 1,
  },
  datePickerList: {
    flex: 1,
  },
  datePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  datePickerItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  datePickerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  datePickerBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveBtn: {
    marginBottom: 0,
  },
});
