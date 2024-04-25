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

const app = express();

const ENABLE_HTTPS = false;

// Object to store the active sessions of users
let activeSessions = [];

console.log("-----------------------------");
console.log("Server starting...");
// create log file with starting date and time as filename in the logs folder
const logFileName = `logs/${new Date().toISOString().replace(/:/g, "-")}.log`;

// function to get DateTime as dd.mm.yyyy hh:mm:ss
function getDateTime() {
  let currentdate = new Date();
  let day = String(currentdate.getDate()).padStart(2, '0');
  let month = String(currentdate.getMonth() + 1).padStart(2, '0');

  let datetime =
    day +
    "." +
    month +
    "." +
    currentdate.getFullYear() +
    " " +
    String(currentdate.getHours()).padStart(2, '0') +
    ":" +
    String(currentdate.getMinutes()).padStart(2, '0') +
    ":" +
    String(currentdate.getSeconds()).padStart(2, '0');
  return datetime;
}

function logToFile(message) {
    if (!fs.existsSync("logs")) {
        fs.mkdirSync("logs");
    }
    fs.appendFileSync(logFileName, getDateTime()+": " + message + "\n");
}

logToFile("Server starting...");

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

function removeIPv6Prefix(ipAddress) {
  // Check if the input is an IPv4-mapped IPv6 address
  if (ipAddress.startsWith("::ffff:")) {
      // Remove the "::ffff:" prefix
      return ipAddress.slice(7);
  } else {
      // Return the original input if it's not in the expected format
      return ipAddress;
  }
}

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Hardcoded credentials for admin login
const validUsername = "beam-admin";
const validPasswordHash =
  "c67e7ef2895b4d936f174891d6d00e9f057af00172370dccc444f50994a12750";

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
    logToFile("Error in checkIfRequestIsAuthenticated: " + error);
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
logToFile("WebSocket (WSS) Server running!");

// WebSocket connection handling
ws.on("connection", function connection(ws) {
  ws.send("Connection established");
});

// Function to broadcast messages to all clients
function broadcastMessage(message) {
  ws.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Connect to LeoDB
const db = new LeoDB();

// Check if database file exists

let absolutePath = path.join(__dirname, "database.db");
console.log("Database file path: " + absolutePath);
if (fs.existsSync(absolutePath)) {
  db.loadFromFile(absolutePath);
  console.log("Database file found and loaded successfully!");
  logToFile("Database file found and loaded successfully!");
} else {
  console.log("No database file found. Starting with empty database.");
  logToFile("No database file found. Starting with empty database.");
}

// Endpoint which redirects convieniently to the angualar frontend
app.get("/", (req, res) => {
  res.redirect("https://vps-81d09b41.vps.ovh.net:4200");
});

// Route to load data from the database
app.get("/get-data", (req, res) => {
  const result = db.read(); // Read all data
  // transform id to DataID
  console.log(result);
  result.forEach((element) => {
    element.dataID = element.id;
  });
  res.json(result);
});

// Route to search by name
app.get("/search-data/:name", (req, res) => {
  const name = req.params.name;
  const result = db.read({ name: name }); // Search data by name
  res.json(result);
});

// Route to get image from tadeot server
app.get("/get-user-image", async (req, res) => {
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

    const imageExists = await checkFileExists(imageUrl);

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
    logToFile("Error in get-user-image: " + error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Function to check if the file exists
async function checkFileExists(url) {
  try {
    const response = await axios.head(url);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// generate Unique Playername if none was sent
function generateUniquePlayerCode() {
  const uniqueDigits = new Set();

  while (uniqueDigits.size < 4) {
    const randomDigit = Math.floor(Math.random() * 10);
    uniqueDigits.add(randomDigit);
  }

  const uniqueCode = Array.from(uniqueDigits).join("");
  return `Player ${uniqueCode}`;
}

// Function to generate a safe session ID
function generateSessionId() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 64; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Route to receive data for the highscore table
app.post("/add-data", checkIfRequestIsAuthenticated, (req, res) => {
  const newData = req.body;

  if (newData) {
    newData.tadeotId = newData.tadeotId.toString().padStart(4, "0");
    const imageURL =
      "https://vps-81d09b41.vps.ovh.net/get-user-image?filename=Visitor_" +
      newData.tadeotId +
      ".png";
    newData.image = imageURL;

    if (
      newData.name == "" ||
      newData.name == null ||
      newData.name == undefined
    ) {
      newData.name = generateUniquePlayerCode();
    }

    // add date time to the data

    db.create(newData); // Use LeoDB to create new data
    db.saveToFile("database.db"); // Save the database to a file, so we can restore the data after a server restart
    broadcastMessage("updateHighscores"); // Send Signal to all clients to update the highscore table
    logToFile("Highscore saved successfully!");
    res.status(201).json({ message: "Data saved successfully!" });
  } else {
    logToFile("Invalid request to save Highscore!");
    res.status(400).json({ error: "Invalid request!" });
  }
});

// Route to save PNG images
app.post(
  "/saveImage",
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
        logToFile("Error in saving the file: " + err);
        return res.status(500).json({ error: "Error saving image!" });
      }
      res.status(201).json({ message: "Image saved successfully!" });

      fs.readFile(targetPath, (err, data) => {
        if (err) {
          logToFile("Error in reading the file: " + err);
        }
        broadcastMessage(data);
        fs.unlinkSync(targetPath);
      });
    });
  }
);

// Protected Endpoint to delete all data
app.delete("/delete-data", checkIfRequestIsAuthenticated, (req, res) => {
  db.deleteAll();
  db.saveToFile("database.db"); // Delete all data and save the database to a file to overrite the old data
  broadcastMessage("updateHighscores");
  logToFile("All highscores deleted!");
  res.json({ message: "All highscores deleted!" });
});

// Protected Endpoint to delete data by ID
app.delete("/delete-data/:id", checkIfRequestIsAuthenticated, (req, res) => {
  const ParamID = req.params.id;

  const result = db.delete({ id: ParamID }); // Delete data by ID
  if (result == true) {
    broadcastMessage("updateHighscores");
    db.saveToFile("database.db");
    logToFile("Data deleted by ID: " + ParamID);
    res.status(200).json({ message: "Data deleted!" });
  } else {
    logToFile("Error deleting data by ID: " + ParamID);
    res.status(404).json({ error: "Error deleting data!" });
  }
});

// Endpoint to check if sessionID is valid from sent cookie
app.get("/checkSession", (req, res) => {
  try {
    // return 401 if no sessionID cookie is present
    if (!req.cookies.authToken) {
      res.sendStatus(401);
      return;
    }

    let sessionID = req.cookies.authToken;
    let ipAddress = req.connection.remoteAddress;

    // Check if sessionID and ipAddress combination exists in activeSessions
    let sessionExists = activeSessions.some(
      (session) =>
        session.sessionID === sessionID && session.ipAddress === ipAddress
    );

    if (sessionExists) {
      res.sendStatus(200);
    } else {
      res.sendStatus(401);
    }
  } catch (error) {
    logToFile("Error checking session: " + error);
    res.sendStatus(500);
  }
});

// Admin Login endpoint
app.post("/loginAuth", (req, res) => {
  const { username, passwordHash } = req.body;

  // Simple authentication
  if (username === validUsername && passwordHash === validPasswordHash) {
    // Login successful
    let sessionID = generateSessionId();
    let ipAddress = req.connection.remoteAddress;
    activeSessions.push({ sessionID, username, ipAddress }); // Storing session along with username
    logToFile("Login successful for '" + username + "' from IP: " + removeIPv6Prefix(ipAddress));

    // Tell Angular that the login was successful and send the sessionID
    res
      .status(200)
      .send({ code: 200, message: "Login successful", sessionID: sessionID });
  } else {
    logToFile("Login failed for '" + username + "' from IP: " + removeIPv6Prefix(req.connection.remoteAddress));

    // Login failed
    res
      .status(401)
      .send({ code: 401, message: "Invalid username or password" });
  }
});

// Protected Endpoint to update a data entry by id
app.put("/update-data/:id", checkIfRequestIsAuthenticated, (req, res) => {
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
      "https://vps-81d09b41.vps.ovh.net/get-user-image?filename=Visitor_" +
      newData.tadeotId +
      ".png";
  }

  if (newData) {
    const result = db.update(paramID, newData); // Update data by ID
    if (result) {
      broadcastMessage("updateHighscores");
      db.saveToFile("database.db");
      logToFile("Data updated by ID: " + paramID);
      res.status(200).json({ message: "Data updated!" });
    } else {
      logToFile("Error updating data by ID: " + paramID);
      res.status(404).json({ error: "Error updating data! Record not found." });
    }
  } else {
    logToFile("Invalid request to update data!");
    res.status(400).json({ error: "Invalid request!" });
  }
});

// Admin Logout endpoint
app.get("/logout", (req, res) => {
  const sessionID = req.cookies.authToken;
  const ipAddress = req.connection.remoteAddress;

  // Check if even a sessionID cookie is present
  if (!sessionID) {
    return res.status(400).send({ code: 400, message: "No session found" });
  }

  // Check if the sessionID and ipAddress combination exists in activeSessions
  let sessionExists = activeSessions.some(
    (session) =>
      session.sessionID === sessionID && session.ipAddress === ipAddress
  );

  if (!sessionExists) {
    return res
      .status(400)
      .send({ code: 400, message: "No active session found" });
  }

  // Remove the session from activeSessions
  activeSessions = activeSessions.filter(
    (session) =>
      session.sessionID !== sessionID && session.ipAddress !== ipAddress
  );

  // Log who logged out with which IP
  logToFile("Logout successful for " + sessionID + " from IP: " + ipAddress);

  // Tell the client that the logout was successful
  res.status(200).send({ code: 200, message: "Logout successful" });
});

// a test url for the keycloak middleware
/*app.get("/test", keycloak.protect(), (req, res) => {
  res.send("Hello World!");
});*/

// Start the HTTPS Server on port 443
server.listen(ENABLE_HTTPS ? 443 : 3000, () => {
  console.log("Server running on port " + (ENABLE_HTTPS ? 443 : 3000));
  logToFile("Server running on port " + (ENABLE_HTTPS ? 443 : 3000));
});
