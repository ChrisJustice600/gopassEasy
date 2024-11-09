const { prisma } = require("../../database/prisma");
const QRCode = require("qrcode");
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const generateQRCode = async (text) => {
  try {
    return await QRCode.toDataURL(text);
  } catch (err) {
    console.error("Erreur lors de la génération du code QR :", err);
    throw new Error("Échec de la génération du QR code");
  }
};

const purchase = async (req, res) => {
  const { flightType, paymentMethod } = req.body;

  try {
    // Définir le montant en fonction du type de vol
    const amount = flightType === "NATIONAL" ? 100 : 200;

    if (!["CARD", "MOBILE_MONEY"].includes(paymentMethod)) {
      return res
        .status(400)
        .json({ error: "Méthode de paiement non supportée" });
    }

    // Simulation d'un paiement
    const transactionReference = `simulated-${Date.now()}-${Math.floor(
      Math.random() * 10000
    )}`;
    const paymentSuccess = true; // Simule le succès du paiement

    if (!paymentSuccess) {
      return res
        .status(400)
        .json({ error: "Échec de la simulation de paiement" });
    }

    // Création de la transaction
    const transaction = await prisma.transaction.create({
      data: {
        amount,
        paymentMethod,
        stripePaymentIntentId: transactionReference,
      },
    });

    // Génération d'un texte unique pour le QR code
    const uniqueText = `${req.user.id}-${transaction.id}-${Date.now()}`;
    const qrCodeBase64 = await generateQRCode(uniqueText);
    const userId = req.user.id;
    console.log(userId);

    // Création du ticket
    const ticket = await prisma.ticket.create({
      data: {
        flightType,
        qrCode: qrCodeBase64,
        transaction: {
          connect: { id: transaction.id },
        },
        user: {
          connect: { id: userId }, // Connecter un utilisateur existant avec son id
        },
      },
    });

    return res.status(201).json({
      message: "Ticket généré avec succès",
      ticket,
    });
  } catch (err) {
    console.error("Erreur lors de la création du ticket :", err);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
};
const listTickets = async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { userId: req.user.id },
  });
  res.json(tickets);
};

// const QRCode = require("qrcode"); // Assurez-vous d'avoir ce module pour décoder le QR code

const decodeQRCode = async (qrCodeData) => {
  try {
    return await QRCode.decode(qrCodeData); // Si le QR code est scanné comme image
  } catch (err) {
    console.error("Erreur lors du décodage du code QR :", err);
    throw new Error("Échec du décodage du QR code");
  }
};

const scanTickets = async (req, res) => {
  const { qrCode } = req.body;

  try {
    // Décoder le texte du QR code si nécessaire
    const decodedText = await decodeQRCode(qrCode);

    // Rechercher le ticket en fonction du QR code décodé
    const ticket = await prisma.ticket.findUnique({
      where: { qrCode: decodedText },
      include: {
        user: true,
        transaction: true,
      },
    });

    if (!ticket) {
      console.error("Ticket introuvable avec le QR Code :", decodedText);
      return res.status(400).json({ error: "Ticket introuvable" });
    }

    if (ticket.status === "INVALID") {
      console.error(
        "Tentative de validation d'un ticket déjà invalidé. ID :",
        ticket.id
      );
      return res.status(400).json({ error: "Ticket déjà invalidé" });
    }

    // Marquer le ticket comme invalidé pour éviter une double utilisation
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "INVALID" },
    });

    res.json({
      message: "Ticket validé avec succès",
      ticket,
      user: ticket.user,
      transaction: ticket.transaction,
    });
  } catch (error) {
    console.error("Erreur lors de la validation du ticket :", error);
    res
      .status(500)
      .json({ error: "Erreur serveur, veuillez réessayer plus tard." });
  }
};

const getUserTickets = async (req, res) => {
  console.log(req.user);

  try {
    // Vérifiez si l'utilisateur est authentifié et si son ID est bien défini
    if (!req.user || !req.user.id) {
      return res.status(400).json({ error: "Utilisateur non authentifié" });
    }

    // Récupérez l'ID de l'utilisateur et assurez-vous qu'il est de type Int
    const userId = parseInt(req.user.id, 10);

    // Récupérez tous les tickets de cet utilisateur, y compris la transaction associée
    const tickets = await prisma.ticket.findMany({
      where: { userId: userId },
      include: {
        transaction: true, // Inclut les détails de la transaction associée
      },
    });

    // Retourne la liste des tickets
    return res.status(200).json(tickets);
  } catch (err) {
    console.error("Erreur lors de la récupération des tickets :", err);
    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
};

module.exports = {
  purchase,
  listTickets,
  scanTickets,
  getUserTickets,
};
