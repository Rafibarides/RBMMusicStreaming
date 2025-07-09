import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  ImageBackground,
  FlatList,
  Animated,
  SectionList
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { palette } from '../utils/Colors';
import { useMusicData } from '../contexts/MusicDataContext';
import songIndexFlat from '../json/songIndexFlat.json';
import artists from '../json/artists.json';

const Dashboard = ({ playSong, onNavigateToPlaylists, onNavigateToArtist }) => {
  const { likedSongs, recentPlays, isLoading } = useMusicData();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showCatalog, setShowCatalog] = useState(false);
  const [showRecentlyAdded, setShowRecentlyAdded] = useState(false);
  const [showNewArtists, setShowNewArtists] = useState(false);

  useEffect(() => {
    // Fade in animation with slight delay for polish
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Organize songs alphabetically with letter dividers
  const getAlphabeticalSongs = () => {
    const sortedSongs = [...songIndexFlat].sort((a, b) => 
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );

    const groupedSongs = {};
    sortedSongs.forEach(song => {
      const firstLetter = song.title.charAt(0).toUpperCase();
      if (!groupedSongs[firstLetter]) {
        groupedSongs[firstLetter] = [];
      }
      groupedSongs[firstLetter].push(song);
    });

    return Object.keys(groupedSongs).sort().map(letter => ({
      title: letter,
      data: groupedSongs[letter]
    }));
  };

  // Get recently added songs (top 10 by release date)
  const getRecentlyAddedSongs = () => {
    return [...songIndexFlat]
      .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
      .slice(0, 10);
  };

  // Calculate newest artists based on their first release date
  const getNewestArtists = () => {
    const artistsWithFirstReleaseDate = artists.map(artist => {
      // Find all songs by this artist
      const artistSongs = songIndexFlat.filter(song => song.artistId === artist.id);
      
      if (artistSongs.length === 0) {
        return { ...artist, firstReleaseDate: null };
      }
      
      // Find the earliest release date
      const earliestDate = artistSongs.reduce((earliest, song) => {
        const songDate = new Date(song.releaseDate);
        return songDate < earliest ? songDate : earliest;
      }, new Date(artistSongs[0].releaseDate));
      
      return { ...artist, firstReleaseDate: earliestDate };
    });

    // Filter out artists with no songs and sort by first release date (newest first)
    return artistsWithFirstReleaseDate
      .filter(artist => artist.firstReleaseDate !== null)
      .sort((a, b) => new Date(b.firstReleaseDate) - new Date(a.firstReleaseDate));
  };

  const renderSongItem = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.songItem}
      onPress={() => {
        if (playSong) {
          playSong(item, likedSongs, index);
        }
      }}
    >
      <Image 
        source={{ uri: item.coverArt }} 
        style={styles.songCover}
      />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {item.title || item.name}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderRecentItem = ({ item, index }) => (
    <TouchableOpacity 
      style={styles.recentItem}
      onPress={() => {
        if (playSong) {
          playSong(item, recentPlays, index);
        }
      }}
    >
      <Image 
        source={{ uri: item.coverArt }} 
        style={styles.recentCover}
      />
      <View style={styles.recentInfo}>
        <Text style={styles.recentTitle} numberOfLines={1}>
          {item.title || item.name}
        </Text>
        <Text style={styles.recentArtist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render catalog song item
  const renderCatalogSongItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.catalogSongItem}
      onPress={() => {
        if (playSong) {
          playSong(item, songIndexFlat, songIndexFlat.findIndex(s => s.id === item.id));
        }
      }}
    >
      <Image 
        source={{ uri: item.coverArt }} 
        style={styles.catalogSongCover}
      />
      <View style={styles.catalogSongInfo}>
        <Text style={styles.catalogSongTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.catalogSongArtist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render catalog section header
  const renderCatalogSectionHeader = ({ section }) => (
    <View style={styles.catalogSectionHeader}>
      <Text style={styles.catalogSectionTitle}>{section.title}</Text>
    </View>
  );

  // Render catalog view
  const renderCatalogView = () => (
    <View style={styles.catalogContainer}>
      <View style={styles.catalogHeader}>
        <TouchableOpacity 
          style={styles.catalogBackButton}
          onPress={() => setShowCatalog(false)}
        >
          <FontAwesome name="chevron-left" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.catalogTitle}>Full Catalog</Text>
        <Text style={styles.catalogCount}>({songIndexFlat.length} songs)</Text>
      </View>

      <SectionList
        sections={getAlphabeticalSongs()}
        renderItem={renderCatalogSongItem}
        renderSectionHeader={renderCatalogSectionHeader}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={true}
        style={styles.catalogList}
      />
    </View>
  );

  // Render recently added view
  const renderRecentlyAddedView = () => {
    const recentlyAddedSongs = getRecentlyAddedSongs();
    
    return (
      <View style={styles.catalogContainer}>
        <View style={styles.catalogHeader}>
          <TouchableOpacity 
            style={styles.catalogBackButton}
            onPress={() => setShowRecentlyAdded(false)}
          >
            <FontAwesome name="chevron-left" size={20} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.catalogTitle}>Recently Added</Text>
          <Text style={styles.catalogCount}>({recentlyAddedSongs.length} songs)</Text>
        </View>

        <FlatList
          data={recentlyAddedSongs}
          renderItem={({ item, index }) => (
            <TouchableOpacity 
              style={styles.recentlyAddedSongItem}
              onPress={() => {
                if (playSong) {
                  playSong(item, recentlyAddedSongs, index);
                }
              }}
            >
              <View style={styles.rankContainer}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <Image 
                source={{ uri: item.coverArt }} 
                style={styles.catalogSongCover}
              />
              <View style={styles.catalogSongInfo}>
                <Text style={styles.catalogSongTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.catalogSongArtist} numberOfLines={1}>
                  {item.artist}
                </Text>
                <Text style={styles.releaseDate}>
                  Released {new Date(item.releaseDate).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          style={styles.catalogList}
        />
      </View>
    );
  };

  // Render new artists view
  const renderNewArtistsView = () => {
    const newestArtists = getNewestArtists();
    const spotlightArtist = newestArtists[0];
    const nextArtists = newestArtists.slice(1, 5); // Next 4 artists

    return (
      <ScrollView style={styles.catalogContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.catalogHeader}>
          <TouchableOpacity 
            style={styles.catalogBackButton}
            onPress={() => setShowNewArtists(false)}
          >
            <FontAwesome name="chevron-left" size={20} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.catalogTitle}>New Artists</Text>
          <Text style={styles.catalogCount}>({newestArtists.length} artists)</Text>
        </View>

        {/* Artist Spotlight */}
        {spotlightArtist && (
          <TouchableOpacity 
            style={styles.spotlightContainer}
            onPress={() => {
              if (onNavigateToArtist) {
                onNavigateToArtist(spotlightArtist);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.spotlightLabel}>Artist Spotlight</Text>
            <Image 
              source={{ uri: spotlightArtist.image }} 
              style={styles.spotlightImage}
            />
            <Text style={styles.spotlightName}>{spotlightArtist.name}</Text>
            <Text style={styles.spotlightDate}>
              Joined {new Date(spotlightArtist.firstReleaseDate).toLocaleDateString()}
            </Text>
            {spotlightArtist.bio && (
              <Text style={styles.spotlightBio}>{spotlightArtist.bio}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Next Artists List */}
        {nextArtists.length > 0 && (
          <View style={styles.nextArtistsContainer}>
            <Text style={styles.nextArtistsTitle}>More New Artists</Text>
            {nextArtists.map((artist, index) => (
              <TouchableOpacity 
                key={artist.id} 
                style={styles.nextArtistItem}
                onPress={() => {
                  if (onNavigateToArtist) {
                    onNavigateToArtist(artist);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.nextArtistRank}>
                  <Text style={styles.nextArtistRankNumber}>{index + 2}</Text>
                </View>
                <Image 
                  source={{ uri: artist.image }} 
                  style={styles.nextArtistImage}
                />
                <View style={styles.nextArtistInfo}>
                  <Text style={styles.nextArtistName} numberOfLines={1}>
                    {artist.name}
                  </Text>
                  <Text style={styles.nextArtistDate}>
                    Joined {new Date(artist.firstReleaseDate).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show catalog view if active
  if (showCatalog) {
    return renderCatalogView();
  }

  // Show recently added view if active
  if (showRecentlyAdded) {
    return renderRecentlyAddedView();
  }

  // Show new artists view if active
  if (showNewArtists) {
    return renderNewArtistsView();
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Music</Text>
      </View>

      {/* Liked Songs Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <FontAwesome name="heart" size={20} color={palette.tertiary} />
          <Text style={styles.sectionTitle}>Liked Songs</Text>
          <Text style={styles.songCount}>({likedSongs.length})</Text>
        </View>
        
        {likedSongs.length > 0 ? (
          <>
            <FlatList
              data={likedSongs.slice(0, 2)} // Show only first 2
              renderItem={renderSongItem}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
            {likedSongs.length > 2 && (
              <TouchableOpacity 
                style={styles.showMoreButton}
                onPress={() => onNavigateToPlaylists && onNavigateToPlaylists('liked-songs')}
              >
                <Text style={styles.showMoreText}>
                  Show all {likedSongs.length} songs
                </Text>
                <FontAwesome name="chevron-right" size={14} color={palette.quaternary} />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <FontAwesome name="heart-o" size={48} color={palette.quaternary} />
            <Text style={styles.emptyStateText}>No liked songs yet</Text>
            <Text style={styles.emptyStateSubtext}>Start liking songs to see them here</Text>
          </View>
        )}
      </View>

      {/* Recent Plays Section */}
      {recentPlays.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="clock-o" size={20} color={palette.quaternary} />
            <Text style={styles.sectionTitle}>Recently Played</Text>
          </View>
          
          <FlatList
            data={recentPlays.slice(0, 5)} // Show only first 5
            renderItem={renderRecentItem}
            keyExtractor={(item, index) => `${item.id}_${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentList}
          />
        </View>
      )}

      {/* Quick Access Section */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <View style={styles.sectionHeader}>
          <Image 
            source={require('../../assets/rbmLogo.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.sectionTitle}>Quick Access</Text>
        </View>
        
        <View style={styles.quickAccessGrid}>
          <TouchableOpacity 
            style={styles.quickAccessButton}
            onPress={() => setShowNewArtists(true)}
          >
            <Text style={styles.quickAccessText}>New Artists</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAccessButton}
            onPress={() => setShowRecentlyAdded(true)}
          >
            <Text style={styles.quickAccessText}>Recently Added</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAccessButton}>
            <Text style={styles.quickAccessText}>Popular</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAccessButton}
            onPress={() => setShowCatalog(true)}
          >
            <Text style={styles.quickAccessText}>Catalog</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Bottom spacing */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: palette.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: palette.text,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: palette.text,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: palette.text,
    marginLeft: 10,
  },
  songCount: {
    fontSize: 16,
    color: palette.quaternary,
    marginLeft: 5,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  songCover: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 15,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: palette.text,
    marginBottom: 2,
  },
  songArtist: {
    fontSize: 14,
    color: palette.quaternary,
  },
  recentList: {
    paddingHorizontal: 20,
  },
  recentItem: {
    width: 120,
    marginRight: 15,
  },
  recentCover: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: palette.text,
    marginBottom: 2,
  },
  recentArtist: {
    fontSize: 12,
    color: palette.quaternary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: palette.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: palette.quaternary,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerLogo: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  quickAccessButton: {
    width: '48%',
    backgroundColor: palette.secondary,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAccessText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  showMoreText: {
    color: palette.quaternary,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Catalog styles
  catalogContainer: {
    flex: 1,
    backgroundColor: palette.background,
  },
  catalogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.secondary,
  },
  catalogBackButton: {
    padding: 10,
    marginRight: 10,
  },
  catalogTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
    flex: 1,
  },
  catalogCount: {
    fontSize: 16,
    color: palette.quaternary,
  },
  catalogList: {
    flex: 1,
  },
  catalogSectionHeader: {
    backgroundColor: palette.secondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.background,
  },
  catalogSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text,
  },
  catalogSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  catalogSongCover: {
    width: 45,
    height: 45,
    borderRadius: 6,
    marginRight: 15,
  },
  catalogSongInfo: {
    flex: 1,
  },
  catalogSongTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: palette.text,
    marginBottom: 2,
  },
  catalogSongArtist: {
    fontSize: 14,
    color: palette.quaternary,
  },
  
  // Recently Added styles
  recentlyAddedSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  rankContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 15,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.tertiary,
  },
  releaseDate: {
    fontSize: 12,
    color: palette.quaternary,
    marginTop: 2,
  },
  
  // New Artists styles
  spotlightContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: palette.secondary,
  },
  spotlightLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.tertiary,
    marginBottom: 20,
  },
  spotlightImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  spotlightName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: palette.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  spotlightDate: {
    fontSize: 14,
    color: palette.quaternary,
    marginBottom: 20,
  },
  spotlightBio: {
    fontSize: 16,
    color: palette.text,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  nextArtistsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  nextArtistsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 20,
  },
  nextArtistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  nextArtistRank: {
    width: 30,
    alignItems: 'center',
    marginRight: 15,
  },
  nextArtistRankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.tertiary,
  },
  nextArtistImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  nextArtistInfo: {
    flex: 1,
  },
  nextArtistName: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 4,
  },
  nextArtistDate: {
    fontSize: 14,
    color: palette.quaternary,
  },
});

export default Dashboard;
