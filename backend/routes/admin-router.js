const express = require("express");

class AdminRouter {
    constructor(io, db) {
        this.db = db;
        this.router = express.Router();
        this.router.use(express.json());
        this.io = io;

        this.deleteAllUsers();
        this.deleteUser();
        this.updateUser();
    }

    async deleteAllUsers() {
        this.router.delete("/deleteAllUsers", async (req, res) => {
            try {
                await this.db.run(`DELETE FROM users`, [], (err) => {
                    if (err) {
                        res.status(500).json({error: err.message});
                    } else {
                        res.status(200).json({message: "All users deleted"});
                        this.io.emit('refresh');
                    }
                });
            } catch (err) {
                res.status(500).json({error: err.message});
            }
        });
    }

    async deleteUser() {
        this.router.delete("/deleteUser/:tadeotId", async (req, res) => {
            try {
                await this.db.run(`DELETE FROM users WHERE tadeotId = ?`, [req.params.tadeotId], (err) => {
                    if (err) {
                        res.status(500).json({error: err.message});
                    } else {
                        res.status(200).json({message: "User deleted"});
                        this.io.emit('refresh');
                    }
                });
            } catch (err) {
                res.status(500).json({error: err.message});
            }
        });
    }

    async updateUser() {
        this.router.put("/updateUser/:tadeotId", async (req, res) => {
            try {
                await this.db.run(`UPDATE users SET username = ?, score = ? WHERE tadeotId = ?`, [req.body.username, req.body.score, req.body.tadeotId], (err) => {
                    if (err) {
                        res.status(500).json({error: err.message});
                    } else {
                        res.status(200).json({message: "User updated"});
                        this.io.emit('refresh');
                    }
                });
            } catch (err) {
                res.status(500).json({error: err.message});
            }
        });
    }

    getRouter() {
        return this.router;
    }
}

module.exports = { adminRouter: AdminRouter };