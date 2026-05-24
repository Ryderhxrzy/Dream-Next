import * as LocalAuthentication from 'expo-local-authentication';
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

const BIOMETRIC_CRED_KEY = 'biometric_credential';
const BIOMETRIC_DEVICE_ID_KEY = 'biometric_device_id';

export interface BiometricCredential {
  credential_token: string;
  device_id: string;
  device_name: string;
}

class BiometricUtils {
  /**
   * Check if device supports biometric authentication
   */
  static async isBiometricAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      return compatible;
    } catch (error) {
      console.error('[Biometric] Hardware check failed:', error);
      return false;
    }
  }

  /**
   * Get available biometric types
   */
  static async getAvailableBiometrics(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return types;
    } catch (error) {
      console.error('[Biometric] Failed to get available types:', error);
      return [];
    }
  }

  /**
   * Check if biometric is enrolled on device
   */
  static async isBiometricEnrolled(): Promise<boolean> {
    try {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('[Biometric] Enrollment check failed:', error);
      return false;
    }
  }

  /**
   * Save biometric credential to keychain
   */
  static async saveBiometricCredential(credential: BiometricCredential): Promise<boolean> {
    try {
      console.log('[Biometric] Starting credential save', {
        device_id: credential.device_id,
        device_name: credential.device_name,
      });

      const credentialJson = JSON.stringify(credential);
      console.log('[Biometric] Credential serialized, size:', credentialJson.length, 'bytes');

      const saved = await Keychain.setGenericPassword(
        BIOMETRIC_CRED_KEY,
        credentialJson,
        {
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          storage: Keychain.STORAGE_TYPE.KC,
        }
      );

      if (saved) {
        console.log('[Biometric] Credential successfully saved to keychain');
        return true;
      }

      console.warn('[Biometric] Keychain.setGenericPassword returned false');
      return false;
    } catch (error) {
      console.error('[Biometric] Failed to save credential to keychain', {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });
      return false;
    }
  }

  /**
   * Retrieve biometric credential from keychain
   */
  static async getBiometricCredential(): Promise<BiometricCredential | null> {
    try {
      console.log('[Biometric] Retrieving credential from keychain');

      const credentials = await Keychain.getGenericPassword({
        storage: Keychain.STORAGE_TYPE.KC,
      });

      if (credentials && credentials.password) {
        try {
          const credential = JSON.parse(credentials.password) as BiometricCredential;
          console.log('[Biometric] Credential retrieved and parsed successfully', {
            device_id: credential.device_id,
            device_name: credential.device_name,
          });
          return credential;
        } catch (parseError) {
          console.error('[Biometric] Failed to parse credential from keychain', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
          });
          return null;
        }
      }

      console.log('[Biometric] No credential found in keychain');
      return null;
    } catch (error) {
      console.error('[Biometric] Failed to retrieve credential from keychain', {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });
      return null;
    }
  }

  /**
   * Delete biometric credential from keychain
   */
  static async deleteBiometricCredential(): Promise<boolean> {
    try {
      const deleted = await Keychain.resetGenericPassword({
        storage: Keychain.STORAGE_TYPE.KC,
      });

      if (deleted) {
        console.log('[Biometric] Credential deleted from keychain');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Biometric] Failed to delete credential:', error);
      return false;
    }
  }

  /**
   * Check if biometric credential exists
   */
  static async hasBiometricCredential(): Promise<boolean> {
    try {
      const credential = await this.getBiometricCredential();
      return credential !== null;
    } catch (error) {
      console.error('[Biometric] Failed to check credential:', error);
      return false;
    }
  }

  /**
   * Authenticate with biometric
   */
  static async authenticate(): Promise<boolean> {
    try {
      console.log('[Biometric] Starting authentication prompt');

      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        fallbackLabel: 'Use passcode',
        disableStrongBiometrics: false,
      });

      if (result.success) {
        console.log('[Biometric] Authentication successful');
        return true;
      }

      if (result.error) {
        console.warn('[Biometric] Authentication failed', {
          error: result.error,
          success: result.success,
          warning: result.warning,
        });
      } else {
        console.warn('[Biometric] Authentication cancelled by user');
      }

      return false;
    } catch (error) {
      console.error('[Biometric] Authentication exception', {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });
      return false;
    }
  }

  /**
   * Generate device ID
   */
  static generateDeviceId(): string {
    return `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device name
   */
  static getDeviceName(): string {
    const timestamp = new Date().toLocaleDateString();
    return `${Platform.OS === 'ios' ? 'iPhone' : 'Android'} - ${timestamp}`;
  }
}

export default BiometricUtils;
