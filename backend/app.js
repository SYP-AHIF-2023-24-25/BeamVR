const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const path = require('path');
const loki = require('lokijs'); // LokiJS as DB
const fs = require('fs');
const multer = require('multer');
const WebSocket = require('ws');

const upload = multer({
  dest: 'tmp/', // Temp folder for uploads
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png') {
      cb(null, true); // accept png files
    } else {
      cb(null, false); // reject other file types
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // max filesize is 10MB
  }
});

// CONFIG
const port = 3030;

// Middleware for handling JSON data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const ws = new WebSocket.Server({ server }); //Create Websocket Server

//handle client connections
ws.on('connection', function connection(ws) {
  ws.send('Connection established');
  console.log('Connection established');
});

//Broadcast messages to all clients
function broadcastMessage(message) {
  ws.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Connect to LokiJS DB
const db = new loki('database.db');
let collection; // Declare the collection variable at the top-level scope

db.loadDatabase({}, () => {
  collection = db.getCollection('beamVR_Highscores'); // Initialize the collection variable

  if (!collection) {
    collection = db.addCollection('beamVR_Highscores'); // Create collection if it doesn't exist
  }
});

// Route to load data from the database
app.get('/get-data', (req, res) => {
  const result = collection.find(); // Load complete data
  res.json(result);
});

// Route to receive data for the highscore table
app.post('/add-data', (req, res) => {
  const newData = req.body;

  if (newData) {
    collection.insert(newData); // Save new data to the database
    db.saveDatabase(); // Save changes to the database
    res.status(201).json({ message: 'Data saved successfully!' });
  } else {
    res.status(400).json({ error: 'Invalid request!' });
  }
});

// Route to save PNG images
app.post('/saveImage', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please upload an image.' });
  }

  const tempPath = req.file.path;
  const targetPath = path.join(__dirname, 'public/media', 'vrgame.png');

  fs.rename(tempPath, targetPath, err => {
    if (err) {
      console.log("Error in saving the file:", err);
      return res.status(500).json({ error: 'Error saving image!'});
    }
    res.status(200).json({ message: 'Image saved successfully!' });

    //Send file to all clients
    fs.readFile(targetPath, (err, data) => {
      if (err) {
        console.log("Error in reading the file:", err);
      }
      broadcastMessage(data);
      console.log("Broadcasted file...");
    });
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});