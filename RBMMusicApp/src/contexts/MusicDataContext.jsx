import React, { createContext, useContext, useState, useEffect } from 'react';
import StorageService from '../services/StorageService';

const MusicDataContext = createContext();

export const useMusicData = () => {
  const context = useContext(MusicDataContext);
  if (!context) {
    throw new Error('useMusicData must be used within a MusicDataProvider');
  }
  return context;
};

export const MusicDataProvider = ({ children }) => {
  const [likedSongs, setLikedSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [recentPlays, setRecentPlays] = useState([]);
  const [forYouPlaylist, setForYouPlaylist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forYouPlaylistLoading, setForYouPlaylistLoading] = useState(true);

  // Load data on app start
  useEffect(() => {
    loadAllData();
    loadForYouPlaylist();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [likedSongsData, playlistsData, recentPlaysData] = await Promise.all([
        StorageService.getLikedSongs(),
        StorageService.getPlaylists(),
        StorageService.getRecentPlays(),
      ]);
      
      setLikedSongs(likedSongsData);
      setPlaylists(playlistsData);
      setRecentPlays(recentPlaysData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadForYouPlaylist = async () => {
    setForYouPlaylistLoading(true);
    try {
      const response = await fetch('https://pub-a2d61889013a43e69563a1bbccaed58c.r2.dev/jsonMaster/forYouPlaylist.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setForYouPlaylist(data);
      console.log('Successfully loaded forYouPlaylist from remote URL');
    } catch (error) {
      console.error('Error loading forYouPlaylist from remote URL:', error);
      // Fallback to local data if remote fails
      try {
        const localData = require('../json/forYouPlaylist.json');
        setForYouPlaylist(localData);
        console.log('Fallback: loaded forYouPlaylist from local file');
      } catch (localError) {
        console.error('Error loading local forYouPlaylist:', localError);
        setForYouPlaylist([]);
      }
    } finally {
      setForYouPlaylistLoading(false);
    }
  };

  // LIKED SONGS FUNCTIONS
  const toggleLikeSong = async (song) => {
    try {
      const isCurrentlyLiked = likedSongs.some(s => s.id === song.id);
      
      if (isCurrentlyLiked) {
        const success = await StorageService.removeFromLikedSongs(song.id);
        if (success) {
          setLikedSongs(prev => prev.filter(s => s.id !== song.id));
          return false; // Now unliked
        }
      } else {
        const success = await StorageService.addToLikedSongs(song);
        if (success) {
          setLikedSongs(prev => [song, ...prev]);
          return true; // Now liked
        }
      }
      return null; // Error occurred
    } catch (error) {
      console.error('Error toggling like:', error);
      return null;
    }
  };

  const isSongLiked = (songId) => {
    return likedSongs.some(song => song.id === songId);
  };

  // PLAYLIST FUNCTIONS
  const createPlaylist = async (name) => {
    try {
      const newPlaylist = await StorageService.createPlaylist(name);
      if (newPlaylist) {
        setPlaylists(prev => [newPlaylist, ...prev]);
        return newPlaylist;
      }
      return null;
    } catch (error) {
      console.error('Error creating playlist:', error);
      return null;
    }
  };

  const addSongToPlaylist = async (playlistId, song) => {
    try {
      const success = await StorageService.addSongToPlaylist(playlistId, song);
      if (success) {
        // Refresh playlists to get updated data
        const updatedPlaylists = await StorageService.getPlaylists();
        setPlaylists(updatedPlaylists);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      return false;
    }
  };

  const removeSongFromPlaylist = async (playlistId, songId) => {
    try {
      const success = await StorageService.removeSongFromPlaylist(playlistId, songId);
      if (success) {
        // Refresh playlists to get updated data
        const updatedPlaylists = await StorageService.getPlaylists();
        setPlaylists(updatedPlaylists);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing song from playlist:', error);
      return false;
    }
  };

  const deletePlaylist = async (playlistId) => {
    try {
      const success = await StorageService.deletePlaylist(playlistId);
      if (success) {
        setPlaylists(prev => prev.filter(p => p.id !== playlistId));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      return false;
    }
  };

  const getPlaylist = (playlistId) => {
    return playlists.find(playlist => playlist.id === playlistId) || null;
  };

  // RECENT PLAYS FUNCTIONS
  const addToRecentPlays = async (song) => {
    try {
      const success = await StorageService.addToRecentPlays(song);
      if (success) {
        // Update local state - remove existing and add to front
        setRecentPlays(prev => {
          const filtered = prev.filter(s => s.id !== song.id);
          return [{ ...song, playedAt: new Date().toISOString() }, ...filtered].slice(0, 50);
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding to recent plays:', error);
      return false;
    }
  };

  const clearRecentPlays = async () => {
    try {
      const success = await StorageService.clearRecentPlays();
      if (success) {
        setRecentPlays([]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error clearing recent plays:', error);
      return false;
    }
  };

  // UTILITY FUNCTIONS
  const clearAllData = async () => {
    try {
      const success = await StorageService.clearAllData();
      if (success) {
        setLikedSongs([]);
        setPlaylists([]);
        setRecentPlays([]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  };

  const refreshData = async () => {
    await loadAllData();
  };

  const refreshForYouPlaylist = async () => {
    await loadForYouPlaylist();
  };

  const value = {
    // State
    likedSongs,
    playlists,
    recentPlays,
    forYouPlaylist,
    isLoading,
    forYouPlaylistLoading,
    
    // Liked Songs
    toggleLikeSong,
    isSongLiked,
    
    // Playlists
    createPlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    deletePlaylist,
    getPlaylist,
    
    // Recent Plays
    addToRecentPlays,
    clearRecentPlays,
    
    // Utilities
    clearAllData,
    refreshData,
    refreshForYouPlaylist,
  };

  return (
    <MusicDataContext.Provider value={value}>
      {children}
    </MusicDataContext.Provider>
  );
};

export default MusicDataContext; 