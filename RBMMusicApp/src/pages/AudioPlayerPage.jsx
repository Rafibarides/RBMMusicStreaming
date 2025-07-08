import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { FontAwesome } from '@expo/vector-icons';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedGestureHandler, useAnimatedStyle, runOnJS, withSpring } from 'react-native-reanimated';
import { palette } from '../utils/Colors';
import artistsData from '../json/artists.json';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AudioPlayerPage = ({ 
  song, 
  onBack, 
  onNavigateToArtist, 
  queue = [], 
  currentIndex = 0,
  isPlaying = false,
  position = 0,
  duration = 0,
  isLoading = false,
  onTogglePlay,
  onSeek,
  onUpdatePosition,
  onNext,
  onPrevious,
  onSliderStart,
  onSliderEnd
}) => {

  // Gesture handling for swipe down to close
  const translateY = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      translateY.value = 0;
    },
    onActive: (event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    },
    onEnd: (event) => {
      if (event.translationY > 150 && event.velocityY > 0) {
        runOnJS(onBack)();
      } else {
        translateY.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const formatTime = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleArtistPress = () => {
    const artist = artistsData.find(a => a.name === song.artist);
    if (artist && onNavigateToArtist) {
      onNavigateToArtist(artist);
    }
  };

  if (!song) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No song selected</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.container, animatedStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <FontAwesome name="chevron-down" size={24} color={palette.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Now Playing</Text>
            <TouchableOpacity style={styles.moreButton}>
              <FontAwesome name="ellipsis-h" size={20} color={palette.text} />
            </TouchableOpacity>
          </View>

          {/* Album Art */}
          <View style={styles.artworkContainer}>
            <Image 
              source={{ uri: song.coverArt }} 
              style={styles.artwork}
              resizeMode="cover"
            />
          </View>

          {/* Song Info */}
          <View style={styles.songInfoContainer}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {song.title || song.name}
            </Text>
            <TouchableOpacity onPress={handleArtistPress}>
              <Text style={styles.artistName} numberOfLines={1}>
                {song.artist}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration}
              value={position}
              onValueChange={(value) => {
                if (onUpdatePosition) {
                  onUpdatePosition(value);
                }
              }}
              onSlidingStart={() => {
                if (onSliderStart) {
                  onSliderStart();
                }
              }}
              onSlidingComplete={(value) => {
                if (onSliderEnd) {
                  onSliderEnd();
                }
                if (onSeek) {
                  onSeek(value);
                }
              }}
              minimumTrackTintColor={palette.text}
              maximumTrackTintColor={palette.quaternary}
              thumbTintColor={palette.text}
            />
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Control Buttons */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={onPrevious}
            >
              <FontAwesome name="step-backward" size={24} color={palette.text} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.playButton}
              onPress={onTogglePlay}
              disabled={isLoading}
            >
              {isLoading ? (
                <FontAwesome name="spinner" size={32} color={palette.text} />
              ) : (
                <FontAwesome 
                  name={isPlaying ? "pause" : "play"} 
                  size={32} 
                  color={palette.text}
                  style={!isPlaying ? styles.playIcon : null}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlButton}
              onPress={onNext}
            >
              <FontAwesome name="step-forward" size={24} color={palette.text} />
            </TouchableOpacity>
          </View>

          {/* Additional Controls */}
          <View style={styles.additionalControls}>
            <TouchableOpacity style={styles.additionalButton}>
              <FontAwesome name="random" size={20} color={palette.quaternary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.additionalButton}>
              <FontAwesome name="heart-o" size={20} color={palette.quaternary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.additionalButton}>
              <FontAwesome name="repeat" size={20} color={palette.quaternary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
  },
  moreButton: {
    padding: 10,
  },
  artworkContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 30,
  },
  artwork: {
    width: screenWidth - 80,
    height: screenWidth - 80,
    borderRadius: 12,
  },
  songInfoContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 30,
  },
  songTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  artistName: {
    fontSize: 18,
    color: palette.quaternary,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 30,
  },
  timeText: {
    fontSize: 14,
    color: palette.quaternary,
    minWidth: 45,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 30,
  },
  controlButton: {
    padding: 20,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
  },
  playIcon: {
    marginLeft: 4,
  },
  additionalControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    paddingBottom: 50,
  },
  additionalButton: {
    padding: 15,
  },
  errorText: {
    fontSize: 18,
    color: palette.text,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default AudioPlayerPage;
