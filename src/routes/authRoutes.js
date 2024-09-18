const { Router } = require("express");
const {
  signin,
  register,
  updateUserInfo,
  logout,
} = require("../../src/controllers/authController");
const { checkUserAuthenticated } = require("../middleware/authMiddleware");

const authRouter = Router();

authRouter.post("/register", register);

authRouter.post("/signin", signin);
// authRouter.post("/logout", logout);

authRouter.put("/update", checkUserAuthenticated, updateUserInfo);

module.exports = authRouter;
