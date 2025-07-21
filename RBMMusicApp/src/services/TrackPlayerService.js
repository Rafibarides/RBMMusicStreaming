import TrackPlayer, { 
  Event, 
  RepeatMode, 
  State, 
  Capability,
  AppKilledPlaybackBehavior,
  AndroidAudioContentType,
} from 'react-native-track-player';

class TrackPlayerService {
  constructor() {
    this.isInitialized = false;
    this.remoteEventHandlers = {};
    this.stateUpdateCallback = null;
    this.trackChangeCallback = null;
    this.positionUpdateCallback = null;
    this.currentTrackId = null;
  }

  // Initialize TrackPlayer for lock screen metadata ONLY
  async initialize() {
    if (this.isInitialized) {
      console.log('🎵 TrackPlayer already initialized for metadata');
      return;
    }

    try {
      console.log('🚀 Initializing TrackPlayer for METADATA ONLY + lock screen...');
      
      await TrackPlayer.setupPlayer({
        // iOS configuration for lock screen metadata ONLY
        iosCategory: 'playback',
        iosCategoryMode: 'default',
        iosCategoryOptions: [],
        
        // Android configuration
        androidAudioContentType: AndroidAudioContentType.Music,
        
        // Don't interfere with expo-av audio
        androidAppKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        
        // Let expo-av handle audio interruptions
        autoHandleInterruptions: false,
        
        // Don't wait for buffer (metadata only)
        waitForBuffer: false,
      });

      console.log('🔧 TrackPlayer setup completed with conservative settings');

      // Set up remote control capabilities for lock screen
      await TrackPlayer.updateOptions({
        // Capabilities - what controls to show on lock screen
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.Stop,
        ],

        // Compact capabilities - controls shown when space is limited
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],

        // Don't update progress too frequently (metadata only)
        progressUpdateEventInterval: 2,

        // Notification color for Android
        color: 0x4CAF50,
      });

      this.isInitialized = true;
      console.log('✅ TrackPlayer initialized for METADATA ONLY + lock screen');
      
      // Set up event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ Failed to initialize TrackPlayer:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  // Set up event listeners for remote controls and playback events
  setupEventListeners() {
    // Remote control events from lock screen/control center
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
      console.log('🎵 REMOTE CONTROL: Play button pressed on lock screen/control center');
      if (this.remoteEventHandlers.onPlay) {
        console.log('🎵 REMOTE CONTROL: Calling onPlay handler');
        this.remoteEventHandlers.onPlay();
      } else {
        console.warn('🎵 REMOTE CONTROL: No onPlay handler registered!');
      }
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
      console.log('⏸️ REMOTE CONTROL: Pause button pressed on lock screen/control center');
      if (this.remoteEventHandlers.onPause) {
        console.log('⏸️ REMOTE CONTROL: Calling onPause handler');
        this.remoteEventHandlers.onPause();
      } else {
        console.warn('⏸️ REMOTE CONTROL: No onPause handler registered!');
      }
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
      console.log('⏹️ REMOTE CONTROL: Stop button pressed on lock screen/control center');
      if (this.remoteEventHandlers.onStop) {
        console.log('⏹️ REMOTE CONTROL: Calling onStop handler');
        this.remoteEventHandlers.onStop();
      } else {
        console.warn('⏹️ REMOTE CONTROL: No onStop handler registered!');
      }
    });

    TrackPlayer.addEventListener(Event.RemoteNext, () => {
      console.log('⏭️ REMOTE CONTROL: Next button pressed on lock screen/control center');
      if (this.remoteEventHandlers.onNext) {
        console.log('⏭️ REMOTE CONTROL: Calling onNext handler');
        this.remoteEventHandlers.onNext();
      } else {
        console.warn('⏭️ REMOTE CONTROL: No onNext handler registered!');
      }
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
      console.log('⏮️ REMOTE CONTROL: Previous button pressed on lock screen/control center');
      if (this.remoteEventHandlers.onPrevious) {
        console.log('⏮️ REMOTE CONTROL: Calling onPrevious handler');
        this.remoteEventHandlers.onPrevious();
      } else {
        console.warn('⏮️ REMOTE CONTROL: No onPrevious handler registered!');
      }
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
      console.log('🔍 REMOTE CONTROL: Seek requested from lock screen/control center:', event.position);
      if (this.remoteEventHandlers.onSeek) {
        console.log('🔍 REMOTE CONTROL: Calling onSeek handler with position:', event.position);
        this.remoteEventHandlers.onSeek(event.position);
      } else {
        console.warn('🔍 REMOTE CONTROL: No onSeek handler registered!');
      }
    });

    // Playback state changes (for UI updates)
    TrackPlayer.addEventListener(Event.PlaybackState, (state) => {
      console.log('🎵 TrackPlayer metadata state changed:', state);
      if (this.stateUpdateCallback) {
        this.stateUpdateCallback(state);
      }
    });

    // Track changes (for UI updates)
    TrackPlayer.addEventListener(Event.PlaybackTrackChanged, (event) => {
      console.log('🎵 TrackPlayer metadata track changed:', event);
      if (this.trackChangeCallback) {
        this.trackChangeCallback(event);
      }
    });

    // Playback errors
    TrackPlayer.addEventListener(Event.PlaybackError, (error) => {
      console.error('❌ TrackPlayer metadata error:', error);
    });
  }

  // Register callbacks for remote control events
  setRemoteEventHandlers(handlers) {
    this.remoteEventHandlers = { ...this.remoteEventHandlers, ...handlers };
  }

  // Set callback for state updates
  setStateUpdateCallback(callback) {
    this.stateUpdateCallback = callback;
  }

  // Set callback for track changes
  setTrackChangeCallback(callback) {
    this.trackChangeCallback = callback;
  }

  // Set callback for position updates
  setPositionUpdateCallback(callback) {
    this.positionUpdateCallback = callback;
  }

  // Set track metadata for lock screen (METADATA ONLY - NO AUDIO PLAYBACK)
  async setNowPlayingMetadata(song) {
    if (!this.isInitialized) {
      console.log('🔧 TrackPlayer not initialized, initializing now...');
      await this.initialize();
    }

    try {
      console.log('🔧 Setting lock screen metadata for:', song.title);
      console.log('🔧 Song data:', {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        coverArt: song.coverArt ? 'present' : 'missing',
        audio: song.audio ? 'present' : 'missing'
      });
      
      // Clear any existing tracks
      await TrackPlayer.reset();
      console.log('🔧 TrackPlayer queue reset');
      
      const track = {
        id: song.id.toString(),
        url: song.audio, // Required by TrackPlayer even for metadata-only
        title: song.title || song.name || 'Unknown Title',
        artist: song.artist || 'Unknown Artist',
        album: song.album || 'Unknown Album',
        artwork: song.coverArt || undefined,
        duration: song.duration || undefined,
        genre: song.genre || undefined,
        date: song.releaseDate || undefined,
      };

      console.log('🔧 Track object created:', {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: track.artwork ? 'present' : 'missing'
      });

      // Add track for metadata
      await TrackPlayer.add(track);
      console.log('🔧 Track added to TrackPlayer queue');
      
      // CRITICAL: Set volume to 0 BEFORE playing to prevent audio output
      await TrackPlayer.setVolume(0);
      console.log('🔧 TrackPlayer volume set to 0 (silent)');
      
      // CRITICAL: Start playing to activate audio session for lock screen
      await TrackPlayer.play();
      console.log('🔧 TrackPlayer started playing (silent) for lock screen activation');
      
      this.currentTrackId = song.id;
      
      const state = await TrackPlayer.getPlaybackState();
      console.log('🔧 TrackPlayer state after lock screen setup:', state);
      
      console.log('✅ Lock screen metadata set successfully for:', song.title);
      
    } catch (error) {
      console.error('❌ Error setting TrackPlayer metadata:', error);
      throw error;
    }
  }

  // Update playback state for lock screen sync (SILENT AUDIO SESSION)
  async updatePlaybackState(isPlaying, position = 0) {
    if (!this.isInitialized) {
      console.log('🔧 TrackPlayer not initialized, skipping state update');
      return;
    }

    try {
      console.log(`🔧 TrackPlayer state sync: isPlaying=${isPlaying}, position=${position}`);
      
      // Always ensure volume is 0 to prevent audio conflicts with expo-av
      await TrackPlayer.setVolume(0);
      
      // Update position if provided
      if (position > 0) {
        await TrackPlayer.seekTo(position / 1000); // Convert ms to seconds
        console.log(`🔧 TrackPlayer position synced to: ${position / 1000}s`);
      }

      // Sync play/pause state for lock screen
      if (isPlaying) {
        await TrackPlayer.play();
        console.log('🔧 TrackPlayer set to PLAYING (silent) for lock screen');
      } else {
        await TrackPlayer.pause();
        console.log('🔧 TrackPlayer set to PAUSED for lock screen');
      }
      
    } catch (error) {
      console.error('🔧 TrackPlayer state sync error:', error);
    }
  }

  // Update track position for lock screen progress (metadata only)
  async updatePosition(position) {
    if (!this.isInitialized) return;

    try {
      await TrackPlayer.seekTo(position / 1000); // Convert milliseconds to seconds
    } catch (error) {
      console.log('TrackPlayer metadata position update');
    }
  }

  // These methods do nothing - expo-av handles actual playback
  async play() {
    console.log('🎵 TrackPlayer.play() called (metadata only - expo-av handles actual playback)');
    // Do nothing - expo-av handles actual playback
  }

  async pause() {
    console.log('⏸️ TrackPlayer.pause() called (metadata only - expo-av handles actual playback)');
    // Do nothing - expo-av handles actual playback
  }

  async stop() {
    if (!this.isInitialized) return;
    try {
      await TrackPlayer.stop();
      await TrackPlayer.reset();
      this.currentTrackId = null;
      console.log('⏹️ TrackPlayer metadata cleared');
    } catch (error) {
      console.log('TrackPlayer metadata stop');
    }
  }

  async seekTo(position) {
    console.log('🔍 TrackPlayer.seekTo() called (metadata only - expo-av handles actual seeking)');
    // Do nothing - expo-av handles actual seeking
    // Position updates are handled by updatePosition()
  }

  // Get current playback state (from TrackPlayer metadata)
  async getState() {
    if (!this.isInitialized) return State.None;
    try {
      return await TrackPlayer.getState();
    } catch (error) {
      return State.None;
    }
  }

  async getPosition() {
    if (!this.isInitialized) return 0;
    try {
      const position = await TrackPlayer.getPosition();
      return position * 1000; // Convert seconds to milliseconds for compatibility
    } catch (error) {
      return 0;
    }
  }

  async getDuration() {
    if (!this.isInitialized) return 0;
    try {
      const duration = await TrackPlayer.getDuration();
      return duration * 1000; // Convert seconds to milliseconds for compatibility
    } catch (error) {
      return 0;
    }
  }

  async getCurrentTrack() {
    if (!this.isInitialized) return null;
    try {
      return await TrackPlayer.getCurrentTrack();
    } catch (error) {
      return null;
    }
  }

  // Set repeat mode (metadata only)
  async setRepeatMode(isRepeating) {
    if (!this.isInitialized) return;
    try {
      await TrackPlayer.setRepeatMode(
        isRepeating ? RepeatMode.Track : RepeatMode.Off
      );
      console.log('🔁 TrackPlayer repeat mode set (metadata only)');
    } catch (error) {
      console.log('TrackPlayer metadata repeat mode update');
    }
  }

  // Clear metadata
  async clearQueue() {
    if (!this.isInitialized) return;
    try {
      await TrackPlayer.reset();
      this.currentTrackId = null;
      console.log('🧹 TrackPlayer metadata cleared');
    } catch (error) {
      console.log('TrackPlayer metadata clear');
    }
  }

  // Cleanup
  async destroy() {
    if (!this.isInitialized) return;
    
    try {
      await TrackPlayer.reset();
      this.isInitialized = false;
      this.currentTrackId = null;
      console.log('🧹 TrackPlayer destroyed (metadata only)');
    } catch (error) {
      console.error('❌ Error destroying TrackPlayer:', error);
    }
  }
}

// Export singleton instance
const trackPlayerService = new TrackPlayerService();
export default trackPlayerService;