import cacheManager from '../services/CacheManager';

export const CacheDebug = {
  // Log current cache statistics
  async logCacheStats() {
    const stats = await cacheManager.getCacheStats();
    console.log('📊 Cache Statistics:', stats);
    return stats;
  },

  // Check if specific URL is cached
  async checkUrl(url) {
    const isCached = await cacheManager.isCached(url);
    const localPath = await cacheManager.getLocalPath(url);
    console.log(`🔍 URL Check: ${url.split('/').pop()}`);
    console.log(`   Cached: ${isCached}`);
    console.log(`   Local Path: ${localPath}`);
    return { isCached, localPath };
  },

  // Check instant cache status
  checkInstantCache(url) {
    const isInstantCached = cacheManager.isImageCachedInstant(url);
    const instantPath = cacheManager.getCachedImagePathInstant(url);
    console.log(`⚡ Instant Cache Check: ${url.split('/').pop()}`);
    console.log(`   Instantly Cached: ${isInstantCached}`);
    console.log(`   Instant Path: ${instantPath}`);
    console.log(`   Cache Manager Ready: ${cacheManager.initialized}`);
    return { isInstantCached, instantPath, cacheReady: cacheManager.initialized };
  },

  // Test multiple URLs for instant cache
  testInstantCacheMultiple(urls) {
    console.log(`⚡ Testing instant cache for ${urls.length} URLs`);
    console.log(`   Cache Manager Ready: ${cacheManager.initialized}`);
    
    const results = urls.map(url => ({
      url: url.split('/').pop(),
      isInstantCached: cacheManager.isImageCachedInstant(url),
      hasInstantPath: !!cacheManager.getCachedImagePathInstant(url)
    }));
    
    console.table(results);
    return results;
  },

  // Clear all cache (for testing)
  async clearAll() {
    await cacheManager.clearCache();
    console.log('🗑️ All cache cleared');
  },

  // Test caching for a specific image
  async testImageCache(url) {
    console.log(`🧪 Testing cache for: ${url.split('/').pop()}`);
    
    // Check initial state
    const before = await this.checkUrl(url);
    
    // Try to cache it
    const result = await cacheManager.cacheImage(url);
    console.log(`   Cache result: ${result}`);
    
    // Check final state
    const after = await this.checkUrl(url);
    
    return { before, after, result };
  }
};

// Make it available globally for console debugging
if (__DEV__) {
  global.CacheDebug = CacheDebug;
}

export default CacheDebug; 