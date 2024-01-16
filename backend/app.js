const express = require("express");
const https = require("https"); // Import HTTPS module
const fs = require("fs");
const path = require("path");
const loki = require("lokijs"); // LokiJS for database
const multer = require("multer");
const WebSocket = require("ws");

const app = express();

console.log("-----------------------------");
console.log("Server starting...");

// SSL Certificate and Private Key paths
const privateKey = fs.readFileSync("/etc/letsencrypt/live/vps-81d09b41.vps.ovh.net/privkey.pem", "utf8");
const certificate = fs.readFileSync("/etc/letsencrypt/live/vps-81d09b41.vps.ovh.net/fullchain.pem", "utf8");
const credentials = { key: privateKey, cert: certificate };

// Code to handle file uploads (PNG)
const upload = multer({
  dest: "tmp/", // Temp folder for uploads
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/png") {
      cb(null, true); // accept png files
    } else {
      cb(null, false); // reject other file types
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // max filesize is 10MB
  },
});

const apiKey = 'dcfc58543cd6c3cc1f73d8eef31a1cb077393bbebbf28c8c8fb1b69e11ca2167'; // correct API-KEY

const checkApiKey = (req, res, next) => {
  const receivedApiKey = req.headers['x-api-key'];

  if (receivedApiKey && receivedApiKey === apiKey) {
    next(); // API-Key is correct, continue
    console.log("API-Key correct");
  } else {
    console.log("API-Key incorrect");
    res.status(401).json({ error: 'Not authorized' }); // API-Key incorrect or not sent, not authorized
  }
};

// HTTPS Server setup
const httpsServer = https.createServer(credentials, app);

// WebSocket Server setup (attached to the HTTPS server)
const ws = new WebSocket.Server({ server: httpsServer });
console.log("WebSocket (WSS) Server running!");

// Middleware for handling JSON data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// WebSocket connection handling
ws.on("connection", function connection(ws) {
  ws.send("Connection established");
  console.log("Connection established");
});

// Function to broadcast messages to all clients
function broadcastMessage(message) {
  ws.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Connect to LokiJS DB
const db = new loki("database.db");
let collection; // Declare the collection variable at the top-level scope

db.loadDatabase({}, () => {
  collection = db.getCollection("beamVR_Highscores"); // Initialize the collection variable

  if (!collection) {
    collection = db.addCollection("beamVR_Highscores"); // Create collection if it doesn't exist
  }
});

// Route to load data from the database
app.get("/get-data", (req, res) => {
  const result = collection.find(); // Load complete data
  res.json(result);
});

// Route to receive data for the highscore table
app.post("/add-data", checkApiKey, (req, res) => {
  const newData = req.body;

  if (newData) {
    collection.insert(newData); // Save new data to the database
    db.saveDatabase(); // Save changes to the database
    res.status(201).json({ message: "Data saved successfully!" });
  } else {
    res.status(400).json({ error: "Invalid request!" });
  }
});

// Route to save PNG images
app.post("/saveImage", checkApiKey, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: "No file uploaded. Please upload an image." });
  }

  const tempPath = req.file.path;
  const targetPath = path.join(__dirname, "public/media", "vrgame.png");

  fs.rename(tempPath, targetPath, (err) => {
    if (err) {
      console.log("Error in saving the file:", err);
      return res.status(500).json({ error: "Error saving image!" });
    }
    res.status(200).json({ message: "Image saved successfully!" });

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

// Start the HTTPS Server on port 443
httpsServer.listen(443, () => {
  console.log("HTTPS Server running on port 443");
});