// StreamDeck Mobile — Movie Adventure Service
import { getApiKey } from '../utils/storage';

export const MOVIE_GENRES = [
  { id: 28, name: 'Action', icon: 'flame' },
  { id: 12, name: 'Adventure', icon: 'compass' },
  { id: 16, name: 'Animation', icon: 'color-palette' },
  { id: 35, name: 'Comedy', icon: 'happy' },
  { id: 80, name: 'Crime', icon: 'finger-print' },
  { id: 99, name: 'Documentary', icon: 'globe' },
  { id: 18, name: 'Drama', icon: 'mask' },
  { id: 10751, name: 'Family', icon: 'people' },
  { id: 14, name: 'Fantasy', icon: 'color-wand' },
  { id: 36, name: 'History', icon: 'library' },
  { id: 27, name: 'Horror', icon: 'skull' },
  { id: 10402, name: 'Music', icon: 'musical-notes' },
  { id: 9648, name: 'Mystery', icon: 'telescope' },
  { id: 10749, name: 'Romance', icon: 'heart' },
  { id: 878, name: 'Sci-Fi', icon: 'rocket' },
  { id: 53, name: 'Thriller', icon: 'flashlight' },
];

export const fetchMovieRecommendations = async (genreIds = [], page = 1) => {
  const apiKey = await getApiKey();
  if (!apiKey) return [];

  try {
    let url = `https://api.tmdb.org/3/discover/movie?api_key=${apiKey}&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=${page}`;
    
    if (genreIds && genreIds.length > 0) {
      // TMDB uses comma separated genre IDs to mean OR, and pipe | for AND. We'll use OR (,)
      url += `&with_genres=${genreIds.join(',')}`;
    }

    const response = await fetch(url);
    if (response.status === 401) throw new Error('INVALID_API_KEY');

    const data = await response.json();
    
    const results = data.results.map(movie => ({
      ...movie,
      media_type: 'movie',
      thumb: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w500${movie.backdrop_path}` : null,
    })).filter(m => m.thumb);

    // Shuffle the results for local variety
    return results.sort(() => Math.random() - 0.5);
  } catch (err) {
    if (err.message === 'INVALID_API_KEY') throw err;
    console.error('[Adventure] Failed to fetch movie recommendations:', err);
    return [];
  }
};
