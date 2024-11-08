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

    // // Vérifiez que tous les champs sont fournis
    // if (!username || !email || !password) {
    //   return res
    //     .status(400)
    //     .json({
    //       error: "Nom d'utilisateur, email, et mot de passe sont requis",
    //     });
    // }

    // // Vérifiez la longueur et la validité du nom d'utilisateur
    // if (username.length < 3 || username.length > 30) {
    //   return res
    //     .status(400)
    //     .json({
    //       error: "Le nom d'utilisateur doit comporter entre 3 et 30 caractères",
    //     });
    // }

    // // Vérifiez la validité de l'adresse email
    // const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (!EMAIL_REGEX.test(email)) {
    //   return res.status(400).json({ error: "Adresse email invalide" });
    // }

    // // Vérifiez la force du mot de passe
    // const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    // if (!PASSWORD_REGEX.test(password)) {
    //   return res.status(400).json({
    //     error:
    //       "Le mot de passe doit contenir au moins 8 caractères, dont une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial",
    //   });
    // }

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
        role,
      },
    });

    // Répondre avec les informations de l'utilisateur créé
    res
      .status(201)
      .json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);

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

    // Vérification des champs requis
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email et mot de passe sont requis." });
    }

    // Vérification de format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ error: "Le format de l'email est invalide." });
    }

    // Vérification de l'utilisateur
    const user = await findUserByEmail(email);
    if (!user) {
      return res
        .status(401)
        .json({ error: "Email ou mot de passe incorrect." });
    }

    // Vérification du mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ error: "Email ou mot de passe incorrect." });
    }

    // Génération et envoi du token
    const token = generateToken(user);
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
      })
      .json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: token,
      });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    res
      .status(500)
      .json({ error: "Erreur serveur. Veuillez réessayer plus tard." });
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
