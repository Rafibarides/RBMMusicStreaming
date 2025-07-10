import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { palette } from '../utils/Colors';
import { useMusicData } from '../contexts/MusicDataContext';
import artistsData from '../json/artists.json';

// Helper function to get cover art for a song
const getSongCoverArt = (song) => {
  if (!song) return null;
  
  // If song already has coverArt (for backward compatibility), use it
  if (song.coverArt) {
    return song.coverArt;
  }

  // Find the artist
  const artist = artistsData.find(a => a.id === song.artistId);
  if (!artist) {
    console.log(`Artist not found for song: ${song.title}, artistId: ${song.artistId}`);
    return null;
  }

  // For album tracks, get cover art from album
  if (song.type === 'album' && song.albumId && artist.albums) {
    const album = artist.albums.find(a => a.id === song.albumId);
    if (album && album.coverArt) {
      return album.coverArt;
    }
  }

  // For singles, get cover art from single
  if (song.type === 'single' && artist.singles) {
    const single = artist.singles.find(s => s.id === song.id);
    if (single && single.coverArt) {
      return single.coverArt;
    }
  }

  // Fallback: if we can't find specific cover art, try to use any available album art from the artist
  if (artist.albums && artist.albums.length > 0 && artist.albums[0].coverArt) {
    return artist.albums[0].coverArt;
  }

  // Final fallback: use artist image if available
  if (artist.image) {
    return artist.image;
  }

  console.log(`No cover art found for song: ${song.title}`);
  return null;
};

const { width: screenWidth } = Dimensions.get('window');

const Popular = ({ onBack, playSong }) => {
  const { forYouPlaylist, forYouPlaylistLoading } = useMusicData();
  
  // Animation values
  const chartAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const barAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Animation refs
  const bounceAnims = useRef([]);
  const pulseAnims = useRef([]);
  const barHeights = useRef([]);

  useEffect(() => {
    // Start chart bars animation
    const startBarAnimations = () => {
      const animations = barAnimations.map((anim, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: Math.random() * 0.8 + 0.2, // Random height between 0.2 and 1
              duration: 1000 + index * 200,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: Math.random() * 0.8 + 0.2,
              duration: 1000 + index * 200,
              useNativeDriver: false,
            }),
          ])
        )
      );

      Animated.stagger(100, animations).start();
    };

    // Start pulse animation for main chart element
    const startPulseAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    // Start rotation animation for chart
    const startChartAnimation = () => {
      Animated.loop(
        Animated.timing(chartAnimation, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        })
      ).start();
    };

    startBarAnimations();
    startPulseAnimation();
    startChartAnimation();
  }, []);

  // Create rotating interpolation
  const chartRotation = chartAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Render animated chart component
  const renderAnimatedChart = () => (
    <View style={styles.chartContainer}>
      {/* Rotating circular chart background */}
      <Animated.View
        style={[
          styles.chartCircle,
          {
            transform: [{ rotate: chartRotation }],
          },
        ]}
      >
        <View style={styles.chartInner}>
          <FontAwesome name="bar-chart" size={40} color={palette.tertiary} />
        </View>
      </Animated.View>

      {/* Pulsing center element */}
      <Animated.View
        style={[
          styles.chartCenter,
          {
            transform: [{ scale: pulseAnimation }],
          },
        ]}
      >
        <FontAwesome name="music" size={24} color={palette.text} />
      </Animated.View>

      {/* Animated bars around the chart */}
      <View style={styles.barsContainer}>
        {barAnimations.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.chartBar,
              {
                height: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['20%', '80%'],
                }),
                left: `${15 + index * 15}%`,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );

  // Render song item for the playlist
  const renderSongItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.songItem}
      onPress={() => {
        if (playSong) {
          playSong(item, forYouPlaylist, index);
        }
      }}
    >
      <View style={styles.rankContainer}>
        <Text style={styles.rankNumber}>{index + 1}</Text>
      </View>
      <Image source={{ uri: getSongCoverArt(item) }} style={styles.songCover} />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <TouchableOpacity style={styles.playButton}>
        <FontAwesome name="play" size={12} color={palette.text} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render collage artwork for playlist header
  const renderCollageArtwork = () => {
    // Show loading or empty state if data is not ready
    if (forYouPlaylistLoading || forYouPlaylist.length === 0) {
      return (
        <View style={[styles.collageContainer, { width: 60, height: 60 }]}>
          <View style={styles.collageLoadingState}>
            <FontAwesome name="music" size={20} color={palette.quaternary} />
          </View>
        </View>
      );
    }

    const imageSize = 30; // Half of 60 for smaller collage
    
    return (
      <View style={[styles.collageContainer, { width: 60, height: 60 }]}>
        {/* Top row */}
        <View style={styles.collageRow}>
          <Image 
            source={{ uri: getSongCoverArt(forYouPlaylist[0]) }} 
            style={[styles.collageImage, { width: imageSize, height: imageSize }]}
          />
          <Image 
            source={{ uri: getSongCoverArt(forYouPlaylist[1]) }} 
            style={[styles.collageImage, { width: imageSize, height: imageSize }]}
          />
        </View>
        
        {/* Bottom row */}
        <View style={styles.collageRow}>
          <Image 
            source={{ uri: getSongCoverArt(forYouPlaylist[2]) }} 
            style={[styles.collageImage, { width: imageSize, height: imageSize }]}
          />
          <Image 
            source={{ uri: getSongCoverArt(forYouPlaylist[3]) }} 
            style={[styles.collageImage, { width: imageSize, height: imageSize }]}
          />
        </View>
        
        {/* Arbiem Logo in bottom right */}
        <View style={[styles.logoContainer, { width: imageSize * 0.6, height: imageSize * 0.6 }]}>
          <Image 
            source={require('../../assets/rbmLogo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  };

  // Show loading state if forYouPlaylist is still loading
  if (forYouPlaylistLoading) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <FontAwesome name="chevron-left" size={20} color={palette.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Popular</Text>
          </View>
          
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <FontAwesome name="chevron-left" size={20} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Popular</Text>
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          {renderAnimatedChart()}
          
          <View style={styles.chartTextContainer}>
            <Text style={styles.chartTitle}>Music Statistics</Text>
            <Text style={styles.chartSubtext}>
              Keep streaming! Detailed stats and charts will become available soon as we gather more data about listening habits and popular tracks.
            </Text>
          </View>
        </View>

        {/* Picked For You Playlist Section */}
        {forYouPlaylist.length > 0 && (
          <View style={styles.playlistSection}>
            <View style={styles.playlistHeader}>
              {renderCollageArtwork()}
              <View style={styles.playlistHeaderInfo}>
                <Text style={styles.playlistName}>Picked for you</Text>
                <Text style={styles.playlistDescription}>
                  Curated by Rafi Barides for Arbiem
                </Text>
                <Text style={styles.playlistCount}>
                  {forYouPlaylist.length} song{forYouPlaylist.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Songs List */}
            <FlatList
              data={forYouPlaylist}
              renderItem={renderSongItem}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
    marginRight: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: palette.text,
  },
  
  // Chart Section Styles
  chartSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    marginBottom: 30,
  },
  chartContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 30,
  },
  chartCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: palette.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  chartInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(81, 105, 115, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: palette.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 10,
  },
  barsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  chartBar: {
    position: 'absolute',
    width: 8,
    backgroundColor: palette.quaternary,
    borderRadius: 4,
    bottom: '10%',
  },
  chartTextContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  chartTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 12,
  },
  chartSubtext: {
    fontSize: 16,
    color: palette.quaternary,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // Playlist Section Styles
  playlistSection: {
    paddingHorizontal: 20,
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: palette.secondary,
  },
  playlistHeaderInfo: {
    flex: 1,
    marginLeft: 15,
  },
  playlistName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 4,
  },
  playlistDescription: {
    fontSize: 14,
    color: palette.quaternary,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  playlistCount: {
    fontSize: 14,
    color: palette.quaternary,
  },
  
  // Song Item Styles
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
  songCover: {
    width: 45,
    height: 45,
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
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  separator: {
    height: 1,
    backgroundColor: palette.secondary,
    marginLeft: 75,
  },
  
  // Collage Artwork Styles
  collageContainer: {
    position: 'relative',
    backgroundColor: 'transparent',
    borderRadius: 8,
    overflow: 'hidden',
  },
  collageRow: {
    flexDirection: 'row',
  },
  collageImage: {
    borderRadius: 0,
  },
  logoContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'black',
    borderTopLeftRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  logoImage: {
    width: '80%',
    height: '80%',
    tintColor: 'white',
  },
  collageLoadingState: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.text,
  },
});

export default Popular;
