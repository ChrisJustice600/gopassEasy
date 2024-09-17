const { generateToken } = require("../../config/jwtconfig");
const { prisma, findUserByEmail } = require("../../database/prisma");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role: "USER",
      },
    });

    res
      .status(201)
      .json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Error creating user:", error);

    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Sign in an existing user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(user);
    res.cookie("token", token).json({
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error("Error during signin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { register, signin };
