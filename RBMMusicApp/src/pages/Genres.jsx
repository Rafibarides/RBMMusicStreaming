import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { palette } from '../utils/Colors';
import { useMusicData } from '../contexts/MusicDataContext';
import CachedImage from '../components/CachedImage';

const { width: screenWidth } = Dimensions.get('window');

const Genres = ({ onBack, playSong }) => {
  const { songIndexFlat, songIndexFlatLoading, artists, artistsLoading } = useMusicData();
  const [selectedGenre, setSelectedGenre] = useState(null);

  // Helper function to get cover art for a song
  const getSongCoverArt = (song, artists) => {
    if (!song) return null;
    
    // If song already has coverArt (for backward compatibility), use it
    if (song.coverArt) {
      return song.coverArt;
    }

    // Find the artist
    const artist = artists.find(a => a.id === song.artistId);
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

  // Button images mapping
  const buttonImages = [
    require('../../assets/Buttons/button1.jpg'),
    require('../../assets/Buttons/button2.jpg'),
    require('../../assets/Buttons/button3.jpg'),
    require('../../assets/Buttons/button4.jpg'),
  ];

  // Dynamically extract unique genres and organize data
  const genreData = useMemo(() => {
    if (songIndexFlatLoading || !songIndexFlat || artistsLoading || !artists) {
      return [];
    }
    
    const genreMap = {};
    
    songIndexFlat.forEach(song => {
      if (song.genre) {
        if (!genreMap[song.genre]) {
          genreMap[song.genre] = [];
        }
        genreMap[song.genre].push(song);
      }
    });

    // Convert to array with additional metadata
    return Object.keys(genreMap).map((genre, index) => ({
      name: genre,
      songs: genreMap[genre],
      songCount: genreMap[genre].length,
      coverImage: getSongCoverArt(genreMap[genre][0], artists), // Use first song's cover as genre image
      buttonImage: buttonImages[index % buttonImages.length], // Cycle through button images
      id: `genre_${index}`
    }));
  }, [songIndexFlat, artists, songIndexFlatLoading, artistsLoading]);

  // Handle genre selection
  const handleGenrePress = (genre) => {
    setSelectedGenre(genre);
  };

  // Handle back navigation
  const handleBack = () => {
    if (selectedGenre) {
      setSelectedGenre(null);
    } else {
      onBack();
    }
  };

  // Render genre button
  const renderGenreButton = ({ item, index }) => {
    const buttonWidth = (screenWidth - 60) / 2; // Equal width for all buttons
    const buttonHeight = 120; // Equal height for all buttons

    return (
      <TouchableOpacity
        style={[
          styles.genreButton,
          {
            width: buttonWidth,
            height: buttonHeight,
            marginBottom: 20,
            marginRight: index % 2 === 0 ? 20 : 0,
          }
        ]}
        onPress={() => handleGenrePress(item)}
        activeOpacity={0.8}
      >
        <ImageBackground
          source={item.buttonImage}
          style={styles.genreButtonBackground}
          imageStyle={styles.genreButtonImageStyle}
        >
          <View style={styles.genreButtonOverlay}>
            <Text style={styles.genreButtonTitle}>
              {item.name}
            </Text>
            <Text style={styles.genreButtonSubtitle}>
              {item.songCount} song{item.songCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  // Render song item in genre detail view for a specific genre
  const renderSongItemForGenre = (item, index, genre) => (
    <TouchableOpacity
      style={styles.songItem}
      onPress={() => {
        if (playSong) {
          playSong(item, genre.songs, index);
        }
      }}
    >
      <CachedImage source={{ uri: getSongCoverArt(item, artists) }} style={styles.songCover} />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {item.artist}
        </Text>
        {item.album && (
          <Text style={styles.songAlbum} numberOfLines={1}>
            {item.album}
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.playButton}>
        <FontAwesome name="play" size={12} color={palette.text} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

    // Render genre detail view for a specific genre
  const renderGenreDetailForGenre = (genre) => {
    if (!genre) return null;

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with genre image */}
        <View style={styles.genreDetailHeader}>
          <ImageBackground
            source={genre.buttonImage}
            style={styles.genreDetailHeaderBackground}
            imageStyle={styles.genreDetailHeaderImageStyle}
          >
            <View style={styles.genreDetailHeaderOverlay}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <FontAwesome name="chevron-left" size={24} color={palette.text} />
              </TouchableOpacity>
              
              <View style={styles.genreDetailHeaderContent}>
                <Text style={styles.genreDetailTitle}>{genre.name}</Text>
                <Text style={styles.genreDetailSubtitle}>
                  {genre.songCount} song{genre.songCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Songs list */}
        <View style={styles.genreDetailSongs}>
          <View style={styles.songsHeader}>
            <Text style={styles.songsHeaderTitle}>Songs</Text>
            <TouchableOpacity 
              style={styles.shuffleButton}
              onPress={() => {
                if (playSong && genre.songs.length > 0) {
                  // Shuffle and play
                  const shuffledSongs = [...genre.songs].sort(() => Math.random() - 0.5);
                  playSong(shuffledSongs[0], shuffledSongs, 0);
                }
              }}
            >
              <FontAwesome name="random" size={16} color={palette.text} />
              <Text style={styles.shuffleButtonText}>Shuffle</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={genre.songs}
            renderItem={({ item, index }) => renderSongItemForGenre(item, index, genre)}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.songSeparator} />}
          />
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  // Render main genres grid
  const renderGenresGrid = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <FontAwesome name="chevron-left" size={20} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Genres</Text>
        </View>

        {/* Genres Grid */}
        <View style={styles.genresContainer}>
          <FlatList
            data={genreData}
            renderItem={renderGenreButton}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.genreRow}
            ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
          />
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
  );

  // Main render - keep all views mounted to prevent reloading
  return (
    <View style={styles.container}>
      {/* Genres Grid - hidden when genre is selected */}
      <View style={[
        styles.viewContainer,
        selectedGenre && styles.hiddenView
      ]}>
        {renderGenresGrid()}
      </View>

      {/* Pre-render all genre detail views to prevent image reloading */}
      {genreData.map((genre) => (
        <View 
          key={genre.id}
          style={[
            styles.viewContainer,
            (!selectedGenre || selectedGenre.id !== genre.id) && styles.hiddenView
          ]}
        >
          {renderGenreDetailForGenre(genre)}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  viewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hiddenView: {
    left: -9999,
    top: -9999,
    opacity: 0,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
  },
  backButton: {
    padding: 10,
    marginRight: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: palette.text,
  },
  
  // Genres Grid Styles
  genresContainer: {
    paddingHorizontal: 20,
  },
  genreRow: {
    justifyContent: 'space-between',
  },
  genreButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  genreButtonBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  genreButtonImageStyle: {
    borderRadius: 12,
  },
  genreButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    padding: 16,
    borderRadius: 12,
  },
  genreButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 4,
  },
  genreButtonSubtitle: {
    fontSize: 14,
    color: palette.text,
    opacity: 0.9,
  },
  
  // Genre Detail Styles
  genreDetailHeader: {
    height: 250,
  },
  genreDetailHeaderBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  genreDetailHeaderImageStyle: {
    opacity: 0.7,
  },
  genreDetailHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 50,
  },
  genreDetailHeaderContent: {
    marginTop: 20,
  },
  genreDetailTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 8,
  },
  genreDetailSubtitle: {
    fontSize: 18,
    color: palette.text,
    opacity: 0.9,
  },
  
  // Songs List Styles
  genreDetailSongs: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  songsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  songsHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: palette.text,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.tertiary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  shuffleButtonText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  songCover: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 2,
  },
  songArtist: {
    fontSize: 14,
    color: palette.quaternary,
    marginBottom: 2,
  },
  songAlbum: {
    fontSize: 12,
    color: palette.quaternary,
    opacity: 0.8,
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
  songSeparator: {
    height: 1,
    backgroundColor: palette.secondary,
    marginLeft: 65,
  },
});

export default Genres;
