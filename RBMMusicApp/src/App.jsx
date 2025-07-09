import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert, AppState, Modal, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';

// Import screens
import Dashboard from './screens/Dashboard';
import Search from './screens/Search';
import Playlists from './screens/Playlists';

// Import pages
import AudioPlayerPage from './pages/AudioPlayerPage';

// Import components
import BottomNavBar from './components/BottomNavBar';
import MinimizedPlayer from './components/MinimizedPlayer';

// Import contexts
import { MusicDataProvider, useMusicData } from './contexts/MusicDataContext';

// Import colors
import { palette } from './utils/Colors';

// Import JSON data for queue management
import songIndexFlat from './json/songIndexFlat.json';
import artistsData from './json/artists.json';

// Main App component that uses the context
const AppContent = () => {
  const { addToRecentPlays } = useMusicData();
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
    playHistory: [], // Track recently played songs to avoid repeats
    isNavigating: false // Prevent multiple concurrent next/previous calls
  });

  // Audio refs and intervals
  const sound = useRef(null);
  const progressInterval = useRef(null);
  
  // Stable refs for callbacks
  const searchStateRef = useRef(searchState);
  const resetSearchNavigationRef = useRef();

  // Update refs when state changes
  useEffect(() => {
    searchStateRef.current = searchState;
  }, [searchState]);

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
    try {
      console.log('Loading audio for:', audioState.currentSong?.title || audioState.currentSong?.name);
      console.log('Audio URL:', audioState.currentSong?.audio);
      
      setAudioState(prev => ({ ...prev, isLoading: true }));
      
      // Unload previous sound
      if (sound.current) {
        console.log('Unloading previous sound');
        await sound.current.unloadAsync();
      }
      
      // Clear previous interval
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }

      // Load new sound with background playback optimizations
      console.log('Creating new sound instance...');
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioState.currentSong.audio },
        { 
          shouldPlay: true, 
          isLooping: audioState.isRepeating, // Set looping based on repeat state
          volume: 1.0,
          rate: 1.0,
          shouldCorrectPitch: true,
          // Additional settings for background playback
          progressUpdateIntervalMillis: 100,
          positionMillis: 0
        },
        // Second parameter for background audio
        (status) => {
          console.log('Audio status update:', status.isLoaded, status.isPlaying);
        }
      );
      
      console.log('Sound created successfully');

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
          
          // Handle track completion - only advance if not repeating
          if (status.didJustFinish && !audioState.isRepeating) {
            playNext();
          }
        }
      });

      // Start progress tracking
      progressInterval.current = setInterval(() => {
        if (newSound) {
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
      console.error('Error loading audio:', error);
      setAudioState(prev => ({ ...prev, isLoading: false }));
      Alert.alert('Error', 'Failed to load audio');
    }
  };

  const togglePlayPause = async () => {
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
    // CRITICAL: Prevent multiple concurrent calls
    if (audioState.isNavigating) {
      console.log('playNext: Already navigating, ignoring click');
      return;
    }

    console.log('playNext: Starting navigation...');
    
    // Lock navigation immediately
    setAudioState(prev => ({ ...prev, isNavigating: true }));

    try {
      // STOP CURRENT AUDIO COMPLETELY AND IMMEDIATELY
      if (sound.current) {
        console.log('playNext: Stopping current audio...');
        try {
          await sound.current.stopAsync();
          await sound.current.unloadAsync();
          sound.current = null;
          console.log('playNext: Current audio stopped and unloaded');
        } catch (error) {
          console.error('Error stopping current audio:', error);
          sound.current = null; // Force null even if error
        }
      }

      // Clear ALL intervals and timers
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }

      // Get next song
      const nextSong = getNextSong();
      if (nextSong) {
        console.log('playNext: Loading next song:', nextSong.song.title || nextSong.song.name);
        setAudioState(prev => ({
          ...prev,
          currentSong: nextSong.song,
          currentIndex: nextSong.index,
          playHistory: [prev.currentSong?.id, ...prev.playHistory.slice(0, 9)], // Keep last 10 songs
          isPlaying: false, // Reset playing state
          position: 0, // Reset position
          isNavigating: false // Unlock navigation
        }));
      } else {
        // Unlock navigation even if no next song
        setAudioState(prev => ({ ...prev, isNavigating: false }));
      }
    } catch (error) {
      console.error('Error in playNext:', error);
      // Unlock navigation on error
      setAudioState(prev => ({ ...prev, isNavigating: false }));
    }
  };

  const playPrevious = async () => {
    // CRITICAL: Prevent multiple concurrent calls
    if (audioState.isNavigating) {
      console.log('playPrevious: Already navigating, ignoring click');
      return;
    }

    console.log('playPrevious: Starting navigation...');
    
    // Lock navigation immediately
    setAudioState(prev => ({ ...prev, isNavigating: true }));

    try {
      // STOP CURRENT AUDIO COMPLETELY AND IMMEDIATELY
      if (sound.current) {
        console.log('playPrevious: Stopping current audio...');
        try {
          await sound.current.stopAsync();
          await sound.current.unloadAsync();
          sound.current = null;
          console.log('playPrevious: Current audio stopped and unloaded');
        } catch (error) {
          console.error('Error stopping current audio:', error);
          sound.current = null; // Force null even if error
        }
      }

      // Clear ALL intervals and timers
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }

      // Get previous song
      const prevSong = getPreviousSong();
      if (prevSong) {
        console.log('playPrevious: Loading previous song:', prevSong.song.title || prevSong.song.name);
        setAudioState(prev => ({
          ...prev,
          currentSong: prevSong.song,
          currentIndex: prevSong.index,
          isPlaying: false, // Reset playing state
          position: 0, // Reset position
          isNavigating: false // Unlock navigation
        }));
      } else {
        // Unlock navigation even if no previous song
        setAudioState(prev => ({ ...prev, isNavigating: false }));
      }
    } catch (error) {
      console.error('Error in playPrevious:', error);
      // Unlock navigation on error
      setAudioState(prev => ({ ...prev, isNavigating: false }));
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

    // If there's a queue and we're not at the end
    if (audioState.queue.length > 0 && audioState.currentIndex < audioState.queue.length - 1) {
      return {
        song: audioState.queue[audioState.currentIndex + 1],
        index: audioState.currentIndex + 1
      };
    }
    
    // If we're at the end of queue or no queue, get next from artist's discography
    const artist = artistsData.find(a => a.name === audioState.currentSong.artist);
    if (artist) {
      const artistSongs = getArtistSongs(artist);
      let availableSongs = artistSongs;

      // If shuffled, use shuffled queue
      if (audioState.isShuffled && audioState.shuffledQueue.length > 0) {
        availableSongs = audioState.shuffledQueue;
      }

      // Filter out recently played songs to avoid repeats
      const recentlyPlayedIds = audioState.playHistory || [];
      const nonRecentSongs = availableSongs.filter(song => 
        !recentlyPlayedIds.includes(song.id) && song.id !== audioState.currentSong?.id
      );

      // If we have non-recent songs, pick from those
      if (nonRecentSongs.length > 0) {
        const nextSong = nonRecentSongs[0];
        return {
          song: nextSong,
          index: 0
        };
      }

      // If all songs are recent, pick next song in artist catalog
      const currentSongIndex = availableSongs.findIndex(s => s.id === audioState.currentSong.id);
      if (currentSongIndex >= 0 && currentSongIndex < availableSongs.length - 1) {
        return {
          song: availableSongs[currentSongIndex + 1],
          index: 0
        };
      }

      // If at end of artist songs, start from beginning
      if (availableSongs.length > 1) {
        return {
          song: availableSongs[0],
          index: 0
        };
      }
    }
    
    // If no next song from artist, pick random from songIndexFlat (avoiding recent plays)
    const recentlyPlayedIds = audioState.playHistory || [];
    const availableSongs = songIndexFlat.filter(song => 
      !recentlyPlayedIds.includes(song.id) && song.id !== audioState.currentSong?.id
    );

    if (availableSongs.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableSongs.length);
      const randomSong = availableSongs[randomIndex];
      console.log('getNextSong: Picking random song from songIndexFlat:', randomSong);
      console.log('Random song has lyrics:', !!randomSong?.lyrics);
      return {
        song: randomSong,
        index: 0
      };
    }

    // Fallback: pick any random song if all are recent
    const randomIndex = Math.floor(Math.random() * songIndexFlat.length);
    const randomSong = songIndexFlat[randomIndex];
    return {
      song: randomSong,
      index: 0
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
    
    // If we're at the beginning of queue or no queue, get previous from artist's discography
    const artist = artistsData.find(a => a.name === audioState.currentSong.artist);
    if (artist) {
      const artistSongs = getArtistSongs(artist);
      let availableSongs = artistSongs;

      // If shuffled, use shuffled queue
      if (audioState.isShuffled && audioState.shuffledQueue.length > 0) {
        availableSongs = audioState.shuffledQueue;
      }

      const currentSongIndex = availableSongs.findIndex(s => s.id === audioState.currentSong.id);
      
      if (currentSongIndex > 0) {
        return {
          song: availableSongs[currentSongIndex - 1],
          index: 0
        };
      }

      // If at the beginning, go to the last song in the catalog
      if (availableSongs.length > 1) {
        return {
          song: availableSongs[availableSongs.length - 1],
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
    const songs = [];
    
    // Add singles
    if (artist.singles) {
      artist.singles.forEach(single => {
        // Find matching song in songIndexFlat to get credits
        const flatSong = songIndexFlat.find(s => s.id === single.id);
        
        songs.push({
          id: single.id,
          title: single.name,
          artist: artist.name,
          coverArt: single.coverArt,
          audio: single.audio,
          lyrics: single.lyrics, // Include lyrics property
          credits: single.credits || flatSong?.credits, // Use credits from song first, then fallback to flatSong
          type: 'single'
        });
      });
    }
    
    // Add album tracks
    if (artist.albums) {
      artist.albums.forEach(album => {
        if (album.songs) {
          album.songs.forEach(song => {
            // Find matching song in songIndexFlat to get credits
            const flatSong = songIndexFlat.find(s => s.id === song.id);
            
            songs.push({
              id: song.id,
              title: song.name,
              artist: artist.name,
              album: album.name,
              coverArt: album.coverArt,
              audio: song.audio,
              lyrics: song.lyrics, // Include lyrics property
              credits: song.credits || flatSong?.credits, // Use credits from song first, then fallback to flatSong
              type: 'album'
            });
          });
        }
      });
    }
    
    return songs;
  };

  const playSong = (song, queue = [], index = 0) => {
    setAudioState(prev => ({
      ...prev,
      currentSong: song,
      showFullPlayer: false,
      queue,
      currentIndex: index
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
        playHistory: []
      }));
    } catch (error) {
      console.error('Error closing mini player:', error);
    }
  };

  const stopAudio = async () => {
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

      if (newShuffled && prev.currentSong) {
        // Create shuffled queue from current artist
        const artist = artistsData.find(a => a.name === prev.currentSong.artist);
        if (artist) {
          const artistSongs = getArtistSongs(artist);
          // Shuffle the songs but keep current song out for now
          const otherSongs = artistSongs.filter(s => s.id !== prev.currentSong.id);
          newShuffledQueue = [prev.currentSong, ...shuffleArray(otherSongs)];
        }
      }

      return {
        ...prev,
        isShuffled: newShuffled,
        shuffledQueue: newShuffledQueue
      };
    });
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
