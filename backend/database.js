const sqlite3 = require('sqlite3');

let db = new sqlite3.Database(__dirname + '/database.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Connected to the database.');
});

function createTable() {
    return new Promise((resolve, reject) => {
	console.log("EXEC!!!!");
        db.exec(`CREATE TABLE IF NOT EXISTS users (
            userId INTEGER PRIMARY KEY AUTOINCREMENT,
            tadeotId INTEGER NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            rank INTEGER NOT NULL,
            score INTEGER NOT NULL
        )`, (err) => {
            if (err) {
		console.log("ERROR!!! :(");
                reject(err);
            } else {
		console.log("ELSEEEE!! ");
                resolve("Table created successfully.");
            }
        });
    });
}

function closeDb() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                console.log('Connection to the database has been closed.');
                resolve();
            }
        });
    });
}

module.exports = { createTable, db, closeDb };
