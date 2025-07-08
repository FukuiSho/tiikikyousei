import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MyPageLayout } from "../../components/ui/mypage/MyPageLayout";
import { styles } from "../../components/utils/styles";
import {
  UserProfile,
  UserProfileUpdateData,
} from "../../components/utils/types";
import {
  getUserOneMessage,
  getUserProfile,
  saveUserProfile,
  updateUserOneMessage,
} from "../../services/locationService";
import { getPersistentUserId } from "../../services/userService";

export default function MyPageScreen() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentOneMessage, setCurrentOneMessage] = useState<string>("");
  const [editingOneMessage, setEditingOneMessage] = useState<string>("");
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);

  // プロフィール用のstate
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileFormData, setProfileFormData] = useState<UserProfileUpdateData>(
    {
      gender: "",
      bloodType: "",
      hometown: "",
      birthday: undefined,
      zodiacSign: "", // 星座フィールドを追加
      worries: "",
      selfIntroduction: "",
      tags: [],
    }
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileTabIndex, setProfileTabIndex] = useState(0); // 0: 基本情報, 1: 詳細情報
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    const initializeData = async () => {
      const userId = await getPersistentUserId();
      setCurrentUserId(userId);

      // 一言メッセージを取得
      try {
        const oneMessage = await getUserOneMessage(userId);
        setCurrentOneMessage(oneMessage);
        setEditingOneMessage(oneMessage);
      } catch (error) {
        console.error("一言メッセージの取得に失敗しました:", error);
        setCurrentOneMessage("");
        setEditingOneMessage("");
      }

      // プロフィール情報を読み込み
      await loadUserProfile(userId);
    };

    initializeData();
  }, []);

  // 一言メッセージの編集を開始
  const startEditingMessage = () => {
    setIsEditingMessage(true);
  };

  // 一言メッセージの保存
  const saveOneMessage = async () => {
    if (editingOneMessage.trim().length === 0) {
      Alert.alert("エラー", "メッセージを入力してください");
      return;
    }

    setSavingMessage(true);
    try {
      const success = await updateUserOneMessage(
        currentUserId,
        editingOneMessage.trim()
      );
      if (success) {
        setCurrentOneMessage(editingOneMessage.trim());
        setIsEditingMessage(false);
        Alert.alert("成功", "一言メッセージを更新しました");
      } else {
        Alert.alert("エラー", "メッセージの更新に失敗しました");
      }
    } catch (error) {
      console.error("一言メッセージの保存に失敗しました:", error);
      Alert.alert("エラー", "メッセージの更新に失敗しました");
    } finally {
      setSavingMessage(false);
    }
  };

  // 一言メッセージの編集をキャンセル
  const cancelEditingMessage = () => {
    setEditingOneMessage(currentOneMessage);
    setIsEditingMessage(false);
  };

  // プロフィール情報を読み込む
  const loadUserProfile = async (userId: string) => {
    if (!userId) return;

    try {
      const profile = await getUserProfile(userId);
      if (profile) {
        setUserProfile(profile);
        setProfileFormData({
          gender: profile.gender || "",
          bloodType: profile.bloodType || "",
          hometown: profile.hometown || "",
          birthday: profile.birthday || undefined,
          zodiacSign: profile.zodiacSign || "", // 星座フィールドを追加
          worries: profile.worries || "",
          selfIntroduction: profile.selfIntroduction || "",
          tags: profile.tags || [],
        });
      }
    } catch (error) {
      console.error("プロフィールの読み込みに失敗しました:", error);
    }
  };

  // プロフィール情報を保存
  const saveUserProfileData = async () => {
    if (!currentUserId) return;

    setSavingProfile(true);
    try {
      // プロフィールデータをクリーンアップ
      const cleanedProfileData = { ...profileFormData };

      // 誕生日が無効な場合は除去
      if (
        cleanedProfileData.birthday &&
        (!(cleanedProfileData.birthday instanceof Date) ||
          isNaN(cleanedProfileData.birthday.getTime()))
      ) {
        cleanedProfileData.birthday = undefined;
      }

      const success = await saveUserProfile(currentUserId, cleanedProfileData);
      if (success) {
        await loadUserProfile(currentUserId); // 最新情報を再読み込み
        setIsEditingProfile(false);
        Alert.alert("成功", "プロフィールを更新しました");
      } else {
        Alert.alert("エラー", "プロフィールの更新に失敗しました");
      }
    } catch (error) {
      console.error("プロフィールの保存に失敗しました:", error);
      Alert.alert("エラー", "プロフィールの更新に失敗しました");
    } finally {
      setSavingProfile(false);
    }
  };

  // プロフィール編集をキャンセル
  const cancelEditingProfile = () => {
    if (userProfile) {
      setProfileFormData({
        gender: userProfile.gender || "",
        bloodType: userProfile.bloodType || "",
        hometown: userProfile.hometown || "",
        birthday: userProfile.birthday || undefined,
        zodiacSign: userProfile.zodiacSign || "", // 星座フィールドを追加
        worries: userProfile.worries || "",
        selfIntroduction: userProfile.selfIntroduction || "",
        tags: userProfile.tags || [],
      });
    }
    setIsEditingProfile(false);
  };

  // タグを追加
  const addTag = () => {
    if (tagInput.trim() && !profileFormData.tags?.includes(tagInput.trim())) {
      setProfileFormData({
        ...profileFormData,
        tags: [...(profileFormData.tags || []), tagInput.trim()],
      });
      setTagInput("");
    }
  };

  // タグを削除
  const removeTag = (tagToRemove: string) => {
    setProfileFormData({
      ...profileFormData,
      tags: profileFormData.tags?.filter((tag) => tag !== tagToRemove) || [],
    });
  };

  // コールバック関数を定義
  const handleMessageEdit = (editing: boolean) => {
    if (editing) {
      startEditingMessage();
    } else {
      cancelEditingMessage();
    }
  };

  const handleMessageChange = (message: string) => {
    setEditingOneMessage(message);
  };

  const handleProfileEdit = (editing: boolean) => {
    if (editing) {
      setIsEditingProfile(true);
    } else {
      cancelEditingProfile();
    }
  };

  const handleProfileFormChange = (data: Partial<UserProfileUpdateData>) => {
    setProfileFormData({ ...profileFormData, ...data });
  };

  const handleTabChange = (index: number) => {
    setProfileTabIndex(index);
  };

  const handleTagInputChange = (input: string) => {
    setTagInput(input);
  };

  const handleTagRemove = (index: number) => {
    const tagToRemove = profileFormData.tags?.[index];
    if (tagToRemove) {
      removeTag(tagToRemove);
    }
  };

  // ホーム画面に戻る関数
  const handleHomeNavigation = () => {
    router.push("/(tabs)");
  };

  // UserProfileにuserIdとdisplayNameを追加したバージョンを作成
  const enhancedUserProfile: UserProfile = {
    ...userProfile,
    userId: currentUserId,
    displayName: currentUserId
      ? `User-${currentUserId.slice(-6)}`
      : "ユーザー名未設定",
  };

  return (
    <SafeAreaView style={styles.container}>
      <MyPageLayout
        userProfile={enhancedUserProfile}
        currentOneMessage={currentOneMessage}
        editingOneMessage={editingOneMessage}
        isEditingMessage={isEditingMessage}
        savingMessage={savingMessage}
        profileFormData={profileFormData}
        isEditingProfile={isEditingProfile}
        savingProfile={savingProfile}
        profileTabIndex={profileTabIndex}
        tagInput={tagInput}
        onMessageEdit={handleMessageEdit}
        onMessageChange={handleMessageChange}
        onMessageSave={saveOneMessage}
        onProfileEdit={handleProfileEdit}
        onProfileFormChange={handleProfileFormChange}
        onProfileSave={saveUserProfileData}
        onTabChange={handleTabChange}
        onTagInputChange={handleTagInputChange}
        onTagAdd={addTag}
        onTagRemove={handleTagRemove}
        onHomeNavigation={handleHomeNavigation}
      />
    </SafeAreaView>
  );
}
