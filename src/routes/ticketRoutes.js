const { Router } = require("express");
const { purchase } = require("../../src/controllers/authController");

const authRouter = Router();

authRouter.post("/tickets/purchase", checkUserAuthenticated, purchase);

module.exports = authRouter;
