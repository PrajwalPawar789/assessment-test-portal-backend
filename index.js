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
  release();
});

// Set up multer for handling file uploads
const upload = multer({
  dest: 'uploads/'
});

app.post('/login', async (req, res) => {
  const { username, email } = req.body;
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM userdata WHERE username = $1 AND email = $2', [username, email]);
    client.release();
    if (result.rows.length === 1) {
      res.status(200).json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials or user does not exist. Please register.' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ success: false, message: 'Failed to log in' });
  }
});

app.post('/submit-typing-test', async (req, res) => {
  const { username, typingTestScore } = req.body;
  try {
    const client = await pool.connect();
    const result = await client.query('UPDATE userdata SET typing_test_score = $1 WHERE username = $2', [typingTestScore, username]);
    client.release();
    res.status(200).json({ success: true, message: 'Typing test score submitted successfully' });
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).json({ success: false, message: 'Failed to submit typing test score' });
  }
});

app.post('/submit-voice-test', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { username } = req.body;
    const fileData = req.file.buffer; // Read file content as buffer

    const client = await pool.connect();
    const result = await client.query('UPDATE userdata SET audio_file_data = $1 WHERE username = $2', [fileData, username]);
    client.release();
    res.status(200).json({ success: true, message: 'Voice test submitted successfully' });
  } catch (error) {
    console.error('Error submitting voice test:', error);
    res.status(500).json({ success: false, message: 'Failed to submit voice test' });
  }
});

app.post('/register', async (req, res) => {
  const { username, email } = req.body;
  try {
    const client = await pool.connect();
    const result = await client.query('INSERT INTO userdata (username, email) VALUES ($1, $2)', [username, email]);
    client.release();
    res.status(200).json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, message: 'Failed to register user' });
  }
});

app.get('/getUserData', async (req, res) => {
  try {
    const query = 'SELECT * FROM userdata';
    const { rows } = await pool.query(query);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No users found' });
    }
    res.status(200).json({ success: true, userData: rows });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user data' });
  }
});

// Endpoint for fetching typing test status data
app.get('/getTypingTestStatusData', async (req, res) => {
  try {
    const query = 'SELECT typing_test_status, COUNT(*) AS count FROM userdata GROUP BY typing_test_status';
    const { rows } = await pool.query(query);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No typing test status data found' });
    }
    res.status(200).json({ success: true, typingTestStatusData: rows });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch typing test status data' });
  }
});

// Endpoint for fetching voice test status data
app.get('/getVoiceTestStatusData', async (req, res) => {
  try {
    const query = 'SELECT voice_test_1_status, voice_test_2_status FROM userdata';
    const { rows } = await pool.query(query);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No voice test status data found' });
    }
    const voiceTestStatusData = rows.reduce((acc, row) => {
      acc[row.voice_test_1_status] = (acc[row.voice_test_1_status] || 0) + 1;
      acc[row.voice_test_2_status] = (acc[row.voice_test_2_status] || 0) + 1;
      return acc;
    }, {});
    res.status(200).json({ success: true, voiceTestStatusData });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch voice test status data' });
  }
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
