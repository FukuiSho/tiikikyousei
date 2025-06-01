import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

/**
 * フォトライブラリから画像を選択する関数
 */
export const selectImageFromLibrary = async () => {
  try {
    // フォトライブラリのアクセス許可を要求
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("エラー", "フォトライブラリへのアクセス許可が必要です");
      return null;
    }

    // 画像を選択
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    // 選択された画像を返す
    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch {
    Alert.alert("エラー", "画像の選択に失敗しました");
    return null;
  }
};

/**
 * カメラで画像を撮影する関数
 */
export const selectImageFromCamera = async () => {
  try {
    // カメラのアクセス許可を要求
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("エラー", "カメラへのアクセス許可が必要です");
      return null;
    }

    // カメラを起動
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    // 撮影された画像を返す
    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch {
    Alert.alert("エラー", "カメラの起動に失敗しました");
    return null;
  }
};

/**
 * 画像選択方法のオプションを表示する関数
 */
export const showImagePickerOptions = (
  onImageFromLibrary: () => void,
  onImageFromCamera: () => void
) => {
  Alert.alert("画像を選択", "画像の取得方法を選択してください", [
    { text: "カメラ", onPress: onImageFromCamera },
    { text: "フォトライブラリ", onPress: onImageFromLibrary },
    { text: "キャンセル", style: "cancel" },
  ]);
};
