import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedGestureHandler, useAnimatedStyle, runOnJS, withSpring } from 'react-native-reanimated';
import { palette } from '../utils/Colors';
import SongListPage from './SongListPage';

const ArtistPage = ({ artist, onBack, searchState, updateSearchState }) => {
  const [activeTab, setActiveTab] = useState('Music');
  
  // Use search state if provided, otherwise fall back to local state
  const currentView = searchState?.songListData ? 'songList' : 'profile';
  const songListData = searchState?.songListData || null;

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
        allSongs.push({
          id: single.id,
          title: single.name,
          name: single.name,
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
            allSongs.push({
              id: song.id,
              title: song.name,
              name: song.name,
              artist: artist.name,
              album: album.name,
              coverArt: album.coverArt,
              audio: song.audio,
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
    const albumSongs = album.songs ? album.songs.map(song => ({
      id: song.id,
      title: song.name,
      name: song.name,
      artist: artist.name,
      album: album.name,
      coverArt: album.coverArt,
      audio: song.audio,
      albumId: song.albumId,
      type: 'album'
    })) : [];
    
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
        // TODO: Handle single play
        console.log('Playing single:', data.name);
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

  // Render video content
  const renderVideoContent = () => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateText}>This artist hasn't uploaded any videos</Text>
    </View>
  );

  // Render events content
  const renderEventsContent = () => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateText}>No upcoming events</Text>
    </View>
  );

  // Get content based on active tab
  const getTabContent = () => {
    switch (activeTab) {
      case 'Music':
        return renderMusicContent();
      case 'Video':
        return renderVideoContent();
      case 'Events':
        return renderEventsContent();
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
                  <TouchableOpacity style={styles.playButton}>
                    <FontAwesome name="play" size={16} color={palette.text} style={styles.playIcon} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Tab Menu */}
            <View style={styles.tabMenu}>
              {['Music', 'Video', 'Events'].map((tab) => (
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
    paddingTop: 80,
    paddingBottom: 20,
  },
  artistImage: {
    width: 250,
    height: 250,
    borderRadius: 8,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 20,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: palette.text,
  },
  tabButtonText: {
    fontSize: 16,
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
    fontSize: 16,
    color: palette.quaternary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: palette.text,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default ArtistPage;
