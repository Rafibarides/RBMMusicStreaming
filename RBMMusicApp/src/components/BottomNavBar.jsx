import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate 
} from 'react-native-reanimated';
import { palette } from '../utils/Colors';

const BottomNavBar = ({ activeTab, onTabPress }) => {
  const tabs = [
    { name: 'Dashboard', icon: 'home' },
    { name: 'Search', icon: 'search' },
    { name: 'Playlists', icon: 'music' },
  ];

  const TabButton = ({ tab, isActive, onPress }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(isActive ? 1 : 0.6);

    const animatedIconStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
      };
    });

    const handlePress = () => {
      // Animation on press
      scale.value = withSpring(0.9, { duration: 100 }, () => {
        scale.value = withSpring(1, { duration: 100 });
      });
      
      // Update opacity
      opacity.value = withSpring(1, { duration: 200 });
      
      onPress(tab.name);
    };

    // Update opacity when active state changes
    React.useEffect(() => {
      opacity.value = withSpring(isActive ? 1 : 0.6, { duration: 200 });
    }, [isActive]);

    return (
      <TouchableOpacity style={styles.tabButton} onPress={handlePress}>
        <Animated.View style={animatedIconStyle}>
          <FontAwesome 
            name={tab.icon} 
            size={24} 
            color={palette.icons} 
          />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TabButton
          key={tab.name}
          tab={tab}
          isActive={activeTab === tab.name}
          onPress={onTabPress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: palette.background,
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.secondary,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BottomNavBar;
