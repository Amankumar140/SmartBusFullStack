// permissions.js
import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export const requestCameraPermission = async () => {
  const permission =
    Platform.OS === 'android'
      ? PERMISSIONS.ANDROID.CAMERA
      : PERMISSIONS.IOS.CAMERA;

  const result = await request(permission);
  return result === RESULTS.GRANTED;
};

export const requestMediaPermission = async () => {
  let permission;
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      // Android 13+
      permission = PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;
    } else {
      permission = PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
    }
  } else {
    permission = PERMISSIONS.IOS.PHOTO_LIBRARY;
  }

  const result = await request(permission);
  return result === RESULTS.GRANTED;
};

export const requestLocationPermission = async () => {
  try {
    let fineLocationPermission;
    let coarseLocationPermission;
    
    if (Platform.OS === 'android') {
      fineLocationPermission = PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      coarseLocationPermission = PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION;
    } else {
      fineLocationPermission = PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
    }

    // Check current status first
    const fineLocationStatus = await check(fineLocationPermission);
    
    if (fineLocationStatus === RESULTS.GRANTED) {
      return true;
    }
    
    if (fineLocationStatus === RESULTS.DENIED) {
      // Request fine location permission
      const fineResult = await request(fineLocationPermission);
      if (fineResult === RESULTS.GRANTED) {
        return true;
      }
    }
    
    // If fine location failed, try coarse location on Android
    if (Platform.OS === 'android' && coarseLocationPermission) {
      const coarseLocationStatus = await check(coarseLocationPermission);
      if (coarseLocationStatus === RESULTS.DENIED) {
        const coarseResult = await request(coarseLocationPermission);
        return coarseResult === RESULTS.GRANTED;
      }
      return coarseLocationStatus === RESULTS.GRANTED;
    }
    
    return false;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};
