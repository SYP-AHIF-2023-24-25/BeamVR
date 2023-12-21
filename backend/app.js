const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const path = require('path');
const loki = require('lokijs'); //LokiJS as DB

//CONFIG
//Port of HTTP Server
const port = 3030;

//is stream online?
const STREAMONLINE = true;
//

// Middleware für die Verarbeitung von JSON-Daten
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Deliver static files in the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Connect to LokiJS DB
const db = new loki('database.db');

db.loadDatabase({}, () => {
  let collection = db.getCollection('beamVR_Highscores'); // Load DB

  if (!collection) {
    collection = db.addCollection('beamVR_Highscores'); // Falls die Sammlung nicht existiert, erstelle sie
  }

  // Route, um Daten aus der LokiJS-Datenbank abzurufen
  app.get('/get-data', (req, res) => {
    const result = collection.find(); // Alle Einträge laden
    res.json(result);
  });

  // Route, um JSON-Daten per POST zu empfangen und in die Datenbank einzufügen
  app.post('/add-data', (req, res) => {
    const newData = req.body; // Empfangene JSON-Daten

    if (newData) {
      collection.insert(newData); // Neue Daten in die Datenbank einfügen
      res.status(201).json({ message: 'Daten erfolgreich hinzugefügt' });
      db.saveDatabase(); //Save to Database
    } else {
      res.status(400).json({ error: 'Ungültige Anfrage' });
    }
  });

  //SendStatus of Stream (Online/Deactivated)
  app.get('/get-stream-status', (req, res) => {
    res.json(STREAMONLINE);
  });
});

// Start the Server
server.listen(port, () => {
  console.log(`Server is running on Port ${port}`);
});
