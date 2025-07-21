import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { palette } from '../utils/Colors';
import CachedImage from './CachedImage';

const MinimizedPlayer = ({ 
  song, 
  isPlaying, 
  isNavigating = false,
  isLoading = false,
  onTogglePlay, 
  onPress, 
  onNext,
  onClose,
  position = 0,
  duration = 0
}) => {
  const [showCloseButton, setShowCloseButton] = useState(false);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const closeButtonTimeout = useRef(null);

  // Reset close button state when song changes
  useEffect(() => {
    setShowCloseButton(false);
    translateY.value = 0;
    opacity.value = 1;
    
    // Clear any existing timeout
    if (closeButtonTimeout.current) {
      clearTimeout(closeButtonTimeout.current);
      closeButtonTimeout.current = null;
    }
  }, [song?.id]);

  // Auto-hide close button after 3 seconds
  useEffect(() => {
    if (showCloseButton) {
      closeButtonTimeout.current = setTimeout(() => {
        setShowCloseButton(false);
      }, 3000);
    }
    
    return () => {
      if (closeButtonTimeout.current) {
        clearTimeout(closeButtonTimeout.current);
      }
    };
  }, [showCloseButton]);

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  const handleLongPress = () => {
    // Clear any existing timeout
    if (closeButtonTimeout.current) {
      clearTimeout(closeButtonTimeout.current);
      closeButtonTimeout.current = null;
    }
    setShowCloseButton(true);
  };

  const handleClose = () => {
    // Clear timeout when closing
    if (closeButtonTimeout.current) {
      clearTimeout(closeButtonTimeout.current);
      closeButtonTimeout.current = null;
    }
    setShowCloseButton(false);
    // Fade out with slight downward motion
    translateY.value = withTiming(30, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 }, () => {
      if (onClose) {
        runOnJS(onClose)();
      }
    });
  };

  const handlePress = () => {
    if (showCloseButton) {
      // Clear timeout when manually hiding
      if (closeButtonTimeout.current) {
        clearTimeout(closeButtonTimeout.current);
        closeButtonTimeout.current = null;
      }
      setShowCloseButton(false);
    } else if (onPress) {
      onPress();
    }
  };

  const handleControlPress = (action) => {
    // Don't trigger close button state when using controls
    if (action && typeof action === 'function') {
      action();
    }
  };

  // Don't render if no song
  if (!song) {
    return null;
  }

  return (
    <View style={styles.playerContainer}>
      <Animated.View style={[styles.glassPill, animatedStyle]}>
        <TouchableOpacity 
          style={styles.touchableContainer}
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={400}
          activeOpacity={0.8}
          pointerEvents="auto"
        >
          <BlurView intensity={25} style={styles.blurContainer} pointerEvents="box-none">
            {/* Song artwork */}
            <View style={styles.artworkContainer}>
              <CachedImage 
                source={{ uri: song.coverArt }} 
                style={styles.artwork}
              />
            </View>
            
            {/* Song info */}
            <View style={styles.songInfo}>
              <Text style={styles.title} numberOfLines={1}>
                {song.title || song.name}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {song.artist}
              </Text>
            </View>
            
            {/* Controls */}
            <TouchableOpacity 
              style={[styles.playBtn, (isNavigating || isLoading) && styles.disabledButton]}
              onPress={() => handleControlPress(onTogglePlay)}
              pointerEvents="auto"
              activeOpacity={0.7}
              disabled={isNavigating || isLoading}
            >
              <FontAwesome 
                name={
                  isLoading ? "hourglass-half" : 
                  isNavigating ? "spinner" : 
                  (isPlaying ? "pause" : "play")
                } 
                size={16} 
                color={(isNavigating || isLoading) ? palette.quaternary : palette.text}
                style={!isPlaying && !isNavigating && !isLoading ? { marginLeft: 1 } : null}
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.nextBtn, (isNavigating || isLoading) && styles.disabledButton]}
              onPress={() => handleControlPress(onNext)}
              pointerEvents="auto"
              activeOpacity={0.7}
              disabled={isNavigating || isLoading}
            >
              <FontAwesome 
                name="step-forward" 
                size={14} 
                color={(isNavigating || isLoading) ? palette.quaternary : palette.text} 
              />
            </TouchableOpacity>
            
            {/* Progress bar */}
            <View style={styles.progressBar} pointerEvents="none">
              <View 
                style={[styles.progress, { width: `${progressPercentage}%` }]} 
              />
            </View>
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Close button - outside of glassPill to avoid overflow:hidden clipping */}
      {showCloseButton && (
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={handleClose}
          pointerEvents="auto"
          activeOpacity={0.8}
        >
          <View style={styles.closeButtonCircle}>
            <FontAwesome 
              name="times" 
              size={12} 
              color="white" 
            />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  playerContainer: {
    position: 'absolute',
    bottom: 90, // Position above nav bar with more clearance
    left: 10,
    right: 10,
    height: 70,
    zIndex: 50, // Lower than nav bar's z-index
    marginBottom: 30,
  },
  glassPill: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5, // Lower than nav bar to prevent interference
    overflow: 'hidden',
  },
  touchableContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  blurContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(37, 56, 64, 0.7)', // Lighter tint for blur
  },
  artworkContainer: {
    marginRight: 12,
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  songInfo: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
    color: palette.quaternary,
  },
  playBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  nextBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  progress: {
    height: 2,
    backgroundColor: palette.text,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    left: -8,
    zIndex: 100, // Higher than the player
    pointerEvents: 'auto',
  },
  closeButtonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.quaternary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MinimizedPlayer;
