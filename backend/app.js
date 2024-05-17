const express = require("express");
const { createTable, db, closeDb } = require('./database');
const cors = require('cors');
const socketIo = require('socket.io');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

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