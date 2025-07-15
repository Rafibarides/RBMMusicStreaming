import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIRECTORY = `${FileSystem.documentDirectory}cache/`;
const CACHE_METADATA_KEY = 'cache_metadata';
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

class CacheManager {
  constructor() {
    this.metadata = {};
    this.initialized = false;
    this.versionManifest = null;
    this.lastVersionCheck = 0;
    // CRITICAL: In-memory cache of what's actually cached for instant access
    this.cachedImagePaths = new Map(); // url -> localPath
    this.initializationPromise = null;
  }

  async initialize() {
    // Prevent multiple initialization calls
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.initialized) return;

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  async _doInitialize() {
    try {
      // Ensure cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });
        console.log('📁 Created cache directory at:', CACHE_DIRECTORY);
      }

      // Load existing metadata
      const savedMetadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      this.metadata = savedMetadata ? JSON.parse(savedMetadata) : {};
      
      // CRITICAL: Build in-memory cache map of what's actually available
      await this._buildCacheMap();
      
      this.initialized = true;
      console.log(`🚀 CacheManager initialized - ${this.cachedImagePaths.size} images instantly available`);
    } catch (error) {
      console.error('❌ Failed to initialize CacheManager:', error);
    }
  }

  /**
   * Build in-memory map of cached images for instant access
   */
  async _buildCacheMap() {
    try {
      const files = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY);
      
      // Check each metadata entry against actual files
      for (const [cacheKey, metadata] of Object.entries(this.metadata)) {
        if (metadata.type === 'image' && metadata.url) {
          const extension = metadata.extension || metadata.url.split('.').pop().toLowerCase();
          const localPath = this.buildLocalPath(cacheKey, `.${extension}`);
          const filename = localPath.split('/').pop();
          
          // Check if file actually exists
          if (files.includes(filename)) {
            this.cachedImagePaths.set(metadata.url, localPath);
          }
        }
      }
      
      console.log(`📋 Built cache map: ${this.cachedImagePaths.size} cached images`);
    } catch (error) {
      console.error('❌ Failed to build cache map:', error);
    }
  }

  /**
   * INSTANT cache check - no async file system calls
   */
  isImageCachedInstant(url) {
    return this.cachedImagePaths.has(url);
  }

  /**
   * INSTANT cached path retrieval - no async file system calls  
   */
  getCachedImagePathInstant(url) {
    return this.cachedImagePaths.get(url) || null;
  }

  /**
   * Generate cache key from URL
   */
  getCacheKey(url) {
    return url.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Get local file path for cached asset
   */
  buildLocalPath(cacheKey, extension = '') {
    return `${CACHE_DIRECTORY}${cacheKey}${extension}`;
  }

  /**
   * Check if we need to validate cache (every 5 minutes)
   */
  shouldCheckVersion() {
    const now = Date.now();
    return (now - this.lastVersionCheck) > VERSION_CHECK_INTERVAL;
  }

  /**
   * Fetch version manifest to check if assets need updating
   */
  async fetchVersionManifest() {
    try {
      const manifestUrl = 'https://pub-a2d61889013a43e69563a1bbccaed58c.r2.dev/jsonMaster/data-version.json';
      const response = await fetch(manifestUrl);
      
      if (response.ok) {
        this.versionManifest = await response.json();
        this.lastVersionCheck = Date.now();
        console.log('📋 Version manifest fetched:', this.versionManifest);
        return this.versionManifest;
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch version manifest:', error);
    }
    return null;
  }

  /**
   * Check if asset needs updating based on version/timestamp
   */
  needsUpdate(cacheKey, remoteVersion) {
    const localMetadata = this.metadata[cacheKey];
    if (!localMetadata) return true;

    // Check version if provided
    if (remoteVersion && localMetadata.version !== remoteVersion) {
      return true;
    }

    // Check timestamp (if asset is older than 24 hours, consider updating)
    const now = Date.now();
    const ageInHours = (now - localMetadata.cachedAt) / (1000 * 60 * 60);
    return ageInHours > 24;
  }

  /**
   * Save metadata for cached asset
   */
  async saveMetadata(cacheKey, metadata) {
    this.metadata[cacheKey] = {
      ...metadata,
      cachedAt: Date.now()
    };
    
    try {
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(this.metadata));
    } catch (error) {
      console.error('❌ Failed to save cache metadata:', error);
    }
  }

  /**
   * Cache a JSON asset
   */
  async cacheJson(url, forceRefresh = false) {
    await this.initialize();
    
    const cacheKey = this.getCacheKey(url);
    const localPath = this.buildLocalPath(cacheKey, '.json');

    try {
      // Check if we should validate cache
      if (!forceRefresh && this.shouldCheckVersion()) {
        await this.fetchVersionManifest();
      }

      // Determine if we need to update
      const assetName = url.split('/').pop().replace('.json', '');
      const remoteVersion = this.versionManifest?.[assetName];
      const needsUpdate = forceRefresh || this.needsUpdate(cacheKey, remoteVersion);

      // Check if local file exists
      const localFileInfo = await FileSystem.getInfoAsync(localPath);
      
      if (localFileInfo.exists && !needsUpdate) {
        // Use cached version
        const cachedData = await FileSystem.readAsStringAsync(localPath);
        return JSON.parse(cachedData);
      }

      // Download fresh version
      console.log(`⬇️ Downloading JSON: ${assetName}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Save to local file system
      await FileSystem.writeAsStringAsync(localPath, JSON.stringify(data));
      
      // Save metadata
      await this.saveMetadata(cacheKey, {
        url,
        type: 'json',
        version: remoteVersion,
        size: JSON.stringify(data).length
      });

      console.log(`✅ Cached JSON: ${assetName}`);
      return data;

    } catch (error) {
      console.error(`❌ Failed to cache JSON ${url}:`, error);
      
      // Try to return cached version as fallback
      try {
        const localFileInfo = await FileSystem.getInfoAsync(localPath);
        if (localFileInfo.exists) {
          console.log(`🔄 Using stale cached JSON as fallback: ${url}`);
          const cachedData = await FileSystem.readAsStringAsync(localPath);
          return JSON.parse(cachedData);
        }
      } catch (fallbackError) {
        console.error('❌ Fallback cache read failed:', fallbackError);
      }
      
      // Return null instead of throwing - let caller handle
      return null;
    }
  }

  /**
   * Cache an image asset
   */
  async cacheImage(url, forceRefresh = false) {
    await this.initialize();
    
    const cacheKey = this.getCacheKey(url);
    // FIX: Always use lowercase extension for consistency
    const extension = url.split('.').pop().toLowerCase();
    const localPath = this.buildLocalPath(cacheKey, `.${extension}`);

    try {
      // Check if local file exists and is not stale
      const localFileInfo = await FileSystem.getInfoAsync(localPath);
      const needsUpdate = forceRefresh || this.needsUpdate(cacheKey);
      
      if (localFileInfo.exists && !needsUpdate) {
        // File exists and is fresh - return immediately
        return localPath;
      }

      // Download fresh version
      console.log(`⬇️ Downloading image: ${url.split('/').pop()}`);
      const downloadResult = await FileSystem.downloadAsync(url, localPath);
      
      if (downloadResult.status !== 200) {
        throw new Error(`HTTP ${downloadResult.status}`);
      }

      // Save metadata with lowercase extension
      await this.saveMetadata(cacheKey, {
        url,
        type: 'image',
        extension: extension, // Store the normalized extension
        size: downloadResult.headers['content-length']
      });

      // CRITICAL: Add to in-memory cache for instant access
      this.cachedImagePaths.set(url, localPath);

      console.log(`✅ Cached image: ${url.split('/').pop()}`);
      return localPath;

    } catch (error) {
      console.error(`❌ Failed to cache image ${url}:`, error);
      
      // Try to return cached version as fallback
      try {
        const localFileInfo = await FileSystem.getInfoAsync(localPath);
        if (localFileInfo.exists) {
          console.log(`🔄 Using stale cached image as fallback`);
          return localPath;
        }
      } catch (fallbackError) {
        console.error('❌ Fallback image cache read failed:', fallbackError);
      }
      
      // CRITICAL FIX: Don't return original URL here - return null to indicate failure
      return null;
    }
  }

  /**
   * Preload multiple images in batches
   */
  async preloadImages(urls, batchSize = 5) {
    await this.initialize();
    
    const results = [];
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (url) => {
        try {
          const localPath = await this.cacheImage(url);
          return { url, localPath, success: true };
        } catch (error) {
          return { url, localPath: url, success: false };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(result => 
        result.status === 'fulfilled' ? result.value : { success: false }
      ));

      // Small delay between batches
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter(r => r.success).length;
    if (successCount < urls.length) {
      console.log(`⚠️ Preloaded ${successCount}/${urls.length} images`);
    }
    
    return results;
  }

  /**
   * Clear cache for specific asset or all assets
   */
  async clearCache(cacheKey = null) {
    await this.initialize();

    try {
      if (cacheKey) {
        // Clear specific asset
        const files = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY);
        const targetFiles = files.filter(file => file.startsWith(cacheKey));
        
        for (const file of targetFiles) {
          await FileSystem.deleteAsync(`${CACHE_DIRECTORY}${file}`);
        }
        
        delete this.metadata[cacheKey];
        console.log(`🗑️ Cleared cache for: ${cacheKey}`);
      } else {
        // Clear all cache
        await FileSystem.deleteAsync(CACHE_DIRECTORY, { idempotent: true });
        await FileSystem.makeDirectoryAsync(CACHE_DIRECTORY, { intermediates: true });
        
        this.metadata = {};
        console.log('🗑️ Cleared all cache');
      }

      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(this.metadata));
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    await this.initialize();

    try {
      const files = await FileSystem.readDirectoryAsync(CACHE_DIRECTORY);
      let totalSize = 0;
      
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${CACHE_DIRECTORY}${file}`);
        totalSize += fileInfo.size || 0;
      }

      return {
        fileCount: files.length,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        metadataCount: Object.keys(this.metadata).length
      };
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error);
      return { fileCount: 0, totalSize: 0, totalSizeMB: 0, metadataCount: 0 };
    }
  }

  /**
   * Check if asset is cached
   */
  async isCached(url) {
    await this.initialize();
    
    const cacheKey = this.getCacheKey(url);
    
    // FIX: Use consistent lowercase extension logic
    const extension = url.split('.').pop().toLowerCase();
    const localPath = this.buildLocalPath(cacheKey, 
      extension === 'json' ? '.json' : `.${extension}`
    );
    
    try {
      // Check if file actually exists on disk
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      return fileInfo.exists;
    } catch {
      return false;
    }
  }

  /**
   * Get local path for cached asset (if exists)
   */
  async getLocalPath(url) {
    await this.initialize();
    
    const cacheKey = this.getCacheKey(url);
    
    // FIX: Use consistent lowercase extension logic  
    const extension = url.split('.').pop().toLowerCase();
    const localPath = this.buildLocalPath(cacheKey,
      extension === 'json' ? '.json' : `.${extension}`
    );
    
    try {
      // Check if file actually exists on disk
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      return fileInfo.exists ? localPath : null;
    } catch {
      return null;
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

export default cacheManager; 