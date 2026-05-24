import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, BackHandler, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { authService } from '../services/authService';
import { TIER_REQUIREMENTS } from '../constants/tierConfig';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_CONFIG } from '../config/api';

interface ProfileDetailsScreenProps {
  token?: string | null;
  onClose?: () => void;
  cartCount?: number;
  onCartPress?: () => void;
  onEditProfile?: (profileData: any) => void;
}

export default function ProfileDetailsScreen({
  token,
  onClose,
  cartCount = 0,
  onCartPress,
  onEditProfile,
}: ProfileDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose?.();
      return true;
    });

    return () => sub.remove();
  }, [onClose]);

  const fetchUserProfile = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const profile = await authService.getCurrentUser(token);
      setUserProfile(profile);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to load profile details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Please allow access to your photos',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No authentication token',
        });
        return;
      }

      setUploadingAvatar(true);
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() || 'avatar.jpg';

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: filename,
      } as any);

      const response = await axios.post(`${API_CONFIG.BASE_URL}/me/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const newAvatarUrl = response.data?.avatar_url || response.data?.data?.avatar_url;

      if (newAvatarUrl) {
        setUserProfile((prev: any) => ({
          ...prev,
          avatar_url: newAvatarUrl,
        }));

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile picture updated',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to upload avatar',
        });
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || error.message || 'Failed to upload avatar',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    if (!token || !editedName.trim()) return;

    try {
      await axios.put(`${API_CONFIG.BASE_URL}/auth/me`, {
        name: editedName.trim(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Name updated successfully',
      });

      setEditingName(false);
      fetchUserProfile();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.message || 'Failed to update name',
      });
    }
  };

  const renderInfoRow = (label: string, value: string | number | null | undefined, icon?: any) => {
    if (!value) return null;
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          {icon && (
            <View style={styles.iconBox}>
              <Ionicons name={icon} size={16} color={Colors.sky} />
            </View>
          )}
          <Text style={styles.infoLabel}>{label}</Text>
        </View>
        <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
      </View>
    );
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    if (status === 'verified' || status === 'true') return '#10b981';
    if (status === 'not_verified' || status === 'false') return '#ef4444';
    return Colors.sky;
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['rgba(14,165,233,0.18)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back-outline" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Details</Text>
          <TouchableOpacity
            style={styles.headerIconCart}
            onPress={onCartPress}
            activeOpacity={0.7}
          >
            <Ionicons name="cart-outline" size={20} color={Colors.text} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.sky} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : userProfile ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
            {/* Profile Header */}
            <View
              style={styles.profileHeaderContainer}
            >
              <View style={styles.profileHeader}>
                <TouchableOpacity
                  style={styles.avatarContainer}
                  onPress={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarLarge}>
                    {userProfile.avatar_url ? (
                      <Image source={{ uri: userProfile.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarInitial}>
                        {userProfile.name?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    )}
                  </View>
                  {uploadingAvatar && (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color={Colors.white} />
                    </View>
                  )}
                  <View style={styles.avatarEditIcon}>
                    <Ionicons name="camera" size={14} color={Colors.white} />
                  </View>
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                  {editingName ? (
                    <View style={styles.nameEditContainer}>
                      <TextInput
                        style={styles.nameInput}
                        value={editedName}
                        onChangeText={setEditedName}
                        placeholder="Enter name"
                        placeholderTextColor={Colors.textSecondary}
                        autoFocus
                      />
                      <View style={styles.nameEditActions}>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={handleSaveName}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="checkmark" size={16} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => setEditingName(false)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close" size={16} color={Colors.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.nameContainer}
                      onPress={() => {
                        setEditedName(userProfile.name || '');
                        setEditingName(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.nameText}>{userProfile.name}</Text>
                      <Ionicons name="pencil" size={14} color={Colors.sky} />
                    </TouchableOpacity>
                  )}
                  <Text style={styles.usernameText}>@{userProfile.username}</Text>

                  {/* Badge and Rank Row */}
                  <View style={styles.badgeRankRow}>
                    {userProfile.badge_image || userProfile.badge_name ? (
                      <View style={styles.badgeContainer}>
                        {userProfile.badge_image ? (
                          <Image source={{ uri: userProfile.badge_image }} style={styles.badgeImage} />
                        ) : (
                          <>
                            <Ionicons name="shield-checkmark" size={14} color={Colors.white} />
                            <Text style={styles.badgeText}>{userProfile.badge_name}</Text>
                          </>
                        )}
                      </View>
                    ) : null}
                    {userProfile.rank && (
                      <View style={styles.rankContainer}>
                        <Ionicons name="podium" size={14} color={Colors.white} />
                        <Text style={styles.rankText}>#{userProfile.rank}</Text>
                      </View>
                    )}
                  </View>

                  {/* Profile Completion */}
                  {userProfile.profile_completion_percentage && (
                    <View style={styles.completionContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${userProfile.profile_completion_percentage}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.completionText}>{userProfile.profile_completion_percentage}% Complete</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Edit/Complete Profile Button */}
            {(() => {
              const isEmpty = (value: any) => !value || value === 'Not specified' || value === '0000';
              const hasNoAddress = isEmpty(userProfile.address) || isEmpty(userProfile.city) ||
                isEmpty(userProfile.region) || isEmpty(userProfile.province) ||
                isEmpty(userProfile.barangay) || isEmpty(userProfile.zip_code);

              const buttonText = hasNoAddress ? 'Complete Profile' : 'Edit Profile';
              const buttonIcon = hasNoAddress ? 'checkmark-circle' : 'pencil';

              return (
                <TouchableOpacity
                  style={[styles.editButton, hasNoAddress && styles.completeProfileButton]}
                  onPress={() => onEditProfile?.(userProfile)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={buttonIcon as any} size={18} color={Colors.white} />
                  <Text style={styles.editButtonText}>{buttonText}</Text>
                </TouchableOpacity>
              );
            })()}

            {/* Personal Information */}
            {renderSection('Personal Information', (
              <>
                {renderInfoRow('First Name', userProfile.first_name, 'person')}
                {renderInfoRow('Last Name', userProfile.last_name)}
                {renderInfoRow('Middle Name', userProfile.middle_name)}
                {renderInfoRow('Email', userProfile.email, 'mail')}
                {renderInfoRow('Phone', userProfile.phone, 'call')}
                {renderInfoRow('Birth Date', userProfile.birth_date, 'calendar')}
                {renderInfoRow('Gender', userProfile.gender?.charAt(0).toUpperCase() + userProfile.gender?.slice(1))}
                {renderInfoRow('Occupation', userProfile.occupation)}
                {renderInfoRow('Work Location', userProfile.work_location?.toUpperCase())}
              </>
            ))}

            {/* Address Information */}
            {renderSection('Address', (
              <>
                {renderInfoRow('Street Address', userProfile.address, 'location')}
                {renderInfoRow('Barangay', userProfile.barangay)}
                {renderInfoRow('City', userProfile.city)}
                {renderInfoRow('Province', userProfile.province)}
                {renderInfoRow('Region', userProfile.region)}
                {renderInfoRow('Zip Code', userProfile.zip_code)}
                {renderInfoRow('Country', userProfile.country)}
              </>
            ))}

            {/* Account Status */}
            {renderSection('Account Status', (
              <>
                <View style={styles.infoRow}>
                  <View style={styles.infoLeft}>
                    <View style={styles.iconBox}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.sky} />
                    </View>
                    <Text style={styles.infoLabel}>Email Verified</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor('verified') }]}>
                    <Text style={styles.statusBadgeText}>
                      {userProfile.email_verified ? 'Verified' : 'Not Verified'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoLeft}>
                    <View style={styles.iconBox}>
                      <Ionicons name="shield" size={16} color={Colors.sky} />
                    </View>
                    <Text style={styles.infoLabel}>Verification Status</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(userProfile.verification_status) }]}>
                    <Text style={styles.statusBadgeText}>
                      {userProfile.verification_status?.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {renderInfoRow('Account Status', userProfile.account_status === 0 ? 'Active' : 'Inactive')}
                {renderInfoRow('Lock Status', userProfile.lock_status === 0 ? 'Unlocked' : 'Locked')}
                {renderInfoRow('Profile Completion', `${userProfile.profile_completion_percentage}%`)}
                {renderInfoRow('Two Factor Auth', userProfile.two_factor_enabled ? 'Enabled' : 'Disabled')}
              </>
            ))}

            {/* Monthly Activation */}
            {userProfile.monthly_activation && renderSection('Monthly Activation', (
              <>
                <View style={styles.infoRow}>
                  <View style={styles.infoLeft}>
                    <View style={styles.iconBox}>
                      <Ionicons name="flash" size={16} color={Colors.sky} />
                    </View>
                    <Text style={styles.infoLabel}>Status</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: userProfile.monthly_activation.status === 'active' ? '#10b981' : '#ef4444' }]}>
                    <Text style={styles.statusBadgeText}>
                      {userProfile.monthly_activation.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {renderInfoRow('Current PV', userProfile.monthly_activation.current_month_pv, 'trending-up')}
                {renderInfoRow('Threshold PV', userProfile.monthly_activation.threshold_pv)}
                {renderInfoRow('Remaining PV', userProfile.monthly_activation.remaining_pv)}
                {renderInfoRow('Qualifying PV', userProfile.monthly_activation.qualifying_pv)}

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(
                            (userProfile.monthly_activation.current_month_pv /
                              userProfile.monthly_activation.threshold_pv) * 100,
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {userProfile.monthly_activation.current_month_pv} / {userProfile.monthly_activation.threshold_pv} PV
                  </Text>
                </View>

                {renderInfoRow('Deadline', userProfile.monthly_activation.month_label)}
                {renderInfoRow('Window Open', userProfile.monthly_activation.window_open ? 'Yes' : 'No')}
              </>
            ))}

            {/* Referral Information */}
            {userProfile.referrer_name && renderSection('Referral Information', (
              <>
                {renderInfoRow('Referrer Name', userProfile.referrer_name, 'person')}
                {renderInfoRow('Referrer Username', `@${userProfile.referrer_username}`)}
              </>
            ))}

            {/* Rank & Badge */}
            {renderSection('Recognition', (
              <>
                {renderInfoRow('Rank', `#${userProfile.rank}`, 'podium')}
                {renderInfoRow('Badge', userProfile.badge_name || 'None', 'shield-checkmark')}
              </>
            ))}

            {/* Badge Journey */}
            {renderSection('Badge Journey', (
              <View style={styles.badgeJourneyList}>
                {Object.values(TIER_REQUIREMENTS).map((tier) => {
                  const isAchieved = Number(userProfile.rank || 0) >= tier.rank;
                  return (
                    <View key={tier.rank} style={[styles.badgeJourneyItem, { borderColor: '#e5e7eb' }]}>
                      <View style={[styles.badgeJourneyRank, { backgroundColor: tier.color }]}>
                        <Text style={styles.badgeJourneyRankText}>R{tier.rank}</Text>
                      </View>
                      <View style={styles.badgeJourneyInfo}>
                        <Text style={styles.badgeJourneyTitle}>{tier.tier}</Text>
                        <Text style={styles.badgeJourneyMeta}>
                          PV: {tier.pv ?? '-'} | Referrals: {tier.referrals ?? '-'}
                        </Text>
                        <Text style={styles.badgeJourneyMeta}>
                          Members: {tier.active_members ?? '-'} | Builders: {tier.active_builders ?? '-'} | Leaders: {tier.active_leaders ?? '-'}
                        </Text>
                      </View>
                      <View style={[styles.badgeJourneyState, { backgroundColor: isAchieved ? '#dcfce7' : '#f1f5f9' }]}>
                        <Text style={[styles.badgeJourneyStateText, { color: isAchieved ? '#166534' : '#475569' }]}>
                          {isAchieved ? 'Achieved' : 'Locked'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Failed to load profile</Text>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  headerGradient: {
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  headerIconCart: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  cartBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 11,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  scrollContent: {
    padding: 8,
    paddingBottom: 40,
  },
  profileHeaderContainer: {
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: Colors.white,
  },
  profileHeader: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 44,
    fontWeight: '900',
    color: Colors.sky,
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  headerInfo: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
    width: '100%',
  },
  nameText: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.text,
    textAlign: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nameEditContainer: {
    width: '100%',
    gap: 8,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.sky,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'center',
  },
  nameEditActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  usernameText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.sky,
  },
  badgeRankRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.sky,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  completionContainer: {
    width: '100%',
    gap: 6,
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e7ff',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.sky,
    borderRadius: 3,
  },
  completionText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionContent: {
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  progressContainer: {
    marginTop: 10,
    gap: 10,
    paddingHorizontal: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.sky,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeJourneyList: {
    gap: 10,
  },
  badgeJourneyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 10,
    backgroundColor: '#f8fafc',
  },
  badgeJourneyRank: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeJourneyRankText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.white,
  },
  badgeJourneyInfo: {
    flex: 1,
    gap: 2,
  },
  badgeJourneyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  badgeJourneyMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  badgeJourneyState: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeJourneyStateText: {
    fontSize: 10,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.sky,
    marginHorizontal: 8,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 14,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  completeProfileButton: {
    backgroundColor: '#10b981',
  },
});
