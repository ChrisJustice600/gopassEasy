const { prisma } = require("../../database/prisma");

const purchase = async (req, res) => {
  const { flightType, paymentMethod } = req.body;
  const qrCode = generateQRCode(); // Une fonction qui génère un QR code

  const transaction = await prisma.transaction.create({
    data: {
      amount: flightType === "NATIONAL" ? 100 : 200, // Exemple de montant
      paymentMethod,
    },
  });

  const ticket = await prisma.ticket.create({
    data: {
      userId: req.user.id,
      flightType,
      qrCode,
      transactionId: transaction.id,
    },
  });

  res.status(201).json(ticket);
};

const listTickets = async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { userId: req.user.id },
  });
  res.json(tickets);
};

module.exports = {
  purchase,
  listTickets,
};
