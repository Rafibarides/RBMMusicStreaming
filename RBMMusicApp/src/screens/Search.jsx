import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  FlatList,
  Linking,
  Modal,
  Dimensions 
} from 'react-native';
import { Video } from 'expo-av';
import { FontAwesome } from '@expo/vector-icons';
import { palette } from '../utils/Colors';

// Import JSON data
import artistsData from '../json/artists.json';
import songsData from '../json/songIndexFlat.json';
import eventsData from '../json/eventIndexFlat.json';
import videosData from '../json/videoIndexFlat.json';
import forYouPlaylist from '../json/forYouPlaylist.json';

// Import pages
import ArtistPage from '../pages/ArtistPage';
import Genres from '../pages/Genres';

const Search = ({ searchState, updateSearchState, resetSearchNavigation, playSong, onStopAudio }) => {
  const {
    searchQuery,
    searchResults,
    showResults,
    currentPage,
    selectedArtist,
    songListData
  } = searchState;

  // Helper function to get cover art for a song
  const getSongCoverArt = (song) => {
    // Find the artist
    const artist = artistsData.find(a => a.id === song.artistId);
    if (!artist) return null;

    // For album tracks, get cover art from album
    if (song.type === 'album' && song.albumId && artist.albums) {
      const album = artist.albums.find(a => a.id === song.albumId);
      if (album) {
        return album.coverArt;
      }
    }

    // For singles, get cover art from single
    if (song.type === 'single' && artist.singles) {
      const single = artist.singles.find(s => s.id === song.id);
      if (single) {
        return single.coverArt;
      }
    }

    return null;
  };

  // Local state for events page
  const [eventsSearchQuery, setEventsSearchQuery] = useState('');
  const [filteredEvents, setFilteredEvents] = useState(eventsData);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dateFilter, setDateFilter] = useState('all'); // all, upcoming, past

  // Local state for videos page
  const [videosSearchQuery, setVideosSearchQuery] = useState('');
  const [filteredVideos, setFilteredVideos] = useState(videosData);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState(16/9);

  // Local state for new music (recently added) page
  const [showNewMusic, setShowNewMusic] = useState(false);

  // Local state for genres page
  const [showGenres, setShowGenres] = useState(false);

  // Search categories grid
  const searchCategories = [
    { id: 1, title: 'New Music', color: palette.secondary },
    { id: 2, title: 'Live Events', color: palette.tertiary },
    { id: 3, title: 'Music Videos', color: palette.quaternary },
    { id: 4, title: 'Genres', color: palette.secondary },
  ];

  // Search function
  const performSearch = (query) => {
    if (query.length === 0) {
      updateSearchState({
        searchResults: [],
        showResults: false
      });
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = [];

    // Search artists
    artistsData.forEach(artist => {
      if (artist.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `artist_${artist.id}`,
          type: 'artist',
          name: artist.name,
          image: artist.image,
          data: artist
        });
      }
    });

    // Search songs
    songsData.forEach(song => {
      if (song.title.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: `song_${song.id}`,
          type: 'song',
          name: song.title,
          artist: song.artist,
          image: getSongCoverArt(song),
          data: song
        });
      }
    });



    updateSearchState({
      searchResults: results,
      showResults: true
    });
  };

    // Handle search input
  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery]);

  // Search and filter events
  const searchEvents = (query, filter) => {
    let events = [...eventsData];

    // Filter by date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'upcoming') {
      events = events.filter(event => new Date(event.date) >= today);
    } else if (filter === 'past') {
      events = events.filter(event => new Date(event.date) < today);
    }

    // Filter by search query
    if (query.length > 0) {
      const lowerQuery = query.toLowerCase();
      events = events.filter(event => {
        // Get artist name
        const artist = artistsData.find(a => a.id === event.artistId);
        const artistName = artist ? artist.name.toLowerCase() : '';
        
        return (
          event.title.toLowerCase().includes(lowerQuery) ||
          event.venue.toLowerCase().includes(lowerQuery) ||
          artistName.includes(lowerQuery)
        );
      });
    }

    // Sort by date (upcoming first)
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    setFilteredEvents(events);
  };

  // Handle events search and filter changes
  useEffect(() => {
    searchEvents(eventsSearchQuery, dateFilter);
  }, [eventsSearchQuery, dateFilter]);

  // Search videos
  const searchVideos = (query) => {
    let videos = [...videosData];

    // Filter by search query
    if (query.length > 0) {
      const lowerQuery = query.toLowerCase();
      videos = videos.filter(video => 
        video.title.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort by release date (newest first)
    videos.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

    setFilteredVideos(videos);
  };

  // Handle video search changes
  useEffect(() => {
    searchVideos(videosSearchQuery);
  }, [videosSearchQuery]);

  // Handle navigation to artist page
  const navigateToArtist = (artist) => {
    updateSearchState({
      selectedArtist: artist,
      currentPage: 'artist'
    });
  };

  // Handle back navigation
  const navigateBack = () => {
    updateSearchState({
      currentPage: 'search',
      selectedArtist: null,
      songListData: null
    });
  };

  // Handle navigation to events page
  const navigateToEvents = () => {
    updateSearchState({
      currentPage: 'events'
    });
  };

  // Handle navigation back from events
  const navigateBackFromEvents = () => {
    updateSearchState({
      currentPage: 'search'
    });
    setSelectedEvent(null);
  };

  // Handle navigation to videos page
  const navigateToVideos = () => {
    updateSearchState({
      currentPage: 'videos'
    });
  };

  // Handle navigation back from videos
  const navigateBackFromVideos = () => {
    updateSearchState({
      currentPage: 'search'
    });
  };

  // Handle navigation to new music (recently added)
  const navigateToNewMusic = () => {
    setShowNewMusic(true);
  };

  // Handle navigation back from new music
  const navigateBackFromNewMusic = () => {
    setShowNewMusic(false);
  };

  // Get recently added songs (top 10 by release date) - same as Dashboard
  const getRecentlyAddedSongs = () => {
    return [...songsData]
      .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))
      .slice(0, 10);
  };

  // Handle navigation to genres
  const navigateToGenres = () => {
    setShowGenres(true);
  };

  // Handle navigation back from genres
  const navigateBackFromGenres = () => {
    setShowGenres(false);
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

  // Handle video play
  const handleVideoPlay = (video) => {
    // Stop any current audio first
    if (onStopAudio) {
      onStopAudio();
    }
    // Navigate to video player page
    setSelectedVideo(video);
    updateSearchState({
      currentPage: 'videoPlayer'
    });
  };

  // Handle video load to get aspect ratio
  const handleVideoLoad = (status) => {
    if (status.naturalSize) {
      const { width, height } = status.naturalSize;
      setVideoAspectRatio(width / height);
    }
  };

  // Close video player
  const closeVideoPlayer = () => {
    setSelectedVideo(null);
    updateSearchState({
      currentPage: 'videos'
    });
  };

  // Render search result item
  const renderSearchItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => {
        if (item.type === 'artist') {
          navigateToArtist(item.data);
        } else {
          // Play the song
          if (playSong) {
            playSong(item.data, [item.data], 0);
          }
        }
      }}
    >
      <Image 
        source={{ uri: item.image }} 
        style={[
          styles.resultImage,
          item.type === 'artist' ? styles.circularImage : styles.squareImage
        ]}
      />
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultTitle}>{item.name}</Text>
        {item.type === 'song' && (
          <View style={styles.subtitleContainer}>
            <Text style={styles.resultSubtitle}>{item.artist}</Text>
            {item.data.album && (
              <>
                <Text style={styles.resultSubtitle}> • </Text>
                <Text style={[styles.resultSubtitle, styles.albumName]}>{item.data.album}</Text>
              </>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render category button
  const renderCategoryButton = ({ item }) => (
    <TouchableOpacity 
      style={[styles.categoryButton, { backgroundColor: item.color }]}
      onPress={() => {
        if (item.title === 'Live Events') {
          navigateToEvents();
        } else if (item.title === 'Music Videos') {
          navigateToVideos();
        } else if (item.title === 'New Music') {
          navigateToNewMusic();
        } else if (item.title === 'Genres') {
          navigateToGenres();
        } else {
          // TODO: Navigate to other category pages
          console.log(`Pressed ${item.title}`);
        }
      }}
    >
      <Text style={styles.categoryButtonText}>{item.title}</Text>
    </TouchableOpacity>
  );

  // Render event item
  const renderEventItem = ({ item }) => {
    const artist = artistsData.find(a => a.id === item.artistId);
    
    return (
      <TouchableOpacity 
        style={styles.eventItem}
        onPress={() => setSelectedEvent(item)}
      >
        <Image 
          source={{ uri: artist?.image }} 
          style={styles.eventArtistImage}
        />
        <View style={styles.eventInfo}>
          <Text style={styles.eventVenue} numberOfLines={1}>
            {item.venue}
          </Text>
          <Text style={styles.eventArtist} numberOfLines={1}>
            {artist?.name}
          </Text>
          <Text style={styles.eventDate}>
            {formatEventDate(item.date)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render event details modal/page
  const renderEventDetails = () => {
    if (!selectedEvent) return null;
    
    const artist = artistsData.find(a => a.id === selectedEvent.artistId);
    
    return (
      <View style={styles.eventDetailsContainer}>
        <View style={styles.eventDetailsHeader}>
          <TouchableOpacity 
            style={styles.eventBackButton}
            onPress={() => setSelectedEvent(null)}
          >
            <FontAwesome name="chevron-left" size={20} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.eventDetailsTitle}>Event Details</Text>
        </View>

        <ScrollView style={styles.eventDetailsScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.eventDetailsContent}>
            <Image 
              source={{ uri: artist?.image }} 
              style={styles.eventDetailsArtistImage}
            />
            
            <Text style={styles.eventDetailsEventTitle}>{selectedEvent.title}</Text>
            <Text style={styles.eventDetailsSubtext}>{selectedEvent.subtext}</Text>
            
            <View style={styles.eventDetailsInfo}>
              <View style={styles.eventDetailRow}>
                <FontAwesome name="user" size={16} color={palette.quaternary} />
                <Text style={styles.eventDetailText}>{artist?.name}</Text>
              </View>
              
              <View style={styles.eventDetailRow}>
                <FontAwesome name="map-marker" size={16} color={palette.quaternary} />
                <Text style={styles.eventDetailText}>{selectedEvent.venue}</Text>
              </View>
              
              <View style={styles.eventDetailRow}>
                <FontAwesome name="calendar" size={16} color={palette.quaternary} />
                <Text style={styles.eventDetailText}>{formatEventDate(selectedEvent.date)}</Text>
              </View>
              
              <View style={styles.eventDetailRow}>
                <FontAwesome name="clock-o" size={16} color={palette.quaternary} />
                <Text style={styles.eventDetailText}>{selectedEvent.showtime}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.ticketButton}
              onPress={() => {
                Linking.openURL(selectedEvent.ticketLink).catch(err => 
                  console.error('Error opening ticket link:', err)
                );
              }}
            >
              <Text style={styles.ticketButtonText}>Get Tickets</Text>
              <FontAwesome name="external-link" size={14} color={palette.text} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // Get recommended videos (exclude current video)
  const getRecommendedVideos = (currentVideoId) => {
    return videosData
      .filter(video => video.id !== currentVideoId)
      .sort(() => Math.random() - 0.5) // Randomize
      .slice(0, 6); // Show 6 recommendations
  };

  // Handle recommended video click
  const handleRecommendedVideoClick = (video) => {
    setSelectedVideo(video);
    // Scroll to top to show the new video
  };

  // Render recommended video item
  const renderRecommendedVideo = ({ item }) => {
    const artist = artistsData.find(a => a.id === item.artistId);
    
    return (
      <TouchableOpacity 
        style={styles.recommendedVideoItem}
        onPress={() => handleRecommendedVideoClick(item)}
      >
        <Image 
          source={{ uri: item.thumbnail }} 
          style={styles.recommendedVideoThumbnail}
        />
        <View style={styles.recommendedVideoInfo}>
          <Text style={styles.recommendedVideoTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.recommendedVideoArtist} numberOfLines={1}>
            {artist?.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render video player page
  const renderVideoPlayer = () => {
    if (!selectedVideo) return null;
    
    const artist = artistsData.find(a => a.id === selectedVideo.artistId);
    const screenWidth = Dimensions.get('window').width;
    const videoHeight = screenWidth / videoAspectRatio;
    const recommendedVideos = getRecommendedVideos(selectedVideo.id);
    
    return (
      <View style={styles.videoPlayerContainer}>
        {/* Header */}
        <View style={styles.videoPlayerHeader}>
          <TouchableOpacity 
            style={styles.videoPlayerBackButton}
            onPress={closeVideoPlayer}
          >
            <FontAwesome name="chevron-left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.videoPlayerHeaderTitle}>Now Playing</Text>
        </View>

        <ScrollView style={styles.videoPlayerScroll} showsVerticalScrollIndicator={false}>
          {/* Video Player - Full width, no border radius */}
          <View style={[styles.videoPlayerWrapper, { height: videoHeight }]}>
            <Video
              source={{ uri: selectedVideo.url }}
              style={styles.videoPlayerVideo}
              useNativeControls
              resizeMode="contain"
              shouldPlay={true}
              isLooping={false}
              onLoad={handleVideoLoad}
            />
          </View>

          {/* Video Info */}
          <View style={styles.videoPlayerInfo}>
            <Text style={styles.videoPlayerTitle}>
              {selectedVideo.title}
            </Text>
            <Text style={styles.videoPlayerArtist}>
              {artist?.name}
            </Text>
          </View>

          {/* Recommended Videos */}
          <View style={styles.recommendedSection}>
            <Text style={styles.recommendedSectionTitle}>Recommended</Text>
            <FlatList
              data={recommendedVideos}
              renderItem={renderRecommendedVideo}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.recommendedSeparator} />}
            />
          </View>
        </ScrollView>
      </View>
    );
  };

  // Render video search result item
  const renderVideoSearchItem = ({ item }) => {
    const artist = artistsData.find(a => a.id === item.artistId);
    
    return (
      <TouchableOpacity 
        style={styles.videoSearchItem}
        onPress={() => handleVideoPlay(item)}
      >
        <Image 
          source={{ uri: item.thumbnail }} 
          style={styles.videoSearchThumbnail}
        />
        <View style={styles.videoSearchInfo}>
          <Text style={styles.videoSearchTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.videoSearchArtist} numberOfLines={1}>
            {artist?.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render horizontal scrolling video thumbnail
  const renderVideoThumbnail = ({ item }) => {
    const artist = artistsData.find(a => a.id === item.artistId);
    
    return (
      <TouchableOpacity 
        style={styles.videoThumbnailItem}
        onPress={() => handleVideoPlay(item)}
      >
        <Image 
          source={{ uri: item.thumbnail }} 
          style={styles.videoThumbnailImage}
        />
        <View style={styles.videoThumbnailOverlay}>
          <FontAwesome name="play" size={24} color="white" />
        </View>
      </TouchableOpacity>
    );
  };

  // Get latest videos for scrolling section
  const getLatestVideos = () => {
    return [...videosData].sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
  };

  // Render videos page
  const renderVideosPage = () => (
    <View style={styles.container}>
      <View style={styles.videosHeader}>
        <TouchableOpacity 
          style={styles.videosBackButton}
          onPress={navigateBackFromVideos}
        >
          <FontAwesome name="chevron-left" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.videosTitle}>Music Videos</Text>
      </View>

      {/* Horizontal scrolling videos section */}
      <View style={styles.latestVideosSection}>
        <FlatList
          data={getLatestVideos()}
          renderItem={renderVideoThumbnail}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.videosThumbnailList}
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <FontAwesome 
          name="search" 
          size={16} 
          color={palette.quaternary} 
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search videos by title..."
          placeholderTextColor={palette.quaternary}
          value={videosSearchQuery}
          onChangeText={setVideosSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Videos Search Results */}
      <FlatList
        data={filteredVideos}
        renderItem={renderVideoSearchItem}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.videosListContainer}
        ItemSeparatorComponent={() => <View style={styles.videosSeparator} />}
        ListEmptyComponent={() => (
          <View style={styles.noVideosContainer}>
            <FontAwesome name="video-camera" size={48} color={palette.quaternary} />
            <Text style={styles.noVideosText}>No videos found</Text>
            <Text style={styles.noVideosSubtext}>
              Try adjusting your search terms
            </Text>
          </View>
        )}
       />
     </View>
   );

  // Render new music (recently added) page
  const renderNewMusicPage = () => {
    const recentlyAddedSongs = getRecentlyAddedSongs();
    
    return (
      <View style={styles.container}>
        <View style={styles.newMusicHeader}>
          <TouchableOpacity 
            style={styles.newMusicBackButton}
            onPress={navigateBackFromNewMusic}
          >
            <FontAwesome name="chevron-left" size={20} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.newMusicTitle}>New Music</Text>
          <Text style={styles.newMusicCount}>({recentlyAddedSongs.length} songs)</Text>
        </View>

        <FlatList
          data={recentlyAddedSongs}
          renderItem={({ item, index }) => (
            <TouchableOpacity 
              style={styles.newMusicSongItem}
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
                source={{ uri: getSongCoverArt(item) }} 
                style={styles.newMusicSongCover}
              />
              <View style={styles.newMusicSongInfo}>
                <Text style={styles.newMusicSongTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.newMusicSongArtist} numberOfLines={1}>
                  {item.artist}
                </Text>
                <Text style={styles.newMusicReleaseDate}>
                  Released {new Date(item.releaseDate).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.newMusicListContainer}
          ItemSeparatorComponent={() => <View style={styles.newMusicSeparator} />}
        />
      </View>
    );
  };

  // Render events page
  const renderEventsPage = () => (
    <View style={styles.container}>
      <View style={styles.eventsHeader}>
        <TouchableOpacity 
          style={styles.eventsBackButton}
          onPress={navigateBackFromEvents}
        >
          <FontAwesome name="chevron-left" size={20} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.eventsTitle}>Live Events</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <FontAwesome 
          name="search" 
          size={16} 
          color={palette.quaternary} 
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events, artists, or venues..."
          placeholderTextColor={palette.quaternary}
          value={eventsSearchQuery}
          onChangeText={setEventsSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Date Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'upcoming', 'past'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                dateFilter === filter && styles.activeFilterButton
              ]}
              onPress={() => setDateFilter(filter)}
            >
              <Text style={[
                styles.filterButtonText,
                dateFilter === filter && styles.activeFilterButtonText
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.eventsListContainer}
        ItemSeparatorComponent={() => <View style={styles.eventsSeparator} />}
        ListEmptyComponent={() => (
          <View style={styles.noEventsContainer}>
            <FontAwesome name="calendar" size={48} color={palette.quaternary} />
            <Text style={styles.noEventsText}>No events found</Text>
            <Text style={styles.noEventsSubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        )}
      />

      {/* Event Details Modal */}
      {selectedEvent && renderEventDetails()}
    </View>
  );

  // Render main search page
  const renderSearchPage = () => (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.searchTitle}>Search</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <FontAwesome 
            name="search" 
            size={16} 
            color={palette.quaternary} 
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="What do you want to listen to?"
            placeholderTextColor={palette.quaternary}
            value={searchQuery}
            onChangeText={(text) => updateSearchState({ searchQuery: text })}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList
              data={searchResults}
              renderItem={renderSearchItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              keyboardShouldPersistTaps="always"
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}

        {/* No Results */}
        {showResults && searchResults.length === 0 && searchQuery.length > 0 && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
          </View>
        )}

        {/* Categories Grid and Recommended Songs (show when not searching) */}
        {!showResults && (
          <>
            {/* Categories Grid */}
            <View style={styles.categoriesContainer}>
              <FlatList
                data={searchCategories}
                renderItem={renderCategoryButton}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                scrollEnabled={false}
                keyboardShouldPersistTaps="always"
                columnWrapperStyle={styles.categoryRow}
              />
            </View>

            {/* Recommended Songs */}
            <View style={styles.recommendedContainer}>
              <Text style={styles.recommendedTitle}>Recommended for You</Text>
              <FlatList
                data={forYouPlaylist}
                renderItem={({ item, index }) => (
                  <TouchableOpacity 
                    style={styles.recommendedSongItem}
                    onPress={() => {
                      if (playSong) {
                        playSong(item, forYouPlaylist, index);
                      }
                    }}
                  >
                    <Image 
                      source={{ uri: getSongCoverArt(item) }} 
                      style={styles.recommendedSongCover}
                    />
                    <View style={styles.recommendedSongInfo}>
                      <Text style={styles.recommendedSongTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.recommendedSongArtist} numberOfLines={1}>
                        {item.artist}
                      </Text>
                      {item.album && (
                        <Text style={styles.recommendedSongAlbum} numberOfLines={1}>
                          {item.album}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                keyboardShouldPersistTaps="always"
                ItemSeparatorComponent={() => <View style={styles.recommendedSeparator} />}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );

  // Main render function
  if (currentPage === 'artist' && selectedArtist) {
    return (
      <ArtistPage 
        artist={selectedArtist} 
        onBack={navigateBack}
        searchState={searchState}
        updateSearchState={updateSearchState}
        playSong={playSong}
        onStopAudio={onStopAudio}
      />
    );
  }

  if (currentPage === 'events') {
    return renderEventsPage();
  }

  if (currentPage === 'videos') {
    return renderVideosPage();
  }

  if (currentPage === 'videoPlayer') {
    return renderVideoPlayer();
  }

  // Show new music page if active
  if (showNewMusic) {
    return renderNewMusicPage();
  }

  // Show genres page if active
  if (showGenres) {
    return (
      <Genres 
        onBack={navigateBackFromGenres}
        playSong={playSong}
      />
    );
  }

  return renderSearchPage();
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'flex-start',
  },
  searchTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.secondary,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: palette.text,
    fontSize: 16,
  },
  resultsContainer: {
    paddingHorizontal: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  resultImage: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  circularImage: {
    borderRadius: 25,
  },
  squareImage: {
    borderRadius: 4,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: palette.text,
  },
  subtitleContainer: {
    flexDirection: 'row',
    marginTop: 2,
  },
  resultSubtitle: {
    fontSize: 14,
    color: palette.text,
    opacity: 0.7,
  },
  albumName: {
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: palette.secondary,
    marginLeft: 65,
  },
  noResultsContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: palette.quaternary,
    textAlign: 'center',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    flex: 1,
    height: 80,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    marginHorizontal: 5,
  },
  categoryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
  },
  categoryRow: {
    justifyContent: 'space-between',
  },
  
  // Recommended for You section styles
  recommendedContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  recommendedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 15,
  },
  recommendedSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recommendedSongCover: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 15,
  },
  recommendedSongInfo: {
    flex: 1,
  },
  recommendedSongTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: palette.text,
    marginBottom: 2,
  },
  recommendedSongArtist: {
    fontSize: 14,
    color: palette.quaternary,
    marginBottom: 2,
  },
  recommendedSongAlbum: {
    fontSize: 12,
    color: palette.quaternary,
  },
  recommendedSeparator: {
    height: 1,
    backgroundColor: palette.secondary,
    marginLeft: 65,
  },
  
  // Events page styles
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  eventsBackButton: {
    padding: 10,
    marginRight: 10,
  },
  eventsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: palette.secondary,
  },
  activeFilterButton: {
    backgroundColor: palette.tertiary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: palette.quaternary,
  },
  activeFilterButtonText: {
    color: palette.text,
  },
  eventsListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  eventArtistImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  eventInfo: {
    flex: 1,
  },
  eventVenue: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 4,
  },
  eventArtist: {
    fontSize: 14,
    color: palette.quaternary,
    marginBottom: 2,
  },
  eventDate: {
    fontSize: 12,
    color: palette.quaternary,
  },
  eventsSeparator: {
    height: 1,
    backgroundColor: palette.secondary,
    marginLeft: 75,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noEventsText: {
    fontSize: 18,
    fontWeight: '500',
    color: palette.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: palette.quaternary,
    textAlign: 'center',
  },
  
  // Event details styles
  eventDetailsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.background,
    zIndex: 1000,
  },
  eventDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.secondary,
  },
  eventBackButton: {
    padding: 10,
    marginRight: 10,
  },
  eventDetailsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: palette.text,
  },
  eventDetailsScroll: {
    flex: 1,
  },
  eventDetailsContent: {
    padding: 20,
    alignItems: 'center',
  },
  eventDetailsArtistImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  eventDetailsEventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  eventDetailsSubtext: {
    fontSize: 16,
    color: palette.quaternary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 30,
  },
  eventDetailsInfo: {
    width: '100%',
    marginBottom: 30,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  eventDetailText: {
    fontSize: 16,
    color: palette.text,
    marginLeft: 12,
    flex: 1,
  },
  ticketButton: {
    backgroundColor: palette.tertiary,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  
  // Videos page styles
  videosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  videosBackButton: {
    padding: 10,
    marginRight: 10,
  },
  videosTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
  },
  latestVideosSection: {
    marginBottom: 20,
  },
  videosThumbnailList: {
    paddingHorizontal: 20,
  },
  videoThumbnailItem: {
    width: 160,
    height: 90,
    marginRight: 15,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  videoThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoThumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videosListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  videoSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  videoSearchThumbnail: {
    width: 120,
    height: 68,
    borderRadius: 8,
    marginRight: 15,
  },
  videoSearchInfo: {
    flex: 1,
  },
  videoSearchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  videoSearchArtist: {
    fontSize: 14,
    color: palette.quaternary,
  },
  videosSeparator: {
    height: 1,
    backgroundColor: palette.secondary,
    marginLeft: 135,
  },
  noVideosContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noVideosText: {
    fontSize: 18,
    fontWeight: '500',
    color: palette.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noVideosSubtext: {
    fontSize: 14,
    color: palette.quaternary,
    textAlign: 'center',
  },
  
  // Video Player Page styles
  videoPlayerContainer: {
    flex: 1,
    backgroundColor: palette.background,
  },
  videoPlayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: palette.secondary,
  },
  videoPlayerBackButton: {
    padding: 10,
    marginRight: 15,
  },
  videoPlayerHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.text,
  },
  videoPlayerScroll: {
    flex: 1,
  },
  videoPlayerWrapper: {
    width: '100%',
    backgroundColor: 'black',
  },
  videoPlayerVideo: {
    width: '100%',
    height: '100%',
  },
  videoPlayerInfo: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: palette.secondary,
  },
  videoPlayerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 6,
    lineHeight: 24,
  },
  videoPlayerArtist: {
    fontSize: 14,
    color: palette.quaternary,
  },
  recommendedSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  recommendedSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 15,
  },
  recommendedVideoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recommendedVideoThumbnail: {
    width: 120,
    height: 68,
    borderRadius: 6,
    marginRight: 15,
  },
  recommendedVideoInfo: {
    flex: 1,
  },
  recommendedVideoTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: palette.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  recommendedVideoArtist: {
    fontSize: 13,
    color: palette.quaternary,
  },
  recommendedSeparator: {
    height: 1,
    backgroundColor: palette.secondary,
    marginLeft: 135,
  },
  
  // New Music (Recently Added) page styles
  newMusicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  newMusicBackButton: {
    padding: 10,
    marginRight: 10,
  },
  newMusicTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
    flex: 1,
  },
  newMusicCount: {
    fontSize: 16,
    color: palette.quaternary,
  },
  newMusicListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  newMusicSongItem: {
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
  newMusicSongCover: {
    width: 45,
    height: 45,
    borderRadius: 6,
    marginRight: 15,
  },
  newMusicSongInfo: {
    flex: 1,
  },
  newMusicSongTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: palette.text,
    marginBottom: 2,
  },
  newMusicSongArtist: {
    fontSize: 14,
    color: palette.quaternary,
    marginBottom: 2,
  },
  newMusicReleaseDate: {
    fontSize: 12,
    color: palette.quaternary,
  },
  newMusicSeparator: {
    height: 1,
    backgroundColor: palette.secondary,
    marginLeft: 75,
  },

  // Recommended for You section styles
  recommendedContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  recommendedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 15,
  },
  recommendedSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recommendedSongCover: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 15,
  },
  recommendedSongInfo: {
    flex: 1,
  },
  recommendedSongTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: palette.text,
    marginBottom: 2,
  },
  recommendedSongArtist: {
    fontSize: 14,
    color: palette.quaternary,
    marginBottom: 2,
  },
  recommendedSongAlbum: {
    fontSize: 12,
    color: palette.quaternary,
  },
  recommendedSeparator: {
    height: 1,
    backgroundColor: palette.secondary,
    marginLeft: 75,
  },
});

export default Search;
