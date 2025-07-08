import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import screens
import Dashboard from './screens/Dashboard';
import Search from './screens/Search';
import Playlists from './screens/Playlists';

// Import components
import BottomNavBar from './components/BottomNavBar';

// Import colors
import { palette } from './utils/Colors';

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  
  // Search state that persists across tab switches
  const [searchState, setSearchState] = useState({
    searchQuery: '',
    searchResults: [],
    showResults: false,
    currentPage: 'search',
    selectedArtist: null,
    songListData: null
  });

  const updateSearchState = (newState) => {
    setSearchState(prevState => ({ ...prevState, ...newState }));
  };

  const resetSearchNavigation = () => {
    setSearchState(prevState => ({
      ...prevState,
      currentPage: 'search',
      selectedArtist: null,
      songListData: null
    }));
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Search':
        return (
          <Search 
            searchState={searchState}
            updateSearchState={updateSearchState}
            resetSearchNavigation={resetSearchNavigation}
          />
        );
      case 'Playlists':
        return <Playlists />;
      default:
        return <Dashboard />;
    }
  };

  const handleTabPress = (tabName) => {
    // If switching to Search tab and we're in a sub-page, reset to main search
    if (tabName === 'Search' && searchState.currentPage !== 'search') {
      resetSearchNavigation();
    }
    setActiveTab(tabName);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={palette.background} />
        
        <View style={styles.screenContainer}>
          {renderScreen()}
        </View>
        
        <BottomNavBar 
          activeTab={activeTab} 
          onTabPress={handleTabPress} 
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  screenContainer: {
    flex: 1,
  },
});
