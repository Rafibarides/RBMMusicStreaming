import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  FlatList,
  Alert 
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { palette } from '../utils/Colors';
import { useMusicData } from '../contexts/MusicDataContext';
import forYouPlaylist from '../json/forYouPlaylist.json';

// Collage Artwork Component
const CollageArtwork = ({ songs, size = 60 }) => {
  // Take first 4 songs for the collage
  const collageImages = songs.slice(0, 4);
  const imageSize = size / 2;
  
  return (
    <View style={[styles.collageContainer, { width: size, height: size }]}>
      {/* Top row */}
      <View style={styles.collageRow}>
        <Image 
          source={{ uri: collageImages[0]?.coverArt }} 
          style={[styles.collageImage, { width: imageSize, height: imageSize }]}
        />
        <Image 
          source={{ uri: collageImages[1]?.coverArt }} 
          style={[styles.collageImage, { width: imageSize, height: imageSize }]}
        />
      </View>
      
      {/* Bottom row */}
      <View style={styles.collageRow}>
        <Image 
          source={{ uri: collageImages[2]?.coverArt }} 
          style={[styles.collageImage, { width: imageSize, height: imageSize }]}
        />
        <Image 
          source={{ uri: collageImages[3]?.coverArt }} 
          style={[styles.collageImage, { width: imageSize, height: imageSize }]}
        />
      </View>
      
      {/* RBM Logo in bottom right */}
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

const Playlists = ({ playSong, initialPlaylistId, onClearInitialPlaylist }) => {
  const { playlists, likedSongs, deletePlaylist, toggleLikeSong, isLoading } = useMusicData();
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  // Create liked songs playlist
  const likedSongsPlaylist = {
    id: 'liked-songs',
    name: 'Liked Songs',
    songs: likedSongs,
    coverArt: likedSongs.length > 0 ? likedSongs[0].coverArt : null,
    createdAt: new Date().toISOString(),
    isLikedSongs: true
  };

  // Create "Picked for you" playlist
  const pickedForYouPlaylist = {
    id: 'picked-for-you',
    name: 'Picked for you',
    songs: forYouPlaylist,
    coverArt: null, // Will use collage
    createdAt: new Date().toISOString(),
    isPickedForYou: true,
    isBuiltIn: true
  };

  // Combine built-in playlists with user playlists
  let allPlaylists = [...playlists];
  
  // Add "Picked for you" first
  allPlaylists.unshift(pickedForYouPlaylist);
  
  // Add liked songs if there are any
  if (likedSongs.length > 0) {
    allPlaylists.unshift(likedSongsPlaylist);
  }

  // Handle initial playlist navigation from Dashboard
  useEffect(() => {
    if (initialPlaylistId && allPlaylists.length > 0) {
      const targetPlaylist = allPlaylists.find(playlist => playlist.id === initialPlaylistId);
      if (targetPlaylist) {
        setSelectedPlaylist(targetPlaylist);
        // Clear the initial playlist ID
        if (onClearInitialPlaylist) {
          onClearInitialPlaylist();
        }
      }
    }
  }, [initialPlaylistId, allPlaylists, onClearInitialPlaylist]);

  // Update selected playlist when likedSongs changes (for real-time updates)
  useEffect(() => {
    if (selectedPlaylist && selectedPlaylist.isLikedSongs) {
      setSelectedPlaylist({
        ...likedSongsPlaylist
      });
    }
  }, [likedSongs]);

  const handlePlaylistPress = (playlist) => {
    if (playlist.songs.length > 0) {
      setSelectedPlaylist(playlist);
    } else {
      Alert.alert('Empty Playlist', 'This playlist is empty. Add some songs to play it.');
    }
  };

  const handlePlayPlaylist = (playlist) => {
    if (playlist.songs.length > 0 && playSong) {
      playSong(playlist.songs[0], playlist.songs, 0);
    }
  };

  const handleDeletePlaylist = (playlistId, playlistName, isLikedSongs, isBuiltIn) => {
    if (isLikedSongs) {
      Alert.alert('Cannot Delete', 'Liked Songs is a system playlist and cannot be deleted.');
      return;
    }
    
    if (isBuiltIn) {
      // Don't show any popup for built-in playlists, just return silently
      return;
    }
    
    Alert.alert(
      'Delete Playlist', 
      `Are you sure you want to delete "${playlistName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deletePlaylist(playlistId)
        }
      ]
    );
  };

  const handleUnlikeSong = async (song) => {
    try {
      const result = await toggleLikeSong(song);
      if (result === false) {
        // Song was successfully unliked, no need to do anything else
        // The context will automatically update the likedSongs state
      } else if (result === null) {
        Alert.alert('Error', 'Failed to remove song from liked songs.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove song from liked songs.');
    }
  };

  const renderPlaylistItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.playlistItem, 
        item.isLikedSongs && styles.likedSongsItem,
        item.isPickedForYou && styles.pickedForYouItem
      ]}
      onPress={() => handlePlaylistPress(item)}
    >
      <View style={styles.playlistCover}>
        {item.isPickedForYou ? (
          <CollageArtwork songs={item.songs} size={60} />
        ) : item.coverArt ? (
          <Image source={{ uri: item.coverArt }} style={styles.coverImage} />
        ) : (
          <View style={[
            styles.defaultCover, 
            item.isLikedSongs && styles.likedSongsDefaultCover
          ]}>
            <FontAwesome 
              name={item.isLikedSongs ? "heart" : "music"} 
              size={24} 
              color={item.isLikedSongs ? palette.tertiary : palette.quaternary} 
            />
          </View>
        )}
      </View>
      
      <View style={styles.playlistInfo}>
        <Text style={[
          styles.playlistName, 
          item.isLikedSongs && styles.likedSongsName,
          item.isPickedForYou && styles.pickedForYouName
        ]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.playlistCount}>
          {item.songs.length} song{item.songs.length !== 1 ? 's' : ''}
        </Text>
        {!item.isLikedSongs && !item.isPickedForYou && (
          <Text style={styles.playlistDate}>
            Created {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        )}
      </View>

      <TouchableOpacity 
        style={styles.moreButton}
        onPress={() => handleDeletePlaylist(item.id, item.name, item.isLikedSongs, item.isBuiltIn)}
      >
        <FontAwesome 
          name={item.isLikedSongs ? "heart" : item.isPickedForYou ? "star" : "trash"} 
          size={16} 
          color={
            item.isLikedSongs ? palette.tertiary : 
            item.isPickedForYou ? palette.tertiary : 
            palette.quaternary
          } 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSongItem = ({ item, index }) => {
    const isLikedSongsPlaylist = selectedPlaylist?.isLikedSongs;
    
    return (
      <TouchableOpacity 
        style={styles.songItem}
        onPress={() => {
          if (playSong && selectedPlaylist) {
            playSong(item, selectedPlaylist.songs, index);
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
        
        {/* Show heart icon for liked songs playlist */}
        {isLikedSongsPlaylist && (
          <TouchableOpacity 
            style={styles.unlikeButton}
            onPress={(e) => {
              e.stopPropagation(); // Prevent song from playing when tapping heart
              handleUnlikeSong(item);
            }}
          >
            <FontAwesome name="heart" size={18} color={palette.tertiary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show playlist detail view
  if (selectedPlaylist) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedPlaylist(null)}
          >
            <FontAwesome name="chevron-left" size={20} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>{selectedPlaylist.name}</Text>
          <TouchableOpacity 
            style={styles.playAllButton}
            onPress={() => handlePlayPlaylist(selectedPlaylist)}
          >
            <FontAwesome name="play" size={16} color={palette.text} />
          </TouchableOpacity>
        </View>

        {/* Playlist Info */}
        <View style={styles.playlistDetail}>
          <View style={styles.detailCover}>
            {selectedPlaylist.isPickedForYou ? (
              <CollageArtwork songs={selectedPlaylist.songs} size={150} />
            ) : selectedPlaylist.coverArt ? (
              <Image source={{ uri: selectedPlaylist.coverArt }} style={styles.detailCoverImage} />
            ) : (
              <View style={styles.detailDefaultCover}>
                <FontAwesome name="music" size={48} color={palette.quaternary} />
              </View>
            )}
          </View>
          <Text style={styles.detailPlaylistName}>{selectedPlaylist.name}</Text>
          <Text style={styles.detailPlaylistCount}>
            {selectedPlaylist.songs.length} song{selectedPlaylist.songs.length !== 1 ? 's' : ''}
          </Text>
          {selectedPlaylist.isPickedForYou && (
            <Text style={styles.detailPlaylistSubtitle}>
              Curated by Rafi Barides for Arbiem
            </Text>
          )}
        </View>

        {/* Songs List */}
        <FlatList
          data={selectedPlaylist.songs}
          renderItem={renderSongItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          style={styles.songsList}
        />
      </View>
    );
  }

  // Show playlists overview
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Playlists</Text>
      </View>

      {allPlaylists.length > 0 ? (
        <FlatList
          data={allPlaylists}
          renderItem={renderPlaylistItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <FontAwesome name="music" size={64} color={palette.quaternary} />
          <Text style={styles.emptyStateText}>No playlists yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Create playlists by adding songs from the player
          </Text>
        </View>
      )}

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
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  playlistCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  coverImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  defaultCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '500',
    color: palette.text,
    marginBottom: 4,
  },
  playlistCount: {
    fontSize: 14,
    color: palette.quaternary,
    marginBottom: 2,
  },
  playlistDate: {
    fontSize: 12,
    color: palette.quaternary,
  },
  moreButton: {
    padding: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '500',
    color: palette.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: palette.quaternary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Detail View Styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  playAllButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistDetail: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  detailCover: {
    width: 150,
    height: 150,
    borderRadius: 12,
    marginBottom: 15,
  },
  detailCoverImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  detailDefaultCover: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailPlaylistName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: palette.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  detailPlaylistCount: {
    fontSize: 16,
    color: palette.quaternary,
    textAlign: 'center',
  },
  detailPlaylistSubtitle: {
    fontSize: 14,
    color: palette.quaternary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  songsList: {
    flex: 1,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  unlikeButton: {
    padding: 10,
    marginLeft: 10,
  },
  likedSongsItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  likedSongsDefaultCover: {
    backgroundColor: 'rgba(81, 105, 115, 0.2)',
  },
  likedSongsName: {
    color: palette.tertiary,
    fontWeight: '600',
  },
  playlistSubtitle: {
    fontSize: 12,
    color: palette.quaternary,
    fontStyle: 'italic',
  },
  pickedForYouItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  pickedForYouName: {
    color: palette.tertiary,
    fontWeight: '600',
  },
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
    borderRadius: 0, // No border radius for individual images
  },
  logoContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'black',
    borderTopLeftRadius: 8, // Only top-left corner rounded to blend with the collage
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  logoImage: {
    width: '80%',
    height: '80%',
    tintColor: 'white',
  },
});

export default Playlists;
