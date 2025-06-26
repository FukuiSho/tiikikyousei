import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ホーム画面</Text>

      {/* 右下に固定された履歴ボタン */}
      <TouchableOpacity
        style={styles.historyButton}
        onPress={() => router.push("/history" as const)}
      >
        <Text style={styles.historyButtonText}>履歴を見る</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  historyButton: {
    position: 'absolute',
    bottom: 30,       // 下からの位置
    right: 20,        // 右からの位置
    backgroundColor: '#4682B4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});