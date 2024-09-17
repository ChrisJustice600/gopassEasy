const { Router } = require("express");
const { purchase } = require("../../src/controllers/ticketController");
const { listTickets } = require("../../src/controllers/ticketController");

const authRouter = Router();

authRouter.post("/tickets/purchase", checkUserAuthenticated, purchase);
authRouter.get("/tickets/list", checkUserAuthenticated, listTickets);

module.exports = authRouter;
