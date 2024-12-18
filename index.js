const express = require("express");
const helmet = require("helmet");

const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
dotenv.config();

const PORT = process.env.PORT;
const app = express();

const authRouter = require("./src/routes/authRoutes");
const ticketRouter = require("./src/routes/ticketRoutes");

app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

app.use(cookieParser());

app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(express.json());

app.use("/auth", authRouter);
app.use("/api", ticketRouter);

app.get("/", (req, res) => {
  res.send("<h1>Bienvenue au serveur C3</h1>");
});

app.listen(PORT, () => console.log(`server started on ${PORT}`));
