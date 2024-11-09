const { Router } = require("express");
const {
  purchase,
  listTickets,
  getUserTickets,
  scanTickets,
} = require("../controllers/ticketController");
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
ticketRouter.get("/tickets/user", checkUserAuthenticated, getUserTickets);

// Agent routes
ticketRouter.post(
  "/agent/scan",
  checkUserAuthenticated,
  // checkUserRole(["AGENT", "ADMIN"]),
  scanTickets
);
// ticketRouter.post(
//   "/agent/invalidate",
//   checkUserAuthenticated,
//   checkUserRole(["AGENT", "ADMIN"]),
//   invalidateTicket
// );

module.exports = ticketRouter;
