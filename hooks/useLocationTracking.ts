import * as Location from "expo-location";
import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import { Post } from "../components/utils/types";
import { saveLocationToFirestore } from "../services/locationService";
import { getNearbyPosts } from "../services/postService";

export interface UseLocationTrackingProps {
  currentUserId: string;
  setPosts?: (posts: Post[] | ((prev: Post[]) => Post[])) => void;
}

export interface UseLocationTrackingReturn {
  location: Location.LocationObject | null;
  isLocationTracking: boolean;
  initializeLocationTracking: () => Promise<void>;
  cleanupLocationTracking: () => void;
  updateSetPosts: (
    setPosts: (posts: Post[] | ((prev: Post[]) => Post[])) => void
  ) => void;
}

export const useLocationTracking = ({
  currentUserId,
  setPosts: initialSetPosts,
}: UseLocationTrackingProps): UseLocationTrackingReturn => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [isLocationTracking, setIsLocationTracking] = useState(false);

  // setPosts関数の参照を保持
  const setPostsRef = useRef(initialSetPosts);

  // 位置情報取得のインターバル参照
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  // すれ違い検知のインターバル参照
  const encounterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // setPosts関数を更新する関数
  const updateSetPosts = useCallback(
    (newSetPosts: (posts: Post[] | ((prev: Post[]) => Post[])) => void) => {
      setPostsRef.current = newSetPosts;
    },
    []
  );

  // Firestoreデータをローカル形式に変換する関数
  const convertFirestorePostsToLocal = useCallback(
    (firestorePosts: any[]): Post[] => {
      return firestorePosts.map((firestorePost) => {
        // Firestoreのリアクション情報を変換
        const reactions: { [userID: string]: string } = {};
        const reactionCounts: { [emoji: string]: number } = {};

        if (
          firestorePost.reactions &&
          typeof firestorePost.reactions === "object"
        ) {
          Object.entries(firestorePost.reactions).forEach(
            ([emoji, data]: [string, any]) => {
              if (data && data.userIds && Array.isArray(data.userIds)) {
                reactionCounts[emoji] = data.count || data.userIds.length;
                // 各ユーザーの反応を記録
                data.userIds.forEach((userId: string) => {
                  reactions[userId] = emoji;
                });
              }
            }
          );
        }

        return {
          id: firestorePost.id,
          content: firestorePost.text,
          author: `User-${firestorePost.userID.slice(-6)}`,
          location: {
            latitude: firestorePost.coordinates.latitude,
            longitude: firestorePost.coordinates.longitude,
          },
          timestamp: firestorePost.timestamp,
          parentPostID: firestorePost.parentPostID,
          reactions: reactions,
          reactionCounts: reactionCounts,
          replies: [],
        };
      });
    },
    []
  );

  // 周辺投稿を取得して投稿リストを更新する関数
  const loadAndUpdateNearbyPosts = useCallback(
    async (currentLocation: Location.LocationObject) => {
      try {
        console.log("周辺投稿を取得中...");
        const nearbyPosts = await getNearbyPosts(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          1.0 // 1km圏内
        );

        if (nearbyPosts.length > 0) {
          console.log(`周辺投稿${nearbyPosts.length}件取得しました`);
          const convertedPosts = convertFirestorePostsToLocal(nearbyPosts);

          // 既存の投稿を更新または新しい投稿を追加
          if (setPostsRef.current) {
            setPostsRef.current((prevPosts) => {
              const updatedPosts = [...prevPosts];
              let hasNewPosts = false;

              convertedPosts.forEach((newPost) => {
                const existingPostIndex = updatedPosts.findIndex(
                  (p) => p.id === newPost.id
                );
                if (existingPostIndex >= 0) {
                  // 既存の投稿を更新（リアクション情報など）
                  updatedPosts[existingPostIndex] = {
                    ...updatedPosts[existingPostIndex],
                    reactions: newPost.reactions,
                    reactionCounts: newPost.reactionCounts,
                  };
                } else {
                  // 新しい投稿を追加
                  updatedPosts.unshift(newPost);
                  hasNewPosts = true;
                }
              });

              if (hasNewPosts) {
                console.log(`新しい投稿が追加されました`);
              }

              return updatedPosts;
            });
          }
        } else {
          console.log("周辺に新しい投稿はありません");
        }
      } catch (error) {
        console.error("周辺投稿取得エラー:", error);
      }
    },
    [convertFirestorePostsToLocal]
  );

  const initializeLocationTracking = useCallback(async () => {
    if (!currentUserId) return;

    // 5秒間隔で位置情報を取得してFirestoreに保存する関数
    const startLocationTracking = () => {
      setIsLocationTracking(true);
      console.log("位置情報の定期取得を開始しました（5秒間隔）");

      locationIntervalRef.current = setInterval(async () => {
        try {
          console.log("定期取得：位置情報を取得中...");
          // すれ違い検知は行わずに位置情報のみ更新
          const savedLocation = await saveLocationToFirestore(
            currentUserId,
            false
          );

          if (savedLocation) {
            // 現在地を更新
            console.log("定期取得：現在地を更新中...");
            const currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            setLocation(currentLocation);

            // 周辺の投稿を取得して表示
            await loadAndUpdateNearbyPosts(currentLocation);
            console.log("定期取得：位置情報を保存しました");
          } else {
            console.error("定期取得：位置情報の保存に失敗しました");
          }
        } catch (error) {
          console.error("位置情報の定期取得でエラーが発生しました:", error);
        }
      }, 5000); // 5秒間隔
    };

    // 20分間隔ですれ違い検知を実行する関数
    const startEncounterDetection = () => {
      console.log("すれ違い検知の定期実行を開始しました（20分間隔）");

      encounterIntervalRef.current = setInterval(
        async () => {
          try {
            console.log("定期実行：すれ違い検知を開始...");
            // すれ違い検知を実行
            const savedLocation = await saveLocationToFirestore(
              currentUserId,
              true
            );

            if (savedLocation) {
              console.log("すれ違い検知が完了しました");
            }
          } catch (error) {
            console.error("すれ違い検知でエラーが発生しました:", error);
          }
        },
        20 * 60 * 1000
      ); // 20分間隔
    };

    try {
      console.log("位置情報の許可を要求中...");
      let { status } = await Location.requestForegroundPermissionsAsync();
      console.log("位置情報の許可ステータス:", status);

      if (status !== "granted") {
        Alert.alert("エラー", "位置情報の許可が必要です");
        return;
      }

      console.log("現在地を取得中...");
      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      console.log("位置情報取得成功", currentLocation.coords);
      setLocation(currentLocation);

      // 初回の位置情報をFirestoreに保存（すれ違い検知なし）
      console.log("Firestoreに位置情報を保存中...");
      const savedLocation = await saveLocationToFirestore(currentUserId, false);
      if (savedLocation) {
        console.log("初回位置情報を保存しました");
      } else {
        console.error("初回位置情報の保存に失敗しました");
      }

      // 初回の周辺投稿取得
      console.log("初回の周辺投稿を取得中...");
      await loadAndUpdateNearbyPosts(currentLocation);

      // 5秒間隔の位置情報取得を開始
      startLocationTracking();

      // 20分間隔のすれ違い検知を開始
      startEncounterDetection();
    } catch (error) {
      console.error("位置情報取得処理でエラーが発生しました:", error);
      Alert.alert(
        "エラー",
        "位置情報の取得に失敗しました: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }, [currentUserId, loadAndUpdateNearbyPosts]);

  const cleanupLocationTracking = useCallback(() => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    if (encounterIntervalRef.current) {
      clearInterval(encounterIntervalRef.current);
      encounterIntervalRef.current = null;
    }
    setIsLocationTracking(false);
  }, []);

  return {
    location,
    isLocationTracking,
    initializeLocationTracking,
    cleanupLocationTracking,
    updateSetPosts,
  };
};
