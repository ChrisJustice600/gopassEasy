const { Router } = require("express");
const { purchase, listTickets } = require("../controllers/ticketController");
const {
  scanQRCode,
  invalidateTicket,
} = require("../controllers/agentController");
const {
  checkUserAuthenticated,
  checkUserRole,
} = require("../middleware/authMiddleware");

const ticketRouter = Router();

ticketRouter.post("/tickets/purchase", checkUserAuthenticated, purchase);
ticketRouter.get("/tickets/list", checkUserAuthenticated, listTickets);

// Agent routes
ticketRouter.post(
  "/agent/scan",
  checkUserAuthenticated,
  checkUserRole(["AGENT", "ADMIN"]),
  scanQRCode
);
ticketRouter.post(
  "/agent/invalidate",
  checkUserAuthenticated,
  checkUserRole(["AGENT", "ADMIN"]),
  invalidateTicket
);

module.exports = ticketRouter;
