import React, { useState } from 'react';
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
import SongListPage from './SongListPage';
import songIndexFlat from '../json/songIndexFlat.json';
import eventIndexFlat from '../json/eventIndexFlat.json';
import videoIndexFlat from '../json/videoIndexFlat.json';

const ArtistPage = ({ artist, onBack, searchState, updateSearchState, playSong, onStopAudio }) => {
  const [activeTab, setActiveTab] = useState('Music');
  const [videoAspectRatios, setVideoAspectRatios] = useState({});
  
  // Use search state if provided, otherwise fall back to local state
  const currentView = searchState?.songListData ? 'songList' : 'profile';
  const songListData = searchState?.songListData || null;

  // Get screen width for artist image
  const screenWidth = Dimensions.get('window').width;

  // Gesture handling for swipe back
  const translateX = useSharedValue(0);

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
        runOnJS(onBack)();
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
    const allSongs = [];
    
    // Add singles
    if (artist.singles) {
      artist.singles.forEach(single => {
        // Find matching song in songIndexFlat to get credits
        const flatSong = songIndexFlat.find(s => s.id === single.id);
        
        allSongs.push({
          id: single.id,
          title: single.name,
          name: single.name,
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
            
            allSongs.push({
              id: song.id,
              title: song.name,
              name: song.name,
              artist: artist.name,
              album: album.name,
              coverArt: album.coverArt,
              audio: song.audio,
              lyrics: song.lyrics, // Include lyrics property
              credits: song.credits || flatSong?.credits, // Use credits from song first, then fallback to flatSong
              albumId: song.albumId,
              type: 'album'
            });
          });
        }
      });
    }
    
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
    const albumSongs = album.songs ? album.songs.map(song => {
      // Find matching song in songIndexFlat to get credits
      const flatSong = songIndexFlat.find(s => s.id === song.id);
      
      return {
        id: song.id,
        title: song.name,
        name: song.name,
        artist: artist.name,
        album: album.name,
        coverArt: album.coverArt,
        audio: song.audio,
        lyrics: song.lyrics, // Include lyrics property
        credits: song.credits || flatSong?.credits, // Use credits from song first, then fallback to flatSong
        albumId: song.albumId,
        type: 'album'
      };
    }) : [];
    
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
      <Image source={{ uri: item.coverArt }} style={styles.albumCover} />
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
        if (playSong) {
          // Find matching song in songIndexFlat to get credits
          const flatSong = songIndexFlat.find(s => s.id === data.id);
          
          const singleData = {
            id: data.id,
            title: data.name,
            name: data.name,
            artist: artist.name,
            coverArt: data.coverArt,
            audio: data.audio,
            lyrics: data.lyrics, // Include lyrics property
            credits: data.credits || flatSong?.credits, // Use credits from song first, then fallback to flatSong
            type: 'single'
          };
          playSong(singleData, [singleData], 0);
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
          <Image source={{ uri: data.coverArt }} style={styles.latestReleaseCover} />
          <View style={styles.latestReleaseInfo}>
            <Text style={styles.latestReleaseTitle}>{data.name}</Text>
            <Text style={styles.latestReleaseType}>
              {isAlbum ? `Album • ${data.songs?.length || 0} songs` : 'Single'}
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

  // Handle video play - stop any current audio
  const handleVideoPlay = () => {
    if (onStopAudio) {
      onStopAudio();
    }
  };

  // Render single video item
  const renderVideoItem = (video) => {
    const aspectRatio = videoAspectRatios[video.id];
    const screenWidth = Dimensions.get('window').width - 40; // Account for padding
    const calculatedHeight = aspectRatio ? screenWidth / aspectRatio : 200;
    
    return (
      <View key={video.id} style={styles.videoItem}>
        <View style={[styles.videoContainer, { height: calculatedHeight }]}>
          <Video
            source={{ uri: video.url }}
            style={styles.videoPlayer}
            useNativeControls
            resizeMode="contain"
            isLooping={false}
            shouldPlay={false}
            onLoad={(status) => handleVideoLoad(video.id, status)}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded && status.isPlaying) {
                handleVideoPlay();
              }
            }}
          />
        </View>
        <Text style={styles.videoTitle}>{video.title}</Text>
      </View>
    );
  };

  // Render video content
  const renderVideoContent = () => {
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
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDate}>{formatEventDate(event.date)}</Text>
      </View>
      
      <Text style={styles.eventSubtext}>{event.subtext}</Text>
      
      <View style={styles.eventDetails}>
        <View style={styles.eventDetailRow}>
          <FontAwesome name="map-marker" size={14} color={palette.quaternary} />
          <Text style={styles.eventVenue}>{event.venue}</Text>
        </View>
        <View style={styles.eventDetailRow}>
          <FontAwesome name="clock-o" size={14} color={palette.quaternary} />
          <Text style={styles.eventShowtime}>{event.showtime}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.ticketButton}
        onPress={() => handleTicketPress(event.ticketLink)}
      >
        <Text style={styles.ticketButtonText}>Get Tickets</Text>
        <FontAwesome name="external-link" size={14} color={palette.text} />
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
          {artistName} has made their music free to stream on RBM Music. They did this to connect 
          directly with their fans and allow you to experience their art in the way that they intended. 
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

  // Get content based on active tab
  const getTabContent = () => {
    switch (activeTab) {
      case 'Music':
        return renderMusicContent();
      case 'Video':
        return renderVideoContent();
      case 'Events':
        return renderEventsContent();
      case 'Support Me':
        return renderSupportContent();
      default:
        return renderMusicContent();
    }
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
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <FontAwesome name="chevron-left" size={20} color={palette.text} />
            </TouchableOpacity>

            {/* Artist Image */}
            <View style={styles.imageContainer}>
              <Image source={{ uri: artist.image }} style={styles.artistImage} />
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
            <View style={styles.tabMenu}>
              {['Music', 'Video', 'Events', 'Support Me'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabButton,
                    activeTab === tab && styles.activeTabButton
                  ]}
                  onPress={() => setActiveTab(tab)}
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
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {getTabContent()}
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
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
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
  },
  
  // Events styles
  eventsContainer: {
    paddingBottom: 20,
    marginBottom: 80,
  },
  eventItem: {
    backgroundColor: palette.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text,
    flex: 1,
    marginRight: 12,
  },
  eventDate: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.tertiary,
  },
  eventSubtext: {
    fontSize: 14,
    color: palette.quaternary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  eventDetails: {
    marginBottom: 16,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventVenue: {
    fontSize: 14,
    color: palette.text,
    marginLeft: 8,
    flex: 1,
  },
  eventShowtime: {
    fontSize: 14,
    color: palette.text,
    marginLeft: 8,
  },
  ticketButton: {
    backgroundColor: palette.tertiary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  ticketButtonText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
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
