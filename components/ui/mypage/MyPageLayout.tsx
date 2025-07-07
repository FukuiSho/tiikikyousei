import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile, UserProfileUpdateData } from '../../utils/types';
import { styles } from '../../utils/styles';

interface MyPageLayoutProps {
  userProfile: UserProfile | null;
  currentOneMessage: string;
  editingOneMessage: string;
  isEditingMessage: boolean;
  savingMessage: boolean;
  profileFormData: UserProfileUpdateData;
  isEditingProfile: boolean;
  savingProfile: boolean;
  profileTabIndex: number;
  tagInput: string;
  onMessageEdit: (editing: boolean) => void;
  onMessageChange: (message: string) => void;
  onMessageSave: () => void;
  onProfileEdit: (editing: boolean) => void;
  onProfileFormChange: (data: Partial<UserProfileUpdateData>) => void;
  onProfileSave: () => void;
  onTabChange: (index: number) => void;
  onTagInputChange: (input: string) => void;
  onTagAdd: () => void;
  onTagRemove: (index: number) => void;
}

export const MyPageLayout: React.FC<MyPageLayoutProps> = ({
  userProfile,
  currentOneMessage,
  editingOneMessage,
  isEditingMessage,
  savingMessage,
  profileFormData,
  isEditingProfile,
  savingProfile,
  profileTabIndex,
  tagInput,
  onMessageEdit,
  onMessageChange,
  onMessageSave,
  onProfileEdit,
  onProfileFormChange,
  onProfileSave,
  onTabChange,
  onTagInputChange,
  onTagAdd,
  onTagRemove,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{ flex: 1 }}>
        {/* ヘッダー部分 */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>マイページ</Text>
        </View>

        {/* プロフィール基本情報 */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={80} color="#4A90E2" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {userProfile?.displayName || 'ユーザー名未設定'}
              </Text>
              <Text style={styles.profileId}>ID: {userProfile?.userId || '未設定'}</Text>
            </View>
          </View>

          {/* 一言メッセージ */}
          <View style={styles.oneMessageSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>一言メッセージ</Text>
              <TouchableOpacity
                onPress={() => onMessageEdit(!isEditingMessage)}
                disabled={savingMessage}
              >
                <Ionicons 
                  name={isEditingMessage ? "close" : "create"} 
                  size={20} 
                  color="#4A90E2" 
                />
              </TouchableOpacity>
            </View>
            
            {isEditingMessage ? (
              <View>
                <TextInput
                  style={styles.messageInput}
                  value={editingOneMessage}
                  onChangeText={onMessageChange}
                  placeholder="一言メッセージを入力..."
                  multiline
                  maxLength={100}
                />
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={onMessageSave}
                  disabled={savingMessage}
                >
                  <Text style={styles.saveButtonText}>
                    {savingMessage ? '保存中...' : '保存'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.messageText}>
                {currentOneMessage || '一言メッセージを設定しましょう'}
              </Text>
            )}
          </View>
        </View>

        {/* タブナビゲーション */}
        <View style={styles.tabNavigation}>
          <TouchableOpacity
            style={[styles.tab, profileTabIndex === 0 && styles.activeTab]}
            onPress={() => onTabChange(0)}
          >
            <Text style={[styles.tabText, profileTabIndex === 0 && styles.activeTabText]}>
              基本情報
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, profileTabIndex === 1 && styles.activeTab]}
            onPress={() => onTabChange(1)}
          >
            <Text style={[styles.tabText, profileTabIndex === 1 && styles.activeTabText]}>
              詳細情報
            </Text>
          </TouchableOpacity>
        </View>

        {/* タブコンテンツ */}
        {profileTabIndex === 0 ? (
          // 基本情報タブ
          <View style={styles.tabContent}>
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>統計情報</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>すれ違い回数</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>0</Text>
                  <Text style={styles.statLabel}>投稿数</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          // 詳細情報タブ
          <View style={styles.tabContent}>
            <View style={styles.profileDetailSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>プロフィール詳細</Text>
                <TouchableOpacity
                  onPress={() => onProfileEdit(!isEditingProfile)}
                  disabled={savingProfile}
                >
                  <Ionicons 
                    name={isEditingProfile ? "close" : "create"} 
                    size={20} 
                    color="#4A90E2" 
                  />
                </TouchableOpacity>
              </View>

              {isEditingProfile ? (
                // 編集モード
                <View style={styles.profileForm}>
                  {/* 性別 */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>性別</Text>
                    <TextInput
                      style={styles.textInput}
                      value={profileFormData.gender}
                      onChangeText={(text) => onProfileFormChange({ gender: text })}
                      placeholder="性別を入力"
                    />
                  </View>

                  {/* 血液型 */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>血液型</Text>
                    <TextInput
                      style={styles.textInput}
                      value={profileFormData.bloodType}
                      onChangeText={(text) => onProfileFormChange({ bloodType: text })}
                      placeholder="血液型を入力"
                    />
                  </View>

                  {/* 出身地 */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>出身地</Text>
                    <TextInput
                      style={styles.textInput}
                      value={profileFormData.hometown}
                      onChangeText={(text) => onProfileFormChange({ hometown: text })}
                      placeholder="出身地を入力"
                    />
                  </View>

                  {/* 悩み */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>悩み</Text>
                    <TextInput
                      style={[styles.textInput, styles.multilineInput]}
                      value={profileFormData.worries}
                      onChangeText={(text) => onProfileFormChange({ worries: text })}
                      placeholder="悩みを入力"
                      multiline
                    />
                  </View>

                  {/* 自己紹介 */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>自己紹介</Text>
                    <TextInput
                      style={[styles.textInput, styles.multilineInput]}
                      value={profileFormData.selfIntroduction}
                      onChangeText={(text) => onProfileFormChange({ selfIntroduction: text })}
                      placeholder="自己紹介を入力"
                      multiline
                    />
                  </View>

                  {/* タグ */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>興味・趣味タグ</Text>
                    <View style={styles.tagInputContainer}>
                      <TextInput
                        style={[styles.textInput, { flex: 1 }]}
                        value={tagInput}
                        onChangeText={onTagInputChange}
                        placeholder="タグを追加"
                      />
                      <TouchableOpacity style={styles.addTagButton} onPress={onTagAdd}>
                        <Ionicons name="add" size={20} color="white" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.tagContainer}>
                      {profileFormData.tags.map((tag, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                          <TouchableOpacity
                            onPress={() => onTagRemove(index)}
                            style={styles.removeTagButton}
                          >
                            <Ionicons name="close" size={14} color="#666" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={onProfileSave}
                    disabled={savingProfile}
                  >
                    <Text style={styles.saveButtonText}>
                      {savingProfile ? '保存中...' : 'プロフィールを保存'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // 表示モード
                <View style={styles.profileDisplay}>
                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>性別</Text>
                    <Text style={styles.fieldValue}>
                      {userProfile?.gender || '未設定'}
                    </Text>
                  </View>
                  
                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>血液型</Text>
                    <Text style={styles.fieldValue}>
                      {userProfile?.bloodType || '未設定'}
                    </Text>
                  </View>
                  
                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>出身地</Text>
                    <Text style={styles.fieldValue}>
                      {userProfile?.hometown || '未設定'}
                    </Text>
                  </View>
                  
                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>悩み</Text>
                    <Text style={styles.fieldValue}>
                      {userProfile?.worries || '未設定'}
                    </Text>
                  </View>
                  
                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>自己紹介</Text>
                    <Text style={styles.fieldValue}>
                      {userProfile?.selfIntroduction || '未設定'}
                    </Text>
                  </View>
                  
                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>興味・趣味タグ</Text>
                    <View style={styles.tagContainer}>
                      {userProfile?.tags && userProfile.tags.length > 0 ? (
                        userProfile.tags.map((tag, index) => (
                          <View key={index} style={styles.displayTag}>
                            <Text style={styles.displayTagText}>{tag}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.fieldValue}>未設定</Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
