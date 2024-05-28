const express = require("express");
const { createTable, db, closeDb } = require('./database');
const cors = require('cors');
const socketIo = require('socket.io');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const fs = require("fs");

const app = express();
const port = 3000;
const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore });

app.use(cors());
app.use(express.json());
app.use(session({
    secret: 'some secret',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));
app.use(keycloak.middleware());

app.get('/protected', [keycloak.protect()], (req, res) => {
    const token = req.kauth.grant.access_token.content;
    let lines = fs.readFileSync('trustedUsers.txt').toString().split('\n');

    for (let i = 0; i < lines.length; i++) {
        if (lines[i] === token.name) {
            res.sendStatus(200);
            return;
        }
    }
    res.sendStatus(403);
});

async function manageDatabase() {
    try {
        console.log(await createTable());
    } catch (err) {
        console.log(err);
    } finally {
        // await closeDb();
    }
}

const server = app.listen(port, () => {
    console.log('Server is running on port 3000');
});

const io = socketIo(server, {
    cors: {
        origin: '*',
    }
});

const userRouter = require('./routes/user-router').userRouter;
const userRouterObject = new userRouter(io, db);
app.use("/scores", (userRouterObject.getRouter()));

const adminRouter = require('./routes/admin-router').adminRouter;
const adminRouterObject = new adminRouter(io, db, userRouterObject);
app.use("/admin", (adminRouterObject.getRouter()));

manageDatabase();