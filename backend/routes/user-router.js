const express = require('express');
const { get } = require("axios");

class UserRouter {
    constructor(io, db) {
        this.db = db;
        this.router = express.Router();
        this.router.use(express.json());
        this.io = io;

        this.getUsers();
        this.getUser();
        this.getBestUser();
        this.getLatestUser();
        this.getUserImage();
        this.addUser();
    }

    async getUsers() {
        this.router.get("/getUsers", async (req, res) => {
            try {
                await this.db.all(`SELECT tadeotId, username, rank, score FROM users`, [], (err, rows) => {
                    if (err) {
                        res.status(500).json({error: err.message});
                    } else {
                        res.status(200).json(rows);
                    }
                });
            } catch (err) {
                res.status(500).json({error: err.message});
            }
        });
    }

    async getUser() {
        this.router.get("/getUser/:tadeotId", async (req, res) => {
            try {
                await this.db.all(`SELECT userId, tadeotId, username, rank, score FROM users WHERE tadeotId = ?`, [req.params.tadeotId], (err, row) => {
                    if (err) {
                        res.status(500).json({error: err.message});
                    } else {
                        res.status(200).json(row);
                    }
                });
            } catch (err) {
                res.status(500).json({error: err.message});
            }
        });
    }

    async getBestUser() {
        this.router.get("/getBestUsers", async (req, res) => {
            try {
                await this.db.all(`SELECT userId, tadeotId, username, rank, score FROM users ORDER BY score DESC LIMIT 6`, [], (err, row) => {
                    if (err) {
                        res.status(500).json({error: err.message});
                    } else {
                        res.status(200).json(row);
                    }
                });
            } catch (err) {
                res.status(500).json({error: err.message});
            }
        });
    }

    async getLatestUser() {
        this.router.get("/getLatestUsers", async (req, res) => {
            try {
                await this.db.all(`SELECT userId, tadeotId, username, rank, score FROM users ORDER BY userId DESC LIMIT 6`, [], (err, row) => {
                    if (err) {
                        res.status(500).json({error: err.message});
                    } else {
                        res.status(200).json(row);
                    }
                });
            } catch (err) {
                res.status(500).json({error: err.message});
            }
        });
    }

    async addUser() {
        this.router.post("/addUser", async (req, res) => {
            try {
                await this.db.serialize(async () => {
                    await this.db.run('BEGIN');
                    const result = await this.db.run(
                        `INSERT INTO users (tadeotId, username, rank, score) VALUES (?, ?, ?, ?)`,
                        [req.body.tadeotId, req.body.username, req.body.rank, req.body.score]
                    );

                    // id of the last inserted row
                    const lastID = result.lastID;
                    try {
                        // updates user ranks after adding a new user
                        await this.updateRanks();
                        await this.db.run('COMMIT');

                        res.status(201).json({message: `A user with userId ${lastID} has been added.`});
                        // notify all clients about new user
                        this.io.emit('userAdded', {userId: lastID, username: req.body.username});
                    } catch (error) {
                        console.error('Error during rank update or commit:', error.message);
                        await this.db.run('ROLLBACK');
                        res.status(500).json({error: error.message});
                    }
                });
            } catch (err) {
                console.error('Database operation failed:', err.message);
                await this.db.run('ROLLBACK');
                res.status(400).json({error: err.message});
            }
        });
    }



    async updateRanks() {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM users ORDER BY score DESC`, (err, users) => {
                if (err) {
                    reject(err);
                    return;
                }
                // rank is determined by their position in the ordered list (index + 1)
                let updates = users.map((user, index) => {
                    return new Promise((resolve, reject) => {
                        this.db.run(`UPDATE users SET rank = ? WHERE userId = ?`, [index + 1, user.userId], (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    });
                });
                Promise.all(updates).then(resolve).catch(reject);
            });
        });
    }

    async getUserImage() {
        this.router.get("/getUserImage/:tadeotId", async (req, res) => {
            const tadeotId = req.params.tadeotId.padStart(4, '0');
            const imageUrl = `https://tadeot.htl-leonding.ac.at/tadeot-backend-v23/images/Visitor_${tadeotId}.png`;
            try {
                const response = await get(imageUrl);
                res.status(200).send(response.data);
            } catch (err) {
                // read and send the default image
                let path = require('path');
                res.sendFile(path.resolve('public/media/userpic-Placeholder.jpg'));
            }
        });
    }

    getRouter() {
        return this.router;
    }
}

module.exports = { userRouter: UserRouter };