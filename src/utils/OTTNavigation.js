import {Linking} from 'react-native';

/**
 * Central registry for all OTT providers supported in the app.
 * Mapping TMDB provider IDs to internal IDs, names, search URLs and App Deep Link Schemes.
 */
export const OTT_PROVIDER_MAP = {
  8:   { id: 'netflix',   name: 'Netflix',      searchUrl: 'https://www.netflix.com/search?q=',         appScheme: 'nflx://www.netflix.com/search?q=' },
  119: { id: 'prime',     name: 'Prime Video',   searchUrl: 'https://www.primevideo.com/search?phrase=',  appScheme: 'primevideo://search?phrase=' },
  9:   { id: 'prime',     name: 'Prime Video',   searchUrl: 'https://www.primevideo.com/search?phrase=',  appScheme: 'primevideo://search?phrase=' }, 
  122: { id: 'hotstar',   name: 'JioHotstar',    searchUrl: 'https://www.hotstar.com/in/explore?search_query=', appScheme: 'hotstar://search?q=' },
  232: { id: 'jio',       name: 'JioCinema',     searchUrl: 'https://www.jiocinema.com/search/',          appScheme: 'jiocinema://' },
  3:   { id: 'google',    name: 'Google TV',     searchUrl: 'https://play.google.com/store/search?q=',    appScheme: 'market://search?q=' },
  2:   { id: 'apple',     name: 'Apple TV',      searchUrl: 'https://tv.apple.com/in/search?term=',       appScheme: 'videos://' },
  220: { id: 'zee5',      name: 'Zee5',          searchUrl: 'https://www.zee5.com/search?q=',             appScheme: 'zee5://search?q=' },
  237: { id: 'sonyliv',   name: 'SonyLIV',       searchUrl: 'https://www.sonyliv.com/search?q=',          appScheme: 'sonyliv://search?q=' },
  121: { id: 'mxplayer',  name: 'MX Player',     searchUrl: 'https://www.mxplayer.in/search?q=',          appScheme: 'mxplayer://' },
  'youtube': { id: 'youtube', name: 'YouTube',  searchUrl: 'https://www.youtube.com/results?search_query=', appScheme: 'youtube://results?search_query=' }
};

/**
 * Core navigation logic for all OTT provider selections.
 * 1. Checks if the native app is installed via Deep Link Scheme.
 * 2. Redirects to the native app if available.
 * 3. Falls back to in-app WebView ONLY if the app is missing.
 */
export const navigateToOTT = async (provider, movieTitle, tmdbId, mediaType, movieboxDomain, navigation) => {
  const query = encodeURIComponent(movieTitle);
  
  // 1. Try Native App Deep Link first
  if (provider.appScheme) {
    try {
      // For some apps we append the query, for others just the base scheme
      const schemeUrl = provider.appScheme.includes('?') || provider.appScheme.includes('/') 
        ? `${provider.appScheme}${query}` 
        : provider.appScheme;
        
      const canOpen = await Linking.canOpenURL(schemeUrl);
      if (canOpen) {
        await Linking.openURL(schemeUrl);
        return true; // Successfully opened in-app
      }
    } catch (e) {
      console.warn(`[OTTNav] Failed to open app scheme for ${provider.name}:`, e);
    }
  }

  // 2. Build Web Fallback URL
  let finalUrl;
  if (provider.searchUrl) {
    finalUrl = `${provider.searchUrl}${query}`;
    
    // Special Logic for Cineby/MovieBox (Direct TMDB ID links)
    if (provider.id === 'moviebox' && movieboxDomain && movieboxDomain.toLowerCase().includes('cineby.sc') && tmdbId && mediaType) {
      const domain = movieboxDomain.replace('http://', '').replace('https://', '');
      finalUrl = `https://${domain}/${mediaType}/${tmdbId}`;
    }
  } else if (provider.url) {
    finalUrl = provider.url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`;
  } else {
    return false; // Nowhere to go
  }

  // 3. Navigate to in-app WebView
  navigation.navigate('WebView', {
    url: finalUrl,
    title: `${movieTitle} on ${provider.name}`,
    appId: provider.id,
    color: provider.color || '#333',
    type: provider.id === 'moviebox' ? 'moviebox' : (provider.id.startsWith('custom') || provider.id === 'hotstar' || provider.id === 'fancode' || provider.id === 'sonyliv' ? 'sports' : 'movie'),
  });
  
  return false; // Opened in WebView
};
