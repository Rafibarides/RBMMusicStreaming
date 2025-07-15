import React, { createContext, useContext, useState, useEffect } from 'react';
import StorageService from '../services/StorageService';
import cacheManager from '../services/CacheManager';

const MusicDataContext = createContext();

export const useMusicData = () => {
  const context = useContext(MusicDataContext);
  if (!context) {
    throw new Error('useMusicData must be used within a MusicDataProvider');
  }
  return context;
};

export const MusicDataProvider = ({ children }) => {
  // State for remote data
  const [forYouPlaylist, setForYouPlaylist] = useState([]);
  const [forYouPlaylistLoading, setForYouPlaylistLoading] = useState(true);
  const [videoIndexFlat, setVideoIndexFlat] = useState([]);
  const [videoIndexFlatLoading, setVideoIndexFlatLoading] = useState(true);
  const [artists, setArtists] = useState([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [songIndexFlat, setSongIndexFlat] = useState([]);
  const [songIndexFlatLoading, setSongIndexFlatLoading] = useState(true);
  const [likedSongs, setLikedSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [recentPlays, setRecentPlays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // CRITICAL: Cache ready state to prevent loading flashes
  const [cacheReady, setCacheReady] = useState(false);

  // Initialize cache manager early and wait for it to be ready
  useEffect(() => {
    const initializeCache = async () => {
      try {
        await cacheManager.initialize();
        setCacheReady(true);
        console.log('🚀 Cache manager ready for instant image loading');
      } catch (error) {
        console.error('❌ Failed to initialize cache manager:', error);
        // Even if cache fails, allow app to continue
        setCacheReady(true);
      }
    };

    initializeCache();
  }, []);

  // Load remote data
  useEffect(() => {
    loadAllData();
    loadForYouPlaylist();
    loadVideoIndexFlat();
    loadArtists();
    loadSongIndexFlat();
  }, []);

  // Background preload artist images for instant loading
  useEffect(() => {
    if (!artistsLoading && artists.length > 0) {
      // Run background preloading after a short delay to not block initial UI
      const preloadTimeout = setTimeout(() => {
        preloadArtistImages();
      }, 2000);

      return () => clearTimeout(preloadTimeout);
    }
  }, [artists, artistsLoading]);

  // Background preload cover art for instant loading  
  useEffect(() => {
    if (!artistsLoading && !songIndexFlatLoading && artists.length > 0 && songIndexFlat.length > 0) {
      // Run background preloading after artist images with lower priority
      const preloadTimeout = setTimeout(() => {
        preloadCoverArt();
      }, 5000);

      return () => clearTimeout(preloadTimeout);
    }
  }, [artists, artistsLoading, songIndexFlat, songIndexFlatLoading]);

  const preloadArtistImages = async () => {
    try {
      // Collect all artist image URLs
      const artistImageUrls = artists
        .map(artist => artist.image)
        .filter(url => url); // Remove any null/undefined URLs

      // Use the new robust caching system
      await cacheManager.preloadImages(artistImageUrls);

    } catch (error) {
      console.error('💥 Error preloading artist images:', error);
    }
  };

  const preloadCoverArt = async () => {
    try {
      // Collect all unique cover art URLs with priority for most used images
      const coverArtUrls = new Set();

      artists.forEach(artist => {
        // Album cover art (higher priority - shown in many places)
        if (artist.albums) {
          artist.albums.forEach(album => {
            if (album.coverArt) {
              coverArtUrls.add(album.coverArt);
            }
          });
        }
        
        // Single cover art (medium priority)
        if (artist.singles) {
          artist.singles.forEach(single => {
            if (single.coverArt) {
              coverArtUrls.add(single.coverArt);
            }
          });
        }
      });

      // Also collect from songIndexFlat for any direct coverArt properties
      songIndexFlat.forEach(song => {
        if (song.coverArt) {
          coverArtUrls.add(song.coverArt);
        }
      });

      const uniqueUrls = Array.from(coverArtUrls);

      // Use the new robust caching system
      await cacheManager.preloadImages(uniqueUrls);

    } catch (error) {
      console.error('💥 Error preloading cover art:', error);
    }
  };

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
      const url = 'https://pub-a2d61889013a43e69563a1bbccaed58c.r2.dev/jsonMaster/forYouPlaylist.json';
      const data = await cacheManager.cacheJson(url);
      setForYouPlaylist(data);
      console.log('✅ Successfully loaded forYouPlaylist from cache/remote');
    } catch (error) {
      console.error('❌ Error loading forYouPlaylist:', error);
      // Fallback to local data if remote fails
      try {
        const localData = require('../json/forYouPlaylist.json');
        setForYouPlaylist(localData);
        console.log('🔄 Fallback: loaded forYouPlaylist from local file');
      } catch (localError) {
        console.error('❌ Error loading local forYouPlaylist:', localError);
        setForYouPlaylist([]);
      }
    } finally {
      setForYouPlaylistLoading(false);
    }
  };

  const loadVideoIndexFlat = async () => {
    setVideoIndexFlatLoading(true);
    try {
      const url = 'https://pub-a2d61889013a43e69563a1bbccaed58c.r2.dev/jsonMaster/videoIndexFlat.json';
      const data = await cacheManager.cacheJson(url);
      setVideoIndexFlat(data);
      console.log('✅ Successfully loaded videoIndexFlat from cache/remote');
    } catch (error) {
      console.error('❌ Error loading videoIndexFlat:', error);
      // Fallback to local data if remote fails
      try {
        const localData = require('../json/videoIndexFlat.json');
        setVideoIndexFlat(localData);
        console.log('🔄 Fallback: loaded videoIndexFlat from local file');
      } catch (localError) {
        console.error('❌ Error loading local videoIndexFlat:', localError);
        setVideoIndexFlat([]);
      }
    } finally {
      setVideoIndexFlatLoading(false);
    }
  };

  const loadArtists = async () => {
    setArtistsLoading(true);
    try {
      const url = 'https://pub-a2d61889013a43e69563a1bbccaed58c.r2.dev/jsonMaster/artists.json';
      const data = await cacheManager.cacheJson(url);
      setArtists(data);
      console.log('✅ Successfully loaded artists from cache/remote');
    } catch (error) {
      console.error('❌ Error loading artists:', error);
      // Fallback to local data if remote fails
      try {
        const localData = require('../json/artists.json');
        setArtists(localData);
        console.log('🔄 Fallback: loaded artists from local file');
      } catch (localError) {
        console.error('❌ Error loading local artists:', localError);
        setArtists([]);
      }
    } finally {
      setArtistsLoading(false);
    }
  };

  const loadSongIndexFlat = async () => {
    setSongIndexFlatLoading(true);
    try {
      const url = 'https://pub-a2d61889013a43e69563a1bbccaed58c.r2.dev/jsonMaster/songIndexFlat.json';
      const data = await cacheManager.cacheJson(url);
      setSongIndexFlat(data);
      console.log('✅ Successfully loaded songIndexFlat from cache/remote');
    } catch (error) {
      console.error('❌ Error loading songIndexFlat:', error);
      // Fallback to local data if remote fails
      try {
        const localData = require('../json/songIndexFlat.json');
        setSongIndexFlat(localData);
        console.log('🔄 Fallback: loaded songIndexFlat from local file');
      } catch (localError) {
        console.error('❌ Error loading local songIndexFlat:', localError);
        setSongIndexFlat([]);
      }
    } finally {
      setSongIndexFlatLoading(false);
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

  const refreshVideoIndexFlat = async () => {
    await loadVideoIndexFlat();
  };

  const refreshArtists = async () => {
    await loadArtists();
  };

  const refreshSongIndexFlat = async () => {
    await loadSongIndexFlat();
  };

  const value = {
    // State
    likedSongs,
    playlists,
    recentPlays,
    forYouPlaylist,
    videoIndexFlat,
    artists,
    songIndexFlat,
    isLoading,
    forYouPlaylistLoading,
    videoIndexFlatLoading,
    artistsLoading,
    songIndexFlatLoading,
    cacheReady, // Add cacheReady to the context value
    
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
    refreshVideoIndexFlat,
    refreshArtists,
    refreshSongIndexFlat,
  };

  return (
    <MusicDataContext.Provider value={value}>
      {children}
    </MusicDataContext.Provider>
  );
};

export default MusicDataContext; 