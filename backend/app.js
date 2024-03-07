const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { LeoDB } = require("./leodb/");
const multer = require("multer");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();

console.log("-----------------------------");
console.log("Server starting...");

// SSL Certificate and Private Key paths
const privateKey = fs.readFileSync(
  "/etc/letsencrypt/live/vps-81d09b41.vps.ovh.net/privkey.pem",
  "utf8"
);
const certificate = fs.readFileSync(
  "/etc/letsencrypt/live/vps-81d09b41.vps.ovh.net/fullchain.pem",
  "utf8"
);
const credentials = { key: privateKey, cert: certificate };

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

const apiKey =
  "dcfc58543cd6c3cc1f73d8eef31a1cb077393bbebbf28c8c8fb1b69e11ca2167";

const checkApiKey = (req, res, next) => {
  const receivedApiKey = req.headers["x-api-key"];

  if (receivedApiKey && receivedApiKey === apiKey) {
    next();
  } else {
    res.status(401).json({ error: "Not authorized" });
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

// Use CORS middleware
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

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
if (fs.existsSync("database.db")) {
  db.loadFromFile("database.db");
  console.log("SERVER: Database loaded from file.");
} else {
  console.log("SERVER: Database file not found. Created empty database.");
}

// Endpoint which redirects convieniently to the angualar frontend
app.get("/", (req, res) => {
  res.redirect("https://vps-81d09b41.vps.ovh.net:4200/home");
});

// Route to load data from the database
app.get("/get-data", (req, res) => {
  const result = db.read(); // Read all data
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
    console.error(error);
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

// Route to receive data for the highscore table
app.post("/add-data", checkApiKey, (req, res) => {
  const newData = req.body;

  if (newData) {
    console.log("DEBUG: Received data:", newData);
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
    db.create(newData); // Use LeoDB to create new data
    db.saveToFile("database.db"); // Save the database to a file, so we can restore the data after a server restart
    broadcastMessage("updateHighscores"); // Send Signal to all clients to update the highscore table
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
      console.log("SERVER: Error in saving the file:", err);
      return res.status(500).json({ error: "Error saving image!" });
    }
    res.status(201).json({ message: "Image saved successfully!" });

    fs.readFile(targetPath, (err, data) => {
      if (err) {
        console.log("SERVER: Error in reading the file:", err);
      }
      broadcastMessage(data);
      fs.unlinkSync(targetPath);
    });
  });
});

// Protected Endpoint to delete all data
app.delete("/delete-data", checkApiKey, (req, res) => {
  db.deleteAll();
  db.saveToFile("database.db"); // Delete all data and save the database to a file to overrite the old data
  broadcastMessage("updateHighscores");
  console.log("SERVER: All data deleted!");
  res.json({ message: "All data deleted!" });
});

// Protected Endpoint to delete data by ID
app.delete("/delete-data/:id", checkApiKey, (req, res) => {
  const ParamID = req.params.id;

  const result = db.delete({ id: ParamID }); // Delete data by ID
  console.log("SERVER: Data deleted by ID:", result);
  if (result == true) {
    broadcastMessage("updateHighscores");
    db.saveToFile("database.db");
    res.status(200).json({ message: "Data deleted!" });
  } else {
    res.status(404).json({ error: "Error deleting data!" });
  }
});

// Start the HTTPS Server on port 443
httpsServer.listen(443, () => {
  console.log("HTTPS Server running on port 443");
});
