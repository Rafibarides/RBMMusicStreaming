import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert, AppState, Modal, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { FontAwesome } from '@expo/vector-icons';

// Import screens
import Dashboard from './screens/Dashboard';
import Search from './screens/Search';
import Playlists from './screens/Playlists';
import ArtistPage from './pages/ArtistPage';

// Import pages
import AudioPlayerPage from './pages/AudioPlayerPage';

// Import components
import BottomNavBar from './components/BottomNavBar';
import MinimizedPlayer from './components/MinimizedPlayer';

// Import contexts
import { MusicDataProvider, useMusicData } from './contexts/MusicDataContext';

// Import services
import StorageService from './services/StorageService';
import cacheManager from './services/CacheManager';

// Import utils
import { palette } from './utils/Colors';

// Main App component that uses the context
const AppContent = () => {
  const { 
    artists, 
    artistsLoading, 
    songIndexFlat, 
    songIndexFlatLoading, 
    addToRecentPlays
  } = useMusicData();
  const [activeTab, setActiveTab] = useState('Dashboard');
  
  // Search state that persists across tab switches
  const [searchState, setSearchState] = useState({
    searchQuery: '',
    searchResults: [],
    showResults: false,
    currentPage: 'search',
    selectedArtist: null,
    songListData: null
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
    shuffleIndex: 0, // Track position in shuffled queue
    shufflePlayedSongs: [], // Track songs already played in shuffle
    playHistory: [], // Track recently played songs to avoid repeats
    catalogPlayHistory: [], // Track songs from entire catalog to ensure all are played before repeating
    isNavigating: false // Prevent multiple concurrent next/previous calls
  });

  // Audio refs and intervals
  const sound = useRef(null);
  const progressInterval = useRef(null);
  
  // Add ref to track repeat state for callbacks
  const isRepeatingRef = useRef(false);
  
  // Add robust navigation locking with refs for immediate protection
  const isNavigatingRef = useRef(false);
  const navigationLock = useRef(false);
  
  // Add loading lock to prevent multiple simultaneous audio loads
  const isLoadingAudioRef = useRef(false);
  
  // Add loading token system to prevent race conditions
  const currentLoadingToken = useRef(0);
  const activeSongId = useRef(null);
  
  // Stable refs for callbacks
  const searchStateRef = useRef(searchState);
  const resetSearchNavigationRef = useRef();
  
  // Video stop callback system
  const stopVideoCallback = useRef(null);

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

  const updateSearchState = (newState) => {
    setSearchState(prevState => ({ ...prevState, ...newState }));
  };

  const resetSearchNavigation = useCallback(() => {
    setSearchState(prevState => ({
      ...prevState,
      currentPage: 'search',
      selectedArtist: null,
      songListData: null
    }));
  }, []);

  // Store stable ref
  resetSearchNavigationRef.current = resetSearchNavigation;

  const updateAudioState = (newState) => {
    setAudioState(prevState => ({ ...prevState, ...newState }));
  };

  // Set up audio session for background playback
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
          // Force audio to continue in background
          interruptionModeIOS: 1, // DoNotMix
          interruptionModeAndroid: 1, // DoNotMix
        });
        console.log('Audio mode configured for background playback');
      } catch (error) {
        console.error('Error setting up audio mode:', error);
      }
    };

    setupAudio();

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
    };
  }, []);

  // Load and play audio when song changes
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
      
      // Unload previous sound with timeout protection
      if (sound.current) {
        try {
          await Promise.race([
            sound.current.unloadAsync(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
          ]);
        } catch (error) {
          console.error('Error unloading previous sound:', error);
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
      
      // Load new sound with background playback optimizations
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: songToLoad.audio },
        { 
          shouldPlay: true, 
          isLooping: audioState.isRepeating,
          volume: 1.0,
          rate: 1.0,
          shouldCorrectPitch: true,
          progressUpdateIntervalMillis: 100,
          positionMillis: 0
        }
      );
      
      // CRITICAL: Final verification before completing load
      if (loadToken !== currentLoadingToken.current) {
        // Clean up the sound we just created
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

      // Set up status updates
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setAudioState(prev => {
            if (!prev.isSliding) {
              return { ...prev, position: status.positionMillis, duration: status.durationMillis };
            }
            return { ...prev, duration: status.durationMillis };
          });
          
          // Handle track completion - only advance if not repeating (use ref to get current value)
          if (status.didJustFinish && !isRepeatingRef.current) {
            playNext();
          }
        }
      });

      // Start progress tracking
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
          });
        }
      }, 100);

    } catch (error) {
      console.error(`❌ Error loading audio for "${songToLoad?.title}" by ${songToLoad?.artist}:`, error);
      console.error(`🔗 Failed URL: ${songToLoad?.audio}`);
      
      // Provide specific error information for debugging
      if (error.message.includes('-1100')) {
        console.error('🚨 ERROR -1100: Audio file does not exist at the specified URL');
        console.error('💡 This usually means:');
        console.error('   1. The audio URL is broken or invalid');
        console.error('   2. The file was moved or deleted from the server');
        console.error('   3. Network connectivity issues');
        console.error('   4. Server-side issues');
      }
      
      setAudioState(prev => ({ ...prev, isLoading: false }));
      Alert.alert('Audio Error', `Failed to load "${songToLoad?.title}"\n\nCheck console for details.`);
    } finally {
      isLoadingAudioRef.current = false;
    }
  };

  const togglePlayPause = async () => {
    // If no sound loaded but we have a current song, reload the audio
    if (!sound.current && audioState.currentSong) {
      console.log('🔄 Reloading audio after video playback...');
      await loadAudio();
      return;
    }

    if (!sound.current) return;

    try {
      if (audioState.isPlaying) {
        await sound.current.pauseAsync();
        setAudioState(prev => ({ ...prev, isPlaying: false }));
      } else {
        await sound.current.playAsync();
        setAudioState(prev => ({ ...prev, isPlaying: true }));
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const seekTo = async (value) => {
    if (!sound.current) return;

    try {
      await sound.current.setPositionAsync(value);
      setAudioState(prev => ({ ...prev, position: value }));
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const updatePosition = (value) => {
    setAudioState(prev => ({ ...prev, position: value }));
  };

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
      // Clear progress interval first
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }

      // Stop and unload current sound with timeout protection
      if (sound.current) {
        try {
          await Promise.race([
            sound.current.unloadAsync(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
          ]);
          sound.current = null;
        } catch (error) {
          console.error('Error unloading sound:', error);
          sound.current = null; // Force cleanup even on error
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
      // Clear progress interval first
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }

      // Stop and unload current sound with timeout protection
      if (sound.current) {
        try {
          await Promise.race([
            sound.current.unloadAsync(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
          ]);
          sound.current = null;
        } catch (error) {
          console.error('Error unloading sound:', error);
          sound.current = null; // Force cleanup even on error
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

    const getNextSong = () => {
    // If repeat is on, return the current song
    if (audioState.isRepeating && audioState.currentSong) {
      return {
        song: audioState.currentSong,
        index: audioState.currentIndex
      };
    }

    // If we're shuffling and have a shuffled queue, prioritize shuffle over regular queue
    if (audioState.isShuffled && audioState.shuffledQueue.length > 0) {
      const nextIndex = audioState.shuffleIndex + 1;
      
      // If we haven't reached the end of the shuffled queue
      if (nextIndex < audioState.shuffledQueue.length) {
        // Update shuffle index in state
        setAudioState(prev => ({ 
          ...prev, 
          shuffleIndex: nextIndex,
          shufflePlayedSongs: [...prev.shufflePlayedSongs, prev.currentSong?.id].filter(Boolean)
        }));
        
        return {
          song: audioState.shuffledQueue[nextIndex],
          index: 0
        };
      } else {
        // We've reached the end of the shuffle, create a new shuffled queue
        let songsToShuffle = [];
        
        if (audioState.queue && audioState.queue.length > 0) {
          // Use current queue (e.g., album songs)
          songsToShuffle = audioState.queue;
        } else {
          // Use entire catalog for shuffle
          songsToShuffle = [...songIndexFlat];
        }
        
        if (songsToShuffle.length > 0) {
          const newShuffledQueue = createSmartShuffledQueue(songsToShuffle, audioState.currentSong);
          
          // Update state with new queue
          setAudioState(prev => ({ 
            ...prev, 
            shuffledQueue: newShuffledQueue,
            shuffleIndex: 1, // Start at index 1 (0 is current song)
            shufflePlayedSongs: [prev.currentSong?.id].filter(Boolean)
          }));
          
          return {
            song: newShuffledQueue[1], // Return second song (first is current)
            index: 0
          };
        }
      }
    }

    // ALBUM PLAYBACK: If there's a queue (album) and we're not at the end, play next in order
    if (audioState.queue.length > 0 && audioState.currentIndex < audioState.queue.length - 1) {
      return {
        song: audioState.queue[audioState.currentIndex + 1],
        index: audioState.currentIndex + 1
      };
    }
    
    // CATALOG PLAYBACK: Either no queue or at end of album - pick randomly from entire catalog
    if (songIndexFlatLoading || !songIndexFlat || songIndexFlat.length === 0) {
      return null; // No songs available
    }

    // Get current catalog play history
    const catalogHistory = audioState.catalogPlayHistory || [];
    const currentSongId = audioState.currentSong?.id;
    
    // Check if we've played all songs in the catalog (reset if so)
    let availableSongs = songIndexFlat.filter(song => 
      !catalogHistory.includes(song.id) && song.id !== currentSongId
    );
    
    // If all songs have been played, reset catalog history and start over
    if (availableSongs.length === 0) {
      console.log('🔄 All catalog songs played - resetting catalog history');
      availableSongs = songIndexFlat.filter(song => song.id !== currentSongId);
      
      // Reset catalog history in state
      setAudioState(prev => ({ 
        ...prev, 
        catalogPlayHistory: []
      }));
    }
    
    // If still no available songs (edge case), just pick any song
    if (availableSongs.length === 0) {
      availableSongs = [...songIndexFlat];
    }
    
    // Pick a random song from available options
    const randomIndex = Math.floor(Math.random() * availableSongs.length);
    const randomSong = availableSongs[randomIndex];
    
    // Convert songIndexFlat item to proper song format with cover art
    const artist = artists.find(a => a.id === randomSong.artistId);
    let coverArt = randomSong.coverArt;
    let albumName = randomSong.album;
    
    if (artist) {
      // For album tracks, get cover art from album
      if (randomSong.type === 'album' && randomSong.albumId && artist.albums) {
        const album = artist.albums.find(a => a.id === randomSong.albumId);
        if (album) {
          coverArt = album.coverArt;
          albumName = album.name;
        }
      }
      
      // For singles, get cover art from single
      if (randomSong.type === 'single' && artist.singles) {
        const single = artist.singles.find(s => s.id === randomSong.id);
        if (single) {
          coverArt = single.coverArt;
        }
      }
    }
    
    const formattedSong = {
      id: randomSong.id,
      title: randomSong.title,
      artist: randomSong.artist,
      album: albumName,
      coverArt: coverArt,
      audio: randomSong.audio,
      lyrics: randomSong.lyrics,
      credits: randomSong.credits,
      type: randomSong.type,
      releaseDate: randomSong.releaseDate,
      genre: randomSong.genre
    };
    
    return {
      song: formattedSong,
      index: 0 // Reset index since we're not in a queue anymore
    };
  };

  const getPreviousSong = () => {
    // If there's a queue and we're not at the beginning
    if (audioState.queue.length > 0 && audioState.currentIndex > 0) {
      return {
        song: audioState.queue[audioState.currentIndex - 1],
        index: audioState.currentIndex - 1
      };
    }
    
    // If we're shuffling and have a shuffled queue
    if (audioState.isShuffled && audioState.shuffledQueue.length > 0) {
      const prevIndex = audioState.shuffleIndex - 1;
      
      // If we can go back in the shuffled queue
      if (prevIndex >= 0) {
        // Update shuffle index in state
        setAudioState(prev => ({ 
          ...prev, 
          shuffleIndex: prevIndex
        }));
        
        return {
          song: audioState.shuffledQueue[prevIndex],
          index: 0
        };
      } else {
        // If at the beginning, go to the last song in the shuffled queue
        const lastIndex = audioState.shuffledQueue.length - 1;
        setAudioState(prev => ({ 
          ...prev, 
          shuffleIndex: lastIndex
        }));
        
        return {
          song: audioState.shuffledQueue[lastIndex],
          index: 0
        };
      }
    }
    
    // If we're at the beginning of queue or no queue, get previous from artist's discography
    const artist = artists.find(a => a.name === audioState.currentSong.artist);
    if (artist) {
      const artistSongs = getArtistSongs(artist);

      const currentSongIndex = artistSongs.findIndex(s => s.id === audioState.currentSong.id);
      
      if (currentSongIndex > 0) {
        return {
          song: artistSongs[currentSongIndex - 1],
          index: 0
        };
      }

      // If at the beginning, go to the last song in the catalog
      if (artistSongs.length > 1) {
        return {
          song: artistSongs[artistSongs.length - 1],
          index: 0
        };
      }
    }
    
    // If no artist songs, pick a random previous song from songIndexFlat
    if (songIndexFlat.length > 1) {
      let randomSong;
      do {
        const randomIndex = Math.floor(Math.random() * songIndexFlat.length);
        randomSong = songIndexFlat[randomIndex];
      } while (randomSong.id === audioState.currentSong?.id && songIndexFlat.length > 1);

      return {
        song: randomSong,
        index: 0
      };
    }

    // Fallback: stay on current song
    return {
      song: audioState.currentSong,
      index: audioState.currentIndex
    };
  };

  const getArtistSongs = (artist) => {
    if (songIndexFlatLoading || !songIndexFlat) {
      return [];
    }
    
    const songs = [];
    
    // Get all songs by this artist from songIndexFlat
    const artistSongs = songIndexFlat.filter(song => song.artistId === artist.id);
    
    artistSongs.forEach(song => {
      // For album tracks, get the cover art from the album info in artist data
      let coverArt = song.coverArt;
      let albumName = song.album;
      
      if (song.type === 'album' && song.albumId && artist.albums) {
        const album = artist.albums.find(a => a.id === song.albumId);
        if (album) {
          coverArt = album.coverArt;
          albumName = album.name;
        }
      }
      
      // For singles, get the cover art from the single info in artist data
      if (song.type === 'single' && artist.singles) {
        const single = artist.singles.find(s => s.id === song.id);
        if (single) {
          coverArt = single.coverArt;
        }
      }
      
      songs.push({
        id: song.id,
        title: song.title,
        artist: artist.name,
        album: albumName,
        coverArt: coverArt,
        audio: song.audio,
        lyrics: song.lyrics,
        credits: song.credits,
        type: song.type,
        releaseDate: song.releaseDate,
        genre: song.genre
      });
    });
    
    return songs;
  };

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
      // Reset catalog history when starting a new album (when queue is provided)
      // This ensures album playback doesn't interfere with catalog tracking
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

  const stopAudio = async () => {
    try {
      // CRITICAL: Cancel any pending audio loads by incrementing token
      currentLoadingToken.current++;
      
      // Stop and unload the current audio
      if (sound.current) {
        await sound.current.stopAsync();
        await sound.current.unloadAsync();
        sound.current = null;
      }
      
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
  };

  // Toggle shuffle mode
  const toggleShuffle = () => {
    setAudioState(prev => {
      const newShuffled = !prev.isShuffled;
      let newShuffledQueue = [];
      let newShuffleIndex = 0;
      let newShufflePlayedSongs = [];

      if (newShuffled && prev.currentSong) {
        // Prioritize current queue (like album songs) over all artist songs
        let songsToShuffle = [];
        
        if (prev.queue && prev.queue.length > 0) {
          // Use current queue (e.g., album songs)
          songsToShuffle = prev.queue;
        } else {
          // Fall back to all artist songs if no queue
          const artist = artists.find(a => a.name === prev.currentSong.artist);
          if (artist) {
            songsToShuffle = getArtistSongs(artist);
          }
        }
        
        if (songsToShuffle.length > 0) {
          newShuffledQueue = createSmartShuffledQueue(songsToShuffle, prev.currentSong);
          newShuffleIndex = 0; // Current song is at index 0
          newShufflePlayedSongs = []; // Reset played songs
        }
      }

      return {
        ...prev,
        isShuffled: newShuffled,
        shuffledQueue: newShuffledQueue,
        shuffleIndex: newShuffleIndex,
        shufflePlayedSongs: newShufflePlayedSongs
      };
    });
  };

  // Enhanced shuffle function that avoids back-to-back repeats
  const createSmartShuffledQueue = (songs, currentSong) => {
    if (songs.length <= 1) return songs;
    
    // Start with current song at the beginning
    const otherSongs = songs.filter(s => s.id !== currentSong?.id);
    
    if (otherSongs.length === 0) return [currentSong];
    
    // Shuffle the other songs
    const shuffled = shuffleArray(otherSongs);
    
    // Ensure the first song after current is not the same (extra safety)
    if (shuffled.length > 1 && shuffled[0].id === currentSong?.id) {
      // Swap first and second songs
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    
    return [currentSong, ...shuffled];
  };

  // Helper function to shuffle array
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleArtistNavigation = (artist) => {
    // Navigate to artist page within search
    setActiveTab('Search');
    updateSearchState({
      selectedArtist: artist,
      currentPage: 'artist'
    });
    closeFullPlayer();
  };

  const handlePlaylistNavigation = (playlistId) => {
    // Navigate to playlists and open specific playlist
    setActiveTab('Playlists');
    // Store the playlist ID to open
    setInitialPlaylistId(playlistId);
  };

  // State to track which playlist should be opened initially
  const [initialPlaylistId, setInitialPlaylistId] = useState(null);

  const renderScreen = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <Dashboard 
            playSong={playSong} 
            onNavigateToPlaylists={handlePlaylistNavigation}
            onNavigateToArtist={handleArtistNavigation}
          />
        );
      case 'Search':
        return (
          <Search 
            searchState={searchState}
            updateSearchState={updateSearchState}
            resetSearchNavigation={resetSearchNavigation}
            playSong={playSong}
            onStopAudio={stopAudio}
            onRegisterVideoStopCallback={registerVideoStopCallback}
            onUnregisterVideoStopCallback={unregisterVideoStopCallback}
          />
        );
      case 'Playlists':
        return <Playlists playSong={playSong} initialPlaylistId={initialPlaylistId} onClearInitialPlaylist={() => setInitialPlaylistId(null)} />;
      default:
        return (
          <Dashboard 
            playSong={playSong} 
            onNavigateToPlaylists={handlePlaylistNavigation}
            onNavigateToArtist={handleArtistNavigation}
          />
        );
    }
  };

  const handleTabPress = useCallback((tabName) => {
    console.log('App: handleTabPress called with:', tabName);
    
    // Use ref to get current state without dependency issues
    if (tabName === 'Search' && searchStateRef.current.currentPage !== 'search') {
      resetSearchNavigationRef.current();
    }
    setActiveTab(tabName);
  }, []); // No dependencies - stable callback

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
