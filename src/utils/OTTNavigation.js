import {Linking} from 'react-native';

/**
 * Central registry for all OTT providers supported in the app.
 * Mapping TMDB provider IDs to internal IDs, names, search URLs and App Deep Link Schemes.
 */
export const OTT_PROVIDER_MAP = {
  8:   { id: 'netflix',   name: 'Netflix',      searchUrl: 'https://www.netflix.com/search?q=',         appScheme: 'nflx://www.netflix.com/search?q=', icon: 'N', color: '#E50914', logoUrl: 'https://image.tmdb.org/t/p/w200/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg' },
  119: { id: 'prime',     name: 'Prime Video',   searchUrl: 'https://www.primevideo.com/search?phrase=',  appScheme: ['primevideo://search?phrase=', 'amazonvideo://watch/'], icon: 'P', color: '#00A8E1', logoUrl: 'https://image.tmdb.org/t/p/w200/emthp39XA2YScoYL1p0sdbAH2WA.jpg' },
  9:   { id: 'prime',     name: 'Prime Video',   searchUrl: 'https://www.primevideo.com/search?phrase=',  appScheme: ['primevideo://search?phrase=', 'amazonvideo://watch/'], icon: 'P', color: '#00A8E1', logoUrl: 'https://image.tmdb.org/t/p/w200/emthp39XA2YScoYL1p0sdbAH2WA.jpg' }, 
  122: { id: 'hotstar',   name: 'JioHotstar',    searchUrl: 'https://www.hotstar.com/in/explore?search_query=', appScheme: 'hotstar://search?q=', icon: 'H', color: '#001E3C', logoUrl: 'https://image.tmdb.org/t/p/w200/7Fl8ylPDclt3ZYgNbW2t7rbZE9I.jpg' },
  2336: { id: 'hotstar',  name: 'JioHotstar',    searchUrl: 'https://www.hotstar.com/in/explore?search_query=', appScheme: 'hotstar://search?q=', icon: 'H', color: '#001E3C', logoUrl: 'https://image.tmdb.org/t/p/w200/7Fl8ylPDclt3ZYgNbW2t7rbZE9I.jpg' },
  220: { id: 'jio',       name: 'JioCinema',     searchUrl: 'https://www.jiocinema.com/search/',          appScheme: 'jiocinema://', icon: 'JC', color: '#D9008D', logoUrl: 'https://image.tmdb.org/t/p/w200/d3ixI1no0EpTj2i7u0Sd2DBXVlG.jpg' },
  350: { id: 'apple',     name: 'Apple TV+',     searchUrl: 'https://tv.apple.com/in/search?term=',       appScheme: 'videos://', icon: '', color: '#000000', logoUrl: 'https://image.tmdb.org/t/p/w200/6uhKBfmtzFqOcLousHwZuzcrScK.jpg' },
  3:   { id: 'google',    name: 'Google TV',     searchUrl: 'https://play.google.com/store/search?q=',    appScheme: 'market://search?q=', icon: 'G', color: '#EA4335', logoUrl: 'https://image.tmdb.org/t/p/w200/tbEdFQDwx5LEVr8WpSeXQSIirVq.jpg' },
  232: { id: 'zee5',      name: 'Zee5',          searchUrl: 'https://www.zee5.com/search?q=',             appScheme: 'zee5://search?q=', icon: 'Z5', color: '#821B6F', logoUrl: 'https://image.tmdb.org/t/p/w200/xEPXbwbfABzPrUTWbgtDFH1NOa.jpg' },
  237: { id: 'sonyliv',   name: 'SonyLIV',       searchUrl: 'https://www.sonyliv.com/search?q=',          appScheme: 'sonyliv://search?q=', icon: 'SL', color: '#2e2e6e', logoUrl: 'https://image.tmdb.org/t/p/w200/tBhjAMfKnkzJNmOiMB8DsBx5QAp.jpg' },
  121: { id: 'voot',      name: 'Voot',          searchUrl: 'https://www.voot.com/search?q=',             appScheme: 'voot://', icon: 'V', color: '#6A1B9A', logoUrl: 'https://image.tmdb.org/t/p/w200/xTVM8uXT9QocigQ07LE7Irc65W2.jpg' },
  'youtube': { id: 'youtube', name: 'YouTube',  searchUrl: 'https://www.youtube.com/results?search_query=', appScheme: 'youtube://results?search_query=', icon: 'Y', color: '#FF0000', logoUrl: 'https://image.tmdb.org/t/p/w200/pTnn5JwWr4p3v2RHQZG5bI2oQGo.jpg' }
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
      const schemes = Array.isArray(provider.appScheme) ? provider.appScheme : [provider.appScheme];
      
      for (const scheme of schemes) {
        // For some apps we append the query, for others just the base scheme
        const schemeUrl = scheme.includes('?') || scheme.includes('/') 
          ? `${scheme}${query}` 
          : scheme;
          
        const canOpen = await Linking.canOpenURL(schemeUrl);
        if (canOpen) {
          await Linking.openURL(schemeUrl);
          return true; // Successfully opened in-app
        }
      }
    } catch (e) {
      console.warn(`[OTTNav] Failed to open app scheme for ${provider.name}:`, e);
    }
  }

  // 2. Build Web Fallback URL
  let finalUrl;
  if (provider.searchUrl) {
    finalUrl = `${provider.searchUrl}${query}`;
    
    if (provider.id?.startsWith('moviebox') && movieboxDomain && tmdbId && mediaType) {
      // Clean domain: extract root domain only (remove protocol, paths, slashes)
      let domain = movieboxDomain.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().trim();
      
      // Cineby specific fix: ensure www if missing (some sites redirect poorly without it)
      if (domain.includes('cineby') && !domain.startsWith('www.')) {
        domain = `www.${domain}`;
      }

      const knownDirectDomains = ['cineby', 'bitcine', 'moviebox', 'rivestream', 'sflix', 'vidsrc', 'embed', '2embed'];
      const isKnownDirect = knownDirectDomains.some(d => domain.includes(d));

      if (isKnownDirect) {
        if (domain.includes('rivestream')) {
          finalUrl = `https://${domain}/watch?type=${mediaType}&id=${tmdbId}`;
        } else {
          finalUrl = `https://${domain}/${mediaType}/${tmdbId}`;
        }
      } else {
        // Return unverified status so the component can show a themed modal
        const domainOnly = domain.split('/')[0];
        return {
          status: 'unverified',
          domain: domainOnly,
          homepageUrl: `https://${domainOnly}`,
          movieTitle: movieTitle
        };
      }
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
