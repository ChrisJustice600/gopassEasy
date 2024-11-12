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
    const amount = flightType === "NATIONAL" ? 15 : 50;

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

// Fonction pour scanner et traiter le QR code
const scanTickets = async (req, res) => {
  const { qrCode } = req.body; // Texte unique scanné et envoyé depuis le frontend

  try {
    // Récupérer tous les tickets de la base de données avec leur QR code en Base64
    const tickets = await prisma.ticket.findMany({
      include: {
        transaction: true,
        user: true,
      },
    });

    // Trouver le ticket correspondant en comparant les QR codes
    let validTicket = null;
    for (const ticket of tickets) {
      const decodedText = await QRCode.toDataURL(qrCode);
      if (ticket.qrCode === decodedText) {
        validTicket = ticket;
        break;
      }
    }

    // Si aucun ticket correspondant n'est trouvé
    if (!validTicket) {
      return res
        .status(404)
        .json({ error: "Ticket non trouvé ou déjà invalidé" });
    }

    // Vérifier si le ticket est déjà utilisé
    if (validTicket.status === "INVALID") {
      return res.status(400).json({ error: "Ce ticket a déjà été utilisé" });
    }

    // Invalider le ticket
    await prisma.ticket.update({
      where: {
        id: validTicket.id,
      },
      data: { status: "INVALID" },
    });

    // Renvoyer les informations de l'utilisateur et de la transaction associée
    return res.status(200).json({
      message: "Ticket validé avec succès",
      ticket: {
        id: validTicket.id,
        qrCode: validTicket.qrCode,
        flightType: validTicket.flightType,
        status: validTicket.status,
        createdAt: validTicket.createdAt,
        updatedAt: validTicket.updatedAt,
        user: {
          id: validTicket.user.id,
          email: validTicket.user.email,
          username: validTicket.user.username,
          role: validTicket.user.role,
          createdAt: validTicket.user.createdAt,
          updatedAt: validTicket.user.updatedAt,
        },
        transaction: {
          id: validTicket.transaction.id,
          amount: validTicket.transaction.amount,
          paymentMethod: validTicket.transaction.paymentMethod,
          stripePaymentIntentId: validTicket.transaction.stripePaymentIntentId,
          createdAt: validTicket.transaction.createdAt,
          updatedAt: validTicket.transaction.updatedAt,
        },
      },
    });
  } catch (err) {
    console.error("Erreur lors du scan du QR code :", err);
    return res.status(500).json({ error: "Erreur interne du serveur" });
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
