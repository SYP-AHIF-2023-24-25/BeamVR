const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { LeoDB } = require("./leodb/");
const multer = require("multer");
const WebSocket = require("ws");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("express-jwt");
const helmet = require("helmet");
const helper = require("./helper"); // load own helper functions
const e = require("express");

const app = express();

// SETTINGS
const ENABLE_HTTPS = false;
const ServerBaseURL = "https://vps-81d09b41.vps.ovh.net";
const AngularPORT = 4200;
//const PREFIX = "/api";
const PREFIX = "";

// Object to store the active sessions of users
let activeSessions = [];

helper.logToFile("Server starting...");
helper.logToFile("Settings:");
helper.logToFile("ServerBaseURL: " + ServerBaseURL);
helper.logToFile("AngularPORT: " + AngularPORT);
helper.logToFile("ENABLE_HTTPS: " + ENABLE_HTTPS);
helper.logToFile("--------------------");

// HTTPS
let privateKey;
let certificate;
let credentials;
if (ENABLE_HTTPS) {
  privateKey = fs.readFileSync(
    "/etc/letsencrypt/live/vps-81d09b41.vps.ovh.net/privkey.pem",
    "utf8"
  );
  certificate = fs.readFileSync(
    "/etc/letsencrypt/live/vps-81d09b41.vps.ovh.net/fullchain.pem",
    "utf8"
  );
  credentials = { key: privateKey, cert: certificate };
}

// Code to handle file uploads (PNG)
const upload = multer({
  dest: "tmp/",
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "image/png") {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// Middleware
app.use(bodyParser.json()); // Middleware for parsing application/json
app.use(cookieParser()); // Middleware for parsing cookies
app.use(express.json()); // Middleware for parsing application/json
app.use(express.urlencoded({ extended: true })); // Middleware for parsing application/x-www-form-urlencoded
app.use(helmet()); // Middleware for setting various security headers for better security (for known WEB vulnerabilities)

// Middleware for setting HSTS header for better security
app.use((req, res, next) => {
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  next();
});

// Use CORS middleware to NOT block requests from other origins
app.use(cors({}));

// API Key for the API
const apiKey =
  "dcfc58543cd6c3cc1f73d8eef31a1cb077393bbebbf28c8c8fb1b69e11ca2167";
const checkIfRequestIsAuthenticated = (req, res, next) => {
  const receivedApiKey = req.headers["x-api-key"];

  if (receivedApiKey && receivedApiKey === apiKey) {
    return next(); // API key is valid, continue
  }

  // If API key is invalid or unset, check if the request is from an authenticated session, else return HTTP 401
  try {
    const authToken = req.cookies.authToken;
    const ipAddress = req.connection.remoteAddress;

    // Check if there's an authToken present
    if (!authToken) {
      return res.status(401).json({ error: "Not authorized" });
    }

    // Check if the sessionID and ipAddress combination exists in activeSessions
    const sessionExists = activeSessions.some(
      (session) =>
        session.sessionID === authToken && session.ipAddress === ipAddress
    );

    if (sessionExists) {
      return next();
    }

    return res.status(401).json({ error: "Not authorized" });
  } catch (error) {
    helper.logToFile("Error in checkIfRequestIsAuthenticated: " + error);
    return res.sendStatus(500);
  }
};

// HTTPS Server setup
let server;
if (ENABLE_HTTPS) {
  server = https.createServer(credentials, app);
} else {
  server = app;
}
// WebSocket Server setup (attached to the HTTPS server)
const ws = new WebSocket.Server({ server: server });
helper.logToFile("WebSocket (WSS) Server running!");

// WebSocket connection handling
ws.on("connection", function connection(ws) {
  ws.send("Connection established");
});

// Connect to LeoDB
const db = new LeoDB();

// Check if database file exists
let absolutePath = path.join(__dirname, "database.db");
console.log("Database file path: " + absolutePath);
helper.logToFile("Database file path: " + absolutePath);
if (fs.existsSync(absolutePath)) {
  db.loadFromFile(absolutePath);
  console.log("Database file found and loaded successfully!");
  helper.logToFile("Database file found and loaded successfully!");
} else {
  console.log("No database file found. Starting with empty database.");
  helper.logToFile("No database file found. Starting with empty database.");
}

// Endpoint which redirects convieniently to the angualar frontend
app.get(PREFIX + "/", (req, res) => {
  res.redirect(ServerBaseURL + ":" + AngularPORT);
});

// Route to load data from the database
app.get(PREFIX + "/get-data", (req, res) => {
  const result = db.read(); // Read all data
  // transform id to DataID
  result.forEach((element) => {
    element.dataID = element.id;
  });
  res.json(result);
});

// Route to search by name
app.get(PREFIX + "/search-data/:name", (req, res) => {
  const name = req.params.name;
  const result = db.read({ name: name }); // Search data by name
  res.json(result);
});

// Route to get image from tadeot server
app.get(PREFIX + "/get-user-image", async (req, res) => {
  try {
    const { filename } = req.query;

    if (!filename) {
      return res.status(400).json({ error: 'Parameter "filename" is missing' });
    }

    if (!filename.endsWith(".png")) {
      return res.status(400).json({
        error: 'Invalid file extension. Only ".png" files are supported.',
      });
    }

    const imageUrl = `https://tadeot.htl-leonding.ac.at/tadeot-backend-v23/images/${filename}`;

    const imageExists = await helper.checkFileExists(imageUrl);

    if (imageExists) {
      const imageStream = await axios.get(imageUrl, { responseType: "stream" });
      imageStream.data.pipe(res);
    } else {
      const defaultImageStream = fs.createReadStream(
        "./public/media/userpic-Placeholder.jpg"
      );
      defaultImageStream.pipe(res);
    }
  } catch (error) {
    helper.logToFile("Error in get-user-image: " + error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to receive data for the highscore table
app.post(PREFIX + "/add-data", checkIfRequestIsAuthenticated, (req, res) => {
  const newData = req.body;

  if (newData) {
    newData.tadeotId = newData.tadeotId.toString().padStart(4, "0");
    const imageURL =
      ServerBaseURL +
      "/get-user-image?filename=Visitor_" +
      newData.tadeotId +
      ".png";
    newData.image = imageURL;

    if (
      newData.name == "" ||
      newData.name == null ||
      newData.name == undefined
    ) {
      newData.name = helper.generateUniquePlayerCode();
    }

    db.create(newData); // Use LeoDB to create new data
    db.saveToFile("database.db"); // Save the database to a file, so we can restore the data after a server restart
    helper.broadcastMessage(ws, "updateHighscores"); // Send Signal to all clients to update the highscore table
    helper.logToFile("Highscore saved successfully!");
    res.status(201).json({ message: "Data saved successfully!" });
  } else {
    helper.logToFile("Invalid request to save Highscore!");
    res.status(400).json({ error: "Invalid request!" });
  }
});

// Route to save PNG images
app.post(
  PREFIX + "/saveImage",
  checkIfRequestIsAuthenticated,
  upload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "No file uploaded. Please upload an image." });
    }

    const tempPath = req.file.path;
    const targetPath = path.join(__dirname, "public/media", "vrgame.png");

    fs.rename(tempPath, targetPath, (err) => {
      if (err) {
        helper.logToFile("Error in saving the file: " + err);
        return res.status(500).json({ error: "Error saving image!" });
      }
      res.status(201).json({ message: "Image saved successfully!" });

      fs.readFile(targetPath, (err, data) => {
        if (err) {
          helper.logToFile("Error in reading the file: " + err);
        }
        helper.broadcastMessage(ws, data);
        fs.unlinkSync(targetPath);
      });
    });
  }
);

// Protected Endpoint to delete all data
app.delete(PREFIX + "/delete-data", checkIfRequestIsAuthenticated, (req, res) => {
  db.deleteAll();
  db.saveToFile("database.db"); // Delete all data and save the database to a file to overrite the old data
  helper.broadcastMessage(ws, "updateHighscores");
  helper.logToFile("All highscores deleted!");
  res.json({ message: "All highscores deleted!" });
});

// Protected Endpoint to delete data by ID
app.delete(PREFIX + "/delete-data/:id", checkIfRequestIsAuthenticated, (req, res) => {
  const ParamID = req.params.id;

  const result = db.delete({ id: ParamID }); // Delete data by ID
  if (result == true) {
    helper.broadcastMessage(ws, "updateHighscores");
    db.saveToFile("database.db");
    helper.logToFile("Data deleted by ID: " + ParamID);
    res.status(200).json({ message: "Data deleted!" });
  } else {
    helper.logToFile("Error deleting data by ID: " + ParamID);
    res.status(404).json({ error: "Error deleting data!" });
  }
});

// Protected Endpoint to update a data entry by id
app.put(PREFIX + "/update-data/:id", checkIfRequestIsAuthenticated, (req, res) => {
  const paramID = req.params.id;
  const newData = req.body;

  // Only Change Score and tadeotId if they are not undefined and numbers
  if (
    newData.score == undefined ||
    (isNaN(newData.score) &&
      newData.score != null &&
      newData.score > 0 &&
      newData.score < 1000)
  ) {
    delete newData.score;
  }
  if (
    newData.tadeotId == undefined ||
    (isNaN(newData.tadeotId) &&
      newData.tadeotId != null &&
      newData.tadeotId > 0 &&
      newData.tadeotId < 1000)
  ) {
    delete newData.tadeotId;
  }

  // Check if Name is not empty
  if (newData.name == "" || newData.name == null || newData.name == undefined) {
    delete newData.name;
  }

  // check if the tadeot id is set
  if (newData.tadeotId) {
    // update the image URL with the new tadeotId and pad it to 4 digits
    newData.tadeotId = newData.tadeotId.toString().padStart(4, "0");
    newData.image =
      ServerBaseURL +
      "/get-user-image?filename=Visitor_" +
      newData.tadeotId +
      ".png";
  }

  if (newData) {
    const result = db.update(paramID, newData); // Update data by ID
    if (result) {
      helper.broadcastMessage(ws, "updateHighscores");
      db.saveToFile("database.db");
      helper.logToFile("Data updated by ID: " + paramID);
      res.status(200).json({ message: "Data updated!" });
    } else {
      helper.logToFile("Error updating data by ID: " + paramID);
      res.status(404).json({ error: "Error updating data! Record not found." });
    }
  } else {
    helper.logToFile("Invalid request to update data!");
    res.status(400).json({ error: "Invalid request!" });
  }
});

// protected test endpoint, use jwt from helper to authenticate
app.get(PREFIX + "/checkSession", (req, res) => {
  helper.checkJWT(req, res);
});

// Start the HTTPS Server on port 443
server.listen(ENABLE_HTTPS ? 443 : 3000, () => {
  console.log("Server running on port " + (ENABLE_HTTPS ? 443 : 3000));
  helper.logToFile("Server running on port " + (ENABLE_HTTPS ? 443 : 3000));
});
