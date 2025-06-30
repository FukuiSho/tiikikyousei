import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Button,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function HistoryScreen() {
  const router = useRouter();

  const [history, setHistory] = useState<string[]>([
    '2025/06/19 アプリ起動',
    '2025/06/18 ログインしました',
    '2025/06/17 設定を変更しました',
  ]);

  const [count, setCount] = useState(1); // 追加履歴用

  // 追加ボタンを押すと履歴が増える
  const handleAdd = () => {
    const newItem = `追加履歴 ${count}`;
    setHistory((prev) => [newItem, ...prev]);
    setCount((prev) => prev + 1);
  };

  // 履歴をタップで削除
  const handleDelete = (item: string) => {
    Alert.alert('削除しますか？', item, [
      { text: 'キャンセル' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => setHistory((prev) => prev.filter((h) => h !== item)),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Button title="← ホームに戻る" onPress={() => router.back()} />
      <Text style={styles.title}>履歴画面</Text>

      <Button title="履歴を追加" onPress={handleAdd} color="#4682B4" />

      <FlatList
        data={history}
        keyExtractor={(item, index) => item + index}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <View style={styles.item}>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  list: {
    paddingBottom: 20,
  },
  item: {
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    elevation: 2,
  },
  itemText: {
    fontSize: 18,
  },
});