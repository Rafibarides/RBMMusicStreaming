import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  FlatList 
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { palette } from '../utils/Colors';

// Import JSON data
import artistsData from '../json/artists.json';
import songsData from '../json/songIndexFlat.json';

// Import pages
import ArtistPage from '../pages/ArtistPage';

const Search = ({ searchState, updateSearchState, resetSearchNavigation, playSong }) => {
  const {
    searchQuery,
    searchResults,
    showResults,
    currentPage,
    selectedArtist,
    songListData
  } = searchState;

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
          image: song.coverArt,
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
        // TODO: Navigate to category page
        console.log(`Pressed ${item.title}`);
      }}
    >
      <Text style={styles.categoryButtonText}>{item.title}</Text>
    </TouchableOpacity>
  );

  // Render main search page
  const renderSearchPage = () => (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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

        {/* Categories Grid (show when not searching) */}
        {!showResults && (
          <View style={styles.categoriesContainer}>
            <FlatList
              data={searchCategories}
              renderItem={renderCategoryButton}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.categoryRow}
            />
          </View>
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
});

export default Search;
