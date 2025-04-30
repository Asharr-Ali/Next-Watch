const express = require('express');
const router = express.Router();
const {
  addRating,
  getRatingsByUser,
  updateRating
} = require('../controllers/ratingController');

// Add new rating
router.post('/', addRating);

// Get all ratings by user
router.get('/user/:userId', getRatingsByUser);

//Update Rating of User
router.post('/update-rating', updateRating);

module.exports = router;
