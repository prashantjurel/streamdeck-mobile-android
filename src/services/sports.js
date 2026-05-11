// src/services/sports.js

const DEFAULT_FOOTBALL_CONFIG = {
  'eng.1': { name: 'Premier League', platform: 'hotstar' },
  'esp.1': { name: 'La Liga', platform: 'fancode' },
  'ger.1': { name: 'Bundesliga', platform: 'sonyliv' },
  'ita.1': { name: 'Serie A', platform: 'fancode' },
  'fra.1': { name: 'Ligue 1', platform: 'fancode' },
  'uefa.champions': { name: 'Champions League', platform: 'sonyliv' },
  'uefa.europa': { name: 'Europa League', platform: 'sonyliv' },
  'uefa.nations': { name: 'UEFA Nations League', platform: 'sonyliv' },
  'eng.fa': { name: 'FA Cup', platform: 'sonyliv' },
  'eng.league_cup': { name: 'EFL Cup', platform: 'fancode' },
  'esp.copa_del_rey': { name: 'Copa del Rey', platform: 'fancode' },
  'fifa.world': { name: 'FIFA World Cup', platform: 'hotstar' },
  'fifa.friendly': { name: 'International Friendlies', platform: 'sonyliv' },
  'fifa.worldq.uefa': { name: 'World Cup Qualifiers (UEFA)', platform: 'sonyliv' },
  'fifa.worldq.afc': { name: 'World Cup Qualifiers (AFC)', platform: 'sonyliv' },
  'fifa.worldq.conmebol': { name: 'World Cup Qualifiers (CONMEBOL)', platform: 'fancode' },
  'fifa.worldq.concacaf': { name: 'World Cup Qualifiers (CONCACAF)', platform: 'fancode' },
  'ind.1': { name: 'Indian Super League', platform: 'hotstar' },
  'default': { name: 'Other Football', platform: 'hotstar' }
};

const F1_2026_SCHEDULE = [
  {
    round: 1, gpName: "Australian Grand Prix", circuit: "Albert Park, Melbourne", countryFlag: "🇦🇺",
    sessions: [
      { name: "Race", date: "2026-03-08T04:00:00Z" }
    ]
  },
  {
    round: 2, gpName: "Chinese Grand Prix", circuit: "Shanghai International", countryFlag: "🇨🇳",
    sessions: [
      { name: "Race", date: "2026-03-15T07:00:00Z" }
    ]
  },
  {
    round: 3, gpName: "Japanese Grand Prix", circuit: "Suzuka International Circuit", countryFlag: "🇯🇵",
    sessions: [
      { name: "FP1", date: "2026-03-27T02:30:00Z" },
      { name: "FP2", date: "2026-03-27T06:00:00Z" },
      { name: "FP3", date: "2026-03-28T02:30:00Z" },
      { name: "Qualifying", date: "2026-03-28T06:00:00Z" },
      { name: "Race", date: "2026-03-29T05:00:00Z" }
    ]
  },
  {
    round: 4, gpName: "Bahrain Grand Prix", circuit: "Bahrain International", countryFlag: "🇧🇭",
    sessions: [
      { name: "FP1", date: "2026-04-10T16:00:00Z" },
      { name: "Qualifying", date: "2026-04-11T16:00:00Z" },
      { name: "Race", date: "2026-04-12T16:00:00Z" }
    ]
  },
  {
    round: 5, gpName: "Saudi Arabian Grand Prix", circuit: "Jeddah Corniche", countryFlag: "🇸🇦",
    sessions: [
      { name: "Race", date: "2026-04-19T17:00:00Z" }
    ]
  },
  {
    round: 6, gpName: "Miami Grand Prix", circuit: "Miami International Autodrome", countryFlag: "🇺🇸",
    sessions: [
      { name: "Race", date: "2026-05-03T19:30:00Z" }
    ]
  }
];

function formatLocalTime(dateStr, includeDate = true) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  const timeStr = `${hours}:${minutes} ${ampm}`;
  
  if (includeDate) {
    return `${month} ${day}, ${timeStr}`;
  }
  return timeStr;
}

function getUpdatedMatchStatus(match) {
  if (!match.startTime) return match;

  const now = Date.now();
  const matchTimeMs = new Date(match.startTime).getTime();

  const isApiLive = match.apiStatus === 'in' || match.apiStatus === 'live';
  const isApiPost = match.apiStatus === 'post' || match.apiStatus === 'post-match' || match.apiStatus === 'final';

  const hasStarted = matchTimeMs > 0 && now >= matchTimeMs;
  const isWithinSoonWindow = matchTimeMs > 0 && (matchTimeMs - now < 30 * 60 * 1000) && (matchTimeMs - now > 0);
  const isVeryOld = matchTimeMs > 0 && now > (matchTimeMs + 8 * 60 * 60 * 1000); 

  let finalStatus = 'upcoming';

  if (isApiLive) {
    finalStatus = 'LIVE';
  } else if (isApiPost || isVeryOld) {
    finalStatus = 'completed';
  } else if (hasStarted) {
    finalStatus = 'LIVE';
  } else if (isWithinSoonWindow) {
    finalStatus = 'soon';
  }

  match.status = finalStatus;

  if (finalStatus === 'LIVE') {
    match.time = `Live - ${match.apiSummary || 'In Progress'}`;
  } else if (finalStatus === 'soon') {
    match.time = `Starting Soon - ${formatLocalTime(match.startTime, false)}`;
  } else if (finalStatus === 'completed') {
    match.time = `FT - ${match.apiSummary || ''}`;
  } else {
    match.time = formatLocalTime(match.startTime, true);
  }

  return match;
}

export async function fetchCricketData() {
  try {
    const res = await fetch('https://site.web.api.espn.com/apis/site/v2/sports/cricket/scorepanel');
    const json = await res.json();
    let allEvents = [];
    if (json.scores) {
      json.scores.forEach(leagueGroup => {
        const leagueName = leagueGroup.leagues?.[0]?.name || '';
        if (leagueGroup.events) {
          leagueGroup.events.forEach(ev => {
            ev.injectedLeagueName = leagueName;
            allEvents.push(ev);
          });
        }
      });
    }

    function isQualifyingCricketMatch(title, seriesName) {
      const t = (title + ' ' + seriesName).toLowerCase();
      const isIPL = t.includes('ipl') || t.includes('indian premier league') || /\b(rr|csk|mi|rcb|kkr|dc|srh|pbks|lsg|gt)\b/i.test(t);
      if (isIPL) return true;

      const badKeywords = ['club', ' c.c.', ' cc', 'fc', 'sheffield shield', 'plunket shield', 'ford trophy', 'marsh cup', 'ranji trophy', 'syed mushtaq ali', 'county', 'first class', 'list a', 'district', 'under-19', 'u19'];
      for (let bad of badKeywords) if (t.includes(bad)) return false;

      const goodKeywords = ['premier league', 'bbl', 'big bash', 'psl', 'cpl', 'sa20', 'hundred', 'ilt20', 'mlc', 'wpl', 'super smash', 't20 blast', 'lpl', 'bpl', 'icc', 'world cup', 't20i', 'odi', 'test match', 'internationals', 'tour of', 'asia cup', 'champions trophy', 'ashes', 'series'];
      for (let good of goodKeywords) if (t.includes(good)) return true;

      const countries = ['india', 'australia', 'england', 'pakistan', 'new zealand', 'south africa', 'west indies', 'sri lanka', 'bangladesh', 'afghanistan', 'zimbabwe', 'ireland'];
      for (let country of countries) if (t.includes(country)) return true;

      return false;
    }

    const filteredEvents = allEvents.filter(m => {
      const seriesName = m.season?.name || m.league?.name || m.injectedLeagueName || '';
      return isQualifyingCricketMatch(m.name, seriesName);
    });

    const matches = filteredEvents.map((m, i) => {
      const comp = m.competitions ? m.competitions[0] : null;
      let logo1 = null;
      let logo2 = null;
      if (comp && comp.competitors && comp.competitors.length >= 2) {
        logo1 = comp.competitors[0].team?.logo || comp.competitors[0].team?.logoSecure;
        logo2 = comp.competitors[1].team?.logo || comp.competitors[1].team?.logoSecure;
      }

      let seriesName = m.season?.name || m.league?.name || m.injectedLeagueName || '';
      if (seriesName.toLowerCase().includes('indian premier')) {
        seriesName = 'IPL';
      } else {
        seriesName = seriesName.replace(/\b(Men's|Women's|Cricket|Tournament|League|202\d)\b/gi, '').trim();
      }

      const matchName = (m.shortName || m.name || 'TBA').replace(/\s+at\s+/gi, ' vs ');
      const title = seriesName ? `${seriesName} • ${matchName}` : matchName;

      return getUpdatedMatchStatus({
        id: m.id || `crk-${i}`,
        type: 'cricket',
        title: title,
        quickAccessName: 'IPL Live',
        startTime: m.date,
        apiStatus: m.status?.type?.state,
        apiSummary: m.status?.summary,
        logo1,
        logo2
      });
    });

    return matches;
  } catch (e) {
    console.error('ESPN Cricket API error:', e);
    return [];
  }
}

export async function fetchFootballData() {
  const leagues = [
    'eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1',
    'uefa.champions', 'uefa.europa', 'uefa.nations',
    'eng.fa', 'eng.league_cup', 'esp.copa_del_rey',
    'fifa.world', 'fifa.friendly',
    'fifa.worldq.uefa', 'fifa.worldq.afc', 'fifa.worldq.conmebol', 'fifa.worldq.concacaf',
    'ind.1'
  ];
  let allMatches = [];

  try {
    const promises = leagues.map(league =>
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.events) {
            data.events.forEach(ev => ev.leagueSlug = league);
          }
          return data;
        })
        .catch(() => null)
    );

    const results = await Promise.all(promises);

    results.forEach(res => {
      if (res && res.events && Array.isArray(res.events)) {
        allMatches = allMatches.concat(res.events);
      }
    });

    const matches = allMatches.map((m, i) => {
      const comp = m.competitions?.[0]?.competitors || [];
      const home = comp.find(c => c.homeAway === 'home');
      const away = comp.find(c => c.homeAway === 'away');

      let title = m.name || (home?.team?.name && away?.team?.name ? `${home.team.name} vs ${away.team.name}` : 'TBA');
      title = title.replace(/\s+at\s+/gi, ' vs ');

      const leagueSlug = m.leagueSlug || 'unknown';
      const config = DEFAULT_FOOTBALL_CONFIG[leagueSlug] || DEFAULT_FOOTBALL_CONFIG.default;

      return getUpdatedMatchStatus({
        id: m.id || `fb-${i}`,
        type: 'football',
        title: `${config.name} • ${title}`,
        quickAccessName: 'Football',
        startTime: m.date,
        apiStatus: m.status?.type?.state,
        apiSummary: `${home?.score || 0} - ${away?.score || 0}`,
        logo1: home?.team?.logo,
        logo2: away?.team?.logo
      });
    });

    return matches;
  } catch (e) {
    console.error('ESPN Football API error:', e);
    return [];
  }
}

export async function fetchF1Data() {
  const now = new Date();
  const upcomingEvents = F1_2026_SCHEDULE.filter(event => {
    const lastSessionDate = new Date(event.sessions[event.sessions.length - 1].date);
    return new Date(lastSessionDate.getTime() + 2 * 60 * 60 * 1000) >= now;
  });

  let allSessions = [];
  upcomingEvents.forEach(event => {
    event.sessions.forEach(s => {
      const sessionDate = new Date(s.date);
      const sessionMs = sessionDate.getTime();
      const nowMs = now.getTime();
      
      const durationHours = (s.name.includes('Qualifying') || s.name.includes('Sprint')) ? 1.25 : 2.25;
      
      const isLive = nowMs >= sessionMs && nowMs <= (sessionMs + durationHours * 60 * 60 * 1000);
      const isPast = nowMs > (sessionMs + durationHours * 60 * 60 * 1000);
      const isSoon = !isLive && !isPast && (sessionMs - nowMs < 30 * 60 * 1000);
      
      let finalStatus = 'upcoming';
      if (isLive) finalStatus = 'LIVE';
      else if (isPast) finalStatus = 'completed';
      else if (isSoon) finalStatus = 'soon';

      if (finalStatus !== 'completed') {
        allSessions.push({
          id: `f1-${event.round}-${s.name}`,
          type: 'f1',
          title: `F1 ${event.countryFlag} • ${event.gpName} ${s.name}`,
          quickAccessName: 'F1 Live',
          status: finalStatus,
          startTime: s.date, // Add startTime for proper sorting
          time: isSoon 
            ? `Starting Soon - ${formatLocalTime(s.date, false)}` 
            : (isLive ? 'Live - In Progress' : formatLocalTime(s.date, true)),
          isF1: true
        });
      }
    });
  });

  return allSessions;
}


export async function fetchLiveSportsData() {
  try {
    const [cricket, football, f1] = await Promise.all([
      fetchCricketData(),
      fetchFootballData(),
      fetchF1Data()
    ]);

    let combined = [...cricket, ...football, ...f1];
    
    // Filter out completed matches
    combined = combined.filter(m => m.status !== 'completed');

    // Sort: LIVE first, then SOON, then UPCOMING
    combined.sort((a, b) => {
      if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
      if (b.status === 'LIVE' && a.status !== 'LIVE') return 1;
      if (a.status === 'soon' && b.status !== 'soon' && b.status !== 'LIVE') return -1;
      if (b.status === 'soon' && a.status !== 'soon' && a.status !== 'LIVE') return 1;
      
      const timeA = new Date(a.startTime).getTime() || 0;
      const timeB = new Date(b.startTime).getTime() || 0;
      
      // If both are LIVE, put the most recently started one first (descending)
      if (a.status === 'LIVE' && b.status === 'LIVE') {
        return timeB - timeA;
      }
      
      // For upcoming/soon, put the one starting closest to now first (ascending)
      return timeA - timeB;
    });

    return combined.slice(0, 30); // Return top 30 matches
  } catch (e) {
    console.error('Failed to fetch combined sports data', e);
    return [];
  }
}
