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

const Playlists = ({ playSong, initialPlaylistId, onClearInitialPlaylist }) => {
  const { playlists, likedSongs, deletePlaylist, isLoading } = useMusicData();
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

  // Combine liked songs playlist with user playlists
  const allPlaylists = likedSongs.length > 0 ? [likedSongsPlaylist, ...playlists] : playlists;

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

  const handleDeletePlaylist = (playlistId, playlistName, isLikedSongs) => {
    if (isLikedSongs) {
      Alert.alert('Cannot Delete', 'Liked Songs is a system playlist and cannot be deleted.');
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

  const renderPlaylistItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.playlistItem, item.isLikedSongs && styles.likedSongsItem]}
      onPress={() => handlePlaylistPress(item)}
    >
      <View style={styles.playlistCover}>
        {item.coverArt ? (
          <Image source={{ uri: item.coverArt }} style={styles.coverImage} />
        ) : (
          <View style={[styles.defaultCover, item.isLikedSongs && styles.likedSongsDefaultCover]}>
            <FontAwesome 
              name={item.isLikedSongs ? "heart" : "music"} 
              size={24} 
              color={item.isLikedSongs ? palette.tertiary : palette.quaternary} 
            />
          </View>
        )}
      </View>
      
      <View style={styles.playlistInfo}>
        <Text style={[styles.playlistName, item.isLikedSongs && styles.likedSongsName]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.playlistCount}>
          {item.songs.length} song{item.songs.length !== 1 ? 's' : ''}
        </Text>
        {!item.isLikedSongs && (
          <Text style={styles.playlistDate}>
            Created {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        )}
      </View>

      <TouchableOpacity 
        style={styles.moreButton}
        onPress={() => handleDeletePlaylist(item.id, item.name, item.isLikedSongs)}
      >
        <FontAwesome 
          name={item.isLikedSongs ? "heart" : "trash"} 
          size={16} 
          color={item.isLikedSongs ? palette.tertiary : palette.quaternary} 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSongItem = ({ item, index }) => (
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
    </TouchableOpacity>
  );

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
            {selectedPlaylist.coverArt ? (
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
});

export default Playlists;
