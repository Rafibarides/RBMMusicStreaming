import { useState, useEffect, useRef } from 'react';
import cacheManager from '../services/CacheManager';

export const useCachedAsset = (url, assetType = 'auto') => {
  const [localPath, setLocalPath] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const mountedRef = useRef(true);

  // Determine asset type if auto
  const getAssetType = (url) => {
    if (assetType !== 'auto') return assetType;
    
    const extension = url.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return 'image';
    } else if (['json'].includes(extension)) {
      return 'json';
    }
    return 'image'; // Default fallback
  };

  useEffect(() => {
    mountedRef.current = true;
    
    const loadAsset = async () => {
      if (!url) {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        const type = getAssetType(url);
        
        // FIRST: Check if already cached and get local path immediately
        const isCached = await cacheManager.isCached(url);
        
        if (isCached) {
          // Image is already cached - get local path immediately
          const cachedPath = await cacheManager.getLocalPath(url);
          if (cachedPath && mountedRef.current) {
            setLocalPath(cachedPath);
            setIsFromCache(true);
            setIsLoading(false);
            return; // Return early - no need to cache again
          }
        }

        // Image not cached - show loading and cache it
        setIsLoading(true);
        setIsFromCache(false);

        let result;
        if (type === 'json') {
          result = await cacheManager.cacheJson(url);
          if (result && mountedRef.current) {
            setLocalPath(result);
            setIsFromCache(false); // This is fresh from network
          } else if (mountedRef.current) {
            // JSON caching failed - this is more serious, throw error
            throw new Error(`Failed to cache JSON: ${url}`);
          }
        } else if (type === 'image') {
          result = await cacheManager.cacheImage(url);
          if (result && mountedRef.current) {
            // Successfully cached - use local path
            setLocalPath(result);
            setIsFromCache(false); // This is fresh from network
          } else if (mountedRef.current) {
            // Caching failed - fall back to original URL
            console.warn(`⚠️ Caching failed for ${url.split('/').pop()}, using network URL`);
            setLocalPath(url);
            setIsFromCache(false);
          }
        }

      } catch (err) {
        console.error('useCachedAsset error:', err);
        if (mountedRef.current) {
          setError(err);
          setLocalPath(url); // Fallback to original URL
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadAsset();

    return () => {
      mountedRef.current = false;
    };
  }, [url, assetType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    localPath: localPath || url,
    isLoading,
    error,
    isFromCache,
    // Utility to force refresh
    refresh: async () => {
      if (!url) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const type = getAssetType(url);
        let result;
        
        if (type === 'json') {
          result = await cacheManager.cacheJson(url, true); // Force refresh
          setLocalPath(result);
        } else if (type === 'image') {
          result = await cacheManager.cacheImage(url, true); // Force refresh
          setLocalPath(result);
        }
        
        setIsFromCache(false);
      } catch (err) {
        setError(err);
        setLocalPath(url);
      } finally {
        setIsLoading(false);
      }
    }
  };
};

// Hook specifically for images with INSTANT cache checking
export const useCachedImage = (url) => {
  // COMPLETELY SYNCHRONOUS initial state determination
  const getInitialState = () => {
    if (!url) {
      return {
        source: null,
        isLoading: false,
        isFromCache: false
      };
    }

    // INSTANT cache check - if cache manager is ready and image is cached
    if (cacheManager.initialized && cacheManager.isImageCachedInstant(url)) {
      const cachedPath = cacheManager.getCachedImagePathInstant(url);
      if (cachedPath) {
        // INSTANT RETURN: Cached image with no loading state
        return {
          source: { uri: `file://${cachedPath}` },
          isLoading: false,
          isFromCache: true
        };
      }
    }

    // Always return the original URL as fallback to ensure image displays
    return {
      source: { uri: url },
      isLoading: !cacheManager.initialized, // Only show loading if cache not ready
      isFromCache: false
    };
  };

  const initialState = getInitialState();
  const [source, setSource] = useState(initialState.source);
  const [isLoading, setIsLoading] = useState(initialState.isLoading);
  const [error, setError] = useState(null);
  const [isFromCache, setIsFromCache] = useState(initialState.isFromCache);
  const [currentUrl, setCurrentUrl] = useState(url); // Track current URL
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Reset state when URL changes
  useEffect(() => {
    if (url !== currentUrl) {
      setCurrentUrl(url);
      const newState = getInitialState();
      setSource(newState.source);
      setIsLoading(newState.isLoading);
      setIsFromCache(newState.isFromCache);
      setError(null);
    }
  }, [url, currentUrl]);

  useEffect(() => {
    // Skip if URL hasn't been set or changed
    if (!url || url !== currentUrl) {
      return;
    }

    // Skip if we already have this URL cached and loaded
    if (isFromCache && !isLoading && source?.uri?.includes(url.split('/').pop())) {
      return;
    }

    if (!url) {
      setSource(null);
      setIsLoading(false);
      return;
    }

    // Wait for cache manager to be ready before doing anything
    if (!cacheManager.initialized) {
      // Cache manager not ready yet - wait for it
      const checkCacheReady = async () => {
        await cacheManager.initialize();
        
        if (!mountedRef.current || url !== currentUrl) return;

        // Now check if image is cached
        if (cacheManager.isImageCachedInstant(url)) {
          const cachedPath = cacheManager.getCachedImagePathInstant(url);
          if (cachedPath && mountedRef.current) {
            setSource({ uri: `file://${cachedPath}` });
            setIsFromCache(true);
            setIsLoading(false);
            return;
          }
        }

        // Image not cached - stop loading but keep original URL
        if (mountedRef.current) {
          setIsLoading(false);
          // Keep showing original URL while we optionally cache in background
          loadImageInBackground();
        }
      };

      checkCacheReady();
      return;
    }

    // Cache manager is ready - do instant check
    if (cacheManager.isImageCachedInstant(url)) {
      const cachedPath = cacheManager.getCachedImagePathInstant(url);
      if (cachedPath && mountedRef.current) {
        setSource({ uri: `file://${cachedPath}` });
        setIsFromCache(true);
        setIsLoading(false);
        return;
      }
    }

    // Image not cached and cache is ready - cache it in background
    loadImageInBackground();

    async function loadImageInBackground() {
      if (!mountedRef.current || url !== currentUrl) return;

      try {
        // Triple-check: ensure it's not cached before downloading
        if (cacheManager.isImageCachedInstant(url)) {
          const cachedPath = cacheManager.getCachedImagePathInstant(url);
          if (cachedPath && mountedRef.current) {
            setSource({ uri: `file://${cachedPath}` });
            setIsFromCache(true);
            setIsLoading(false);
            return;
          }
        }

        // Download the image in background
        const result = await cacheManager.cacheImage(url);
        
        if (mountedRef.current && result && url === currentUrl) {
          // Successfully cached - switch to local version
          setSource({ uri: `file://${result}` });
          setIsFromCache(false); // This is fresh from network
        }
        // If caching failed, keep using original URL (already set)

      } catch (err) {
        console.error('useCachedImage background caching error:', err);
        // Keep using original URL on error
      }
    }

  }, [url, currentUrl, isFromCache, isLoading]);

  return {
    source,
    isLoading,
    error,
    isFromCache
  };
};

// Hook specifically for JSON with parsing
export const useCachedJson = (url) => {
  const [data, setData] = useState(null);
  const result = useCachedAsset(url, 'json');
  
  useEffect(() => {
    if (result.localPath && typeof result.localPath === 'object') {
      // If we got parsed JSON data directly from cache manager
      setData(result.localPath);
    } else {
      setData(null);
    }
  }, [result.localPath]);

  return {
    data,
    isLoading: result.isLoading,
    error: result.error,
    isFromCache: result.isFromCache,
    refresh: result.refresh
  };
};

// Hook for preloading multiple assets
export const usePreloadAssets = () => {
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: 0 });

  const preloadImages = async (urls) => {
    setIsPreloading(true);
    setPreloadProgress({ loaded: 0, total: urls.length });

    try {
      const results = await cacheManager.preloadImages(urls);
      
      // Update progress as images complete
      let loaded = 0;
      results.forEach(result => {
        if (result.success) loaded++;
        setPreloadProgress({ loaded, total: urls.length });
      });

      return results;
    } catch (error) {
      console.error('Preload failed:', error);
      throw error;
    } finally {
      setIsPreloading(false);
    }
  };

  return {
    preloadImages,
    isPreloading,
    preloadProgress
  };
};

export default useCachedAsset; 