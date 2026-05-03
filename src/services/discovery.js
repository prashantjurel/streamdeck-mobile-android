/**
 * Discovery Service for StreamDeck Mobile
 * Fetches curated content from RSS, Wikipedia, YouTube, and Reddit.
 */

export const ADVENTURE_CATEGORIES = [
  { id: 'science', name: 'Science & Math', emoji: '🧪' },
  { id: 'history', name: 'History', emoji: '📜' },
  { id: 'philosophy', name: 'Philosophy & Life', emoji: '🧘' },
  { id: 'tech', name: 'Technology', emoji: '💻' },
  { id: 'nature', name: 'Nature', emoji: '🌿' },
  { id: 'culture', name: 'Culture & Society', emoji: '🌍' },
  { id: 'arts', name: 'Arts & Design', emoji: '🎨' },
  { id: 'business', name: 'Business', emoji: '💼' },
  { id: 'health', name: 'Health & Psychology', emoji: '🧠' },
  { id: 'literature', name: 'Literature', emoji: '📚' },
  { id: 'music', name: 'Music', emoji: '🎵' },
  { id: 'food', name: 'Food', emoji: '🍳' },
  { id: 'fun', name: 'Fun Stuff', emoji: '🎈' },
  { id: 'gaming', name: 'Gaming', emoji: '🎮' },
  { id: 'sports', name: 'Sports', emoji: '⚽' },
  { id: 'other', name: 'Other', emoji: '✨' }
];

const ADVENTURE_PROVIDERS = [
  // --- Articles & Essays ---
  { name: 'Aeon', type: 'rss', url: 'https://aeon.co/feed.rss', categories: ['philosophy', 'culture', 'arts'], contentType: 'Article' },
  { name: 'Nautilus', type: 'rss', url: 'https://nautil.us/feed/', categories: ['science', 'nature'], contentType: 'Article' },
  { name: 'Quanta', type: 'rss', url: 'https://www.quantamagazine.org/feed', categories: ['science', 'tech'], contentType: 'Article' },
  { name: 'Big Think', type: 'rss', url: 'https://bigthink.com/feeds/feed.rss', categories: ['philosophy', 'science', 'tech'], contentType: 'Article' },
  { name: 'Open Culture', type: 'rss', url: 'http://feeds.feedburner.com/OpenCulture', categories: ['culture', 'literature', 'arts', 'music'], contentType: 'Article' },
  { name: 'Atlas Obscura', type: 'rss', url: 'https://www.atlasobscura.com/feeds/latest', categories: ['nature', 'history', 'culture'], contentType: 'Article' },
  { name: 'Wait But Why', type: 'rss', url: 'https://waitbutwhy.com/feed', categories: ['philosophy', 'science', 'tech'], contentType: 'Article' },
  { name: 'Wired', type: 'rss', url: 'https://www.wired.com/feed/rss', categories: ['tech', 'business'], contentType: 'Article' },
  { name: 'Literary Hub', type: 'rss', url: 'https://lithub.com/feed/', categories: ['literature', 'culture'], contentType: 'Article' },
  { name: 'Paris Review', type: 'rss', url: 'https://www.theparisreview.org/blog/feed/', categories: ['literature', 'arts'], contentType: 'Article' },
  { name: 'The Browser', type: 'rss', url: 'https://thebrowser.com/rss/', categories: ['culture', 'philosophy', 'other'], contentType: 'Article' },
  { name: 'Longform', type: 'rss', url: 'https://longform.org/feed.xml', categories: ['literature', 'culture'], contentType: 'Article' },
  { name: 'Brain Pickings', type: 'rss', url: 'https://www.themarginalian.org/feed/', categories: ['philosophy', 'literature', 'arts'], contentType: 'Article' },
  { name: 'Derek Sivers', type: 'rss', url: 'https://sive.rs/blog.rss', categories: ['philosophy', 'business'], contentType: 'Article' },
  { name: 'Paul Graham', type: 'rss', url: 'http://www.paulgraham.com/rss.html', categories: ['tech', 'business', 'philosophy'], contentType: 'Article' },
  
  // --- Video & Documentaries ---
  { name: 'Kurzgesagt', type: 'youtube_rss', channelId: 'UCsXVk37bltUXD1iCh9W9FQg', categories: ['science', 'tech', 'philosophy'], contentType: 'Video' },
  { name: 'Veritasium', type: 'youtube_rss', channelId: 'UCHnyfMqiRRG1u-2MsSQLbXA', categories: ['science', 'tech'], contentType: 'Video' },
  { name: 'Vsauce', type: 'youtube_rss', channelId: 'UC6nSFpj9HTCZ5t-N3Rm3-HA', categories: ['science', 'health', 'fun'], contentType: 'Video' },
  { name: 'DW Documentary', type: 'youtube_rss', channelId: 'UC_66_P7D3vS6Wpax_Wz3Aow', categories: ['culture', 'history', 'nature'], contentType: 'Documentary' },
  { name: 'Real Stories', type: 'youtube_rss', channelId: 'UCv690_AitfL8t_94Vj0vL_g', categories: ['culture', 'history'], contentType: 'Documentary' },
  { name: 'Dust', type: 'youtube_rss', channelId: 'UC7sDT8jZ76VylbL1_6LKy3w', categories: ['arts', 'tech', 'fun'], contentType: 'Short Film' },
  { name: 'Frontline', type: 'youtube_rss', channelId: 'UC3ScyryU9Oy9Wse398qujrQ', categories: ['culture', 'business', 'history'], contentType: 'Documentary' },
  { name: 'Timeline', type: 'youtube_rss', channelId: 'UC88lvyJe7aHZmcvzvubDFRg', categories: ['history'], contentType: 'Documentary' },
  { name: 'TED', type: 'youtube_rss', channelId: 'UCAuUUnT6oDeKwE6v1NGQxug', categories: ['science', 'tech', 'culture', 'philosophy'], contentType: 'Video' },

  // --- Podcasts & Audio ---
  { name: 'Radiolab', type: 'rss', url: 'http://feeds.wnyc.org/radiolab', categories: ['science', 'culture', 'fun'], contentType: 'Podcast' },
  { name: '99% Invisible', type: 'rss', url: 'http://feeds.feedburner.com/99percentinvisible', categories: ['arts', 'history', 'tech'], contentType: 'Podcast' },
  { name: 'TED Radio Hour', type: 'rss', url: 'https://feeds.npr.org/510298/podcast.xml', categories: ['science', 'tech', 'culture'], contentType: 'Podcast' },
  { name: 'Philosophize This!', type: 'rss', url: 'http://philosophizethis.libsyn.com/rss', categories: ['philosophy'], contentType: 'Podcast' },
  { name: 'Science Vs', type: 'rss', url: 'https://feeds.megaphone.fm/sciencevs', categories: ['science', 'health'], contentType: 'Podcast' },
  
  // --- Science & Research ---
  { name: 'Nature', type: 'rss', url: 'http://feeds.nature.com/nature/rss/current', categories: ['science'], contentType: 'Article' },
  { name: 'arXiv', type: 'rss', url: 'http://export.arxiv.org/rss/physics', categories: ['science', 'tech'], contentType: 'Research' },
  { name: 'SciTech Daily', type: 'rss', url: 'https://scitechDaily.com/feed/', categories: ['science', 'tech', 'nature'], contentType: 'Article' },
  { name: 'Smithsonian', type: 'rss', url: 'https://www.smithsonianmag.com/rss/latest/', categories: ['history', 'nature', 'arts'], contentType: 'Article' },

  // --- Niche & Interest ---
  { name: 'Serious Eats', type: 'rss', url: 'https://www.seriouseats.com/rss', categories: ['food'], contentType: 'Article' },
  { name: 'Psychology Today', type: 'rss', url: 'https://www.psychologytoday.com/us/rss/index.xml', categories: ['health'], contentType: 'Article' },
  { name: 'IGN', type: 'rss', url: 'https://feeds.feedburner.com/ign/news', categories: ['gaming', 'tech'], contentType: 'Article' },
  { name: 'Pitchfork', type: 'rss', url: 'https://pitchfork.com/feed/rss', categories: ['music', 'culture'], contentType: 'Article' },
  { name: 'Wikipedia', type: 'wiki_featured', categories: ['history', 'science', 'culture', 'other'], contentType: 'Education' },

  // --- Reddit Curated ---
  { name: 'DeepValue', type: 'reddit', sub: 'DeepValue', categories: ['business', 'other'], contentType: 'Article' },
  { name: 'Science', type: 'reddit', sub: 'science', categories: ['science'], contentType: 'Article' },
  { name: 'InterestingAsFuck', type: 'reddit', sub: 'interestingasfuck', categories: ['fun', 'other'], contentType: 'Article' },
  { name: 'Philosophy', type: 'reddit', sub: 'philosophy', categories: ['philosophy'], contentType: 'Article' },
];

import AsyncStorage from '@react-native-async-storage/async-storage';

export const fetchDiscoveryContent = async (selectedCategoryIds = []) => {
  const recentSourcesJson = await AsyncStorage.getItem('streamdeck_adventure_recent_sources');
  const recentSources = recentSourcesJson ? JSON.parse(recentSourcesJson) : [];
  
  let filteredProviders = ADVENTURE_PROVIDERS.filter(p => 
    p.categories.some(cat => selectedCategoryIds.includes(cat))
  );
  if (filteredProviders.length === 0) filteredProviders = ADVENTURE_PROVIDERS;

  // Serendipity 22%
  const isSerendipity = Math.random() < 0.22;
  const currentPool = isSerendipity ? ADVENTURE_PROVIDERS : filteredProviders;

  // Anti-Repetition
  let availableProviders = currentPool.filter(p => !recentSources.includes(p.name));
  if (availableProviders.length < 3) {
    const newRecent = recentSources.slice(Math.floor(recentSources.length / 2));
    await AsyncStorage.setItem('streamdeck_adventure_recent_sources', JSON.stringify(newRecent));
    availableProviders = currentPool.filter(p => !newRecent.includes(p.name));
  }

  const selectedProviders = [];
  const pool = [...availableProviders];
  const count = Math.min(4, pool.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selectedProviders.push(pool.splice(idx, 1)[0]);
  }

  try {
    const fetchPromises = selectedProviders.map(async (provider) => {
      try {
        let results = [];
        if (provider.type === 'reddit') results = await fetchRedditSource(provider.sub);
        else if (provider.type === 'rss') results = await fetchRSSSource(provider);
        else if (provider.type === 'wiki_featured') results = await fetchWikiFeatured();
        else if (provider.type === 'youtube_rss') results = await fetchYouTubeRSS(provider);
        
        return results.slice(0, 4).map(item => ({
          ...item,
          contentType: provider.contentType || 'Article',
          categoryLabel: getCategoryLabel(provider.categories)
        }));
      } catch (err) {
        return [];
      }
    });

    const nestedResults = await Promise.all(fetchPromises);
    const allPosts = nestedResults.flat();
    
    // Update Recent
    const updatedRecent = Array.from(new Set([...recentSources, ...selectedProviders.map(p => p.name)]));
    await AsyncStorage.setItem('streamdeck_adventure_recent_sources', JSON.stringify(updatedRecent.slice(-20)));

    return allPosts.sort(() => Math.random() - 0.5);
  } catch (err) {
    console.error(`[DiscoveryService] Multi-fetch failed:`, err);
    return [];
  }
};

function getCategoryLabel(ids) {
  if (!ids || ids.length === 0) return 'Other';
  const cat = ADVENTURE_CATEGORIES.find(c => c.id === ids[0]);
  return cat ? cat.name : 'Other';
}

async function fetchRedditSource(sub) {
  const response = await fetch(`https://www.reddit.com/r/${sub}/top.json?limit=15&t=week`);
  const json = await response.json();
  return json.data.children.map(child => {
    const p = child.data;
    let imageUrl = p.url;
    if (p.preview && p.preview.images && p.preview.images[0]) {
      imageUrl = p.preview.images[0].source.url.replace(/&amp;/g, '&');
    }
    return {
      id: p.name,
      title: p.title,
      snippet: p.selftext || `Curated discovery from r/${p.subreddit}`,
      thumb: imageUrl,
      url: `https://reddit.com${p.permalink}`,
      source: `r/${p.subreddit}`,
      category: 'Mind-Blowing'
    };
  }).filter(p => p.thumb && !p.thumb.includes('reddit.com/r/'));
}

async function fetchRSSSource(provider) {
  const response = await fetch(provider.url);
  const text = await response.text();
  
  // Custom XML parsing for React Native (DOMParser alternative or regex)
  // Since RN doesn't have a native DOMParser, we use a simple regex-based extraction 
  // or the user might have an XML library. We'll use lookaheads/regex for lightweight extraction.
  
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(text)) !== null) {
    const itemContent = match[1];
    const title = itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] || 
                  itemContent.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const link = itemContent.match(/<link>([\s\S]*?)<\/link>/)?.[1];
    const desc = itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ||
                 itemContent.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '';
    
    let thumb = '';
    const enclosureMatch = itemContent.match(/<enclosure[^>]+url="([^">]+)"/);
    if (enclosureMatch) {
      thumb = enclosureMatch[1];
    } else {
      const mediaMatch = itemContent.match(/<media:content[^>]+url="([^">]+)"/);
      if (mediaMatch) thumb = mediaMatch[1];
    }

    if (!thumb) {
      const imgMatch = desc.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch) thumb = imgMatch[1];
    }

    // Robust discovery image sanitization for Mobile
    if (thumb && thumb.includes('?')) {
      thumb = thumb.split('?')[0];
    }

    if (!thumb) thumb = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop';

    if (title && link) {
      items.push({
        id: link,
        title: title.trim(),
        snippet: desc.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
        thumb,
        url: link,
        source: provider.name,
        category: provider.categories[0] || 'Discovery'
      });
    }
  }
  return items;
}

async function fetchWikiFeatured() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  
  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/featured/${y}/${m}/${d}`);
    const data = await response.json();
    const results = [];
    
    if (data.tfa) {
      results.push({
        id: 'wiki-tfa-' + d,
        title: data.tfa.titles.normalized,
        snippet: data.tfa.extract,
        thumb: data.tfa.thumbnail?.source || data.tfa.originalimage?.source,
        url: data.tfa.content_urls.desktop.page,
        source: 'Wikipedia Featured',
        category: 'Article of the Day'
      });
    }
    
    if (data.onthisday && data.onthisday[0]) {
      const event = data.onthisday[0];
      results.push({
        id: 'wiki-otd-' + d,
        title: `On This Day: ${event.year}`,
        snippet: event.text,
        thumb: event.pages[0]?.thumbnail?.source || data.tfa?.thumbnail?.source,
        url: event.pages[0]?.content_urls?.desktop.page,
        source: 'History',
        category: 'Flashback'
      });
    }

    return results;
  } catch (e) { return []; }
}

async function fetchYouTubeRSS(provider) {
  const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${provider.channelId}`);
  const text = await response.text();
  
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(text)) !== null) {
    const content = match[1];
    const title = content.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const link = content.match(/<link[^>]+href="([^">]+)"/)?.[1];
    const videoId = content.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)?.[1];
    const thumb = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    
    if (title && link) {
      entries.push({
        id: videoId || link,
        title: title.trim(),
        snippet: 'New educational video release.',
        thumb: thumb,
        url: link,
        source: provider.name,
        category: 'Education'
      });
    }
  }
  return entries;
}

function cleanHTML(html) {
  return html.replace(/<[^>]*>?/gm, '').trim();
}
