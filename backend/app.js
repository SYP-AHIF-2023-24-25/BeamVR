const express = require("express");
const { createTable, db, closeDb } = require('./database');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());

async function manageDatabase() {
    try {
        console.log(await createTable());
    } catch (err) {
        console.log(err);
    } finally {
        // await closeDb();
    }
}

const userRouter = require('./routes/user-router').userRouter;
app.use("/scores", (new userRouter(db)).getRouter());

app.listen(port, () => {
    console.log('Server is running on port 3000');
});

manageDatabase();