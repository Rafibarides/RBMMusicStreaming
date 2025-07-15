import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { FontAwesome } from '@expo/vector-icons';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedGestureHandler, 
  useAnimatedStyle, 
  runOnJS, 
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '../utils/Colors';
import CachedImage from '../components/CachedImage';

import { useMusicData } from '../contexts/MusicDataContext';

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
  isNavigating = false,
  isRepeating = false,
  isShuffled = false,
  onTogglePlay,
  onSeek,
  onUpdatePosition,
  onNext,
  onPrevious,
  onToggleRepeat,
  onToggleShuffle,
  onSliderStart,
  onSliderEnd
}) => {
  const [lyricsData, setLyricsData] = useState(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  // Refs for optimization
  const lyricsContainerRef = useRef(null);
  const previousSecondRef = useRef(-1);

  // Music data context
  const { toggleLikeSong, isSongLiked, createPlaylist: createPlaylistContext, addSongToPlaylist: addSongToPlaylistContext, playlists: contextPlaylists, artists: contextArtists } = useMusicData();



  // Gesture handling for swipe down to close
  const translateY = useSharedValue(0);
  const lyricsHeight = useSharedValue(0);
  const bubbleScale = useSharedValue(1); // For bubble animation
  const scrollOffset = useSharedValue(0);
  const panRef = useRef(null);
  const scrollRef = useRef(null);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (event) => {
      translateY.value = 0;
    },
    onActive: (event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    },
    onEnd: (event) => {
      if (event.translationY > 30 || event.velocityY > 50) {
        translateY.value = withTiming(1000, { duration: 250 }, () => {
          runOnJS(onBack)();
        });
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const lyricsAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: withTiming(lyricsHeight.value, { duration: 300 }),
      opacity: withTiming(lyricsHeight.value > 0 ? 1 : 0, { duration: 300 }),
    };
  });

  const bubbleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: bubbleScale.value }],
    };
  });

  const formatTime = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Convert time string to seconds (for lyrics)
  const timeToSeconds = (timeString) => {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return minutes * 60 + seconds;
  };

  // Load lyrics data from Cloudflare URL when song changes
  useEffect(() => {
    
    const loadLyrics = async () => {
      if (song?.lyrics) {
        try {
          const response = await fetch(song.lyrics);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const lyricsData = await response.json();
          setLyricsData(lyricsData);
        } catch (error) {
          setLyricsData(null);
        }
              } else {
        setLyricsData(null);
      }
    };

    loadLyrics();
  }, [song]);

  // Find current lyric based on current time (converted to seconds) - exactly like web reference
  useEffect(() => {
    if (lyricsData && position > 0) {
      const currentSecond = Math.floor(position / 1000);
      
      const currentIndex = lyricsData.findIndex((lyric) => {
        const startTime = timeToSeconds(lyric.start);
        const endTime = timeToSeconds(lyric.end);
        return currentSecond >= startTime && currentSecond <= endTime;
      });
      
      if (currentIndex !== -1 && currentIndex !== currentLyricIndex) {
        setCurrentLyricIndex(currentIndex);
        
        // Trigger bubble animation for new lyric
        bubbleScale.value = withTiming(1.2, { duration: 200 }, () => {
          bubbleScale.value = withTiming(1.05, { duration: 200 });
        });
        
        // Auto-scroll to keep current lyric in FIXED position (second line from top)
        if (lyricsContainerRef.current) {
          const lineHeight = 80; // Height per lyric line (increased for bigger text)
          const fixedPosition = lineHeight; // Second line position (one line height from top)
          const targetScrollY = Math.max(0, currentIndex * lineHeight - fixedPosition);
          
          lyricsContainerRef.current.scrollTo({
            y: targetScrollY,
            animated: true,
          });
        }
      }
    }
  }, [lyricsData, position, currentLyricIndex]); // Fast updates based on position changes

  // Toggle lyrics visibility - exactly like web reference
  const toggleLyrics = () => {
    const newShowState = !showLyrics;
    setShowLyrics(newShowState);
    lyricsHeight.value = newShowState ? 300 : 0;
    setShowMenu(false); // Close menu when opening lyrics
  };

  // Toggle menu visibility
  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  // Handle menu item selection
  const handleMenuOption = (option) => {
    setShowMenu(false);
    
    // Add a small delay to ensure menu closes before modal opens
    setTimeout(() => {
      if (option === 'lyrics') {
        toggleLyrics();
      } else if (option === 'credits') {
        setShowCreditsModal(true);
      } else if (option === 'addToPlaylist') {
        setShowPlaylistModal(true);
      }
    }, 100);
  };

  // Handle heart icon press
  const handleLikePress = async () => {
    if (song) {
      await toggleLikeSong(song);
    }
  };

  // Handle lyric click to seek - exactly like web reference
  const handleLyricClick = (index) => {
    const startTime = timeToSeconds(lyricsData[index].start);
    const seekTimeMs = startTime * 1000; // Convert back to milliseconds
    if (onSeek) {
      onSeek(seekTimeMs);
    }
    setCurrentLyricIndex(index);
  };

  const handleArtistPress = () => {
    const artist = contextArtists.find(a => a.name === song.artist);
    if (artist && onNavigateToArtist) {
      onNavigateToArtist(artist);
    }
  };

  // Playlist management functions
  const createPlaylist = async (name) => {
    try {
      const newPlaylist = await createPlaylistContext(name);
      if (newPlaylist) {
        // Add the song to the new playlist
        const success = await addSongToPlaylistContext(newPlaylist.id, song);
        if (success) {
          setShowCreatePlaylist(false);
          setNewPlaylistName('');
          setShowPlaylistModal(false);
          Alert.alert('Success', `Added "${song.title}" to new playlist "${name}"`);
        } else {
          Alert.alert('Error', 'Failed to add song to playlist');
        }
      } else {
        Alert.alert('Error', 'Failed to create playlist');
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', 'Failed to create playlist');
    }
  };

  const addToPlaylist = async (playlistId) => {
    try {
      const success = await addSongToPlaylistContext(playlistId, song);
      if (success) {
        setShowPlaylistModal(false);
        
        const playlistName = contextPlaylists.find(p => p.id === playlistId)?.name;
        Alert.alert('Success', `Added "${song.title}" to "${playlistName}"`);
      } else {
        Alert.alert('Info', `"${song.title}" is already in this playlist`);
      }
    } catch (error) {
      console.error('Error adding to playlist:', error);
      Alert.alert('Error', 'Failed to add song to playlist');
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
    <>
      <GestureHandlerRootView style={styles.container}>
                <PanGestureHandler 
          ref={panRef}
          onGestureEvent={gestureHandler}
          shouldCancelWhenOutside={false}
          enabled={true}
          maxPointers={1}
          simultaneousHandlers={scrollRef}
        >
          <Animated.View style={[styles.container, animatedStyle]}>
            {/* Background Gradient with Cover Art */}
            <View style={styles.backgroundGradient}>
              <CachedImage 
                source={{ uri: song.coverArt }} 
                style={styles.backgroundImage}
                resizeMode="cover"
                blurRadius={8} // Add blur effect to background image
              />
              <LinearGradient
                colors={['rgba(21, 32, 38, 0.3)', 'rgba(21, 32, 38, 0.5)', 'rgba(21, 32, 38, 0.8)', palette.background]}
                style={styles.gradientOverlay}
                locations={[0, 0.3, 0.7, 1]}
              />
            </View>

            {/* Scrollable Content */}
            <ScrollView 
              ref={scrollRef}
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContentContainer}
              onScroll={(event) => {
                scrollOffset.value = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
              waitFor={panRef}
            >
              {/* Header - Scrolls with content */}
              <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                  <FontAwesome name="chevron-down" size={24} color={palette.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>Now Playing</Text>
                </View>
                <View style={styles.menuContainer}>
                  <TouchableOpacity 
                    style={styles.moreButton} 
                    onPress={toggleMenu}
                  >
                    <FontAwesome name="ellipsis-h" size={20} color={palette.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Album Art */}
              <View style={styles.artworkContainer}>
                <CachedImage 
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
                  style={[styles.controlButton, isNavigating && styles.disabledButton]}
                  onPress={onPrevious}
                  disabled={isNavigating}
                >
                  <FontAwesome 
                    name="step-backward" 
                    size={24} 
                    color={isNavigating ? palette.quaternary : palette.text} 
                  />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.playButton}
                  onPress={onTogglePlay}
                  disabled={isLoading || isNavigating}
                >
                  {isLoading || isNavigating ? (
                    <FontAwesome name="spinner" size={32} color={palette.text} />
                  ) : isPlaying ? (
                    <FontAwesome name="pause" size={32} color={palette.text} />
                  ) : (
                    <View style={styles.playTriangleContainer}>
                      <View style={styles.playTriangle} />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.controlButton, isNavigating && styles.disabledButton]}
                  onPress={onNext}
                  disabled={isNavigating}
                >
                  <FontAwesome 
                    name="step-forward" 
                    size={24} 
                    color={isNavigating ? palette.quaternary : palette.text} 
                  />
                </TouchableOpacity>
              </View>

              {/* Additional Controls */}
              <View style={styles.additionalControls}>
                <TouchableOpacity style={styles.additionalButton} onPress={onToggleShuffle}>
                  <FontAwesome 
                    name="random" 
                    size={20} 
                    color={isShuffled ? palette.text : palette.quaternary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.additionalButton} onPress={handleLikePress}>
                  <FontAwesome 
                    name={song && isSongLiked(song.id) ? "heart" : "heart-o"} 
                    size={20} 
                    color={song && isSongLiked(song.id) ? palette.tertiary : palette.quaternary} 
                  />
                </TouchableOpacity>
                {lyricsData && (
                  <TouchableOpacity style={styles.additionalButton} onPress={toggleLyrics}>
                    <FontAwesome 
                      name={showLyrics ? "chevron-up" : "chevron-down"}
                      size={20} 
                      color={palette.text} 
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.additionalButton} onPress={onToggleRepeat}>
                  <FontAwesome 
                    name="repeat" 
                    size={20} 
                    color={isRepeating ? palette.text : palette.quaternary} 
                  />
                </TouchableOpacity>
              </View>



              {/* Lyrics Section - exactly like web reference */}
              {lyricsData && (
                <Animated.View style={[styles.lyricsContainer, lyricsAnimatedStyle]}>
                  <ScrollView
                    ref={lyricsContainerRef}
                    style={styles.lyricsScrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.lyricsContent}
                  >
                    {lyricsData.map((lyric, index) => {
                      const isCurrent = index === currentLyricIndex;
                      return (
                        <TouchableOpacity
                          key={index}
                          style={styles.lyricLine}
                          onPress={() => handleLyricClick(index)}
                          activeOpacity={0.8}
                        >
                          <Animated.Text
                            numberOfLines={2} // Allow text to wrap to 2 lines
                            style={[
                              styles.lyricText,
                              isCurrent ? [styles.currentLyricText, bubbleAnimatedStyle] : styles.inactiveLyricText
                            ]}
                          >
                            {lyric.lyric}
                          </Animated.Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </Animated.View>
              )}

              {/* Bottom spacing */}
              <View style={{ height: 50 }} />
            </ScrollView>

            {/* Menu Background Overlay - render FIRST so it's behind the menu */}
            {showMenu && (
              <TouchableOpacity 
                style={styles.menuBackgroundOverlay} 
                onPress={() => setShowMenu(false)}
                activeOpacity={1}
              />
            )}

            {/* Dropdown Menu - render AFTER overlay so it's on top */}
            {showMenu && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => handleMenuOption('lyrics')}
                  activeOpacity={0.7}
                >
                  <FontAwesome name="align-left" size={16} color={palette.text} />
                  <Text style={styles.menuText}>Lyrics</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => handleMenuOption('credits')}
                  activeOpacity={0.7}
                >
                  <FontAwesome name="users" size={16} color={palette.text} />
                  <Text style={styles.menuText}>Credits</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.menuItem, styles.lastMenuItem]} 
                  onPress={() => handleMenuOption('addToPlaylist')}
                  activeOpacity={0.7}
                >
                  <FontAwesome name="plus" size={16} color={palette.text} />
                  <Text style={styles.menuText}>Add to Playlist</Text>
                </TouchableOpacity>
              </View>
            )}

          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>

      {/* CREDITS MODAL */}
      <Modal
        visible={showCreditsModal}
        onRequestClose={() => setShowCreditsModal(false)}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Credits</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowCreditsModal(false)}
            >
              <FontAwesome name="times" size={24} color={palette.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.songInfoSection}>
              <CachedImage 
                source={{ uri: song.coverArt }} 
                style={styles.modalSongCover}
              />
              <Text style={styles.modalSongTitle}>{song.title}</Text>
              <Text style={styles.modalSongArtist}>{song.artist}</Text>
            </View>

            {song.credits && song.credits.length > 0 ? (
              <View style={styles.creditsSection}>
                <Text style={styles.creditsSectionTitle}>Production Credits</Text>
                {song.credits.map((credit, index) => (
                  <View key={index} style={styles.creditItem}>
                    <Text style={styles.creditName}>{credit.name}</Text>
                    <Text style={styles.creditRole}>{credit.role}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noCreditsSection}>
                <FontAwesome name="music" size={48} color={palette.quaternary} />
                <Text style={styles.noCreditsText}>No credits available</Text>
                <Text style={styles.noCreditsSubtext}>
                  Credits information is not available for this song
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* PLAYLIST MODAL */}
      <Modal
        visible={showPlaylistModal}
        onRequestClose={() => setShowPlaylistModal(false)}
        animationType="slide"
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add to Playlist</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => {
                setShowPlaylistModal(false);
                setShowCreatePlaylist(false);
                setNewPlaylistName('');
              }}
            >
              <FontAwesome name="times" size={24} color={palette.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.songInfoSection}>
              <CachedImage 
                source={{ uri: song.coverArt }} 
                style={styles.modalSongCover}
              />
              <Text style={styles.modalSongTitle}>{song.title}</Text>
              <Text style={styles.modalSongArtist}>{song.artist}</Text>
            </View>

            {!showCreatePlaylist ? (
              <>
                <TouchableOpacity 
                  style={styles.createPlaylistButton}
                  onPress={() => setShowCreatePlaylist(true)}
                >
                  <FontAwesome name="plus" size={20} color={palette.text} />
                  <Text style={styles.createPlaylistText}>Create New Playlist</Text>
                </TouchableOpacity>

                {contextPlaylists.length > 0 ? (
                  <View style={styles.playlistsSection}>
                    <Text style={styles.playlistsSectionTitle}>Your Playlists</Text>
                    {contextPlaylists.map((playlist) => (
                      <TouchableOpacity 
                        key={playlist.id}
                        style={styles.playlistItem}
                        onPress={() => addToPlaylist(playlist.id)}
                      >
                        <View style={styles.playlistCover}>
                          <FontAwesome name="music" size={16} color={palette.quaternary} />
                        </View>
                        <View style={styles.playlistInfo}>
                          <Text style={styles.playlistName}>{playlist.name}</Text>
                          <Text style={styles.playlistCount}>
                            {playlist.songs.length} song{playlist.songs.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <FontAwesome name="plus" size={16} color={palette.quaternary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noPlaylistsSection}>
                    <FontAwesome name="list" size={48} color={palette.quaternary} />
                    <Text style={styles.noPlaylistsText}>No playlists yet</Text>
                    <Text style={styles.noPlaylistsSubtext}>
                      Create your first playlist to get started
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.createPlaylistSection}>
                <Text style={styles.createPlaylistTitle}>Create New Playlist</Text>
                <TextInput
                  style={styles.playlistNameInput}
                  placeholder="Enter playlist name"
                  placeholderTextColor={palette.quaternary}
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                  autoFocus
                />
                <View style={styles.createPlaylistButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowCreatePlaylist(false);
                      setNewPlaylistName('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.createButton, !newPlaylistName.trim() && styles.createButtonDisabled]}
                    onPress={() => {
                      if (newPlaylistName.trim()) {
                        createPlaylist(newPlaylistName.trim());
                      }
                    }}
                    disabled={!newPlaylistName.trim()}
                  >
                    <Text style={[styles.createButtonText, !newPlaylistName.trim() && styles.createButtonTextDisabled]}>
                      Create
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

    </>
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
    paddingTop: 0, // Remove top padding since it's handled by ScrollView
    paddingBottom: 20,
    backgroundColor: 'transparent', // Make header transparent to show gradient
  },

  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 50, // Add top padding for status bar area
    paddingBottom: 50,
  },
  backButton: {
    padding: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    textAlign: 'center',
  },
  moreButton: {
    padding: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40, // Adjust as needed to position it below the button
    right: 0,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 10, // Higher elevation to ensure it's above the overlay
    zIndex: 2000, // Very high z-index to ensure it appears above overlay
    minWidth: 120,
  },
  menuBackgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 500, // Lower than dropdown menu but higher than content
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  lastMenuItem: {
    borderBottomWidth: 0, // Remove border for the last item
  },
  menuText: {
    marginLeft: 10,
    fontSize: 14,
    color: palette.text,
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
  disabledButton: {
    opacity: 0.5,
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
  playTriangleContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: palette.text,
    transform: [{ rotate: '90deg' }],
    // Soften the triangle edges with subtle styling
    opacity: 0.95,
  },
  playIcon: {
    marginLeft: 4,
  },
  additionalControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    paddingBottom: 20,
  },
  additionalButton: {
    padding: 15,
  },
  // Lyrics Styles - exactly like web reference
  lyricsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(5px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  lyricsScrollView: {
    maxHeight: 300,
  },
  lyricsContent: {
    paddingHorizontal: 20,
    paddingVertical: 20, // Reduced from 40 to minimize extra space
  },
  lyricLine: {
    paddingVertical: 12,
    minHeight: 80, // Increased height for bigger text and two lines
    justifyContent: 'center',
  },
  lyricText: {
    textAlign: 'left', // Left aligned as requested
    color: palette.text,
    lineHeight: 28, // Better line height for readability
  },
  // Current lyric - bigger with bubble animation effect
  currentLyricText: {
    fontSize: 22, // Bigger text
    fontWeight: 'bold',
    opacity: 1,
    shadowColor: palette.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  // Inactive lyrics - bigger but dimmed
  inactiveLyricText: {
    fontSize: 18, // Bigger than before
    fontWeight: 'normal',
    opacity: 0.6,
    transform: [{ scale: 1 }],
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 18,
    color: palette.text,
    textAlign: 'center',
    marginTop: 100,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999, // High enough to intercept touches but below dropdown menu
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.6, // Extend slightly more to cover header nicely
    zIndex: -1, // Ensure it's behind other content
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.6, // Match the gradient container height
    opacity: 0.4, // Slightly higher opacity for better visibility
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.6, // Match the gradient container height
  },
  // Built-in Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: palette.background,
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.secondary,
    minWidth: 250,
    maxWidth: screenWidth - 40,
    elevation: 10, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalCloseText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },

  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: palette.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50, // Add top padding for status bar
    borderBottomWidth: 1,
    borderBottomColor: palette.secondary,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.text,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  songInfoSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalSongCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalSongTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 4,
  },
  modalSongArtist: {
    fontSize: 14,
    color: palette.quaternary,
  },
  
  // Credits modal styles
  creditsSection: {
    paddingTop: 20,
  },
  creditsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 15,
  },
  creditItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: palette.secondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  creditName: {
    fontSize: 16,
    color: palette.text,
    fontWeight: '500',
  },
  creditRole: {
    fontSize: 14,
    color: palette.quaternary,
  },
  noCreditsSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noCreditsText: {
    fontSize: 18,
    fontWeight: '500',
    color: palette.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noCreditsSubtext: {
    fontSize: 14,
    color: palette.quaternary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Playlist modal styles
  createPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: palette.secondary,
    borderRadius: 8,
    marginBottom: 20,
  },
  createPlaylistText: {
    fontSize: 16,
    color: palette.text,
    fontWeight: '500',
    marginLeft: 8,
  },
  playlistsSection: {
    paddingTop: 10,
  },
  playlistsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 15,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: palette.secondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  playlistCover: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: palette.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    color: palette.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  playlistCount: {
    fontSize: 12,
    color: palette.quaternary,
  },
  noPlaylistsSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPlaylistsText: {
    fontSize: 18,
    fontWeight: '500',
    color: palette.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noPlaylistsSubtext: {
    fontSize: 14,
    color: palette.quaternary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Create playlist styles
  createPlaylistSection: {
    paddingVertical: 20,
  },
  createPlaylistTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 15,
  },
  playlistNameInput: {
    backgroundColor: palette.secondary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: palette.text,
    borderWidth: 1,
    borderColor: palette.quaternary,
    marginBottom: 20,
  },
  createPlaylistButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: palette.secondary,
    borderRadius: 8,
    marginRight: 10,
  },
  cancelButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: palette.tertiary,
    borderRadius: 8,
    marginLeft: 10,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  createButtonTextDisabled: {
    color: palette.quaternary,
  },
});

export default AudioPlayerPage;
