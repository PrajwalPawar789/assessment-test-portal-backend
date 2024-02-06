const express = require('express');
const axios = require('axios');
const multer = require('multer');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:3000', // Update with the URL where your React app is running
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
  exposedHeaders: ['Authorization'],
}));

let authToken;
let conversationId;

// Set up multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Authentication route for Symbl.ai
app.get('/authenticate', async (req, res) => {
  try {
    const response = await axios.post('https://api.symbl.ai/oauth2/token:generate', {
      type: 'application',
      appId: '6331503556564766444137434f3964694e6842414c57417942463433784b6450', // Replace with your Symbl.ai app ID
      appSecret: '73527441635445677143524c636c76684f3766586a684f6247347a384d545966627951616d7a5579754e6957634f78323638583446705835475a4b5456727133', // Replace with your Symbl.ai app secret
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    authToken = response.data.accessToken;
    res.json(response.data);
  } catch (error) {
    console.error('Error authenticating:', error.message);
    res.status(error.response ? error.response.status : 500).send(error.message);
  }
});

// Media route to process audio using Symbl.ai
app.post('/process-media', upload.single('file'), async (req, res) => {
  // Specify parameters for Symbl.ai processing
  const params = {
    name: 'Name',
    languageCode: 'en-US',
    enableAllTrackers: true,
  };

  const mediaOption = {
    url: 'https://api.symbl.ai/v1/process/audio',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': `audio/${req.file.mimetype.split('/')[1]}`,
    },
    qs: params,
    json: true,
  };

  try {
    const response = await axios.post(mediaOption.url, req.file.buffer, {
      headers: mediaOption.headers,
      params: mediaOption.qs,
    });

    conversationId = response.data.conversationId;
    res.json(response.data);
  } catch (error) {
    console.error('Error processing media:', error.message);
    res.status(error.response ? error.response.status : 500).send(error.message);
  }
});

// Get results of intelligence generation from Symbl.ai
app.get('/get-intelligence', async (req, res) => {
  const intelligenceOption = {
    url: `https://api.symbl.ai/v1/conversations/${conversationId}/trackers`,
    headers: { Authorization: `Bearer ${authToken}` },
    json: true,
  };

  try {
    const response = await axios(intelligenceOption);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching intelligence:', error.message);
    res.status(error.response ? error.response.status : 500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
