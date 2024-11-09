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
  console.log(flightType, paymentMethod);

  try {
    // Définir le montant en fonction du type de vol
    const amount = flightType === "NATIONAL" ? 100 : 200;

    let transaction;

    // Simulation de paiement par carte bancaire ou Mobile Money
    if (paymentMethod === "CARD" || paymentMethod === "MOBILE_MONEY") {
      const transactionReference = `simulated-${Date.now()}-${Math.floor(
        Math.random() * 10000
      )}`;
      const paymentSuccess = true; // Simuler le succès du paiement

      if (!paymentSuccess) {
        return res
          .status(400)
          .json({ error: "Échec de la simulation de paiement" });
      }

      // Créer l'enregistrement de la transaction
      transaction = await prisma.transaction.create({
        data: {
          amount,
          paymentMethod,
          stripePaymentIntentId: transactionReference,
        },
      });
    } else {
      return res
        .status(400)
        .json({ error: "Méthode de paiement non supportée" });
    }

    // Générer un texte unique pour le code QR
    const uniqueText = `${req.user.id}-${transaction.id}-${Date.now()}`;
    const qrCodeBase64 = await generateQRCode(uniqueText);

    // Créer le ticket avec la transaction
    const ticket = await prisma.ticket.create({
      data: {
        userId: req.user.id,
        flightType,
        qrCode: qrCodeBase64,
        transaction: {
          connect: { id: transaction.id }, // Connecter la transaction créée
        },
      },
    });

    res.status(201).json(ticket);
  } catch (err) {
    console.error("Erreur lors de la création du ticket :", err);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
};
const listTickets = async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { userId: req.user.id },
  });
  res.json(tickets);
};

const scanTickets = async (req, res) => {
  const { qrCode } = req.body;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        user: true,
        transaction: true,
      },
    });

    if (!ticket) {
      console.error("Ticket introuvable avec le QR Code :", qrCode);
      return res.status(400).json({ error: "Ticket introuvable" });
    }

    if (ticket.status === "INVALID") {
      console.error(
        "Tentative de validation d'un ticket déjà invalidé. ID :",
        ticket.id
      );
      return res.status(400).json({ error: "Ticket déjà invalidé" });
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "INVALID" },
    });

    res.json({ message: "Ticket validé avec succès", ticket });
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
