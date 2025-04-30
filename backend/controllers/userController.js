const { connectToDB, sql } = require('../db');

// 🔹 Add a new user
const createUser = async (req, res) => {
  const { username, email } = req.body;

  if (!username || !email) {
    return res.status(400).json({ error: 'Username and Email are required' });
  }

  try {
    const pool = await connectToDB();
    await pool.request()
      .input('username', sql.VarChar, username)
      .input('email', sql.VarChar, email)
      .query('INSERT INTO Users (username, email) VALUES (@username, @email)');

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error(' Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

module.exports = {
  createUser
};
