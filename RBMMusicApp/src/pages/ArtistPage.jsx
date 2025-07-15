import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Linking,
} from 'react-native';
import { Video } from 'expo-av';
import { FontAwesome } from '@expo/vector-icons';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedGestureHandler, useAnimatedStyle, runOnJS, withSpring } from 'react-native-reanimated';
import { palette } from '../utils/Colors';
import { useMusicData } from '../contexts/MusicDataContext';
import CachedImage from '../components/CachedImage';
import SongListPage from './SongListPage';
import eventIndexFlat from '../json/eventIndexFlat.json';

const ArtistPage = ({ artist, onBack, searchState, updateSearchState, playSong, onStopAudio, onRegisterVideoStopCallback, onUnregisterVideoStopCallback }) => {
  const { 
    videoIndexFlat, 
    videoIndexFlatLoading, 
    songIndexFlat, 
    songIndexFlatLoading, 
    artistImagesPreloaded 
  } = useMusicData();
  const [activeTab, setActiveTab] = useState('Music');
  const [videoAspectRatios, setVideoAspectRatios] = useState({});
  const [playingVideoId, setPlayingVideoId] = useState(null);
  
  // Reset any local state when artist changes
  useEffect(() => {
    setVideoAspectRatios({});
    setPlayingVideoId(null);
  }, [artist?.id]);

  // Function to stop currently playing video
  const stopCurrentVideo = () => {
    if (playingVideoId) {
      console.log('🛑 Stopping video due to music playback');
      setPlayingVideoId(null);
    }
  };

  // Register video stop callback when component mounts or playingVideoId changes
  useEffect(() => {
    if (onRegisterVideoStopCallback) {
      onRegisterVideoStopCallback(stopCurrentVideo);
    }
    
    return () => {
      if (onUnregisterVideoStopCallback) {
        onUnregisterVideoStopCallback();
      }
    };
  }, [onRegisterVideoStopCallback, onUnregisterVideoStopCallback, playingVideoId]);

  // Cleanup effect to stop any playing video when component unmounts
  useEffect(() => {
    return () => {
      if (playingVideoId) {
        setPlayingVideoId(null);
      }
    };
  }, []);
  
  // Use search state if provided, otherwise fall back to local state
  const currentView = searchState?.songListData ? 'songList' : 'profile';
  const songListData = searchState?.songListData || null;

  // Get screen width for artist image
  const screenWidth = Dimensions.get('window').width;

  // Gesture handling for swipe back
  const translateX = useSharedValue(0);

  // Safe wrapper for back navigation that includes error handling
  const safeHandleBackNavigation = () => {
    try {
      handleBackNavigation();
    } catch (error) {
      console.error('Error in gesture back navigation:', error);
    }
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      translateX.value = 0;
    },
    onActive: (event) => {
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    },
    onEnd: (event) => {
      if (event.translationX > 100 && event.velocityX > 0) {
        runOnJS(safeHandleBackNavigation)();
      } else {
        translateX.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  if (!artist) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Artist not found</Text>
      </View>
    );
  }

  // Get latest release (prioritize albums, then singles)
  const getLatestRelease = () => {
    if (artist.albums && artist.albums.length > 0) {
      return { type: 'album', data: artist.albums[0] };
    }
    if (artist.singles && artist.singles.length > 0) {
      return { type: 'single', data: artist.singles[0] };
    }
    return null;
  };

  const latestRelease = getLatestRelease();

  // Get all songs from artist (singles + album tracks)
  const getAllArtistSongs = () => {
    if (songIndexFlatLoading || !songIndexFlat) {
      return [];
    }
    
    const allSongs = [];
    
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
      
      allSongs.push({
        id: song.id,
        title: song.title,
        name: song.title,
        artist: artist.name,
        album: albumName,
        coverArt: coverArt,
        audio: song.audio,
        lyrics: song.lyrics,
        credits: song.credits,
        albumId: song.albumId,
        type: song.type,
        releaseDate: song.releaseDate,
        genre: song.genre
      });
    });
    
    return allSongs;
  };

  // Navigate to all releases
  const navigateToAllReleases = () => {
    const allSongs = getAllArtistSongs();
    const newSongListData = {
      songs: allSongs,
      title: 'All Releases',
      subtitle: `${artist.name} • ${allSongs.length} songs`
    };
    
    if (updateSearchState) {
      updateSearchState({ songListData: newSongListData });
    }
  };

  // Navigate to album songs
  const navigateToAlbum = (album) => {
    if (songIndexFlatLoading || !songIndexFlat) {
      return;
    }
    
    // Get songs for this album from songIndexFlat
    const albumSongs = songIndexFlat.filter(song => song.albumId === album.id).map(song => ({
      id: song.id,
      title: song.title,
      name: song.title,
      artist: artist.name,
      album: album.name,
      coverArt: album.coverArt,
      audio: song.audio,
      lyrics: song.lyrics,
      credits: song.credits,
      albumId: song.albumId,
      type: 'album',
      releaseDate: song.releaseDate,
      genre: song.genre
    }));
    
    const newSongListData = {
      songs: albumSongs,
      title: album.name,
      subtitle: `${artist.name} • ${albumSongs.length} songs`
    };
    
    if (updateSearchState) {
      updateSearchState({ songListData: newSongListData });
    }
  };

  // Navigate back to artist profile
  const navigateBackToProfile = () => {
    if (updateSearchState) {
      updateSearchState({ songListData: null });
    }
  };

  // Render album item
  const renderAlbum = ({ item }) => (
    <TouchableOpacity 
      style={styles.albumItem}
      onPress={() => navigateToAlbum(item)}
    >
      <CachedImage source={{ uri: item.coverArt }} style={styles.albumCover} />
      <Text style={styles.albumTitle} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.albumArtist} numberOfLines={1}>{artist.name}</Text>
    </TouchableOpacity>
  );

  // Render latest release
  const renderLatestRelease = () => {
    if (!latestRelease) return null;

    const { type, data } = latestRelease;
    const isAlbum = type === 'album';

    const handleLatestReleasePress = () => {
      if (isAlbum) {
        navigateToAlbum(data);
      } else {
        // Play the single
        if (playSong && !songIndexFlatLoading && songIndexFlat) {
          // Find the single in songIndexFlat
          const flatSong = songIndexFlat.find(s => s.id === data.id);
          
          if (flatSong) {
            const singleData = {
              id: flatSong.id,
              title: flatSong.title,
              name: flatSong.title,
              artist: artist.name,
              coverArt: data.coverArt, // Use cover art from artist data
              audio: flatSong.audio,
              lyrics: flatSong.lyrics,
              credits: flatSong.credits,
              type: 'single',
              releaseDate: flatSong.releaseDate,
              genre: flatSong.genre
            };
            playSong(singleData, [singleData], 0);
          }
        }
      }
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Latest Release</Text>
        <TouchableOpacity 
          style={styles.latestReleaseItem}
          onPress={handleLatestReleasePress}
        >
          <CachedImage source={{ uri: data.coverArt }} style={styles.latestReleaseCover} />
          <View style={styles.latestReleaseInfo}>
            <Text style={styles.latestReleaseTitle}>{data.name}</Text>
            <Text style={styles.latestReleaseType}>
              {isAlbum ? `Album • ${songIndexFlatLoading || !songIndexFlat ? 0 : songIndexFlat.filter(song => song.albumId === data.id).length} songs` : 'Single'}
            </Text>
            <Text style={styles.latestReleaseArtist}>{artist.name}</Text>
          </View>
          {isAlbum && (
            <FontAwesome name="chevron-right" size={16} color={palette.quaternary} style={styles.chevronIcon} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Render music content
  const renderMusicContent = () => (
    <View>
      {renderLatestRelease()}
      
      {artist.albums && artist.albums.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Albums</Text>
          <FlatList
            data={artist.albums}
            renderItem={renderAlbum}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.albumsList}
          />
        </View>
      )}

      <TouchableOpacity 
        style={styles.allReleasesButton}
        onPress={navigateToAllReleases}
      >
        <Text style={styles.allReleasesText}>All Releases</Text>
        <FontAwesome name="chevron-right" size={14} color={palette.quaternary} />
      </TouchableOpacity>
    </View>
  );

  // Render video content
  const renderVideoContent = () => {
    if (videoIndexFlatLoading) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>Loading videos...</Text>
        </View>
      );
    }

    const artistVideos = getArtistVideos();

    if (artistVideos.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <FontAwesome name="video-camera" size={48} color={palette.quaternary} />
          <Text style={styles.emptyStateText}>This artist hasn't uploaded any videos</Text>
          <Text style={styles.emptyStateSubtext}>
            Check back later for new video content
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.videosContainer}>
        <Text style={styles.sectionTitle}>Videos</Text>
        {artistVideos.map(video => renderVideoItem(video))}
      </View>
    );
  };

  // Get videos for current artist
  const getArtistVideos = () => {
    return videoIndexFlat.filter(video => video.artistId === artist.id);
  };

  // Handle video load to get natural dimensions
  const handleVideoLoad = (videoId, status) => {
    if (status.naturalSize) {
      const { width, height } = status.naturalSize;
      const aspectRatio = width / height;
      setVideoAspectRatios(prev => ({
        ...prev,
        [videoId]: aspectRatio
      }));
    }
  };

  // Handle video play - stop any current audio and other videos
  const handleVideoPlay = (videoId) => {
    if (onStopAudio) {
      console.log('🎥 Starting video - stopping any playing audio');
      onStopAudio();
    }
    // Set this video as the currently playing one (stops all others)
    setPlayingVideoId(videoId);
  };

  // Handle video pause/stop
  const handleVideoStop = (videoId) => {
    // If this was the playing video, clear the playing state
    if (playingVideoId === videoId) {
      setPlayingVideoId(null);
    }
  };

  // Handle back navigation - stop any playing video first
  const handleBackNavigation = () => {
    try {
      if (playingVideoId) {
        setPlayingVideoId(null);
      }
      if (onBack && typeof onBack === 'function') {
        onBack();
      }
    } catch (error) {
      console.error('Error in handleBackNavigation:', error);
      // Fallback navigation if there's an error
      if (updateSearchState) {
        updateSearchState({
          currentPage: 'search',
          selectedArtist: null,
          songListData: null,
          previousPage: null
        });
      }
    }
  };

  // Render single video item
  const renderVideoItem = (video) => {
    const aspectRatio = videoAspectRatios[video.id];
    const screenWidth = Dimensions.get('window').width - 40; // Account for padding
    const calculatedHeight = aspectRatio ? screenWidth / aspectRatio : 200;
    const isCurrentlyPlaying = playingVideoId === video.id;
    
    return (
      <View key={video.id} style={styles.videoItem}>
        <View style={[styles.videoContainer, { height: calculatedHeight }]}>
          <Video
            source={{ uri: video.url }}
            style={styles.videoPlayer}
            useNativeControls
            resizeMode="contain"
            isLooping={false}
            shouldPlay={isCurrentlyPlaying}
            onLoad={(status) => handleVideoLoad(video.id, status)}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded) {
                if (status.isPlaying && !isCurrentlyPlaying) {
                  // Video started playing, make it the active one
                  handleVideoPlay(video.id);
                } else if (!status.isPlaying && isCurrentlyPlaying) {
                  // Video stopped/paused, clear the playing state
                  handleVideoStop(video.id);
                }
              }
            }}
          />
        </View>
        <Text style={styles.videoTitle}>{video.title}</Text>
      </View>
    );
  };



  // Get events for current artist
  const getArtistEvents = () => {
    const artistEvents = eventIndexFlat.filter(event => event.artistId === artist.id);
    
    // Sort by date (upcoming first)
    return artistEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Handle ticket link press
  const handleTicketPress = (ticketLink) => {
    Linking.openURL(ticketLink).catch(err => 
      console.error('Error opening ticket link:', err)
    );
  };

  // Format date for display
  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    const options = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Render single event item
  const renderEventItem = (event) => (
    <View key={event.id} style={styles.eventItem}>
      {/* Date - Prominent at the top */}
      <View style={styles.eventDateHeader}>
        <Text style={styles.eventDate}>
          {formatEventDate(event.date)}
        </Text>
      </View>
      
      <View style={styles.eventMainContent}>
        {/* Artist Image */}
        <CachedImage source={{ uri: artist.image }} style={styles.eventArtistImage} />
        
        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventVenue} numberOfLines={2}>
            {event.venue}
          </Text>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={styles.eventShowtime}>
            {event.showtime}
          </Text>
        </View>
      </View>
      
      {/* Subtext */}
      {event.subtext && (
        <Text style={styles.eventSubtext}>{event.subtext}</Text>
      )}

      {/* Ticket Button */}
      <TouchableOpacity 
        style={styles.ticketButton}
        onPress={() => handleTicketPress(event.ticketLink)}
      >
        <Text style={styles.ticketButtonText}>Get Tickets</Text>
        <FontAwesome name="external-link" size={12} color={palette.text} />
      </TouchableOpacity>
    </View>
  );

  // Render events content
  const renderEventsContent = () => {
    const artistEvents = getArtistEvents();

    if (artistEvents.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <FontAwesome name="calendar" size={48} color={palette.quaternary} />
          <Text style={styles.emptyStateText}>No upcoming events</Text>
          <Text style={styles.emptyStateSubtext}>
            Check back later for tour announcements
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.eventsContainer}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        {artistEvents.map(event => renderEventItem(event))}
      </View>
    );
  };

  // Render support content
  const renderSupportContent = () => {
    const artistName = artist.name;
    const hasSupportLink = artist.supportLink;

    return (
      <View style={styles.supportContainer}>
        <Text style={styles.supportDescription}>
          {artistName} has made their music free to stream on Arbiem.  
          Support them!
        </Text>
        
        {hasSupportLink ? (
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={() => {
              Linking.openURL(artist.supportLink).catch(err => 
                console.error('Error opening support link:', err)
              );
            }}
          >
            <FontAwesome name="dollar" size={16} color={palette.text} style={styles.supportIcon} />
            <Text style={styles.supportButtonText}>Support</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.noSupportText}>
            {artistName} has not provided a support link, but they want to share their music with you. 
            Show them love by listening to their tracks and sharing their music with others!
          </Text>
        )}
      </View>
    );
  };

  // Render about content
  const renderAboutContent = () => {
    const hasBio = artist.bio;
    const hasInstagram = artist.instagram;

    return (
      <View style={styles.aboutContainer}>
        {hasBio ? (
          <Text style={styles.bioText}>
            {artist.bio}
          </Text>
        ) : (
          <Text style={styles.noBioText}>
            No bio yet.
          </Text>
        )}
        
        {hasInstagram && (
          <TouchableOpacity 
            style={styles.instagramButton}
            onPress={() => {
              Linking.openURL(artist.instagram).catch(err => 
                console.error('Error opening Instagram link:', err)
              );
            }}
          >
            <FontAwesome name="instagram" size={20} color={palette.text} style={styles.instagramIcon} />
            <Text style={styles.instagramButtonText}>Follow on Instagram</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };



  // Show SongListPage if currentView is 'songList'
  if (currentView === 'songList' && songListData) {
    return (
      <SongListPage
        songs={songListData.songs}
        title={songListData.title}
        subtitle={songListData.subtitle}
        onBack={navigateBackToProfile}
        playSong={playSong}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header with back button */}
            <TouchableOpacity style={styles.backButton} onPress={handleBackNavigation}>
              <FontAwesome name="chevron-left" size={20} color={palette.text} />
            </TouchableOpacity>

            {/* Artist Image */}
            <View style={styles.imageContainer}>
              <CachedImage 
                source={{ uri: artist.image }} 
                style={styles.artistImage}
              />
            </View>

            {/* Artist Info & Controls */}
            <View style={styles.artistInfo}>
              <View style={styles.nameAndButtons}>
                <Text style={styles.artistName}>{artist.name}</Text>
                <View style={styles.controlButtons}>
                  <TouchableOpacity style={styles.shuffleButton}>
                    <FontAwesome name="random" size={12} color={palette.quaternary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.playButton}
                    onPress={() => {
                      if (playSong) {
                        const allSongs = getAllArtistSongs();
                        if (allSongs.length > 0) {
                          playSong(allSongs[0], allSongs, 0);
                        }
                      }
                    }}
                  >
                    <FontAwesome name="play" size={16} color={palette.text} style={styles.playIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Tab Menu */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.tabMenu}
              contentContainerStyle={styles.tabMenuContent}
            >
              {['Music', 'Video', 'Events', 'Support Me', 'About Me'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabButton,
                    activeTab === tab && styles.activeTabButton
                  ]}
                  onPress={() => {
                    // Stop any playing video when switching away from Video tab
                    if (activeTab === 'Video' && tab !== 'Video' && playingVideoId) {
                      setPlayingVideoId(null);
                    }
                    setActiveTab(tab);
                  }}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeTab === tab && styles.activeTabButtonText
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {/* Always render all content, but position hidden ones offscreen */}
              <View style={[
                styles.tabPanel,
                activeTab !== 'Music' && styles.hiddenTabPanel
              ]}>
                {renderMusicContent()}
              </View>
              
              <View style={[
                styles.tabPanel,
                activeTab !== 'Video' && styles.hiddenTabPanel
              ]}>
                {renderVideoContent()}
              </View>
              
              <View style={[
                styles.tabPanel,
                activeTab !== 'Events' && styles.hiddenTabPanel
              ]}>
                {renderEventsContent()}
              </View>
              
              <View style={[
                styles.tabPanel,
                activeTab !== 'Support Me' && styles.hiddenTabPanel
              ]}>
                {renderSupportContent()}
              </View>
              
              <View style={[
                styles.tabPanel,
                activeTab !== 'About Me' && styles.hiddenTabPanel
              ]}>
                {renderAboutContent()}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  imageContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  artistImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').width,
    borderRadius: 0,
  },
  artistInfo: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  nameAndButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  artistName: {
    fontSize: 40,
    fontWeight: 'bold',
    color: palette.text,
    flex: 1,
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: palette.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  playIcon: {
    marginLeft: 2,
  },
  shuffleButton: {
    padding: 8,
  },
  tabMenu: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabMenuContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: palette.text,
  },
  tabButtonText: {
    fontSize: 14,
    color: palette.quaternary,
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: palette.text,
    fontWeight: '600',
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  tabPanel: {
    // Default visible state
  },
  hiddenTabPanel: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    opacity: 0,
    pointerEvents: 'none',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 15,
  },
  latestReleaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  latestReleaseCover: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginRight: 15,
  },
  latestReleaseInfo: {
    flex: 1,
  },
  latestReleaseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 4,
  },
  latestReleaseType: {
    fontSize: 14,
    color: palette.quaternary,
    marginBottom: 2,
  },
  latestReleaseArtist: {
    fontSize: 14,
    color: palette.quaternary,
  },
  chevronIcon: {
    marginLeft: 10,
  },
  albumsList: {
    paddingRight: 20,
  },
  albumItem: {
    width: 120,
    marginRight: 15,
  },
  albumCover: {
    width: 120,
    height: 120,
    borderRadius: 6,
    marginBottom: 8,
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: palette.text,
    marginBottom: 2,
  },
  albumArtist: {
    fontSize: 12,
    color: palette.quaternary,
  },
  allReleasesButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: palette.secondary,
    marginTop: 10,
    marginBottom: 80, 
  },
  allReleasesText: {
    fontSize: 16,
    color: palette.text,
    fontWeight: '500',
  },
  emptyStateContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    marginBottom: 120,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: palette.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: palette.quaternary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 18,
    color: palette.text,
    textAlign: 'center',
    marginTop: 100,
  },
  supportContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  supportDescription: {
    fontSize: 14,
    color: palette.text,
    opacity: 0.7,
    lineHeight: 20,
    marginBottom: 20,
  },
  supportButton: {
    backgroundColor: palette.black,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 80,
  },
  supportIcon: {
    marginRight: 8,
  },
  supportButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  noSupportText: {
    fontSize: 14,
    color: palette.quaternary,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 120,
  },

  // About Me styles
  aboutContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bioText: {
    fontSize: 16,
    color: palette.text,
    lineHeight: 24,
    marginBottom: 30,
  },
  noBioText: {
    fontSize: 16,
    color: palette.quaternary,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 30,
  },
  instagramButton: {
    backgroundColor: palette.secondary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 120,
  },
  instagramIcon: {
    marginRight: 8,
  },
  instagramButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Events styles
  eventsContainer: {
    paddingBottom: 40,
    marginBottom: 120,
  },
  eventItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 6,
    padding: 16,
    marginBottom: 12,
  },
  eventDateHeader: {
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  eventDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text,
    textAlign: 'center',
  },
  eventMainContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventArtistImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  eventInfo: {
    flex: 1,
  },
  eventVenue: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 4,
    lineHeight: 22,
  },
  eventTitle: {
    fontSize: 14,
    color: palette.quaternary,
    marginBottom: 4,
    lineHeight: 18,
  },
  eventShowtime: {
    fontSize: 12,
    color: palette.quaternary,
  },
  eventSubtext: {
    fontSize: 13,
    color: palette.quaternary,
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18,
  },
  ticketButton: {
    backgroundColor: palette.tertiary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  ticketButtonText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  
  // Video styles
  videosContainer: {
    paddingBottom: 20,
    marginBottom: 80,
  },
  videoItem: {
    marginBottom: 24,
  },
  videoContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: palette.background,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginTop: 12,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

export default ArtistPage;
