import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Users, MapPin, Clock } from 'lucide-react-native';

interface CommunityMember {
  id: string;
  username: string;
  created_at: string;
  locations?: {
    latitude: number;
    longitude: number;
    updated_at: string;
  };
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunityMembers();
  }, []);

  const fetchCommunityMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          created_at,
          locations (
            latitude,
            longitude,
            updated_at
          )
        `)
        .neq('user_id', user?.id);

      if (error) {
        console.error('Error fetching members:', error);
        return;
      }

      setMembers(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return '今';
    if (diffInMinutes < 60) return `${diffInMinutes}分前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}時間前`;
    return `${Math.floor(diffInMinutes / 1440)}日前`;
  };

  const renderMember = ({ item }: { item: CommunityMember }) => (
    <TouchableOpacity style={styles.memberCard}>
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: `https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop` }}
          style={styles.avatar}
        />
        <View style={[styles.statusDot, { backgroundColor: item.locations ? '#10B981' : '#6B7280' }]} />
      </View>
      
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.username}</Text>
        <View style={styles.memberDetails}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.memberTime}>
            参加: {formatDate(item.created_at)}
          </Text>
        </View>
        {item.locations && (
          <View style={styles.memberDetails}>
            <MapPin size={14} color="#10B981" />
            <Text style={styles.memberLocation}>
              最終位置更新: {formatDate(item.locations.updated_at)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Users size={28} color="#4F46E5" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>コミュニティ</Text>
            <Text style={styles.headerSubtitle}>
              {members.length}人のメンバー
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{members.filter(m => m.locations).length}</Text>
          <Text style={styles.statLabel}>オンライン</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{members.length}</Text>
          <Text style={styles.statLabel}>総メンバー</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {members.filter(m => {
              if (!m.locations) return false;
              const lastUpdate = new Date(m.locations.updated_at);
              const now = new Date();
              return (now.getTime() - lastUpdate.getTime()) < 24 * 60 * 60 * 1000;
            }).length}
          </Text>
          <Text style={styles.statLabel}>24時間以内</Text>
        </View>
      </View>

      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchCommunityMembers}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#4F46E5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  memberDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  memberTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 6,
  },
  memberLocation: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
    marginLeft: 6,
  },
});