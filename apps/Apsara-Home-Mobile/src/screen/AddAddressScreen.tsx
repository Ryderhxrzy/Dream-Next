import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Colors } from '../constants/colors';
import { API_CONFIG } from '../config/api';
import Toast from 'react-native-toast-message';
import BottomSheetSelector from '../components/BottomSheetSelector/BottomSheetSelector';

interface LocationData {
  code: string;
  name: string;
  zipCode?: string;
}

interface AddAddressScreenProps {
  isDarkMode?: boolean;
  onBack?: () => void;
  onAddressAdded?: () => void;
  token?: string;
}

export default function AddAddressScreen({
  isDarkMode = false,
  onBack,
  onAddressAdded,
  token,
}: AddAddressScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Form states
  const [locationType, setLocationType] = useState('Home');
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [region, setRegion] = useState<LocationData | null>(null);
  const [province, setProvince] = useState<LocationData | null>(null);
  const [city, setCity] = useState<LocationData | null>(null);
  const [barangay, setBarangay] = useState<LocationData | null>(null);

  // Dropdown states
  const [showLocationTypeModal, setShowLocationTypeModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showBarangayModal, setShowBarangayModal] = useState(false);

  // Data states
  const [regions, setRegions] = useState<LocationData[]>([]);
  const [provinces, setProvinces] = useState<LocationData[]>([]);
  const [cities, setCities] = useState<LocationData[]>([]);
  const [barangays, setBarangays] = useState<LocationData[]>([]);

  const locationTypes = ['Home', 'Office', 'Other'];

  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f0f9ff',
    containerBg: isDarkMode ? '#1f2937' : Colors.white,
    text: isDarkMode ? '#f8fafc' : Colors.text,
    textSec: isDarkMode ? '#94a3b8' : Colors.textSecondary,
    border: isDarkMode ? '#374151' : '#e5e7eb',
    borderLight: isDarkMode ? '#475569' : '#f1f5f9',
  };

  // Fetch regions on mount
  useEffect(() => {
    fetchRegions();
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack?.();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  const fetchRegions = async () => {
    try {
      setLoadingLocations(true);
      console.log('[fetchRegions] Starting');

      // Try backend first
      try {
        const url = `${API_CONFIG.BASE_URL}/address/regions`;
        console.log('[fetchRegions] Trying backend URL:', url);
        const response = await axios.get(url);
        console.log('[fetchRegions] Backend response:', response.data);

        if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
          const formattedData = response.data.data.map((item: any) => ({
            code: item.code || item.id,
            name: item.name,
            zipCode: item.zip_code,
          }));
          console.log('[fetchRegions] Backend formatted data count:', formattedData.length);
          setRegions(formattedData);
          return;
        } else {
          console.log('[fetchRegions] Backend returned empty or unexpected structure, trying PSGC...');
        }
      } catch (backendError: any) {
        console.log('[fetchRegions] Backend failed:', backendError.message, 'trying PSGC...');
      }

      // Fallback to PSGC
      const psgcUrl = 'https://psgc.gitlab.io/api/regions/';
      console.log('[fetchRegions] Trying PSGC URL:', psgcUrl);
      const response = await axios.get(psgcUrl);
      console.log('[fetchRegions] PSGC response count:', Array.isArray(response.data) ? response.data.length : 'not an array');

      if (response.data && Array.isArray(response.data)) {
        const formattedData = response.data.map((item: any) => ({
          code: item.code,
          name: item.name,
        }));
        console.log('[fetchRegions] PSGC formatted data count:', formattedData.length);
        setRegions(formattedData);
      } else {
        console.log('[fetchRegions] PSGC response is not an array:', response.data);
        setRegions([]);
      }
    } catch (error) {
      console.error('[fetchRegions] Error:', error);
      setRegions([]);
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
      console.log('[fetchProvinces] Starting with regionCode:', regionCode);

      // Try backend first
      try {
        const url = `${API_CONFIG.BASE_URL}/address/provinces?region_code=${regionCode}`;
        console.log('[fetchProvinces] Trying backend URL:', url);
        const response = await axios.get(url);
        console.log('[fetchProvinces] Backend response:', response.data);

        if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
          const formattedData = response.data.data.map((item: any) => ({
            code: item.code || item.id,
            name: item.name,
            zipCode: item.zip_code,
          }));
          console.log('[fetchProvinces] Backend formatted data:', formattedData);
          setProvinces(formattedData);
          return;
        } else {
          console.log('[fetchProvinces] Backend returned empty or unexpected structure, trying PSGC...');
        }
      } catch (backendError: any) {
        console.log('[fetchProvinces] Backend failed:', backendError.message, 'trying PSGC...');
      }

      // Fallback to PSGC
      const psgcUrl = `https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`;
      console.log('[fetchProvinces] Trying PSGC URL:', psgcUrl);
      const response = await axios.get(psgcUrl);
      console.log('[fetchProvinces] PSGC response:', response.data);

      if (response.data && Array.isArray(response.data)) {
        const formattedData = response.data.map((item: any) => ({
          code: item.code,
          name: item.name,
        }));
        console.log('[fetchProvinces] PSGC formatted data:', formattedData);
        setProvinces(formattedData);
      } else {
        console.log('[fetchProvinces] PSGC response is not an array:', response.data);
        setProvinces([]);
      }
    } catch (error) {
      console.error('[fetchProvinces] Error:', error);
      setProvinces([]);
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
      console.log('[fetchCities] Starting with provinceCode:', provinceCode);

      // Try backend first
      try {
        const url = `${API_CONFIG.BASE_URL}/address/cities?province_code=${provinceCode}`;
        console.log('[fetchCities] Trying backend URL:', url);
        const response = await axios.get(url);
        console.log('[fetchCities] Backend response:', response.data);

        if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
          const formattedData = response.data.data.map((item: any) => ({
            code: item.code || item.id,
            name: item.name,
            zipCode: item.zip_code,
          }));
          console.log('[fetchCities] Backend formatted data:', formattedData);
          setCities(formattedData);
          return;
        } else {
          console.log('[fetchCities] Backend returned empty or unexpected structure, trying PSGC...');
        }
      } catch (backendError: any) {
        console.log('[fetchCities] Backend failed:', backendError.message, 'trying PSGC...');
      }

      // Fallback to PSGC
      const psgcUrl = `https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`;
      console.log('[fetchCities] Trying PSGC URL:', psgcUrl);
      const response = await axios.get(psgcUrl);
      console.log('[fetchCities] PSGC response:', response.data);

      if (response.data && Array.isArray(response.data)) {
        const formattedData = response.data.map((item: any) => ({
          code: item.code,
          name: item.name,
          zipCode: item.zipCode || item.zip_code,
        }));
        console.log('[fetchCities] PSGC formatted data:', formattedData);
        setCities(formattedData);
      } else {
        console.log('[fetchCities] PSGC response is not an array:', response.data);
        setCities([]);
      }
    } catch (error) {
      console.error('[fetchCities] Error:', error);
      setCities([]);
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
      console.log('[fetchBarangays] Starting with cityCode:', cityCode);

      // Try backend first
      try {
        const url = `${API_CONFIG.BASE_URL}/address/barangays?city_code=${cityCode}`;
        console.log('[fetchBarangays] Trying backend URL:', url);
        const response = await axios.get(url);
        console.log('[fetchBarangays] Backend response:', response.data);

        if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
          const formattedData = response.data.data.map((item: any) => ({
            code: item.code || item.id,
            name: item.name,
            zipCode: item.zip_code,
          }));
          console.log('[fetchBarangays] Backend formatted data:', formattedData);
          setBarangays(formattedData);
          return;
        } else {
          console.log('[fetchBarangays] Backend returned empty or unexpected structure, trying PSGC...');
        }
      } catch (backendError: any) {
        console.log('[fetchBarangays] Backend failed:', backendError.message, 'trying PSGC...');
      }

      // Fallback to PSGC
      const psgcUrl = `https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`;
      console.log('[fetchBarangays] Trying PSGC URL:', psgcUrl);
      const response = await axios.get(psgcUrl);
      console.log('[fetchBarangays] PSGC response:', response.data);

      if (response.data && Array.isArray(response.data)) {
        const formattedData = response.data.map((item: any) => ({
          code: item.code,
          name: item.name,
        }));
        console.log('[fetchBarangays] PSGC formatted data:', formattedData);
        setBarangays(formattedData);
      } else {
        console.log('[fetchBarangays] PSGC response is not an array:', response.data);
        setBarangays([]);
      }
    } catch (error) {
      console.error('[fetchBarangays] Error:', error);
      setBarangays([]);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load barangays',
      });
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleRegionSelect = (selectedRegion: LocationData) => {
    setRegion(selectedRegion);
    setProvince(null);
    setCity(null);
    setBarangay(null);
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    fetchProvinces(selectedRegion.code);
    setShowRegionModal(false);
  };

  const handleProvinceSelect = (selectedProvince: LocationData) => {
    setProvince(selectedProvince);
    setCity(null);
    setBarangay(null);
    setCities([]);
    setBarangays([]);
    fetchCities(selectedProvince.code);
    setShowProvinceModal(false);
  };

  const handleCitySelect = (selectedCity: LocationData) => {
    setCity(selectedCity);
    setBarangay(null);
    setBarangays([]);
    fetchBarangays(selectedCity.code);
    setShowCityModal(false);
  };

  const handleBarangaySelect = (selectedBarangay: LocationData) => {
    setBarangay(selectedBarangay);
    setShowBarangayModal(false);
  };

  const handleAddAddress = async () => {
    if (!fullName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter your name',
      });
      return;
    }

    if (!contactNumber.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter contact number',
      });
      return;
    }

    if (!region || !province || !city || !barangay) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please select region, province, city, and barangay',
      });
      return;
    }

    setLoading(true);
    try {
      // For now, just show a success message
      // In a real app, you'd make an API call to save the address
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Address added successfully',
      });
      onAddressAdded?.();
    } catch (error) {
      console.error('Error adding address:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add address',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['rgba(59,130,246,0.15)', 'rgba(31,41,55,0)'] : ['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top, backgroundColor: isDarkMode ? '#1f2937' : Colors.white }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back-outline" size={24} color={isDarkMode ? '#e5e7eb' : Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerGreeting, { color: isDarkMode ? '#f8fafc' : Colors.text }]}>
              Add Address
            </Text>
            <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#9ca3af' : Colors.textSecondary }]}>
              Add a new shipping address
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Form */}
      <ScrollView
        style={[styles.content, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: colors.containerBg, borderColor: colors.border }]}>
          {/* Location Type */}
          <Text style={[styles.label, { color: colors.text }]}>Location Type *</Text>
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.borderLight, borderColor: colors.border }]}
            onPress={() => setShowLocationTypeModal(true)}
          >
            <Text style={[styles.selectButtonText, { color: colors.text }]}>{locationType}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSec} />
          </TouchableOpacity>

          {/* Name */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.borderLight, borderColor: colors.border, color: colors.text }]}
            placeholder="Enter your name"
            placeholderTextColor={colors.textSec}
            value={fullName}
            onChangeText={setFullName}
          />

          {/* Contact Number */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Contact Number *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.borderLight, borderColor: colors.border, color: colors.text }]}
            placeholder="Enter contact number"
            placeholderTextColor={colors.textSec}
            keyboardType="phone-pad"
            value={contactNumber}
            onChangeText={setContactNumber}
          />

          {/* Region */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Region *</Text>
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.borderLight, borderColor: colors.border }]}
            onPress={() => setShowRegionModal(true)}
          >
            <Text style={[styles.selectButtonText, { color: region ? colors.text : colors.textSec }]}>
              {region ? region.name : 'Select region'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSec} />
          </TouchableOpacity>

          {/* Province */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Province *</Text>
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.borderLight, borderColor: colors.border, opacity: region ? 1 : 0.5 }]}
            onPress={() => region && setShowProvinceModal(true)}
            disabled={!region}
          >
            <Text style={[styles.selectButtonText, { color: province ? colors.text : colors.textSec }]}>
              {province ? province.name : 'Select province'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSec} />
          </TouchableOpacity>

          {/* City */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>City *</Text>
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.borderLight, borderColor: colors.border, opacity: province ? 1 : 0.5 }]}
            onPress={() => province && setShowCityModal(true)}
            disabled={!province}
          >
            <Text style={[styles.selectButtonText, { color: city ? colors.text : colors.textSec }]}>
              {city ? city.name : 'Select city'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSec} />
          </TouchableOpacity>

          {/* Barangay */}
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Barangay *</Text>
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: colors.borderLight, borderColor: colors.border, opacity: city ? 1 : 0.5 }]}
            onPress={() => city && setShowBarangayModal(true)}
            disabled={!city}
          >
            <Text style={[styles.selectButtonText, { color: barangay ? colors.text : colors.textSec }]}>
              {barangay ? barangay.name : 'Select barangay'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSec} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Button */}
      <View style={[styles.footer, { backgroundColor: colors.containerBg, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: Colors.sky, opacity: loading ? 0.6 : 1 }]}
          onPress={handleAddAddress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="add-circle" size={18} color={Colors.white} />
              <Text style={styles.addButtonText}>Add Address</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Location Type Bottom Sheet */}
      <BottomSheetSelector
        visible={showLocationTypeModal}
        title="Select Location Type"
        items={locationTypes.map((type) => ({ code: type, name: type }))}
        selectedItem={locationTypes.map((type) => ({ code: type, name: type })).find((item) => item.code === locationType) || null}
        isDarkMode={isDarkMode}
        onSelect={(item) => {
          setLocationType(item.code);
          setShowLocationTypeModal(false);
        }}
        onClose={() => setShowLocationTypeModal(false)}
      />

      {/* Region Bottom Sheet */}
      <BottomSheetSelector
        visible={showRegionModal}
        title="Select Region"
        items={regions}
        selectedItem={region}
        loading={loadingLocations}
        isDarkMode={isDarkMode}
        onSelect={handleRegionSelect}
        onClose={() => setShowRegionModal(false)}
      />

      {/* Province Bottom Sheet */}
      <BottomSheetSelector
        visible={showProvinceModal}
        title="Select Province"
        items={provinces}
        selectedItem={province}
        loading={loadingLocations}
        isDarkMode={isDarkMode}
        onSelect={handleProvinceSelect}
        onClose={() => setShowProvinceModal(false)}
      />

      {/* City Bottom Sheet */}
      <BottomSheetSelector
        visible={showCityModal}
        title="Select City"
        items={cities}
        selectedItem={city}
        loading={loadingLocations}
        isDarkMode={isDarkMode}
        onSelect={handleCitySelect}
        onClose={() => setShowCityModal(false)}
      />

      {/* Barangay Bottom Sheet */}
      <BottomSheetSelector
        visible={showBarangayModal}
        title="Select Barangay"
        items={barangays}
        selectedItem={barangay}
        loading={loadingLocations}
        isDarkMode={isDarkMode}
        onSelect={handleBarangaySelect}
        onClose={() => setShowBarangayModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: -10,
    marginRight: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerGreeting: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
  },
  contentContainer: {
    paddingVertical: 12,
    gap: 12,
  },
  section: {
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectButtonText: {
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  addButton: {
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
});
