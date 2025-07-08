import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../utils/styles";
import {
  BIRTH_DAYS,
  BIRTH_MONTHS,
  BIRTH_YEARS,
  BLOOD_TYPE_OPTIONS,
  GENDER_OPTIONS,
  PREFECTURE_OPTIONS,
  UserProfile,
  UserProfileUpdateData,
  ZODIAC_SIGNS,
} from "../../utils/types";

// オプション選択コンポーネント（性別・血液型用）
interface OptionSelectorProps {
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

const OptionSelector: React.FC<OptionSelectorProps> = ({
  options,
  selectedValue,
  onSelect,
}) => {
  return (
    <View style={styles.optionContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.optionButton,
            selectedValue === option && styles.optionButtonSelected,
          ]}
          onPress={() => onSelect(option)}
        >
          <Text
            style={[
              styles.optionText,
              selectedValue === option && styles.optionTextSelected,
            ]}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ドロップダウン選択コンポーネント（出身地・星座用）
interface DropdownSelectorProps {
  options: string[];
  selectedValue: string;
  placeholder: string;
  onSelect: (value: string) => void;
}

const DropdownSelector: React.FC<DropdownSelectorProps> = ({
  options,
  selectedValue,
  placeholder,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.dropdownButtonText}>
          {selectedValue || placeholder}
        </Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color="#666"
        />
      </TouchableOpacity>

      {isOpen && (
        <ScrollView style={styles.dropdownList} nestedScrollEnabled>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.dropdownItem,
                selectedValue === option && styles.dropdownItemSelected,
              ]}
              onPress={() => {
                onSelect(option);
                setIsOpen(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  selectedValue === option && styles.dropdownItemTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// 生年月日選択コンポーネント
interface DateSelectorProps {
  selectedDate?: Date;
  onDateChange: (date: Date) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({
  selectedDate,
  onDateChange,
}) => {
  const [selectedYear, setSelectedYear] = useState(
    selectedDate?.getFullYear()?.toString() || ""
  );
  const [selectedMonth, setSelectedMonth] = useState(
    selectedDate ? `${selectedDate.getMonth() + 1}月` : ""
  );
  const [selectedDay, setSelectedDay] = useState(
    selectedDate ? `${selectedDate.getDate()}日` : ""
  );

  const [yearOpen, setYearOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);

  const handleDatePartChange = (year: string, month: string, day: string) => {
    if (year && month && day) {
      const yearNum = parseInt(year);
      const monthNum = parseInt(month.replace("月", "")) - 1;
      const dayNum = parseInt(day.replace("日", ""));
      const newDate = new Date(yearNum, monthNum, dayNum);
      onDateChange(newDate);
    }
  };

  const handleYearSelect = (year: string) => {
    setSelectedYear(year);
    handleDatePartChange(year, selectedMonth, selectedDay);
    setYearOpen(false);
  };

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    handleDatePartChange(selectedYear, month, selectedDay);
    setMonthOpen(false);
  };

  const handleDaySelect = (day: string) => {
    setSelectedDay(day);
    handleDatePartChange(selectedYear, selectedMonth, day);
    setDayOpen(false);
  };

  return (
    <View style={styles.datePickerContainer}>
      {/* 年選択 */}
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setYearOpen(!yearOpen)}
        >
          <Text style={styles.datePickerButtonText}>
            {selectedYear || "年"}
          </Text>
        </TouchableOpacity>
        {yearOpen && (
          <ScrollView
            style={[styles.dropdownList, { maxHeight: 150 }]}
            nestedScrollEnabled
          >
            {BIRTH_YEARS.map((year) => (
              <TouchableOpacity
                key={year}
                style={styles.dropdownItem}
                onPress={() => handleYearSelect(year)}
              >
                <Text style={styles.dropdownItemText}>{year}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* 月選択 */}
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setMonthOpen(!monthOpen)}
        >
          <Text style={styles.datePickerButtonText}>
            {selectedMonth || "月"}
          </Text>
        </TouchableOpacity>
        {monthOpen && (
          <ScrollView
            style={[styles.dropdownList, { maxHeight: 150 }]}
            nestedScrollEnabled
          >
            {BIRTH_MONTHS.map((month) => (
              <TouchableOpacity
                key={month}
                style={styles.dropdownItem}
                onPress={() => handleMonthSelect(month)}
              >
                <Text style={styles.dropdownItemText}>{month}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* 日選択 */}
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setDayOpen(!dayOpen)}
        >
          <Text style={styles.datePickerButtonText}>{selectedDay || "日"}</Text>
        </TouchableOpacity>
        {dayOpen && (
          <ScrollView
            style={[styles.dropdownList, { maxHeight: 150 }]}
            nestedScrollEnabled
          >
            {BIRTH_DAYS.map((day) => (
              <TouchableOpacity
                key={day}
                style={styles.dropdownItem}
                onPress={() => handleDaySelect(day)}
              >
                <Text style={styles.dropdownItemText}>{day}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

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
  onHomeNavigation: () => void; // ホーム画面への遷移関数
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
  onHomeNavigation,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{ flex: 1 }}>
        {/* ヘッダー部分 */}
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onHomeNavigation}
          >
            <Ionicons name="arrow-back" size={24} color="#4A90E2" />
            <Text style={styles.backButtonText}>ホームに戻る</Text>
          </TouchableOpacity>
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
                {userProfile?.displayName || "ユーザー名未設定"}
              </Text>
              <Text style={styles.profileId}>
                ID: {userProfile?.userId || "未設定"}
              </Text>
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
                    {savingMessage ? "保存中..." : "保存"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.messageText}>
                {currentOneMessage || "一言メッセージを設定しましょう"}
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
            <Text
              style={[
                styles.tabText,
                profileTabIndex === 0 && styles.activeTabText,
              ]}
            >
              基本情報
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, profileTabIndex === 1 && styles.activeTab]}
            onPress={() => onTabChange(1)}
          >
            <Text
              style={[
                styles.tabText,
                profileTabIndex === 1 && styles.activeTabText,
              ]}
            >
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
                    <OptionSelector
                      options={GENDER_OPTIONS}
                      selectedValue={profileFormData.gender || ""}
                      onSelect={(value) =>
                        onProfileFormChange({ gender: value })
                      }
                    />
                  </View>

                  {/* 血液型 */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>血液型</Text>
                    <OptionSelector
                      options={BLOOD_TYPE_OPTIONS}
                      selectedValue={profileFormData.bloodType || ""}
                      onSelect={(value) =>
                        onProfileFormChange({ bloodType: value })
                      }
                    />
                  </View>

                  {/* 生年月日 */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>生年月日</Text>
                    <DateSelector
                      selectedDate={profileFormData.birthday}
                      onDateChange={(date) =>
                        onProfileFormChange({ birthday: date })
                      }
                    />
                  </View>

                  {/* 出身地 */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>出身地</Text>
                    <DropdownSelector
                      options={PREFECTURE_OPTIONS}
                      selectedValue={profileFormData.hometown || ""}
                      placeholder="出身地を選択"
                      onSelect={(value) =>
                        onProfileFormChange({ hometown: value })
                      }
                    />
                  </View>

                  {/* 星座 */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>星座</Text>
                    <DropdownSelector
                      options={ZODIAC_SIGNS}
                      selectedValue={profileFormData.zodiacSign || ""}
                      placeholder="星座を選択"
                      onSelect={(value) =>
                        onProfileFormChange({ zodiacSign: value })
                      }
                    />
                  </View>

                  {/* 悩み */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>悩み</Text>
                    <TextInput
                      style={[styles.textInput, styles.multilineInput]}
                      value={profileFormData.worries}
                      onChangeText={(text) =>
                        onProfileFormChange({ worries: text })
                      }
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
                      onChangeText={(text) =>
                        onProfileFormChange({ selfIntroduction: text })
                      }
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
                      <TouchableOpacity
                        style={styles.addTagButton}
                        onPress={onTagAdd}
                      >
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
                      {savingProfile ? "保存中..." : "プロフィールを保存"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // 表示モード
                <View style={styles.profileDisplay}>
                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>性別</Text>
                    <Text style={styles.fieldValue}>
                      {userProfile?.gender || "未設定"}
                    </Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>血液型</Text>
                    <Text style={styles.fieldValue}>
                      {userProfile?.bloodType || "未設定"}
                    </Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>生年月日</Text>
                    <Text style={styles.fieldValue}>
                      {userProfile?.birthday
                        ? `${userProfile.birthday.getFullYear()}年${userProfile.birthday.getMonth() + 1}月${userProfile.birthday.getDate()}日`
                        : "未設定"}
                    </Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>出身地</Text>
                    <Text style={styles.fieldValue}>
                      {userProfile?.hometown || "未設定"}
                    </Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>星座</Text>
                    <Text style={styles.fieldValue}>
                      {userProfile?.zodiacSign || "未設定"}
                    </Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>悩み</Text>
                    <Text style={styles.fieldValue}>
                      {userProfile?.worries || "未設定"}
                    </Text>
                  </View>

                  <View style={styles.profileField}>
                    <Text style={styles.fieldLabel}>自己紹介</Text>
                    <Text style={styles.fieldValue}>
                      {userProfile?.selfIntroduction || "未設定"}
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
