const express = require("express");
const { createTable, db } = require('./database');
const cors = require('cors');
const socketIo = require('socket.io');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const fs = require("fs");
const cookieParser = require('cookie-parser');

const app = express();
const port = 3000;
const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore }, __dirname + '/keycloak.json');

app.use(express.json());
app.use(session({
    secret: 'some secret',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));
app.use(keycloak.middleware());

app.use(cookieParser());

const corsOptions = {
    origin: true, // Erlaubt alle Origins
    credentials: true, // Erlaubt das Senden von Cookies
};
app.use(cors(corsOptions));

function checkIsTrusted(req, res, next) {
    let lines = fs.readFileSync('trustedUsers.txt').toString().split('\n');
    let token = req.kauth.grant.access_token.content;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i] === token.preferred_username) {
            console.log("User is trusted with name: " + token.preferred_username);
            next();
            return;
        }
    }
    res.sendStatus(403);
}

app.get('/protected', [keycloak.protect()], (req, res) => {
    const token = req.kauth.grant.access_token.token;
    // set token cookie
    res.cookie('token', token, {
        httpOnly: false,
        secure: false, // Setze auf true, wenn du HTTPS verwendest
        sameSite: 'None',
    });
    checkIsTrusted(req, res, () => {
        res.sendStatus(200);
    });
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
app.use("/admin", keycloak.protect(), checkIsTrusted);
app.use("/admin", (adminRouterObject.getRouter()));

manageDatabase();