import {Linking} from 'react-native';
import { getCurrentUser } from '../services/auth';
import { resolveStream, isFebBoxAvailable } from '../services/febbox';

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
 * Build the embed URL for a given engine provider.
 * Uses the correct API docs for each provider.
 */
const buildEngineUrl = (engineId, tmdbId, mediaType, s = 1, e = 1, resumeTime = 0) => {
  const t = Math.floor(resumeTime);
  const commonCineParams = `autoplay=true&autoskip=true&back=close&color=%238b5cf6&t=${t}&events=true`;

  switch (engineId) {
    case 'cinesrc':
      if (mediaType === 'movie') {
        return `https://cinesrc.st/embed/movie/${tmdbId}?${commonCineParams}`;
      }
      return `https://cinesrc.st/embed/tv/${tmdbId}?s=${s}&e=${e}&${commonCineParams}`;
    
    case 'febbox':
      // FebBox uses the local HLS player page — URL is resolved dynamically
      return `febbox://resolve/${tmdbId}/${mediaType}/${s}/${e}?t=${t}`;
    
    default:
      return null;
  }
};

/**
 * Intelligent Availability Check for Direct Engines.
 * Checks CineSrc -> VidKing -> RiveStream in priority order.
 * Returns the first available provider with its embed URL.
 */
export const checkDirectEngineAvailability = (tmdbId, mediaType, s = 1, e = 1, resumeTime = 0) => {
  return new Promise(async (resolve) => {
    const { loadSettings } = require('./storage');
    const settings = await loadSettings();
    const priority = settings.directEnginePriority || ['cinesrc'];
    
    const engineMap = {
      'cinesrc': { id: 'cinesrc', name: 'CineSrc' }
    };

    const providers = priority.map(id => engineMap[id]).filter(Boolean);

    for (const p of providers) {
      try {
        const url = buildEngineUrl(p.id, tmdbId, mediaType, s, e, resumeTime);
        if (!url) continue;

        const isAvailable = await new Promise((resResolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', url, true); 
          xhr.timeout = 4000;
          
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 2) { 
              if (xhr.status >= 200 && xhr.status < 400) {
                xhr.abort();
                resResolve(true);
              } else {
                xhr.abort();
                resResolve(false);
              }
            }
          };

          xhr.onerror = () => resResolve(false);
          xhr.ontimeout = () => resResolve(false);
          xhr.send();
        });

        if (isAvailable) {
          // Re-build with resumeTime just to be sure
          const finalUrl = buildEngineUrl(p.id, tmdbId, mediaType, s, e, resumeTime);
          console.log(`[DirectEngine] ✓ Found content on ${p.name}`);
          resolve({ url: finalUrl, id: p.id, name: p.name });
          return;
        } else {
          console.log(`[DirectEngine] ✗ ${p.name} check failed`);
        }
      } catch (err) {
        console.log(`[DirectEngine] ✗ ${p.name} check exception: ${err.message}`);
      }
    }
    resolve(null);
  });
};

/**
 * Core navigation logic for all OTT provider selections.
 */
export const navigateToOTT = async (provider, movieTitle, tmdbId, mediaType, movieboxDomain, navigation, s = 1, e = 1, resumeTime = 0, thumb = null, showName = null) => {
  const query = encodeURIComponent(movieTitle);
  
  // 1. Try Native App Deep Link first
  if (provider.appScheme && provider.id !== 'direct') {
    try {
      const schemes = Array.isArray(provider.appScheme) ? provider.appScheme : [provider.appScheme];
      for (const scheme of schemes) {
        const schemeUrl = scheme.includes('?') || scheme.includes('/') ? `${scheme}${query}` : scheme;
        const canOpen = await Linking.canOpenURL(schemeUrl);
        if (canOpen) {
          await Linking.openURL(schemeUrl);
          return true;
        }
      }
    } catch (e) {
      console.warn(`[OTTNav] Failed to open app scheme for ${provider.name}:`, e);
    }
  }

  let finalUrl;
  let finalId = provider.id;
  let finalName = provider.name;
  let engineSource = null; 

  // Case A: Unified Direct Engine (StreamDeck Engine)
  if (provider.id === 'direct') {
    if (tmdbId && mediaType) {
      // Delegate the availability check to the WebViewScreen so the UI doesn't freeze
      finalUrl = 'streamdeck://direct';
      finalId = 'direct'; 
      finalName = `StreamDeck Engine`;
      engineSource = 'direct'; 
    }
  }

  // Case A-bis: FebBox Source (resolves HLS stream → local player)
  if (!finalUrl && provider.id === 'febbox') {
    finalUrl = 'streamdeck://febbox';
    finalId = 'febbox';
    finalName = 'FebBox Stream';
    engineSource = 'febbox';
  }

  // Case B: MovieBox Custom Domains
  if (!finalUrl && provider.id?.startsWith('moviebox') && movieboxDomain && tmdbId && mediaType) {
    let domain = movieboxDomain.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase().trim();
    if (domain.includes('cineby') && !domain.startsWith('www.')) domain = `www.${domain}`;
    
    if (mediaType === 'movie') {
      finalUrl = `https://vidsrc.pro/embed/movie/${tmdbId}`;
    } else {
      finalUrl = `https://vidsrc.pro/embed/tv/${tmdbId}/${s}/${e}`;
    }
    finalName = provider.name;
  }

  // Case C: Search-URL based Fallback
  if (!finalUrl && provider.searchUrl) {
    finalUrl = `${provider.searchUrl}${query}`;
  } 

  // Case D: Direct Static URL
  if (!finalUrl && provider.url) {
    finalUrl = provider.url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`;
  }

  if (!finalUrl) {
    console.warn('[OTTNav] No final URL resolved for', provider.name);
    return false;
  }

  // 3. Navigate to in-app WebView
  try {
    const isEngineType = finalId === 'direct';
    const user = getCurrentUser();
    
    navigation.navigate('WebView', {
      url: finalUrl,
      title: movieTitle,
      showName: showName || (mediaType === 'tv' ? movieTitle : null),
      tmdbId,
      mediaType,
      season: s,
      episode: e,
      resumeTime,
      thumb,
      userId: user?.uid,
      appId: finalId,
      color: provider.color || '#8b5cf6',
      type: isEngineType ? 'direct_engine' : (finalId.startsWith('moviebox') ? 'moviebox' : 'movie'),
      engineSource: engineSource,
    });
  } catch (e) {
    console.error('[OTTNav] Navigation failed:', e);
  }
  
  return false; 
};
