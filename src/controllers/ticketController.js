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
      // Générer une référence de transaction unique pour la simulation
      const transactionReference = `simulated-${Date.now()}-${Math.floor(
        Math.random() * 10000
      )}`;

      // Supposons que le paiement est réussi pour la simulation
      const paymentSuccess = true;

      if (!paymentSuccess) {
        return res
          .status(400)
          .json({ error: "Échec de la simulation de paiement" });
      }

      // Créer l'enregistrement de la transaction après la simulation de paiement réussie
      transaction = await prisma.transaction.create({
        data: {
          amount,
          paymentMethod,
          stripePaymentIntentId: transactionReference, // Remplacer par transactionReference
        },
      });
    } else {
      return res
        .status(400)
        .json({ error: "Méthode de paiement non supportée" });
    }

    // Générer un texte unique pour le code QR
    const uniqueText = `${req.user.id}-${transaction.id}-${Date.now()}`;

    // Fonction simulée pour générer un code QR en base64 (tu pourrais utiliser une bibliothèque pour générer un QR réel)
    const qrCodeBase64 = await generateQRCode(uniqueText);

    // Créer le ticket
    const ticket = await prisma.ticket.create({
      data: {
        userId: req.user.id,
        flightType,
        qrCode: qrCodeBase64,
        transactionId: transaction.id,
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

  const ticket = await prisma.ticket.findUnique({
    where: { qrCode },
  });

  if (!ticket || ticket.status === "INVALID") {
    return res.status(400).json({ error: "Invalid ticket" });
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "INVALID" },
  });

  res.json({ message: "Ticket validated" });
};

module.exports = {
  purchase,
  listTickets,
  scanTickets,
};
