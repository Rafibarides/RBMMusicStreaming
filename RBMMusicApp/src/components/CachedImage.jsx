import React, { useState, useEffect, useRef } from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { palette } from '../utils/Colors';
import { useCachedImage } from '../hooks/useCachedAsset';

const CachedImage = ({ 
  source, 
  style, 
  showLoading = false, 
  loadingText = "Loading...",
  fallbackComponent = null,
  onLoad,
  onError,
  ...props 
}) => {
  const mountedRef = useRef(true);
  const imageUri = source?.uri;
  
  // Use the instant caching hook
  const { source: cachedSource, isLoading, error, isFromCache } = useCachedImage(imageUri);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Call onLoad when image is ready
  useEffect(() => {
    if (!isLoading && !error && cachedSource && mountedRef.current) {
      if (onLoad) onLoad();
    }
  }, [isLoading, error, cachedSource, onLoad]);

  // Call onError when there's an error
  useEffect(() => {
    if (error && mountedRef.current) {
      if (onError) onError(error);
    }
  }, [error, onError]);

  // If there's an error and a fallback component is provided
  if (error && fallbackComponent) {
    return fallbackComponent;
  }

  // CRITICAL: Never show loading overlay for cached images
  // Only show loading if:
  // 1. showLoading is explicitly requested
  // 2. Image is actually loading from network (not from cache)
  // 3. We have a loading state and it's not a cached image
  const shouldShowLoading = showLoading && isLoading && !isFromCache;

  return (
    <View style={style}>
      <Image
        source={cachedSource || source}
        style={style}
        resizeMode="cover"
        {...props}
      />
      {shouldShowLoading && (
        <View style={[styles.loadingOverlay, style]}>
          <View style={styles.loadingIndicator}>
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(21, 32, 38, 0.85)',
    borderRadius: 6,
  },
  loadingIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 6,
  },
  loadingText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default CachedImage; 