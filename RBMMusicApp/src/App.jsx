import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  SafeAreaView, 
  View, 
  Alert,
  AppState
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';

// Import contexts
import { MusicDataProvider, useMusicData } from './contexts/MusicDataContext';

// Import components
import BottomNavBar from './components/BottomNavBar';
import MinimizedPlayer from './components/MinimizedPlayer';

// Import screens
import Dashboard from './screens/Dashboard';
import Search from './screens/Search';
import Playlists from './screens/Playlists';

// Import pages
import AudioPlayerPage from './pages/AudioPlayerPage';
import ArtistPage from './pages/ArtistPage';
import SongListPage from './pages/SongListPage';
import Genres from './pages/Genres';
import Popular from './pages/Popular';

// Import services
import StorageService from './services/StorageService';
import cacheManager from './services/CacheManager';
import trackPlayerService from './services/TrackPlayerService';

// Import utils
import { palette } from './utils/Colors';

const AppContent = () => {
  const { 
    artists, 
    artistsLoading, 
    songIndexFlat, 
    songIndexFlatLoading, 
    addToRecentPlays
  } = useMusicData();
  const [activeTab, setActiveTab] = useState('Search');
  
  // Search state that persists across tab switches
  const [searchState, setSearchState] = useState({
    searchQuery: '',
    searchResults: [],
    showResults: false,
    currentPage: 'search',
    selectedArtist: null,
    songListData: null,
    previousPage: null
  });

  // Audio player state
  const [audioState, setAudioState] = useState({
    currentSong: null,
    isPlaying: false,
    showFullPlayer: false,
    queue: [],
    currentIndex: 0,
    position: 0,
    duration: 0,
    isLoading: false,
    isSliding: false,
    isRepeating: false,
    isShuffled: false,
    shuffledQueue: [],
    shuffleIndex: 0,
    shufflePlayedSongs: [],
    playHistory: [],
    catalogPlayHistory: [],
    isNavigating: false
  });

  // Audio refs and intervals
  const sound = useRef(null);
  const progressInterval = useRef(null);
  
  // Refs for navigation locking
  const isRepeatingRef = useRef(false);
  const isNavigatingRef = useRef(false);
  const navigationLock = useRef(false);
  const isLoadingAudioRef = useRef(false);
  const currentLoadingToken = useRef(0);
  const activeSongId = useRef(null);
  
  // Stable refs for callbacks
  const searchStateRef = useRef(searchState);
  const resetSearchNavigationRef = useRef();
  
  // Video stop callback system
  const stopVideoCallback = useRef(null);

  // Refs for remote control handlers (to avoid stale closures)
  const audioStateRef = useRef(audioState);
  const togglePlayPauseRef = useRef();
  const playNextRef = useRef();
  const playPreviousRef = useRef();
  const seekToRef = useRef();
  const stopAudioRef = useRef();

  // Update refs when state changes
  useEffect(() => {
    searchStateRef.current = searchState;
  }, [searchState]);

  // Update repeat ref when repeat state changes
  useEffect(() => {
    isRepeatingRef.current = audioState.isRepeating;
  }, [audioState.isRepeating]);

  // Update navigation ref when navigation state changes
  useEffect(() => {
    isNavigatingRef.current = audioState.isNavigating;
  }, [audioState.isNavigating]);

  // Update audio state ref for remote controls
  useEffect(() => {
    audioStateRef.current = audioState;
  }, [audioState]);

  const updateSearchState = (newState) => {
    setSearchState(prevState => ({ ...prevState, ...newState }));
  };

  const updateAudioState = (newState) => {
    setAudioState(prevState => ({ ...prevState, ...newState }));
  };

  // Helper function to sync metadata with TrackPlayer for lock screen
  const syncTrackPlayerMetadata = async (action, ...args) => {
    try {
      switch (action) {
        case 'play':
          await trackPlayerService.updatePlaybackState(true, audioState.position);
          break;
        case 'pause':
          await trackPlayerService.updatePlaybackState(false, audioState.position);
          break;
        case 'stop':
          await trackPlayerService.stop();
          break;
        case 'seek':
          const [position] = args;
          await trackPlayerService.updatePosition(position);
          break;
        default:
          console.warn('Unknown metadata sync action:', action);
      }
    } catch (error) {
      console.error(`Error syncing TrackPlayer metadata for action ${action}:`, error);
    }
  };

  // Set up audio session and TrackPlayer
  useEffect(() => {
    const setupAudio = async () => {
      try {
        // Request audio permissions first
        const { status } = await Audio.requestPermissionsAsync();
        console.log('Audio permissions status:', status);

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          // Let TrackPlayer handle interruption mode for better lock screen integration
          interruptionModeIOS: 2, // MixWithOthers - let TrackPlayer control audio session
          interruptionModeAndroid: 2, // DuckOthers
        });
        console.log('✅ Expo-av audio mode configured for background playback');
      } catch (error) {
        console.error('Error setting up expo-av audio mode:', error);
      }
    };

    const setupTrackPlayer = async () => {
      try {
        await trackPlayerService.initialize();
        
        // Set up remote control event handlers to bridge with expo-av
        console.log('🔧 Setting up remote control event handlers...');
        trackPlayerService.setRemoteEventHandlers({
          onPlay: async () => {
            console.log('🎵 HANDLER: Remote play triggered from lock screen/control center');
            if (togglePlayPauseRef.current) {
              const currentState = audioStateRef.current;
              console.log('🔧 HANDLER: Current audio state:', { 
                hasSong: !!currentState.currentSong, 
                isPlaying: currentState.isPlaying 
              });
              if (currentState.currentSong && !currentState.isPlaying) {
                console.log('🎵 HANDLER: Calling togglePlayPause to play');
                togglePlayPauseRef.current();
              } else {
                console.log('🔧 HANDLER: Conditions not met for play action');
              }
            } else {
              console.warn('🔧 HANDLER: togglePlayPauseRef.current is null!');
            }
          },
          onPause: async () => {
            console.log('⏸️ HANDLER: Remote pause triggered from lock screen/control center');
            if (togglePlayPauseRef.current) {
              const currentState = audioStateRef.current;
              console.log('🔧 HANDLER: Current audio state:', { 
                hasSong: !!currentState.currentSong, 
                isPlaying: currentState.isPlaying 
              });
              if (currentState.isPlaying) {
                console.log('⏸️ HANDLER: Calling togglePlayPause to pause');
                togglePlayPauseRef.current();
              } else {
                console.log('🔧 HANDLER: Already paused, no action needed');
              }
            } else {
              console.warn('🔧 HANDLER: togglePlayPauseRef.current is null!');
            }
          },
          onNext: () => {
            console.log('⏭️ HANDLER: Remote next triggered from lock screen/control center');
            if (playNextRef.current) {
              console.log('⏭️ HANDLER: Calling playNext');
              playNextRef.current();
            } else {
              console.warn('🔧 HANDLER: playNextRef.current is null!');
            }
          },
          onPrevious: () => {
            console.log('⏮️ HANDLER: Remote previous triggered from lock screen/control center');
            if (playPreviousRef.current) {
              console.log('⏮️ HANDLER: Calling playPrevious');
              playPreviousRef.current();
            } else {
              console.warn('🔧 HANDLER: playPreviousRef.current is null!');
            }
          },
          onSeek: async (position) => {
            console.log('🔍 HANDLER: Remote seek triggered from lock screen/control center:', position);
            if (seekToRef.current) {
              console.log('🔍 HANDLER: Calling seekTo with position:', position * 1000);
              await seekToRef.current(position * 1000); // Convert seconds to milliseconds
            } else {
              console.warn('🔧 HANDLER: seekToRef.current is null!');
            }
          },
          onStop: async () => {
            console.log('⏹️ HANDLER: Remote stop triggered from lock screen/control center');
            if (stopAudioRef.current) {
              console.log('⏹️ HANDLER: Calling stopAudio');
              stopAudioRef.current();
            } else {
              console.warn('🔧 HANDLER: stopAudioRef.current is null!');
            }
          }
        });
        
        console.log('✅ Remote control event handlers configured');
        
        console.log('✅ TrackPlayer remote controls configured for lock screen integration');
      } catch (error) {
        console.error('❌ Failed to initialize TrackPlayer:', error);
      }
    };

    setupAudio();
    setupTrackPlayer();

    // Handle app state changes for background playback
    const handleAppStateChange = (nextAppState) => {
      console.log('App state changed to:', nextAppState);
      if (nextAppState === 'active') {
        // App came to foreground - resume progress tracking
        console.log('App active - resuming progress tracking');
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background - audio should continue playing
        console.log('App backgrounded - audio should continue playing');
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Initialize cache manager
    cacheManager.initialize();

    // Cleanup on unmount
    return () => {
      if (sound.current) {
        sound.current.unloadAsync();
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      appStateSubscription?.remove();
      trackPlayerService.destroy();
    };
  }, []);

  // Load and play audio when song changes using expo-av
  useEffect(() => {
    if (audioState.currentSong) {
      loadAudio();
    }
  }, [audioState.currentSong]);

  const loadAudio = async () => {
    // Prevent multiple simultaneous audio loads
    if (isLoadingAudioRef.current) {
      return;
    }

    // Generate unique token for this load operation
    const loadToken = ++currentLoadingToken.current;
    const songToLoad = audioState.currentSong;
    
    if (!songToLoad) {
      return;
    }
    
    isLoadingAudioRef.current = true;
    activeSongId.current = songToLoad.id;
    
    try {
      setAudioState(prev => ({ ...prev, isLoading: true }));
      
      // Check if we're still the current operation
      if (loadToken !== currentLoadingToken.current) {
        return;
      }

      // Unload previous sound quickly
      if (sound.current) {
        try {
          await sound.current.unloadAsync();
        } catch (error) {
          console.warn('Warning unloading previous sound:', error.message);
        }
        sound.current = null;
      }
      
      // Check again if we're still the current operation
      if (loadToken !== currentLoadingToken.current) {
        return;
      }
      
      // Clear previous interval
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }

      // Verify song hasn't changed during async operations
      if (audioState.currentSong?.id !== songToLoad.id) {
        return;
      }

      console.log(`🎵 Loading audio for: "${songToLoad.title}" by ${songToLoad.artist}`);
      console.log(`🔗 Audio URL: ${songToLoad.audio}`);
      
      // Load new sound with simple timeout
      const { sound: newSound } = await Promise.race([
        Audio.Sound.createAsync(
          { uri: songToLoad.audio },
          { 
            shouldPlay: true, 
            isLooping: audioState.isRepeating,
            volume: 1.0,
            rate: 1.0,
            shouldCorrectPitch: true,
            progressUpdateIntervalMillis: 500,
            positionMillis: 0
          }
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]);
      
      // CRITICAL: Final verification before completing load
      if (loadToken !== currentLoadingToken.current) {
        try {
          await newSound.unloadAsync();
        } catch (error) {
          console.error('Error cleaning up cancelled sound:', error);
        }
        return;
      }
      
      // Verify the song is still the same
      if (audioState.currentSong?.id !== songToLoad.id) {
        try {
          await newSound.unloadAsync();
        } catch (error) {
          console.error('Error cleaning up mismatched sound:', error);
        }
        return;
      }

      sound.current = newSound;
      setAudioState(prev => ({ 
        ...prev, 
        isPlaying: true, 
        isLoading: false,
        position: 0
      }));

      // Set TrackPlayer metadata for lock screen
      try {
        await trackPlayerService.setNowPlayingMetadata(songToLoad);
        await syncTrackPlayerMetadata('play');
        console.log('✅ TrackPlayer metadata set');
      } catch (error) {
        console.warn('⚠️ TrackPlayer metadata warning:', error.message);
      }

      // Set up status updates
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setAudioState(prev => {
            if (!prev.isSliding) {
              return { ...prev, position: status.positionMillis, duration: status.durationMillis };
            }
            return { ...prev, duration: status.durationMillis };
          });
          
          if (status.didJustFinish && !isRepeatingRef.current) {
            playNext();
          }
        }
      });

      // Simple progress tracking
      progressInterval.current = setInterval(() => {
        if (newSound && loadToken === currentLoadingToken.current) {
          newSound.getStatusAsync().then((status) => {
            if (status.isLoaded) {
              setAudioState(prev => {
                if (!prev.isSliding) {
                  return { ...prev, position: status.positionMillis };
                }
                return prev;
              });
            }
          }).catch(() => {
            // Ignore errors
          });
        }
      }, 1000);

      console.log('✅ Audio loaded successfully');

    } catch (error) {
      console.error(`❌ Error loading audio:`, error.message);
      setAudioState(prev => ({ ...prev, isLoading: false }));
    } finally {
      isLoadingAudioRef.current = false;
    }
  };

  const togglePlayPause = async () => {
    // If no sound loaded but we have a current song, reload the audio
    if (!sound.current && audioState.currentSong) {
      console.log('🔄 Reloading audio after interruption...');
      await loadAudio();
      return;
    }

    if (!sound.current) return;

    try {
      if (audioState.isPlaying) {
        await sound.current.pauseAsync();
        setAudioState(prev => ({ ...prev, isPlaying: false }));
        // Sync metadata with TrackPlayer for lock screen
        await syncTrackPlayerMetadata('pause');
      } else {
        await sound.current.playAsync();
        setAudioState(prev => ({ ...prev, isPlaying: true }));
        // Sync metadata with TrackPlayer for lock screen
        await syncTrackPlayerMetadata('play');
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  // Update ref for remote controls
  togglePlayPauseRef.current = togglePlayPause;

  const seekTo = async (value) => {
    if (!sound.current) return;

    try {
      await sound.current.setPositionAsync(value);
      setAudioState(prev => ({ ...prev, position: value }));
      // Sync position with TrackPlayer for lock screen
      await syncTrackPlayerMetadata('seek', value);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  // Update ref for remote controls
  seekToRef.current = seekTo;

  const updatePosition = (value) => {
    setAudioState(prev => ({ ...prev, position: value }));
  };

  // Rest of the component methods remain the same...
  const playNext = async () => {
    // CRITICAL: Use ref for immediate protection before any async operations
    if (isNavigatingRef.current || navigationLock.current) {
      return;
    }

    // Lock immediately using ref (faster than state)
    navigationLock.current = true;
    isNavigatingRef.current = true;
    
    // IMMEDIATELY cancel any pending audio loads by incrementing token
    currentLoadingToken.current++;
    
    // Also update state for UI feedback
    setAudioState(prev => ({ ...prev, isNavigating: true }));

    try {
      // Clear progress interval
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }

      // Stop and unload current sound
      if (sound.current) {
        try {
          await sound.current.unloadAsync();
          sound.current = null;
        } catch (error) {
          console.warn('Warning during navigation cleanup:', error.message);
          sound.current = null;
        }
      }

      // Get next song
      const nextSong = getNextSong();
      
      if (nextSong) {
        // Update state with new song - this will trigger loadAudio with new token
        setAudioState(prev => ({
          ...prev,
          currentSong: nextSong.song,
          currentIndex: nextSong.index,
          playHistory: [prev.currentSong?.id, ...prev.playHistory.slice(0, 9)],
          catalogPlayHistory: [...prev.catalogPlayHistory, prev.currentSong?.id].filter(Boolean),
          isPlaying: false,
          position: 0,
          isRepeating: false // Turn off repeat when manually skipping
        }));
      }
      
    } catch (error) {
      console.error('Error in playNext:', error);
    } finally {
      // ALWAYS unlock navigation, even on error
      setTimeout(() => {
        navigationLock.current = false;
        isNavigatingRef.current = false;
        setAudioState(prev => ({ ...prev, isNavigating: false }));
      }, 100); // Small delay to prevent immediate re-triggering
    }
  };

  // Update ref for remote controls
  playNextRef.current = playNext;

  const playPrevious = async () => {
    // CRITICAL: Use ref for immediate protection before any async operations
    if (isNavigatingRef.current || navigationLock.current) {
      return;
    }

    // Lock immediately using ref (faster than state)
    navigationLock.current = true;
    isNavigatingRef.current = true;
    
    // IMMEDIATELY cancel any pending audio loads by incrementing token
    currentLoadingToken.current++;
    
    // Also update state for UI feedback
    setAudioState(prev => ({ ...prev, isNavigating: true }));

    try {
      // Clear progress interval
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }

      // Stop and unload current sound
      if (sound.current) {
        try {
          await sound.current.unloadAsync();
          sound.current = null;
        } catch (error) {
          console.warn('Warning during navigation cleanup:', error.message);
          sound.current = null;
        }
      }

      // Get previous song
      const prevSong = getPreviousSong();
      
      if (prevSong) {
        // Update state with new song - this will trigger loadAudio with new token
        setAudioState(prev => ({
          ...prev,
          currentSong: prevSong.song,
          currentIndex: prevSong.index,
          isPlaying: false,
          position: 0,
          isRepeating: false // Turn off repeat when manually skipping
        }));
      }
      
    } catch (error) {
      console.error('Error in playPrevious:', error);
    } finally {
      // ALWAYS unlock navigation, even on error
      setTimeout(() => {
        navigationLock.current = false;
        isNavigatingRef.current = false;
        setAudioState(prev => ({ ...prev, isNavigating: false }));
      }, 100); // Small delay to prevent immediate re-triggering
    }
  };

  // Update ref for remote controls
  playPreviousRef.current = playPrevious;

  // Continue with existing methods...
  const getNextSong = () => {
    // Implementation remains the same
    if (audioState.isRepeating && audioState.currentSong) {
      return {
        song: audioState.currentSong,
        index: audioState.currentIndex
      };
    }

    if (audioState.isShuffled) {
      return getNextShuffledSong();
    }

    if (audioState.queue.length > 0) {
      const nextIndex = audioState.currentIndex + 1;
      if (nextIndex < audioState.queue.length) {
        return {
          song: audioState.queue[nextIndex],
          index: nextIndex
        };
      }
    }

    return getCatalogNextSong();
  };

  const getPreviousSong = () => {
    // Implementation remains the same
    if (audioState.queue.length > 0 && audioState.currentIndex > 0) {
      const prevIndex = audioState.currentIndex - 1;
      return {
        song: audioState.queue[prevIndex],
        index: prevIndex
      };
    }
    return null;
  };

  const getNextShuffledSong = () => {
    // Implementation remains the same
    const availableSongs = audioState.shuffledQueue.filter(
      song => !audioState.shufflePlayedSongs.includes(song.id)
    );

    if (availableSongs.length === 0) {
      setAudioState(prev => ({ ...prev, shufflePlayedSongs: [] }));
      return { song: audioState.shuffledQueue[0], index: 0 };
    }

    const randomIndex = Math.floor(Math.random() * availableSongs.length);
    const nextSong = availableSongs[randomIndex];
    const actualIndex = audioState.shuffledQueue.findIndex(s => s.id === nextSong.id);

    setAudioState(prev => ({
      ...prev,
      shufflePlayedSongs: [...prev.shufflePlayedSongs, nextSong.id]
    }));

    return { song: nextSong, index: actualIndex };
  };

  const getCatalogNextSong = () => {
    // Implementation remains the same
    if (!artists.length || artistsLoading) return null;

    const allSongs = [];
    artists.forEach(artist => {
      if (artist.albums) {
        artist.albums.forEach(album => {
          if (album.songs) {
            album.songs.forEach(song => {
              allSongs.push({
                ...song,
                artist: artist.name,
                album: album.name,
                coverArt: album.coverArt
              });
            });
          }
        });
      }
      if (artist.singles) {
        artist.singles.forEach(single => {
          allSongs.push({
            ...single,
            artist: artist.name,
            album: 'Single'
          });
        });
      }
    });

    if (allSongs.length === 0) return null;

    const unplayedSongs = allSongs.filter(
      song => !audioState.catalogPlayHistory.includes(song.id)
    );

    if (unplayedSongs.length === 0) {
      setAudioState(prev => ({ ...prev, catalogPlayHistory: [] }));
      const randomIndex = Math.floor(Math.random() * allSongs.length);
      return { song: allSongs[randomIndex], index: 0 };
    }

    const randomIndex = Math.floor(Math.random() * unplayedSongs.length);
    return { song: unplayedSongs[randomIndex], index: 0 };
  };

  const stopAudio = async () => {
    try {
      // CRITICAL: Cancel any pending audio loads by incrementing token
      currentLoadingToken.current++;
      
      // Stop and unload the expo-av audio
      if (sound.current) {
        await sound.current.stopAsync();
        await sound.current.unloadAsync();
        sound.current = null;
      }
      
      // Sync stop with TrackPlayer metadata
      await syncTrackPlayerMetadata('stop');
      
      // Clear the progress interval
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      
      // Reset loading states and navigation locks
      isLoadingAudioRef.current = false;
      navigationLock.current = false;
      isNavigatingRef.current = false;
      
      // Reset audio state but keep the current song info (just stop playing)
      setAudioState(prevState => ({ 
        ...prevState, 
        isPlaying: false,
        position: 0,
        isLoading: false,
        isNavigating: false,
      }));
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  // Update ref for remote controls
  stopAudioRef.current = stopAudio;

  // Toggle repeat mode
  const toggleRepeat = async () => {
    const newRepeatState = !audioState.isRepeating;
    setAudioState(prev => ({
      ...prev,
      isRepeating: newRepeatState
    }));

    // Update the current sound's looping state if it's loaded
    if (sound.current) {
      try {
        await sound.current.setIsLoopingAsync(newRepeatState);
      } catch (error) {
        console.error('Error updating looping state:', error);
      }
    }

    // Update TrackPlayer repeat mode for metadata
    try {
      await trackPlayerService.setRepeatMode(newRepeatState);
    } catch (error) {
      console.error('Error updating TrackPlayer repeat mode:', error);
    }
  };

  // Rest of component remains the same...
  const playSong = (song, queue = [], index = 0) => {
    // Stop any playing video when music starts
    if (stopVideoCallback.current) {
      console.log('🎵 Starting music - stopping any playing video');
      stopVideoCallback.current();
    }
    
    setAudioState(prev => ({
      ...prev,
      currentSong: song,
      showFullPlayer: false,
      queue,
      currentIndex: index,
      catalogPlayHistory: queue.length > 0 ? [] : prev.catalogPlayHistory
    }));
    
    // Add to recent plays
    if (addToRecentPlays) {
      addToRecentPlays(song);
    }
  };

  const openFullPlayer = () => {
    setAudioState(prevState => ({ ...prevState, showFullPlayer: true }));
  };

  const closeFullPlayer = () => {
    setAudioState(prevState => ({ ...prevState, showFullPlayer: false }));
  };

  // Video stop callback management
  const registerVideoStopCallback = (callback) => {
    stopVideoCallback.current = callback;
  };

  const unregisterVideoStopCallback = () => {
    stopVideoCallback.current = null;
  };

  const closeMiniPlayer = async () => {
    try {
      // Stop and unload the current audio
      if (sound.current) {
        await sound.current.stopAsync();
        await sound.current.unloadAsync();
        sound.current = null;
      }
      
      // Clear TrackPlayer metadata
      await trackPlayerService.clearQueue();
      
      // Clear the progress interval
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      
      // Reset audio state
      setAudioState(prevState => ({ 
        ...prevState, 
        currentSong: null,
        isPlaying: false,
        queue: [],
        currentIndex: 0,
        position: 0,
        duration: 0,
        isLoading: false,
        isNavigating: false,
        isRepeating: false,
        isShuffled: false,
        shuffledQueue: [],
        playHistory: [],
        catalogPlayHistory: []
      }));
    } catch (error) {
      console.error('Error closing mini player:', error);
    }
  };

  // Rest of the component implementation remains the same...
  const toggleShuffle = () => {
    const newShuffleState = !audioState.isShuffled;
    
    if (newShuffleState && audioState.queue.length > 0) {
      const shuffled = [...audioState.queue].sort(() => Math.random() - 0.5);
      setAudioState(prev => ({
        ...prev,
        isShuffled: true,
        shuffledQueue: shuffled,
        shuffleIndex: 0,
        shufflePlayedSongs: prev.currentSong ? [prev.currentSong.id] : []
      }));
    } else {
      setAudioState(prev => ({
        ...prev,
        isShuffled: false,
        shuffledQueue: [],
        shuffleIndex: 0,
        shufflePlayedSongs: []
      }));
    }
  };

  const resetSearchNavigation = () => {
    setSearchState(prevState => ({
      ...prevState,
      currentPage: 'search',
      selectedArtist: null,
      songListData: null,
      previousPage: null
    }));
  };

  resetSearchNavigationRef.current = resetSearchNavigation;

  const handleTabPress = (tabName) => {
    if (tabName === 'Search' && activeTab !== 'Search') {
      resetSearchNavigation();
    }
    setActiveTab(tabName);
  };

  const handleArtistNavigation = (artist) => {
    setActiveTab('Search');
    setSearchState(prevState => ({
      ...prevState,
      currentPage: 'artist',
      selectedArtist: artist,
      previousPage: 'search'
    }));
  };

  const stopAllAudio = () => {
    if (stopVideoCallback.current) {
      stopVideoCallback.current();
    }
  };

  const renderScreen = () => {
    if (activeTab === 'Dashboard') {
      return (
        <Dashboard 
          playSong={playSong}
          onNavigateToPlaylists={() => setActiveTab('Playlists')}
          onNavigateToArtist={handleArtistNavigation}
        />
      );
    } else if (activeTab === 'Search') {
      return (
        <Search 
          searchState={searchState}
          updateSearchState={updateSearchState}
          resetSearchNavigation={resetSearchNavigation}
          playSong={playSong}
          onStopAudio={stopAllAudio}
          onRegisterVideoStopCallback={registerVideoStopCallback}
          onUnregisterVideoStopCallback={unregisterVideoStopCallback}
        />
      );
    } else if (activeTab === 'Playlists') {
      return (
        <Playlists 
          playSong={playSong}
        />
      );
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={palette.background} />
        
        <View style={styles.screenContainer}>
          {renderScreen()}
        </View>
        
        {/* Bottom Navigation - Must be before MinimizedPlayer for proper layering */}
        <BottomNavBar 
          activeTab={activeTab} 
          onTabPress={handleTabPress} 
        />

        {/* Minimized Player - Positioned above nav bar */}
        <MinimizedPlayer
          song={audioState.currentSong}
          isPlaying={audioState.isPlaying}
          isNavigating={audioState.isNavigating}
          isLoading={audioState.isLoading}
          onTogglePlay={togglePlayPause}
          onPress={openFullPlayer}
          onNext={playNext}
          onClose={closeMiniPlayer}
          position={audioState.position}
          duration={audioState.duration}
        />

        {/* Full Audio Player Modal */}
        {audioState.showFullPlayer && (
          <AudioPlayerPage
            song={audioState.currentSong}
            queue={audioState.queue}
            currentIndex={audioState.currentIndex}
            isPlaying={audioState.isPlaying}
            position={audioState.position}
            duration={audioState.duration}
            isLoading={audioState.isLoading}
            isNavigating={audioState.isNavigating}
            isRepeating={audioState.isRepeating}
            isShuffled={audioState.isShuffled}
            onBack={closeFullPlayer}
            onNavigateToArtist={handleArtistNavigation}
            onTogglePlay={togglePlayPause}
            onSeek={seekTo}
            onUpdatePosition={updatePosition}
            onNext={playNext}
            onPrevious={playPrevious}
            onToggleRepeat={toggleRepeat}
            onToggleShuffle={toggleShuffle}
            onSliderStart={() => setAudioState(prev => ({ ...prev, isSliding: true }))}
            onSliderEnd={() => setAudioState(prev => ({ ...prev, isSliding: false }))}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

// Main App wrapper with context provider
export default function App() {
  return (
    <MusicDataProvider>
      <AppContent />
    </MusicDataProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  screenContainer: {
    flex: 1,
  },
});
