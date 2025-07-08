import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../components/utils/styles";
import {
  EncounterWithUserInfo,
  getEncounterHistory,
} from "../../services/locationService";
import { getPersistentUserId } from "../../services/userService";

export default function HistoryScreen() {
  const router = useRouter();
  const [encounterHistory, setEncounterHistory] = useState<
    EncounterWithUserInfo[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEncounterHistory = async () => {
      try {
        setLoading(true);
        const userId = await getPersistentUserId();

        console.log("すれ違い履歴を取得中...");
        const history = await getEncounterHistory(userId);
        setEncounterHistory(history);
        console.log(`すれ違い履歴を${history.length}件取得しました`);
      } catch (error) {
        console.error("すれ違い履歴取得エラー:", error);
        Alert.alert("エラー", "すれ違い履歴の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    loadEncounterHistory();
  }, []);

  // 日時をフォーマットする関数
  const formatDateTime = (timestamp: Date | string): string => {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 距離をフォーマットする関数
  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  // 履歴項目をレンダリング
  const renderHistoryItem = ({ item }: { item: EncounterWithUserInfo }) => (
    <View style={historyStyles.historyItem}>
      <View style={historyStyles.historyHeader}>
        <View style={historyStyles.userInfo}>
          <Ionicons name="person-circle" size={24} color="#007AFF" />
          <Text style={historyStyles.username}>{item.otherUsername}</Text>
        </View>
        <Text style={historyStyles.timestamp}>
          {formatDateTime(item.timestamp)}
        </Text>
      </View>

      <View style={historyStyles.historyBody}>
        <View style={historyStyles.distanceContainer}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={historyStyles.distance}>
            距離: {formatDistance(item.distance)}
          </Text>
        </View>

        {item.otherOneMessage && (
          <View style={historyStyles.messageContainer}>
            <Ionicons name="chatbubble-outline" size={16} color="#666" />
            <Text style={historyStyles.oneMessage} numberOfLines={2}>
              {item.otherOneMessage}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={historyStyles.header}>
        <TouchableOpacity
          style={historyStyles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
          <Text style={historyStyles.backButtonText}>ホームに戻る</Text>
        </TouchableOpacity>
        <Text style={historyStyles.title}>すれ違い履歴</Text>
      </View>

      {/* コンテンツ */}
      {loading ? (
        <View style={historyStyles.centerContainer}>
          <Text style={historyStyles.loadingText}>読み込み中...</Text>
        </View>
      ) : encounterHistory.length === 0 ? (
        <View style={historyStyles.centerContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={historyStyles.emptyText}>
            まだすれ違いの履歴がありません
          </Text>
          <Text style={historyStyles.emptySubText}>
            アプリを起動して外に出かけてみましょう！
          </Text>
        </View>
      ) : (
        <>
          {/* 統計情報 */}
          <View style={historyStyles.statsContainer}>
            <Text style={historyStyles.statsText}>
              総すれ違い回数: {encounterHistory.length}回
            </Text>
          </View>

          {/* 履歴リスト */}
          <FlatList
            data={encounterHistory}
            keyExtractor={(item, index) => `${item.otherUserId}-${index}`}
            renderItem={renderHistoryItem}
            contentContainerStyle={historyStyles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const historyStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
    marginLeft: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  statsContainer: {
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  statsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  listContainer: {
    padding: 16,
  },
  historyItem: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
  },
  historyBody: {
    gap: 8,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  distance: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  oneMessage: {
    fontSize: 14,
    color: "#333",
    marginLeft: 6,
    flex: 1,
    lineHeight: 20,
  },
});
