import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedGestureHandler, useAnimatedStyle, runOnJS, withSpring } from 'react-native-reanimated';
import { palette } from '../utils/Colors';

const SongListPage = ({ songs, title, subtitle, onBack, playSong }) => {
  // Gesture handling for swipe back
  const translateX = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      translateX.value = 0;
    },
    onActive: (event) => {
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    },
    onEnd: (event) => {
      if (event.translationX > 100 && event.velocityX > 0) {
        runOnJS(onBack)();
      } else {
        translateX.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  if (!songs || songs.length === 0) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View style={[styles.container, animatedStyle]}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <FontAwesome name="chevron-left" size={20} color={palette.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{title || 'Songs'}</Text>
            </View>
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No songs available</Text>
            </View>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    );
  }

  // Render song item
  const renderSongItem = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.songItem}
      onPress={() => {
        if (playSong) {
          playSong(item, songs, index);
        }
      }}
    >
      <Image 
        source={{ uri: item.coverArt }} 
        style={styles.songCover}
      />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {item.title || item.name}
        </Text>
        <View style={styles.songSubtitleContainer}>
          <Text style={styles.songArtist} numberOfLines={1}>
            {item.artist}
          </Text>
          {item.album && (
            <>
              <Text style={styles.songArtist}> • </Text>
              <Text style={[styles.songArtist, styles.albumName]} numberOfLines={1}>
                {item.album}
              </Text>
            </>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.moreButton}>
        <FontAwesome name="ellipsis-v" size={16} color={palette.quaternary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.container, animatedStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <FontAwesome name="chevron-left" size={20} color={palette.text} />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{title || 'Songs'}</Text>
              {subtitle && (
                <Text style={styles.headerSubtitle}>{subtitle}</Text>
              )}
            </View>
          </View>

          {/* Song List */}
          <FlatList
            data={songs}
            renderItem={renderSongItem}
            keyExtractor={(item, index) => `${item.id || index}`}
            style={styles.songList}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.secondary,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
  },
  headerSubtitle: {
    fontSize: 16,
    color: palette.quaternary,
    marginTop: 2,
  },
  songList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  songCover: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 15,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: palette.text,
    marginBottom: 4,
  },
  songSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  songArtist: {
    fontSize: 14,
    color: palette.text,
    opacity: 0.7,
  },
  albumName: {
    fontWeight: 'bold',
  },
  moreButton: {
    padding: 10,
  },
  separator: {
    height: 1,
    backgroundColor: palette.secondary,
    marginLeft: 65,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: palette.quaternary,
    textAlign: 'center',
  },
});

export default SongListPage;
