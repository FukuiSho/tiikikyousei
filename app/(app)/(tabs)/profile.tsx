import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
 
/**
* ProfileEditScreen
* --------------------------------------------------
* Expo‑Router の /profile ルートで表示されるプロフィール編集画面。
* 既存コードに影響しないよう自己完結型にしています。
* 画像は base64 URI として一時保存。永続化は TODO: にフックしてください。
*/
export default function ProfileEditScreen() {
  //#region ────────────── State ──────────────
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [oneLiner, setOneLiner] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  //#endregion
 
  //#region ────────────── Helpers ──────────────
  const requestImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("権限がありません", "写真ライブラリへのアクセスを許可してください。");
      return;
    }
 
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: false,
    });
 
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);
 
  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert("入力不足", "名前を入力してください。");
      return;
    }
 
    /**
     * TODO: ここでプロフィール情報を永続化
     * 例: await updateUserProfile({ name, gender, oneLiner, bio, avatarUri });
     */
 
    router.back(); // 画面を閉じる
  }, [name, gender, oneLiner, bio, avatarUri]);
  //#endregion
 
  //#region ────────────── Render ──────────────
  return (
<KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={80}
>
<ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
>
        {/* アイコン */}
<TouchableOpacity
          style={styles.avatarWrapper}
          onPress={requestImage}
          accessibilityRole="button"
          accessibilityLabel="アイコンを変更"
>
          {avatarUri ? (
<Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
<Ionicons name="camera" size={42} color="#888" />
          )}
</TouchableOpacity>
 
        {/* 名前 */}
<Text style={styles.label}>名前</Text>
<TextInput
          style={styles.input}
          placeholder="あなたの名前"
          value={name}
          onChangeText={setName}
          maxLength={20}
        />
 
        {/* 性別 */}
<Text style={styles.label}>性別</Text>
<View style={styles.genderRow}>
          {(
            [
              { key: "male", label: "男性", icon: "male" },
              { key: "female", label: "女性", icon: "female" },
              { key: "other", label: "その他", icon: "trans" },
            ] as const
          ).map(({ key, label, icon }) => (
<TouchableOpacity
              key={key}
              style={[
                styles.genderButton,
                gender === key && styles.genderButtonActive,
              ]}
              onPress={() => setGender(key)}
>
<Ionicons
                name={`${icon}-outline` as any}
                size={18}
                color={gender === key ? "#fff" : "#777"}
              />
<Text
                style={[
                  styles.genderText,
                  gender === key && styles.genderTextActive,
                ]}
>
                {label}
</Text>
</TouchableOpacity>
          ))}
</View>
 
        {/* ひとこと */}
<Text style={styles.label}>みんなにひとこと</Text>
<TextInput
          style={styles.input}
          placeholder="例: よろしくお願いします！"
          value={oneLiner}
          onChangeText={setOneLiner}
          maxLength={50}
        />
 
        {/* 自由記載欄 */}
<Text style={styles.label}>自己紹介</Text>
<TextInput
          style={[styles.input, styles.textarea]}
          placeholder="好きなこと、趣味、経歴など…"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
        />
 
        {/* 保存ボタン */}
<TouchableOpacity style={styles.saveButton} onPress={handleSave}>
<Text style={styles.saveButtonText}>保存する</Text>
</TouchableOpacity>
</ScrollView>
</KeyboardAvoidingView>
  );
  //#endregion
}
 
// ────────────── Styles ──────────────
const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  label: {
    alignSelf: "flex-start",
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    backgroundColor: "#FFF",
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  genderRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  genderButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
  },
  genderButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  genderText: {
    marginLeft: 6,
    color: "#777",
    fontSize: 13,
  },
  genderTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  saveButton: {
    marginTop: 24,
    width: "100%",
    paddingVertical: 14,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },
});