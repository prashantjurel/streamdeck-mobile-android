// StreamDeck Mobile — Live TV Screen
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  Linking,
  Image,
  ImageBackground,
  TextInput,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {Colors, FontSizes, Spacing, BorderRadius} from '../theme/colors';
import SectionHeader from '../components/SectionHeader';
import { loadSettings } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';
import { fetchLiveSportsData, fetchWorldCupData } from '../services/sports';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const SPORT_CATEGORIES = [
  {id: 'all', name: 'All Sports', icon: 'grid-outline'},
  {id: 'cricket', name: 'Cricket', icon: 'cricket', iconType: 'MCI'},
  {id: 'football', name: 'Football', icon: 'football-outline'},
  {id: 'f1', name: 'F1 Racing', icon: 'speedometer-outline'},
];

const PROVIDER_CONFIG = {
  'IPL Live': [
    { id: 'hotstar', name: 'JioHotstar', appScheme: 'hotstar://', url: 'https://www.hotstar.com', color: '#001944', icon: '⭐' }
  ],
  'Football': [
    { id: 'hotstar', name: 'JioHotstar', appScheme: 'hotstar://', url: 'https://www.hotstar.com', color: '#001944', icon: '⭐' }
  ],
  'F1 Live': [
    { id: 'fancode', name: 'FanCode', appScheme: 'fancode://', url: 'https://fancode.com', color: '#FF6B35', icon: '⚽' }
  ]
};

const INITIAL_WORLD_CUP_STANDINGS = {
  A: [
    { rank: 1, team: 'Mexico', flag: '🇲🇽', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 2, team: 'South Africa', flag: '🇿🇦', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 3, team: 'South Korea', flag: '🇰🇷', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 4, team: 'Czechia', flag: '🇨🇿', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 }
  ],
  B: [
    { rank: 1, team: 'Canada', flag: '🇨🇦', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 2, team: 'Bosnia-Herzegovina', flag: '🇧🇦', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 3, team: 'Qatar', flag: '🇶🇦', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 4, team: 'Switzerland', flag: '🇨🇭', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 }
  ],
  C: [
    { rank: 1, team: 'Brazil', flag: '🇧🇷', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 2, team: 'Morocco', flag: '🇲🇦', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 3, team: 'Haiti', flag: '🇭🇹', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 4, team: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 }
  ],
  D: [
    { rank: 1, team: 'United States', flag: '🇺🇸', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 2, team: 'Paraguay', flag: '🇵🇾', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 3, team: 'Australia', flag: '🇦🇺', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 4, team: 'Türkiye', flag: '🇹🇷', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 }
  ],
  E: [
    { rank: 1, team: 'Germany', flag: '🇩🇪', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 2, team: 'Curacao', flag: '🇨🇼', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 3, team: 'Ivory Coast', flag: '🇨🇮', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 4, team: 'Ecuador', flag: '🇪🇨', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 }
  ],
  F: [
    { rank: 1, team: 'Netherlands', flag: '🇳🇱', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 2, team: 'Japan', flag: '🇯🇵', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 3, team: 'Tunisia', flag: '🇹🇳', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 4, team: 'Sweden', flag: '🇸🇪', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 }
  ],
  G: [
    { rank: 1, team: 'Belgium', flag: '🇧🇪', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 2, team: 'Egypt', flag: '🇪🇬', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 3, team: 'Iran', flag: '🇮🇷', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 4, team: 'New Zealand', flag: '🇳🇿', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 }
  ],
  H: [
    { rank: 1, team: 'Spain', flag: '🇪🇸', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 2, team: 'Cape Verde', flag: '🇨🇻', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 3, team: 'Saudi Arabia', flag: '🇸🇦', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 4, team: 'Uruguay', flag: '🇺🇾', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 }
  ],
  I: [
    { rank: 1, team: 'France', flag: '🇫🇷', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 2, team: 'Senegal', flag: '🇸🇳', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 3, team: 'Iraq', flag: '🇮🇶', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 4, team: 'Norway', flag: '🇳🇴', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 }
  ],
  J: [
    { rank: 1, team: 'Argentina', flag: '🇦🇷', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 2, team: 'Algeria', flag: '🇩🇿', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 3, team: 'Austria', flag: '🇦🇹', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 4, team: 'Jordan', flag: '🇯🇴', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 }
  ],
  K: [
    { rank: 1, team: 'Portugal', flag: '🇵🇹', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 2, team: 'Colombia', flag: '🇨🇴', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 3, team: 'Uzbekistan', flag: '🇺🇿', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 4, team: 'DR Congo', flag: '🇨🇩', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 }
  ],
  L: [
    { rank: 1, team: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 2, team: 'Croatia', flag: '🇭🇷', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 3, team: 'Panama', flag: '🇵🇦', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 },
    { rank: 4, team: 'Ghana', flag: '🇬🇭', p: 0, w: 0, d: 0, l: 0, gd: '0', pts: 0 }
  ]
};

const WORLD_CUP_MATCHES = [];

const WORLD_CUP_KNOCKOUTS = {
  r32: [
    { team1: '2A', team2: '2B', date: 'June 29, 2026 • 02:30 AM IST • Match 73', location: 'Los Angeles' },
    { team1: '1E', team2: '3A/B/C/D/F', date: 'June 30, 2026 • 05:30 AM IST • Match 74', location: 'Boston' },
    { team1: '1F', team2: '2C', date: 'June 30, 2026 • 02:30 AM IST • Match 75', location: 'Monterrey' },
    { team1: '1C', team2: '2F', date: 'June 30, 2026 • 06:30 AM IST • Match 76', location: 'Houston' },
    { team1: '1I', team2: '3C/D/F/G/H', date: 'July 01, 2026 • 02:30 AM IST • Match 77', location: 'Dallas' },
    { team1: '2E', team2: '2I', date: 'July 01, 2026 • 05:30 AM IST • Match 78', location: 'East Rutherford' },
    { team1: '1A', team2: '3C/E/F/H/I', date: 'July 01, 2026 • 06:30 AM IST • Match 79', location: 'Seattle' },
    { team1: '1L', team2: '3E/H/I/J/K', date: 'July 02, 2026 • 02:30 AM IST • Match 80', location: 'Atlanta' },
    { team1: '1D', team2: '3B/E/F/I/J', date: 'July 02, 2026 • 05:30 AM IST • Match 81', location: 'San Francisco' },
    { team1: '1G', team2: '3A/E/H/I/J', date: 'July 02, 2026 • 06:30 AM IST • Match 82', location: 'Pasadena' },
    { team1: '2K', team2: '2L', date: 'July 03, 2026 • 02:30 AM IST • Match 83', location: 'Toronto' },
    { team1: '1H', team2: '2J', date: 'July 03, 2026 • 05:30 AM IST • Match 84', location: 'Los Angeles' },
    { team1: '1B', team2: '3E/F/G/I/J', date: 'July 03, 2026 • 06:30 AM IST • Match 85', location: 'East Rutherford' },
    { team1: '1J', team2: '2H', date: 'July 04, 2026 • 02:30 AM IST • Match 86', location: 'Miami' },
    { team1: '1K', team2: '3D/E/I/J/L', date: 'July 04, 2026 • 05:30 AM IST • Match 87', location: 'Dallas' },
    { team1: '2D', team2: '2G', date: 'July 04, 2026 • 06:30 AM IST • Match 88', location: 'Kansas City' }
  ],
  r16: [
    { team1: 'W74', team2: 'W77', date: 'July 05, 2026 • 02:30 AM IST • Match 89', location: 'Philadelphia' },
    { team1: 'W73', team2: 'W75', date: 'July 06, 2026 • 02:30 AM IST • Match 90', location: 'Houston' },
    { team1: 'W76', team2: 'W78', date: 'July 06, 2026 • 05:30 AM IST • Match 91', location: 'East Rutherford' },
    { team1: 'W79', team2: 'W80', date: 'July 07, 2026 • 02:30 AM IST • Match 92', location: 'Mexico City' },
    { team1: 'W83', team2: 'W84', date: 'July 07, 2026 • 05:30 AM IST • Match 93', location: 'Dallas' },
    { team1: 'W81', team2: 'W82', date: 'July 08, 2026 • 02:30 AM IST • Match 94', location: 'Seattle' },
    { team1: 'W86', team2: 'W88', date: 'July 08, 2026 • 05:30 AM IST • Match 95', location: 'Atlanta' },
    { team1: 'W85', team2: 'W87', date: 'July 08, 2026 • 06:30 AM IST • Match 96', location: 'Vancouver' }
  ],
  qf: [
    { team1: 'W89', team2: 'W90', date: 'July 11, 2026 • 02:30 AM IST • Match 97', location: 'Boston' },
    { team1: 'W91', team2: 'W92', date: 'July 12, 2026 • 02:30 AM IST • Match 98', location: 'Miami' },
    { team1: 'W93', team2: 'W94', date: 'July 12, 2026 • 05:30 AM IST • Match 99', location: 'Kansas City' },
    { team1: 'W95', team2: 'W96', date: 'July 12, 2026 • 06:30 AM IST • Match 100', location: 'Los Angeles' }
  ],
  sf: [
    { team1: 'W97', team2: 'W98', date: 'July 15, 2026 • 05:30 AM IST • Match 101', location: 'Dallas' },
    { team1: 'W99', team2: 'W100', date: 'July 16, 2026 • 05:30 AM IST • Match 102', location: 'Atlanta' }
  ],
  final: [
    { team1: 'W101', team2: 'W102', date: 'July 20, 2026 • 02:30 AM IST • Final', location: 'MetLife Stadium, NY/NJ' }
  ]
};

const INITIAL_WORLD_CUP_CHRONOLOGICAL_GROUP_STAGE = [];

const cleanTeamName = (name) => {
  if (!name) return '';
  let n = name.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ');
  if (n === 'usa') return 'united states';
  if (n === 'turkey') return 'turkiye';
  if (n === 'cote d ivoire' || n === 'cote divoire') return 'ivory coast';
  if (n === 'cabo verde') return 'cape verde';
  if (n === 'bosnia-herzegovina' || n === 'bosnia and herzegovina' || n === 'bosnia herzegovina' || n === 'bosnia herz') return 'bosnia-herzegovina';
  return n;
};

const getDisplayTeamName = (name) => {
  if (!name) return '';
  const lowercase = name.toLowerCase();
  if (lowercase.includes('bosnia')) return 'Bosnia-Herz.';
  if (lowercase === 'united states' || lowercase === 'united states of america') return 'USA';
  if (lowercase.includes('congo dr') || lowercase.includes('dr congo') || lowercase.includes('democratic republic of the congo')) return 'DR Congo';
  return name;
};

const getGroupForTeam = (teamName) => {
  if (!teamName) return 'A';
  const cleanName = cleanTeamName(teamName);
  for (const g of Object.keys(INITIAL_WORLD_CUP_STANDINGS)) {
    if (INITIAL_WORLD_CUP_STANDINGS[g].some(t => cleanTeamName(t.team) === cleanName)) {
      return g;
    }
  }
  return 'A'; // fallback
};

const parseMatchDate = (match) => {
  if (match.rawDate) return new Date(match.rawDate);
  try {
    const parts = match.date.split('•');
    const datePart = parts[0].trim();
    const timePart = parts[1].replace('IST', '').trim();
    
    const [time, ampm] = timePart.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    const date = new Date(datePart);
    date.setHours(hours);
    date.setMinutes(minutes);
    return date;
  } catch (e) {
    return new Date();
  }
};

const getBlockbusterMatches = (matches) => {
  if (!matches || matches.length === 0) return [];
  
  const keyNations = ['portugal', 'argentina', 'brazil', 'germany', 'spain', 'france', 'croatia', 'england', 'norway'];
  
  const firstMatch = matches[0];
  const otherBlockbusters = matches.filter((m, index) => {
    if (index === 0) return false;
    const t1 = m.team1.toLowerCase();
    const t2 = m.team2.toLowerCase();
    return keyNations.some(nation => t1.includes(nation) || t2.includes(nation));
  });
  
  const allBlockbusters = firstMatch ? [firstMatch, ...otherBlockbusters] : otherBlockbusters;
  
  allBlockbusters.sort((a, b) => {
    if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
    if (b.status === 'LIVE' && a.status !== 'LIVE') return 1;
    
    const dateA = a.rawDate ? new Date(a.rawDate) : parseMatchDate(a);
    const dateB = b.rawDate ? new Date(b.rawDate) : parseMatchDate(b);
    return dateA - dateB;
  });
  
  return allBlockbusters;
};

const mergeMatches = (apiMatches, initialMatches) => {
  const merged = initialMatches.map(initMatch => {
    const matchInApi = apiMatches.find(apiM => {
      const apiT1 = cleanTeamName(apiM.team1);
      const apiT2 = cleanTeamName(apiM.team2);
      const initT1 = cleanTeamName(initMatch.team1);
      const initT2 = cleanTeamName(initMatch.team2);
      return (apiT1 === initT1 && apiT2 === initT2) || (apiT1 === initT2 && apiT2 === initT1);
    });
    
    if (matchInApi) {
      return {
        ...initMatch,
        status: matchInApi.status,
        score: matchInApi.score,
        date: matchInApi.date,
        rawDate: matchInApi.rawDate,
        venue: matchInApi.venue,
        homeScore: matchInApi.homeScore,
        awayScore: matchInApi.awayScore,
      };
    }
    return initMatch;
  });
  
  const extras = apiMatches.filter(apiM => {
    return !initialMatches.some(initMatch => {
      const apiT1 = cleanTeamName(apiM.team1);
      const apiT2 = cleanTeamName(apiM.team2);
      const initT1 = cleanTeamName(initMatch.team1);
      const initT2 = cleanTeamName(initMatch.team2);
      return (apiT1 === initT1 && apiT2 === initT2) || (apiT1 === initT2 && apiT2 === initT1);
    });
  });
  
  const combined = [...merged, ...extras];
  combined.sort((a, b) => {
    const dateA = a.rawDate ? new Date(a.rawDate) : parseMatchDate(a);
    const dateB = b.rawDate ? new Date(b.rawDate) : parseMatchDate(b);
    return dateA - dateB;
  });
  
  return combined;
};

const getUpdatedStandings = (matches) => {
  const computed = JSON.parse(JSON.stringify(INITIAL_WORLD_CUP_STANDINGS));
  
  matches.forEach(m => {
    if (m.status === 'LIVE' || m.status === 'FINISHED') {
      let groupLetter = null;
      let t1Idx = -1;
      let t2Idx = -1;
      
      for (const g of Object.keys(computed)) {
        const idx1 = computed[g].findIndex(t => cleanTeamName(t.team) === cleanTeamName(m.team1));
        const idx2 = computed[g].findIndex(t => cleanTeamName(t.team) === cleanTeamName(m.team2));
        if (idx1 !== -1 && idx2 !== -1) {
          groupLetter = g;
          t1Idx = idx1;
          t2Idx = idx2;
          break;
        }
      }
      
      if (groupLetter !== null) {
        const t1 = computed[groupLetter][t1Idx];
        const t2 = computed[groupLetter][t2Idx];
        
        t1.p += 1;
        t2.p += 1;
        
        const s1 = m.homeScore || 0;
        const s2 = m.awayScore || 0;
        const diff = s1 - s2;
        
        if (s1 > s2) {
          t1.w += 1;
          t1.pts += 3;
          t2.l += 1;
        } else if (s2 > s1) {
          t2.w += 1;
          t2.pts += 3;
          t1.l += 1;
        } else {
          t1.d += 1;
          t1.pts += 1;
          t2.d += 1;
          t2.pts += 1;
        }
        
        const currentGd1 = parseInt(t1.gd, 10) || 0;
        const currentGd2 = parseInt(t2.gd, 10) || 0;
        
        const newGd1 = currentGd1 + diff;
        const newGd2 = currentGd2 - diff;
        
        t1.gd = newGd1 > 0 ? `+${newGd1}` : `${newGd1}`;
        t2.gd = newGd2 > 0 ? `+${newGd2}` : `${newGd2}`;
      }
    }
  });
  
  Object.keys(computed).forEach(g => {
    computed[g].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const gdA = parseInt(a.gd, 10) || 0;
      const gdB = parseInt(b.gd, 10) || 0;
      if (gdB !== gdA) return gdB - gdA;
      return a.team.localeCompare(b.team);
    });
    computed[g].forEach((t, index) => {
      t.rank = index + 1;
    });
  });
  
  return computed;
};

const LiveTVScreen = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPicker, setShowPicker] = useState(false);
  const [selectedQuickItem, setSelectedQuickItem] = useState(null);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [customProviders, setCustomProviders] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  
  // FIFA World Cup 2026 States
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [countdownStr, setCountdownStr] = useState('');
  const [wcHubMode, setWcHubMode] = useState('groups'); // 'groups' | 'knockouts'
  const [selectedKnockoutRound, setSelectedKnockoutRound] = useState('r32'); // 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  
  const [worldCupMatches, setWorldCupMatches] = useState(INITIAL_WORLD_CUP_CHRONOLOGICAL_GROUP_STAGE);
  const [worldCupStandings, setWorldCupStandings] = useState(INITIAL_WORLD_CUP_STANDINGS);
  const [blockbusterMatches, setBlockbusterMatches] = useState([]);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [wcExpanded, setWcExpanded] = useState(true);
  const [liveExpanded, setLiveExpanded] = useState(true);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  
  const groupScheduleScrollRef = React.useRef(null);

  useEffect(() => {
    if (route.params?.expandWorldCup) {
      setWcExpanded(true);
      navigation.setParams({ expandWorldCup: undefined });
    }
  }, [route.params?.expandWorldCup, navigation]);

  useEffect(() => {
    if (wcHubMode === 'groups' && groupScheduleScrollRef.current && worldCupMatches.length > 0) {
      const activeIndex = worldCupMatches.findIndex(
        m => m.status === 'LIVE' || m.status === 'UPCOMING' || !m.status
      );
      if (activeIndex > 0) {
        setTimeout(() => {
          groupScheduleScrollRef.current?.scrollTo({
            y: activeIndex * 110, // Approx height + gap
            animated: true
          });
        }, 400);
      }
    }
  }, [wcHubMode, worldCupMatches]);


  useEffect(() => {
    const calculateCountdown = () => {
      const target = new Date('2026-06-12T04:30:00+05:30');
      const now = new Date();
      const diff = target - now;
      if (diff <= 0) {
        setCountdownStr('⚡ LIVE NOW!');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      setCountdownStr(`${days}d ${hours}h ${mins}m ${secs}s`);
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reanimated Hooks (Must be stable at the top)
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Fetch custom providers from settings whenever this screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadSettings().then(settings => {
        setCustomProviders(settings.liveSportsProviders || []);
      });
      
      const loadMatches = async () => {
        setLoadingMatches(true);

        // Fetch general sports AND World Cup data in parallel — they're independent
        const [matches, apiWorldCupMatches] = await Promise.all([
          fetchLiveSportsData().catch(err => {
            console.error('[LiveTV] fetchLiveSportsData failed:', err);
            return [];
          }),
          fetchWorldCupData().catch(err => {
            console.error('[LiveTV] fetchWorldCupData failed:', err);
            return [];
          }),
        ]);

        setLiveMatches(matches);
        
        // Merge API data with the full mock list to show all matches
        const merged = mergeMatches(apiWorldCupMatches, INITIAL_WORLD_CUP_CHRONOLOGICAL_GROUP_STAGE);
        
        // Enriched with groups for rendering/standings
        const enriched = merged.map(m => ({
          ...m,
          group: m.group || getGroupForTeam(m.team1)
        }));
        
        setWorldCupMatches(enriched);
        setWorldCupStandings(getUpdatedStandings(enriched));
        
        // Process blockbuster matches dynamically
        const blockbusters = getBlockbusterMatches(enriched).map(m => {
          let displayTime = m.date;
          if (m.status === 'LIVE') {
            displayTime = `⚡ LIVE NOW - ${m.score || ''}`;
          } else if (m.status === 'FINISHED') {
            displayTime = `FT - ${m.score || ''}`;
          }
          return {
            ...m,
            time: displayTime
          };
        });
        setBlockbusterMatches(blockbusters);
        
        setLoadingMatches(false);
      };
      
      loadMatches();
    }, [])
  );

  // Fallback padding for devices that report 0 insets
  const topPadding = insets.top || StatusBar.currentHeight || 0;
  const bottomPadding = insets.bottom || 20;

  const getCustomProviderAppearance = (name, url) => {
    const text = (name + url).toLowerCase();
    
    let icon = '⚡'; // Default
    if (text.includes('cric')) icon = '🏏';
    else if (text.includes('foot') || text.includes('soccer')) icon = '⚽';
    else if (text.includes('f1') || text.includes('race')) icon = '🏎️';
    else if (text.includes('sport')) icon = '🏟️';
    else if (text.includes('tv') || text.includes('stream') || text.includes('watch')) icon = '📺';
    else if (text.includes('live')) icon = '🔴';
    else if (text.includes('play')) icon = '▶️';
    else if (text.includes('flix') || text.includes('movie')) icon = '🍿';
    
    // Generate a consistent pseudo-random vibrant color based on the name string
    const colors = [
      '#FF3366', '#8B5CF6', '#3B82F6', '#10B981', 
      '#F59E0B', '#EC4899', '#14B8A6', '#6366F1'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    
    return { icon, color: colors[colorIndex] };
  };

  const handleQuickAccessPress = (item) => {
    setSelectedQuickItem(item);
    
    const nativeProviders = PROVIDER_CONFIG[item.name] || [];
    
    // Map user's custom providers to the provider schema with dynamic aesthetics
    const formattedCustomProviders = customProviders.map((p, idx) => {
      const appearance = getCustomProviderAppearance(p.name, p.url);
      return {
        id: `custom_${idx}`,
        name: p.name,
        url: p.url,
        color: appearance.color,
        icon: appearance.icon,
      };
    });

    setAvailableProviders([...nativeProviders, ...formattedCustomProviders]);
    setShowPicker(true);
  };

  const handleSelectProvider = async (provider) => {
    setShowPicker(false);
    
    if (provider.appScheme) {
      try {
        const canOpen = await Linking.canOpenURL(provider.appScheme);
        if (canOpen) {
          await Linking.openURL(provider.appScheme);
          return;
        }
      } catch (e) {
        console.warn(`[LiveTV] Could not open native app for ${provider.id}:`, e);
      }
    }

    // Fallback to WebView
    let finalUrl = provider.url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    navigation.navigate('WebView', {
      url: finalUrl,
      title: `${selectedQuickItem.name} on ${provider.name}`,
      appId: provider.id,
      color: provider.color,
      type: 'live_sports', // Skips cinematic loader, CW tracking, and sandbox stripping
    });
  };

  const RenderMatchCard = ({ match }) => {
    const [img1Error, setImg1Error] = useState(false);
    const [img2Error, setImg2Error] = useState(false);

    return (
      <TouchableOpacity
        style={styles.matchCard}
        activeOpacity={0.8}
        onPress={() => handleQuickAccessPress({ name: match.quickAccessName })}
      >
        <View style={styles.matchThumbContainer}>
          <Image 
            source={{ 
              uri: match.type === 'f1' 
                ? 'https://images.pexels.com/photos/36920232/pexels-photo-36920232.jpeg?auto=compress&cs=tinysrgb&w=1200'
                : match.type === 'football'
                ? 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=800'
                : 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=800'
            }} 
            style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} 
            resizeMode="cover"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12 }]} />
          
          {match.type === 'f1' ? null : match.logo1 && match.logo2 ? (
            <View style={styles.splitThumb}>
              <View style={styles.teamSide}>
                {!img1Error ? (
                  <Image 
                    source={{ uri: match.logo1 }} 
                    style={{ width: 40, height: 40 }} 
                    resizeMode="contain" 
                    onError={() => setImg1Error(true)}
                  />
                ) : (
                  <Text style={styles.teamFallbackIcon}>
                    {match.type === 'football' ? '⚽' : match.type === 'cricket' ? '🏏' : '🏁'}
                  </Text>
                )}
              </View>
              <View style={styles.vsCircle}><Text style={styles.vsText}>VS</Text></View>
              <View style={styles.teamSide}>
                {!img2Error ? (
                  <Image 
                    source={{ uri: match.logo2 }} 
                    style={{ width: 40, height: 40 }} 
                    resizeMode="contain" 
                    onError={() => setImg2Error(true)}
                  />
                ) : (
                  <Text style={styles.teamFallbackIcon}>
                    {match.type === 'football' ? '⚽' : match.type === 'cricket' ? '🏏' : '🏁'}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.genericThumb}>
              <Text style={styles.genericIcon}>
                {match.type === 'football' ? '⚽' : match.type === 'cricket' ? '🏏' : '🏁'}
              </Text>
            </View>
          )}

          {match.status === 'LIVE' && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
          {match.status === 'soon' && (
            <View style={[styles.liveBadge, {backgroundColor: Colors.accentPurple}]}>
              <Text style={styles.liveBadgeText}>SOON</Text>
            </View>
          )}
        </View>

        <View style={styles.matchInfo}>
          <Text style={styles.matchTitle} numberOfLines={2}>{match.title}</Text>
          <Text style={[styles.matchTime, match.status === 'LIVE' && {color: '#10b981'}]}>
            {match.time}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screen, {paddingBottom: insets.bottom || 80}]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingTop: topPadding}}
      >
        <View style={{height: Spacing.md}} />

        <SectionHeader
          title="Live TV"
          subtitle="Watch live sports and TV channels"
          rightAction={
            <TouchableOpacity 
              onPress={() => navigation.navigate('SourceManager', { type: 'sports' })}
              style={styles.headerPillAction}
            >
              <Ionicons name="add" size={16} color={Colors.textPrimary} style={{marginRight: 4}} />
              <Text style={styles.headerActionText}>Sources</Text>
            </TouchableOpacity>
          }
        />

        {/* Category Filter — Dynamic Glow Tabs */}
        <View style={styles.tabContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabContent}>
            {SPORT_CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryChipContainer}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.categoryChip, isSelected && styles.categoryChipActive]}>
                    {isSelected && (
                      <Animated.View style={[styles.glowBorder, glowAnimatedStyle]}>
                        <LinearGradient
                          colors={[Colors.accentPink, 'transparent', Colors.accentPink, 'transparent', Colors.accentPink]}
                          style={{ flex: 1 }}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                      </Animated.View>
                    )}
                    <View style={[styles.categoryChipInner, isSelected && styles.categoryChipInnerActive]}>
                    {cat.iconType === 'MCI' ? (
                      <MaterialCommunityIcons 
                        name={cat.icon} 
                        size={18} 
                        color={isSelected ? '#fff' : 'rgba(255,255,255,0.4)'} 
                        style={{ marginRight: 6 }} 
                      />
                    ) : (
                      <Ionicons 
                        name={cat.icon} 
                        size={16} 
                        color={isSelected ? '#fff' : 'rgba(255,255,255,0.4)'} 
                        style={{ marginRight: 6 }} 
                      />
                    )}
                      <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                        {cat.name}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* FIFA World Cup 2026 Hub */}
        {(selectedCategory === 'all' || selectedCategory === 'football') && (
          <View style={styles.wcHubContainer}>
            <TouchableOpacity 
              style={styles.wcCollapsibleHeader} 
              onPress={() => setWcExpanded(!wcExpanded)}
              activeOpacity={0.8}
            >
              <View style={styles.wcCollapsibleTitleContainer}>
                <Ionicons name="trophy-outline" size={16} color="#FFD700" />
                <Text style={styles.wcCollapsibleTitle}>FIFA WORLD CUP 2026</Text>
              </View>
              <Ionicons 
                name={wcExpanded ? "chevron-up" : "chevron-down"} 
                size={18} 
                color="#FFD700" 
              />
            </TouchableOpacity>

            {wcExpanded && (
              <>
                {/* Elegant Header Banner with Stadium Photo */}
            <ImageBackground
              source={require('../assets/images/wc_bg.png')}
              style={styles.wcBannerImageBg}
              imageStyle={{ borderRadius: 24 }}
            >
              <LinearGradient
                colors={['rgba(2, 44, 34, 0.85)', 'rgba(6, 78, 59, 0.85)', 'rgba(15, 23, 42, 0.9)']}
                style={styles.wcBannerGradientOverlay}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
              >
                <View style={styles.wcBadge}>
                  <Text style={styles.wcBadgeText}>🏆 FIFA WORLD CUP 2026</Text>
                </View>
                <Text style={styles.wcTitle}>The Greatest Show on Earth</Text>
                <Text style={styles.wcSubtitle}>USA • Canada • Mexico</Text>
                
                {/* Countdown Ticker */}
                <View style={styles.wcCountdownBox}>
                  <View style={styles.wcPulseDot} />
                  <Text style={styles.wcCountdownLabel}>COUNTDOWN (IST): </Text>
                  <Text style={styles.wcCountdownValue}>{countdownStr || 'Calculating...'}</Text>
                </View>
              </LinearGradient>
            </ImageBackground>

            {/* Featured Blockbuster Match Carousel */}
            <Text style={styles.wcSectionLabel}>FEATURED BLOCKBUSTERS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.wcMatchesScroll}
            >
              {blockbusterMatches.map((match, idx) => (
                <TouchableOpacity
                  key={match.id || idx}
                  style={styles.wcMatchCard}
                  activeOpacity={0.8}
                  onPress={() => handleQuickAccessPress({ name: 'Football' })}
                >
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.08)', 'rgba(0,0,0,0.85)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.wcCardHeader}>
                    <Text style={styles.wcStadiumText} numberOfLines={1}>{match.venue || match.stadium || 'TBA'}</Text>
                    {match.status === 'LIVE' && (
                      <View style={styles.wcLiveBadge}>
                        <View style={styles.wcLiveDot} />
                        <Text style={styles.wcLiveText}>LIVE</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.wcTeamsRow}>
                    <View style={styles.wcTeamColumn}>
                      <Text style={styles.wcFlagText}>{match.flag1}</Text>
                      <Text style={styles.wcTeamText}>{match.team1}</Text>
                    </View>
                    {match.status === 'LIVE' || match.status === 'FINISHED' ? (
                      <View style={styles.wcScoreContainer}>
                        <Text style={styles.wcScoreText}>{match.score}</Text>
                      </View>
                    ) : (
                      <Text style={styles.wcVsText}>VS</Text>
                    )}
                    <View style={styles.wcTeamColumn}>
                      <Text style={styles.wcFlagText}>{match.flag2}</Text>
                      <Text style={styles.wcTeamText}>{match.team2}</Text>
                    </View>
                  </View>

                  <Text style={styles.wcTimeText}>{match.time}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Interactive World Cup Dashboard (Togglable Mode Switcher) */}
            <View style={styles.wcModeSwitcherContainer}>
              <TouchableOpacity
                style={[styles.wcModeButton, wcHubMode === 'groups' && styles.wcModeButtonActive]}
                onPress={() => setWcHubMode('groups')}
              >
                <Ionicons name="grid-outline" size={14} color={wcHubMode === 'groups' ? '#FFD700' : 'rgba(255,255,255,0.4)'} />
                <Text style={[styles.wcModeButtonText, wcHubMode === 'groups' && styles.wcModeButtonTextActive]}>
                  GROUP STAGE
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.wcModeButton, wcHubMode === 'knockouts' && styles.wcModeButtonActive]}
                onPress={() => setWcHubMode('knockouts')}
              >
                <Ionicons name="git-network-outline" size={14} color={wcHubMode === 'knockouts' ? '#FFD700' : 'rgba(255,255,255,0.4)'} />
                <Text style={[styles.wcModeButtonText, wcHubMode === 'knockouts' && styles.wcModeButtonTextActive]}>
                  KNOCKOUT BRACKET
                </Text>
              </TouchableOpacity>
            </View>

            {wcHubMode === 'groups' ? (
              <View style={styles.standingsWidget}>
                {/* Horizontal Scrollable Groups A to L Tabs */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.groupTabsScrollContent}
                  style={styles.groupTabsScroll}
                >
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(group => (
                    <TouchableOpacity
                      key={group}
                      style={[styles.groupTabButtonScroll, selectedGroup === group && styles.groupTabButtonActive]}
                      onPress={() => setSelectedGroup(group)}
                    >
                      <Text style={[styles.groupTabText, selectedGroup === group && styles.groupTabTextActive]}>
                        GROUP {group}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Leaderboard Table */}
                <View style={styles.standingsTable}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.headerCell, {flex: 0.8}]}>TEAM</Text>
                    <Text style={styles.headerCell}>P</Text>
                    <Text style={styles.headerCell}>W</Text>
                    <Text style={styles.headerCell}>GD</Text>
                    <Text style={[styles.headerCell, {fontWeight: 'bold', color: '#FFD700'}]}>PTS</Text>
                  </View>
                  
                  {worldCupStandings[selectedGroup]?.map((team, idx) => (
                    <View key={idx} style={[styles.tableTeamRow, idx === 0 && styles.tableTopTeamRow]}>
                      <View style={[styles.cellContainer, {flex: 0.8}]}>
                        <Text style={styles.teamRankText}>{team.rank}</Text>
                        <Text style={styles.teamFlagIcon}>{team.flag}</Text>
                        <Text style={styles.teamNameText} numberOfLines={1}>{team.team}</Text>
                      </View>
                      <Text style={styles.cellText}>{team.p}</Text>
                      <Text style={styles.cellText}>{team.w}</Text>
                      <Text style={styles.cellText}>{team.gd}</Text>
                      <Text style={[styles.cellText, {fontWeight: '800', color: idx === 0 ? '#FFD700' : '#fff'}]}>
                        {team.pts}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Dynamic Chronological Group Stage Schedule */}
                <Text style={styles.groupMatchesHeader}>GROUP STAGE MATCHES (IST)</Text>
                
                {/* Team Search Query Filter */}
                <View style={styles.searchContainer}>
                  <Ionicons name="search-outline" size={16} color="rgba(255, 255, 255, 0.4)" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Filter by team (e.g. Argentina, Brazil)..."
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    value={teamSearchQuery}
                    onChangeText={setTeamSearchQuery}
                    clearButtonMode="while-editing"
                    autoCapitalize="none"
                  />
                  {teamSearchQuery !== '' && (
                    <TouchableOpacity onPress={() => setTeamSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color="rgba(255, 255, 255, 0.4)" />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView 
                  ref={groupScheduleScrollRef}
                  nestedScrollEnabled
                  style={styles.wcKnockoutMatchListScroll}
                  contentContainerStyle={styles.wcKnockoutMatchList}
                  showsVerticalScrollIndicator={true}
                >
                  {worldCupMatches
                    .filter(m => {
                      if (!teamSearchQuery) return true;
                      const q = teamSearchQuery.toLowerCase().trim();
                      return m.team1.toLowerCase().includes(q) || m.team2.toLowerCase().includes(q);
                    })
                    .map((match, idx) => (
                      <TouchableOpacity
                        key={idx}
                      style={[styles.wcKnockoutMatchItem, match.status === 'LIVE' && { borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}
                      activeOpacity={0.8}
                      onPress={() => handleQuickAccessPress({ name: 'Football' })}
                    >
                      <View style={styles.wcKnockoutTeams}>
                        <View style={styles.wcKnockoutTeamLeft}>
                          {match.flag1 ? <Text style={styles.wcKnockoutFlag}>{match.flag1}</Text> : null}
                          <Text style={[styles.wcKnockoutTeamName, { flex: 1, marginLeft: 8 }]} numberOfLines={1}>
                            {getDisplayTeamName(match.team1)}
                          </Text>
                        </View>
                        
                        {match.score ? (
                          <View style={styles.wcScoreBadge}>
                            <Text style={styles.wcScoreText}>{match.score}</Text>
                          </View>
                        ) : (
                          <View style={styles.wcVsBadge}>
                            <Text style={styles.wcVsTextKnockout}>VS</Text>
                          </View>
                        )}

                        <View style={styles.wcKnockoutTeamRight}>
                          <Text style={[styles.wcKnockoutTeamName, { flex: 1, marginRight: 8, textAlign: 'right' }]} numberOfLines={1}>
                            {getDisplayTeamName(match.team2)}
                          </Text>
                          {match.flag2 ? <Text style={styles.wcKnockoutFlag}>{match.flag2}</Text> : null}
                        </View>
                      </View>
                      
                      <View style={styles.wcKnockoutMeta}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {match.status === 'LIVE' && (
                            <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>LIVE</Text>
                            </View>
                          )}
                          <View style={{ backgroundColor: 'rgba(255, 215, 0, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: 'rgba(255, 215, 0, 0.3)' }}>
                            <Text style={{ color: '#FFD700', fontSize: 8, fontWeight: '900' }}>GROUP {match.group}</Text>
                          </View>
                          <Text style={styles.wcKnockoutDate}>{match.date}</Text>
                        </View>
                        <View style={styles.wcKnockoutLocationBox}>
                          <Ionicons name="location-outline" size={10} color="rgba(255, 215, 0, 0.6)" />
                          <Text style={styles.wcKnockoutLocation}>{match.venue}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.standingsWidget}>
                {/* Horizontal Scrollable Knockout Round Tabs */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.groupTabsScrollContent}
                  style={styles.groupTabsScroll}
                >
                  {[
                    { key: 'r32', label: 'ROUND OF 32' },
                    { key: 'r16', label: 'ROUND OF 16' },
                    { key: 'qf', label: 'QUARTERFINALS' },
                    { key: 'sf', label: 'SEMIFINALS' },
                    { key: 'final', label: 'FINAL' }
                  ].map(round => (
                    <TouchableOpacity
                      key={round.key}
                      style={[styles.groupTabButtonScroll, { paddingHorizontal: 16 }, selectedKnockoutRound === round.key && styles.groupTabButtonActive]}
                      onPress={() => setSelectedKnockoutRound(round.key)}
                    >
                      <Text style={[styles.groupTabText, selectedKnockoutRound === round.key && styles.groupTabTextActive]}>
                        {round.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Match List for Selected Knockout Round */}
                <ScrollView 
                  nestedScrollEnabled 
                  style={styles.wcKnockoutMatchListScroll}
                  contentContainerStyle={styles.wcKnockoutMatchList}
                  showsVerticalScrollIndicator={true}
                >
                  {WORLD_CUP_KNOCKOUTS[selectedKnockoutRound]?.map((match, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.wcKnockoutMatchItem}
                      activeOpacity={0.8}
                      onPress={() => handleQuickAccessPress({ name: 'Football' })}
                    >
                      <View style={styles.wcKnockoutTeams}>
                        <View style={styles.wcKnockoutTeamLeft}>
                          <Text style={[styles.wcKnockoutTeamName, { flex: 1 }]} numberOfLines={1}>{getDisplayTeamName(match.team1)}</Text>
                        </View>
                        <View style={styles.wcVsBadge}>
                          <Text style={styles.wcVsTextKnockout}>VS</Text>
                        </View>
                        <View style={styles.wcKnockoutTeamRight}>
                          <Text style={[styles.wcKnockoutTeamName, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>{getDisplayTeamName(match.team2)}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.wcKnockoutMeta}>
                        <Text style={styles.wcKnockoutDate}>{match.date}</Text>
                        <View style={styles.wcKnockoutLocationBox}>
                          <Ionicons name="location-outline" size={10} color="rgba(255, 215, 0, 0.6)" />
                          <Text style={styles.wcKnockoutLocation}>{match.location}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
              </>
            )}
          </View>
        )}

        {/* Live Matches Section */}
        <View style={styles.liveMatchesSection}>
          <TouchableOpacity 
            style={styles.collapsibleSectionHeader} 
            onPress={() => setLiveExpanded(!liveExpanded)}
            activeOpacity={0.8}
          >
            <View style={styles.collapsibleSectionTitleContainer}>
              <Ionicons name="radio-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.sectionLabelText}>LIVE MATCHES</Text>
            </View>
            <Ionicons 
              name={liveExpanded ? "chevron-up" : "chevron-down"} 
              size={14} 
              color={Colors.textMuted} 
            />
          </TouchableOpacity>

          {liveExpanded && (
            loadingMatches ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Fetching live matches...</Text>
              </View>
            ) : liveMatches.filter(m => (selectedCategory === 'all' || m.type === selectedCategory) && m.status === 'LIVE').length === 0 ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>No live matches right now.</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.matchesScrollContent}
              >
                {liveMatches.filter(m => (selectedCategory === 'all' || m.type === selectedCategory) && m.status === 'LIVE').map((match) => (
                  <RenderMatchCard key={match.id} match={match} />
                ))}
              </ScrollView>
            )
          )}
        </View>

        {/* Upcoming Matches Section */}
        <View style={styles.liveMatchesSection}>
          <TouchableOpacity 
            style={styles.collapsibleSectionHeader} 
            onPress={() => setUpcomingExpanded(!upcomingExpanded)}
            activeOpacity={0.8}
          >
            <View style={styles.collapsibleSectionTitleContainer}>
              <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.sectionLabelText}>UPCOMING MATCHES</Text>
            </View>
            <Ionicons 
              name={upcomingExpanded ? "chevron-up" : "chevron-down"} 
              size={14} 
              color={Colors.textMuted} 
            />
          </TouchableOpacity>

          {upcomingExpanded && (
            loadingMatches ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Fetching schedules...</Text>
              </View>
            ) : liveMatches.filter(m => (selectedCategory === 'all' || m.type === selectedCategory) && m.status !== 'LIVE').length === 0 ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>No upcoming matches found.</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.matchesScrollContent}
              >
                {liveMatches.filter(m => (selectedCategory === 'all' || m.type === selectedCategory) && m.status !== 'LIVE').map((match) => (
                  <RenderMatchCard key={match.id} match={match} />
                ))}
              </ScrollView>
            )
          )}
        </View>


        <View style={{height: 120}} />
      </ScrollView>

      {/* Smart Provider Selection Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{flex: 1}} onPress={() => setShowPicker(false)} />
          <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>Available On</Text>
                <Text style={styles.modalSubtitle}>Select where to stream {selectedQuickItem?.name}</Text>
             </View>
             
             <View style={styles.providerGrid}>
                {availableProviders.map(provider => (
                  <TouchableOpacity 
                    key={provider.id} 
                    style={styles.providerItem}
                    onPress={() => handleSelectProvider(provider)}
                  >
                    <View style={[styles.providerIconBox, {backgroundColor: provider.color}]}>
                      <Text style={styles.providerIconText}>{provider.icon}</Text>
                    </View>
                    <Text style={styles.providerName}>{provider.name}</Text>
                  </TouchableOpacity>
                ))}
             </View>

             <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowPicker(false)}>
                <Text style={styles.closeModalText}>Cancel</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },

  sectionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  tabContainer: {
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  tabContent: {
    paddingHorizontal: Spacing.xl,
    gap: 12,
  },
  categoryChipContainer: {
    marginRight: 4,
  },
  categoryChip: {
    padding: 1.5,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryChipActive: {
    backgroundColor: '#000',
    borderColor: Colors.accentPink + '40',
    shadowColor: Colors.accentPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  categoryChipInnerActive: {
    backgroundColor: '#000',
  },
  glowBorder: {
    position: 'absolute',
    width: 200,
    height: 200,
    top: -75,
    left: -50,
  },
  categoryText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  liveMatchesSection: {
    marginTop: Spacing.lg,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  matchesScrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  matchCard: {
    width: 260,
    backgroundColor: 'rgba(25, 25, 30, 0.9)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  matchThumbContainer: {
    height: 120,
    backgroundColor: '#161622',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitThumb: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  teamSide: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    // Added shadow and border for premium feel
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  teamFallbackIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  vsCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#161622',
  },
  vsText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
  genericThumb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genericIcon: {
    fontSize: 32,
  },
  f1Thumb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(225,6,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  f1Icon: {
    fontSize: 32,
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#e11d48',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  matchInfo: {
    padding: Spacing.md,
  },
  matchTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    marginBottom: 4,
  },
  matchTime: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  quickAccessSection: {
    marginTop: Spacing.xl,
  },
  premiumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    gap: 10,
  },
  premiumCard: {
    width: (SCREEN_WIDTH - Spacing.xl * 2 - 10) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 25, 30, 0.95)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  premiumIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  premiumInfo: {
    flex: 1,
  },
  premiumName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.1,
  },
  modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#12121A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: Spacing.xl,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalHeader: { alignItems: 'center', marginBottom: Spacing.xl },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20 },
  providerItem: { width: '28%', alignItems: 'center', marginBottom: Spacing.lg },
  providerIconBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  providerIconText: { fontSize: 32, fontWeight: '900', color: '#fff' },
  providerName: { fontSize: 12, fontWeight: '700', color: '#fff' },
  closeModalBtn: {
    marginTop: 10,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
  },
  closeModalText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  headerPillAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 20, 0.98)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
  },
  headerActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // FIFA World Cup 2026 Styles
  wcHubContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  wcBannerImageBg: {
    marginHorizontal: Spacing.xl,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    marginBottom: Spacing.lg,
  },
  wcBannerGradientOverlay: {
    padding: 20,
  },
  groupMatchesHeader: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  wcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  wcBadgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  wcTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  wcSubtitle: {
    color: '#FFFFFF', // Solid white for maximum visibility
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },
  wcCountdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  wcPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  wcCountdownLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  wcCountdownValue: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  wcSectionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  wcMatchesScroll: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 10,
    gap: 14,
  },
  wcMatchCard: {
    width: 240,
    height: 145,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.12)',
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#0c0f1d',
  },
  wcCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wcStadiumText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '700',
    maxWidth: '70%',
  },
  wcLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  wcLiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  wcLiveText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  wcTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  wcTeamColumn: {
    alignItems: 'center',
    width: '40%',
  },
  wcFlagText: {
    fontSize: 32,
    marginBottom: 4,
  },
  wcTeamText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  wcVsText: {
    color: 'rgba(255, 215, 0, 0.6)',
    fontSize: 12,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  wcTimeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  standingsWidget: {
    marginHorizontal: Spacing.xl,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    overflow: 'hidden',
  },
  groupTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 3,
  },
  groupTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  groupTabButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  groupTabText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
  },
  groupTabTextActive: {
    color: '#FFD700',
  },
  standingsTable: {
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerCell: {
    flex: 0.35,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  tableTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  tableTopTeamRow: {
    backgroundColor: 'rgba(255, 215, 0, 0.02)',
  },
  cellContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamRankText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '700',
    width: 12,
  },
  teamFlagIcon: {
    fontSize: 16,
  },
  teamNameText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cellText: {
    flex: 0.35,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  // High-Fidelity World Cup Mode Switcher & Knockouts
  wcModeSwitcherContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 4,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  wcModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  wcModeButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  wcModeButtonText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  wcModeButtonTextActive: {
    color: '#FFD700',
  },
  groupTabsScroll: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingBottom: 8,
  },
  groupTabsScrollContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  groupTabButtonScroll: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wcKnockoutMatchListScroll: {
    maxHeight: 330,
    width: '100%',
  },
  wcKnockoutMatchList: {
    gap: 12,
    marginTop: 8,
    paddingBottom: 8,
  },
  wcKnockoutMatchItem: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
  },
  wcKnockoutTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  wcKnockoutTeamLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 4,
    paddingRight: 12, // Gap to prevent overlapping with center VS badge
  },
  wcKnockoutTeamRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 4,
    paddingLeft: 12, // Gap to prevent overlapping with center VS badge
  },
  wcVsBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wcVsTextKnockout: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '900',
    fontStyle: 'italic',
    lineHeight: 12,
    textAlign: 'center',
  },
  wcScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
  wcScoreText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  wcKnockoutTeamName: {
    color: '#fff',
    fontSize: 14, // Refined font size to fit long names nicely
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  wcKnockoutFlag: {
    fontSize: 18,
  },
  wcKnockoutMeta: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
    alignItems: 'center',
    gap: 6,
  },
  wcKnockoutDate: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
  },
  wcKnockoutLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wcKnockoutLocation: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    paddingVertical: 10,
    fontWeight: '600',
  },
  wcScoreContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
    alignSelf: 'center',
    marginHorizontal: 10,
  },
  wcCollapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  wcCollapsibleTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wcCollapsibleTitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  collapsibleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    marginBottom: 4,
  },
  collapsibleSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabelText: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
});

export default LiveTVScreen;
