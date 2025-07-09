import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  ImageBackground,
  FlatList,
  Animated
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { palette } from '../utils/Colors';
import { useMusicData } from '../contexts/MusicDataContext';

const Dashboard = ({ playSong, onNavigateToPlaylists }) => {
  const { likedSongs, recentPlays, isLoading } = useMusicData();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation with slight delay for polish
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
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
          <TouchableOpacity style={styles.quickAccessButton}>
            <Text style={styles.quickAccessText}>New Artists</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAccessButton}>
            <Text style={styles.quickAccessText}>Recently Added</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAccessButton}>
            <Text style={styles.quickAccessText}>Popular</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAccessButton}>
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
});

export default Dashboard;
