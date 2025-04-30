const express = require('express');
const router = express.Router();

const {
  getTopRatedMovies,
  searchMoviesByTitle,
  getMovieById,
  getRecommendedMovies
} = require('../controllers/movieController');

// Top-rated movies
router.get('/top-rated', getTopRatedMovies);

//  Search by title (query param: ?title=...)
router.get('/search', searchMoviesByTitle);

// Movie recommendation
router.get('/recommend/:userId', getRecommendedMovies);

//  Movie by ID
router.get('/:id', getMovieById);

module.exports = router;
