import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '@/lib/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { MapPin, Navigation } from 'lucide-react-native';

interface UserLocation {
  latitude: number;
  longitude: number;
  user_id: string;
  profiles: {
    username: string;
  };
}

export default function MapScreen() {
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('位置情報の許可が必要です');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      
      // Update user location in database
      if (user) {
        await updateUserLocation(location.coords.latitude, location.coords.longitude);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Fetch other users' locations
    fetchUserLocations();

    // Subscribe to location updates
    const subscription = supabase
      .channel('locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        fetchUserLocations();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const updateUserLocation = async (latitude: number, longitude: number) => {
    if (!user) return;

    const { error } = await supabase
      .from('locations')
      .upsert({
        user_id: user.id,
        latitude,
        longitude,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error updating location:', error);
    }
  };

  const fetchUserLocations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('locations')
      .select(`
        latitude,
        longitude,
        user_id,
        profiles (
          username
        )
      `)
      .neq('user_id', user.id);

    if (error) {
      console.error('Error fetching locations:', error);
      return;
    }

    setUserLocations(data || []);
  };

  const getCurrentLocation = async () => {
    try {
      let newLocation = await Location.getCurrentPositionAsync({});
      setLocation(newLocation);
      
      if (user) {
        await updateUserLocation(newLocation.coords.latitude, newLocation.coords.longitude);
      }
    } catch (error) {
      Alert.alert('エラー', '位置情報を取得できませんでした');
    }
  };

  if (errorMsg) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MapPin size={48} color="#EF4444" />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Text style={styles.errorSubtext}>
            設定から位置情報の許可を有効にしてください
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!location) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MapPin size={48} color="#4F46E5" />
          <Text style={styles.loadingText}>位置情報を取得中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {userLocations.map((userLoc) => (
          <Marker
            key={userLoc.user_id}
            coordinate={{
              latitude: userLoc.latitude,
              longitude: userLoc.longitude,
            }}
            title={userLoc.profiles.username}
            description="コミュニティメンバー"
          />
        ))}
      </MapView>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>地域協生</Text>
        <Text style={styles.headerSubtitle}>
          {userLocations.length}人のメンバーが近くにいます
        </Text>
      </View>

      <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
        <Navigation size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  locationButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#4F46E5',
    marginTop: 16,
    textAlign: 'center',
  },
});