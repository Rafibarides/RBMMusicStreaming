import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  LIKED_SONGS: 'likedSongs',
  PLAYLISTS: 'playlists',
  RECENT_PLAYS: 'recentPlays',
};

class StorageService {
  // LIKED SONGS
  static async getLikedSongs() {
    try {
      const likedSongs = await AsyncStorage.getItem(STORAGE_KEYS.LIKED_SONGS);
      return likedSongs ? JSON.parse(likedSongs) : [];
    } catch (error) {
      console.error('Error getting liked songs:', error);
      return [];
    }
  }

  static async addToLikedSongs(song) {
    try {
      const likedSongs = await this.getLikedSongs();
      const isAlreadyLiked = likedSongs.some(s => s.id === song.id);
      
      if (!isAlreadyLiked) {
        const updatedLikedSongs = [song, ...likedSongs];
        await AsyncStorage.setItem(STORAGE_KEYS.LIKED_SONGS, JSON.stringify(updatedLikedSongs));
        return true; // Added
      }
      return false; // Already liked
    } catch (error) {
      console.error('Error adding to liked songs:', error);
      return false;
    }
  }

  static async removeFromLikedSongs(songId) {
    try {
      const likedSongs = await this.getLikedSongs();
      const updatedLikedSongs = likedSongs.filter(song => song.id !== songId);
      await AsyncStorage.setItem(STORAGE_KEYS.LIKED_SONGS, JSON.stringify(updatedLikedSongs));
      return true;
    } catch (error) {
      console.error('Error removing from liked songs:', error);
      return false;
    }
  }

  static async isSongLiked(songId) {
    try {
      const likedSongs = await this.getLikedSongs();
      return likedSongs.some(song => song.id === songId);
    } catch (error) {
      console.error('Error checking if song is liked:', error);
      return false;
    }
  }

  // PLAYLISTS
  static async getPlaylists() {
    try {
      const playlists = await AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      return playlists ? JSON.parse(playlists) : [];
    } catch (error) {
      console.error('Error getting playlists:', error);
      return [];
    }
  }

  static async savePlaylists(playlists) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
      return true;
    } catch (error) {
      console.error('Error saving playlists:', error);
      return false;
    }
  }

  static async createPlaylist(name) {
    try {
      const playlists = await this.getPlaylists();
      const newPlaylist = {
        id: Date.now().toString(),
        name: name.trim(),
        songs: [],
        createdAt: new Date().toISOString(),
        coverArt: null, // Will be set to first song's cover art when song is added
      };
      
      const updatedPlaylists = [newPlaylist, ...playlists];
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updatedPlaylists));
      return newPlaylist;
    } catch (error) {
      console.error('Error creating playlist:', error);
      return null;
    }
  }

  static async addSongToPlaylist(playlistId, song) {
    try {
      const playlists = await this.getPlaylists();
      const playlistIndex = playlists.findIndex(p => p.id === playlistId);
      
      if (playlistIndex === -1) return false;
      
      const playlist = playlists[playlistIndex];
      const isAlreadyInPlaylist = playlist.songs.some(s => s.id === song.id);
      
      if (!isAlreadyInPlaylist) {
        playlist.songs.push(song);
        
        // Set cover art to first song's cover art if not set
        if (!playlist.coverArt && song.coverArt) {
          playlist.coverArt = song.coverArt;
        }
        
        playlists[playlistIndex] = playlist;
        await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
        return true;
      }
      return false; // Already in playlist
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      return false;
    }
  }

  static async removeSongFromPlaylist(playlistId, songId) {
    try {
      const playlists = await this.getPlaylists();
      const playlistIndex = playlists.findIndex(p => p.id === playlistId);
      
      if (playlistIndex === -1) return false;
      
      const playlist = playlists[playlistIndex];
      playlist.songs = playlist.songs.filter(song => song.id !== songId);
      
      // Update cover art if removed song was the cover
      if (playlist.songs.length > 0 && playlist.coverArt) {
        // Keep current cover art, or set to first song if needed
        if (!playlist.songs.some(song => song.coverArt === playlist.coverArt)) {
          playlist.coverArt = playlist.songs[0].coverArt;
        }
      } else if (playlist.songs.length === 0) {
        playlist.coverArt = null;
      }
      
      playlists[playlistIndex] = playlist;
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
      return true;
    } catch (error) {
      console.error('Error removing song from playlist:', error);
      return false;
    }
  }

  static async deletePlaylist(playlistId) {
    try {
      const playlists = await this.getPlaylists();
      const updatedPlaylists = playlists.filter(playlist => playlist.id !== playlistId);
      await AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(updatedPlaylists));
      return true;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      return false;
    }
  }

  static async getPlaylist(playlistId) {
    try {
      const playlists = await this.getPlaylists();
      return playlists.find(playlist => playlist.id === playlistId) || null;
    } catch (error) {
      console.error('Error getting playlist:', error);
      return null;
    }
  }

  // RECENT PLAYS
  static async getRecentPlays() {
    try {
      const recentPlays = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_PLAYS);
      return recentPlays ? JSON.parse(recentPlays) : [];
    } catch (error) {
      console.error('Error getting recent plays:', error);
      return [];
    }
  }

  static async addToRecentPlays(song) {
    try {
      const recentPlays = await this.getRecentPlays();
      
      // Remove the song if it already exists to avoid duplicates
      const filteredRecentPlays = recentPlays.filter(s => s.id !== song.id);
      
      // Add the song to the beginning and limit to 50 recent songs
      const updatedRecentPlays = [
        { ...song, playedAt: new Date().toISOString() },
        ...filteredRecentPlays
      ].slice(0, 50);
      
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_PLAYS, JSON.stringify(updatedRecentPlays));
      return true;
    } catch (error) {
      console.error('Error adding to recent plays:', error);
      return false;
    }
  }

  static async clearRecentPlays() {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.RECENT_PLAYS, JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('Error clearing recent plays:', error);
      return false;
    }
  }

  // UTILITY METHODS
  static async clearAllData() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.LIKED_SONGS,
        STORAGE_KEYS.PLAYLISTS,
        STORAGE_KEYS.RECENT_PLAYS,
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  }

  static async exportData() {
    try {
      const [likedSongs, playlists, recentPlays] = await Promise.all([
        this.getLikedSongs(),
        this.getPlaylists(),
        this.getRecentPlays(),
      ]);
      
      return {
        likedSongs,
        playlists,
        recentPlays,
        exportedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }
}

export default StorageService; 