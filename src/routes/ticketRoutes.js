const { Router } = require("express");
const { purchase } = require("../../src/controllers/ticketController");

const authRouter = Router();

authRouter.post("/tickets/purchase", checkUserAuthenticated, purchase);

module.exports = authRouter;
