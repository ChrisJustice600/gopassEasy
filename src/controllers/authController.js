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
    const { username, email, password } = req.body;
    console.log(username, email, password);

    // Vérifiez que l'email et le mot de passe sont fournis
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "L'email et le mot de passe sont requis" });
    }

    // Vérifiez la validité de l'adresse email
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Adresse email invalide" });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Définir le rôle en fonction de l'email
    const role = email === "admin@gopass.cd" ? "ADMIN" : "USER";

    // Créer l'utilisateur avec le rôle défini
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: passwordHash,
        role, // Attribuer le rôle ici
      },
    });

    // Répondre avec les informations de l'utilisateur créé
    res
      .status(201)
      .json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);

    // Gérer les erreurs de duplication d'email
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return res.status(400).json({ error: "Cet email existe déjà" });
    }
    res.status(500).json({ error: "Erreur interne du serveur" });
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
    console.log(token);

    res.cookie("token", token).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: token,
    });
  } catch (error) {
    console.error("Error during signin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateUserInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, password } = req.body;

    let updateData = {};

    if (email) {
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      updateData.email = email;
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      updateData.password = passwordHash;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      message: "User information updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user information:", error);
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return res.status(400).json({ error: "Email already in use" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { register, signin, updateUserInfo };
