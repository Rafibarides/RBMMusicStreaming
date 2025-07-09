import React, { useCallback, memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { palette } from '../utils/Colors';

const BottomNavBar = memo(({ activeTab, onTabPress }) => {
  const tabs = [
    { name: 'Dashboard', icon: 'home' },
    { name: 'Search', icon: 'search' },
    { name: 'Playlists', icon: 'music' },
  ];

  console.log('BottomNavBar: Rendering with activeTab:', activeTab);

  const handleTabPress = useCallback((tabName) => {
    console.log('BottomNavBar: Tab button pressed:', tabName);
    console.log('BottomNavBar: onTabPress function available:', typeof onTabPress);
    
    if (onTabPress && typeof onTabPress === 'function') {
      console.log('BottomNavBar: Calling onTabPress with:', tabName);
      onTabPress(tabName);
    } else {
      console.warn('BottomNavBar: onTabPress is not a function!', onTabPress);
    }
  }, [onTabPress]);

  const TabButton = memo(({ tab, isActive }) => {
    console.log(`BottomNavBar: Rendering TabButton for ${tab.name}, active: ${isActive}`);
    
    return (
      <TouchableOpacity 
        style={styles.tabButton} 
        onPress={() => {
          console.log(`BottomNavBar: TouchableOpacity pressed for ${tab.name}`);
          handleTabPress(tab.name);
        }}
        activeOpacity={0.6}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        accessible={true}
        accessibilityLabel={`${tab.name} tab`}
        accessibilityRole="button"
        onPressIn={() => console.log(`BottomNavBar: Press IN for ${tab.name}`)}
        onPressOut={() => console.log(`BottomNavBar: Press OUT for ${tab.name}`)}
      >
        <FontAwesome 
          name={tab.icon} 
          size={24} 
          color={palette.icons}
          style={{ opacity: isActive ? 1 : 0.6 }}
        />
      </TouchableOpacity>
    );
  });

  return (
    <View style={styles.container} pointerEvents="box-none">
      {tabs.map((tab) => (
        <TabButton
          key={tab.name}
          tab={tab}
          isActive={activeTab === tab.name}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: palette.background,
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.secondary,
    zIndex: 100,
    elevation: 10,
    position: 'relative', // Ensure proper positioning
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 50,
    paddingVertical: 10,
  },
});

BottomNavBar.displayName = 'BottomNavBar';

export default BottomNavBar;
