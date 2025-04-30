const { connectToDB, sql } = require('../db');
const axios = require('axios');

//  GET top rated movies
const getTopRatedMovies = async (req, res) => {
  try {
    const pool = await connectToDB();
    const result = await pool.request().query(`
    SELECT M.Movie_id, M.title, M.duration_minutes, M.description, M.release_date, M.original_language, M.ratings, 
    STRING_AGG(G.genre_name, ', ') AS Genres
    FROM Movies M
    JOIN movie_genres MG ON M.Movie_id = MG.movie_id
    JOIN genres G ON G.genre_id = MG.genre_id
    GROUP BY M.Movie_id, M.title, M.duration_minutes, M.description, M.release_date, M.original_language, M.ratings
    ORDER BY M.ratings DESC

    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(' Error fetching top-rated movies:', err);
    res.status(500).json({ error: 'Failed to retrieve top-rated movies' });
  }
};

//  GET movies by title search
const searchMoviesByTitle = async (req, res) => {
  const title = req.query.title;

  if (!title) {
    return res.status(400).json({ error: 'Title is required in query' });
  }

  try {
    const pool = await connectToDB();
    const result = await pool
      .request()
      .input('title', sql.VarChar, `%${title}%`)
      .query(`
      SELECT M.Movie_id, M.title, M.duration_minutes, M.description, M.release_date, M.original_language, M.ratings, 
      STRING_AGG(G.genre_name, ', ') AS Genres
      FROM Movies M
      JOIN movie_genres MG ON M.Movie_id = MG.movie_id
      JOIN genres G ON G.genre_id = MG.genre_id
      WHERE title LIKE @title
      GROUP BY M.Movie_id, M.title, M.duration_minutes, M.description, M.release_date, M.original_language, M.ratings
    `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error(' Error searching movies by title:', err);
    res.status(500).json({ error: 'Failed to search movies' });
  }
};

//  GET single movie by ID
const getMovieById = async (req, res) => {
  const movieId = req.params.id;

  try {
    const pool = await connectToDB();
    const result = await pool.request()
      .input('movieId', sql.Int, movieId)
      .query('SELECT * FROM Movies WHERE Movie_id = @movieId');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(' Error fetching movie by ID:', err);
    res.status(500).json({ error: 'Failed to retrieve movie' });
  }
};

// GET recommended movies for a user
const getRecommendedMovies = async (req, res) => {
  const userId = req.params.userId;

  try {
    // Step 1: Call the Flask API to get recommended movie titles
    const flaskResponse = await axios.post('http://localhost:5001/recommendations', {
      user_id: userId,
    });

    const recommendedTitles = flaskResponse.data.recommended_movies; // Array of titles

    if (!recommendedTitles.length) {
      return res.status(404).json({ message: 'No recommendations found' });
    }

    // Step 2: Query SQL Server to get full movie details
    const pool = await connectToDB();

    // Dynamically create query placeholders
    const titlePlaceholders = recommendedTitles.map((_, index) => `@title${index}`).join(', ');

    const request = pool.request();
    recommendedTitles.forEach((title, index) => {
      request.input(`title${index}`, sql.NVarChar, title);
    });

    const query = `

    SELECT M.Movie_id, M.title, M.duration_minutes, M.description, M.release_date, M.original_language, M.ratings, 
    STRING_AGG(G.genre_name, ', ') AS Genres
    FROM Movies M
    JOIN movie_genres MG ON M.Movie_id = MG.movie_id
    JOIN genres G ON G.genre_id = MG.genre_id
    WHERE M.title IN (${titlePlaceholders})
    GROUP BY M.Movie_id, M.title, M.duration_minutes, M.description, M.release_date, M.original_language, M.ratings;
`;

    const result = await request.query(query);

    res.json(result.recordset);
  } catch (err) {
    console.error('Error generating recommendations:', err);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
};

module.exports = {
  getTopRatedMovies,
  searchMoviesByTitle,
  getMovieById,
  getRecommendedMovies
};