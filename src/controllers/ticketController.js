const { prisma } = require("../../database/prisma");
const QRCode = require("qrcode");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const generateQRCode = async (text) => {
  try {
    return await QRCode.toDataURL(text);
  } catch (err) {
    console.error("Erreur lors de la génération du code QR :", err);
    throw new Error("Échec de la génération du QR code");
  }
};

const purchase = async (req, res) => {
  const { flightType, paymentMethod, stripeToken } = req.body;

  try {
    const amount = flightType === "NATIONAL" ? 100 : 200;

    let transaction;

    if (paymentMethod === "CARD") {
      // Process Stripe payment
      const charge = await stripe.charges.create({
        amount: amount * 100, // Stripe expects amount in cents
        currency: "eur",
        source: stripeToken,
        description: `Flight ticket purchase - ${flightType}`,
      });

      if (charge.status !== "succeeded") {
        return res.status(400).json({ error: "Payment failed" });
      }

      // Create transaction record after successful payment
      transaction = await prisma.transaction.create({
        data: {
          amount,
          paymentMethod,
          stripeChargeId: charge.id,
        },
      });
    } else {
      // For other payment methods, create transaction immediately
      transaction = await prisma.transaction.create({
        data: {
          amount,
          paymentMethod,
        },
      });
    }

    // Generate unique text for QR code
    const uniqueText = `${req.user.id}-${transaction.id}-${Date.now()}`;

    // Generate QR code
    const qrCodeBase64 = await generateQRCode(uniqueText);

    // Create ticket
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
