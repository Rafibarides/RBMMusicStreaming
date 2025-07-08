import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { palette } from '../utils/Colors';

const MinimizedPlayer = ({ 
  song, 
  isPlaying, 
  onTogglePlay, 
  onPress, 
  onNext 
}) => {
  if (!song) return null;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        {/* Song artwork */}
        <Image 
          source={{ uri: song.coverArt }} 
          style={styles.artwork}
        />
        
        {/* Song info */}
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {song.title || song.name}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {song.artist}
          </Text>
        </View>
        
        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={onTogglePlay}
          >
            <FontAwesome 
              name={isPlaying ? "pause" : "play"} 
              size={18} 
              color={palette.text}
              style={!isPlaying ? styles.playIcon : null}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={onNext}
          >
            <FontAwesome 
              name="step-forward" 
              size={16} 
              color={palette.text} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.secondary,
    borderTopWidth: 1,
    borderTopColor: palette.tertiary,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 15,
  },
  songInfo: {
    flex: 1,
    paddingRight: 10,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: palette.text,
    marginBottom: 2,
  },
  artistName: {
    fontSize: 14,
    color: palette.quaternary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    padding: 10,
    marginLeft: 5,
  },
  playIcon: {
    marginLeft: 2,
  },
});

export default MinimizedPlayer;
