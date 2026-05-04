// StreamDeck Mobile — Movie Adventure Service
import { getApiKey } from '../utils/storage';

export const MOVIE_GENRES = [
  { id: 28, name: 'Action', emoji: '💥' },
  { id: 12, name: 'Adventure', emoji: '🗺️' },
  { id: 16, name: 'Animation', emoji: '✨' },
  { id: 35, name: 'Comedy', emoji: '😂' },
  { id: 80, name: 'Crime', emoji: '🕵️' },
  { id: 99, name: 'Documentary', emoji: '🌍' },
  { id: 18, name: 'Drama', emoji: '🎭' },
  { id: 10751, name: 'Family', emoji: '👨‍👩‍👧‍👦' },
  { id: 14, name: 'Fantasy', emoji: '🧙‍♂️' },
  { id: 36, name: 'History', emoji: '📜' },
  { id: 27, name: 'Horror', emoji: '👻' },
  { id: 10402, name: 'Music', emoji: '🎵' },
  { id: 9648, name: 'Mystery', emoji: '🔍' },
  { id: 10749, name: 'Romance', emoji: '❤️' },
  { id: 878, name: 'Sci-Fi', emoji: '🛸' },
  { id: 53, name: 'Thriller', emoji: '😱' },
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
    const data = await response.json();
    
    return data.results.map(movie => ({
      ...movie,
      media_type: 'movie',
      thumb: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w500${movie.backdrop_path}` : null,
    })).filter(m => m.thumb); // Only return movies with posters
  } catch (err) {
    console.error('[Adventure] Failed to fetch movie recommendations:', err);
    return [];
  }
};
