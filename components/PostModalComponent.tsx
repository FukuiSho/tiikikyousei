import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "./utils/styles";
import { NewPost } from "./utils/types";

interface PostModalComponentProps {
  visible: boolean;
  newPost: NewPost;
  selectedImage: string | null;
  onClose: () => void;
  onNewPostChange: (post: NewPost) => void;
  onCreatePost: () => void;
  onImagePicker: () => void;
  onRemoveImage: () => void;
}

export const PostModalComponent: React.FC<PostModalComponentProps> = ({
  visible,
  newPost,
  selectedImage,
  onClose,
  onNewPostChange,
  onCreatePost,
  onImagePicker,
  onRemoveImage,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.modalContent}>
          {/* モーダルヘッダー */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>新しい投稿</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* モーダル本体 */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 20,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            scrollEnabled={true}
            bounces={true}
          >
            <View style={styles.inputGroup}>
              <Text style={styles.label}>内容（任意）</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="投稿の内容を入力（画像のみでも投稿可能）"
                value={newPost.content}
                onChangeText={(text) =>
                  onNewPostChange({ ...newPost, content: text })
                }
                multiline={true}
                numberOfLines={5}
                maxLength={300}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>投稿者名</Text>
              <TextInput
                style={styles.input}
                placeholder="あなたの名前を入力"
                value={newPost.author}
                onChangeText={(text) =>
                  onNewPostChange({ ...newPost, author: text })
                }
                maxLength={20}
                returnKeyType="done"
              />
            </View>

            {/* ========== 画像選択セクション ========== */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>画像</Text>
              {/* 画像選択ボタン */}
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={onImagePicker}
              >
                <Text style={styles.imagePickerText}>
                  {selectedImage ? "画像を変更" : "画像を選択"}
                </Text>
                {/* 画像削除ボタン */}
                {selectedImage && (
                  <TouchableOpacity
                    style={styles.imageRemoveButton}
                    onPress={onRemoveImage}
                  >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              {/* 選択された画像のプレビュー */}
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.selectedImage}
                  resizeMode="cover"
                />
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={onCreatePost}
            >
              <Text style={styles.submitButtonText}>投稿する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
