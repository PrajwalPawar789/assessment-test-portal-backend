const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// PostgreSQL database connection configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Check database connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Connected to database');
  client.release();
});

// Set up multer for handling file uploads
const upload = multer({
  dest: 'uploads/'
});

// Endpoint for storing login details
app.post('/login', async (req, res) => {
  const { username, email } = req.body;
  try {
    const client = await pool.connect();
    const result = await client.query('INSERT INTO user_data (username, email) VALUES ($1, $2)', [username, email]);
    client.release();
    res.status(200).json({ success: true, message: 'Login successful' });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, message: 'Failed to log in' });
  }
});

// Endpoint for submitting typing test score
app.post('/submit-typing-test', async (req, res) => {
  const { username, typingTestScore } = req.body; // Assuming userId is available in the request body
  try {
    const client = await pool.connect();
    // Assuming user_data table has a foreign key reference to a users table, and userId is the foreign key
    const result = await client.query('UPDATE user_data SET typing_test_score = $1 WHERE username = $2', [typingTestScore, username]);
    client.release();
    res.status(200).json({ success: true, message: 'Typing test score submitted successfully' });
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).json({ success: false, message: 'Failed to submit typing test score' });
  }
});

// Endpoint for submitting voice test
// Endpoint for submitting voice test
app.post('/submit-voice-test', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { username } = req.body;
    const filePath = req.file.path;

    const client = await pool.connect();
    const result = await client.query('UPDATE user_data SET audio_file = $1 WHERE username = $2', [filePath, username]);
    client.release();
    res.status(200).json({ success: true, message: 'Voice test submitted successfully' });
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).json({ success: false, message: 'Failed to submit voice test' });
  }
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
