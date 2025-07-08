import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, AppState } from 'react-native';
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

// Import colors
import { palette } from './utils/Colors';

// Import JSON data for queue management
import songIndexFlat from './json/songIndexFlat.json';
import artistsData from './json/artists.json';

export default function App() {
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
    isSliding: false
  });

  // Audio refs and intervals
  const sound = useRef(null);
  const progressInterval = useRef(null);

  const updateSearchState = (newState) => {
    setSearchState(prevState => ({ ...prevState, ...newState }));
  };

  const resetSearchNavigation = () => {
    setSearchState(prevState => ({
      ...prevState,
      currentPage: 'search',
      selectedArtist: null,
      songListData: null
    }));
  };

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
          isLooping: false,
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
          
          // Handle track completion
          if (status.didJustFinish) {
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

  const playNext = () => {
    const nextSong = getNextSong();
    if (nextSong) {
      setAudioState(prev => ({
        ...prev,
        currentSong: nextSong.song,
        currentIndex: nextSong.index
      }));
    }
  };

  const playPrevious = () => {
    const prevSong = getPreviousSong();
    if (prevSong) {
      setAudioState(prev => ({
        ...prev,
        currentSong: prevSong.song,
        currentIndex: prevSong.index
      }));
    }
  };

  const getNextSong = () => {
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
      const currentSongIndex = artistSongs.findIndex(s => s.id === audioState.currentSong.id);
      
      if (currentSongIndex >= 0 && currentSongIndex < artistSongs.length - 1) {
        return {
          song: artistSongs[currentSongIndex + 1],
          index: 0
        };
      }
    }
    
    // If no next song from artist, pick random from songIndexFlat
    const randomIndex = Math.floor(Math.random() * songIndexFlat.length);
    return {
      song: songIndexFlat[randomIndex],
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
      const currentSongIndex = artistSongs.findIndex(s => s.id === audioState.currentSong.id);
      
      if (currentSongIndex > 0) {
        return {
          song: artistSongs[currentSongIndex - 1],
          index: 0
        };
      }
    }
    
    // If no previous song, stay on current song
    return null;
  };

  const getArtistSongs = (artist) => {
    const songs = [];
    
    // Add singles
    if (artist.singles) {
      artist.singles.forEach(single => {
        songs.push({
          id: single.id,
          title: single.name,
          artist: artist.name,
          coverArt: single.coverArt,
          audio: single.audio,
          type: 'single'
        });
      });
    }
    
    // Add album tracks
    if (artist.albums) {
      artist.albums.forEach(album => {
        if (album.songs) {
          album.songs.forEach(song => {
            songs.push({
              id: song.id,
              title: song.name,
              artist: artist.name,
              album: album.name,
              coverArt: album.coverArt,
              audio: song.audio,
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
  };

  const openFullPlayer = () => {
    setAudioState(prevState => ({ ...prevState, showFullPlayer: true }));
  };

  const closeFullPlayer = () => {
    setAudioState(prevState => ({ ...prevState, showFullPlayer: false }));
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

  const renderScreen = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <Dashboard playSong={playSong} />;
      case 'Search':
        return (
          <Search 
            searchState={searchState}
            updateSearchState={updateSearchState}
            resetSearchNavigation={resetSearchNavigation}
            playSong={playSong}
          />
        );
      case 'Playlists':
        return <Playlists playSong={playSong} />;
      default:
        return <Dashboard playSong={playSong} />;
    }
  };

  const handleTabPress = (tabName) => {
    // If switching to Search tab and we're in a sub-page, reset to main search
    if (tabName === 'Search' && searchState.currentPage !== 'search') {
      resetSearchNavigation();
    }
    setActiveTab(tabName);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={palette.background} />
        
        <View style={styles.screenContainer}>
          {renderScreen()}
        </View>
        
        {/* Minimized Player */}
        <MinimizedPlayer
          song={audioState.currentSong}
          isPlaying={audioState.isPlaying}
          onTogglePlay={togglePlayPause}
          onPress={openFullPlayer}
          onNext={playNext}
        />
        
        <BottomNavBar 
          activeTab={activeTab} 
          onTabPress={handleTabPress} 
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
            onBack={closeFullPlayer}
            onNavigateToArtist={handleArtistNavigation}
            onTogglePlay={togglePlayPause}
            onSeek={seekTo}
            onUpdatePosition={updatePosition}
            onNext={playNext}
            onPrevious={playPrevious}
            onSliderStart={() => setAudioState(prev => ({ ...prev, isSliding: true }))}
            onSliderEnd={() => setAudioState(prev => ({ ...prev, isSliding: false }))}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
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
