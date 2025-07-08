import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { palette } from '../utils/Colors';

const MinimizedPlayer = ({ 
  song, 
  isPlaying, 
  onTogglePlay, 
  onPress, 
  onNext,
  position = 0,
  duration = 0
}) => {
  if (!song) return null;

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <TouchableOpacity 
      style={styles.glassPill} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <BlurView intensity={25} style={styles.blurContainer}>
        {/* Song artwork */}
        <Image 
          source={{ uri: song.coverArt }} 
          style={styles.artwork}
        />
        
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
          style={styles.playBtn}
          onPress={onTogglePlay}
        >
          <FontAwesome 
            name={isPlaying ? "pause" : "play"} 
            size={16} 
            color={palette.text}
            style={!isPlaying ? { marginLeft: 1 } : null}
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.nextBtn}
          onPress={onNext}
        >
          <FontAwesome 
            name="step-forward" 
            size={14} 
            color={palette.text} 
          />
        </TouchableOpacity>
        
        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View 
            style={[styles.progress, { width: `${progressPercentage}%` }]} 
          />
        </View>
      </BlurView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  glassPill: {
    position: 'absolute',
    bottom: 120, // Position above nav bar
    left: 10,
    right: 10,
    height: 70,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(37, 56, 64, 0.7)', // Lighter tint for blur
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
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
});

export default MinimizedPlayer;
