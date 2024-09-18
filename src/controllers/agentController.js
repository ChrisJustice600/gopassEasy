const { prisma } = require("../../database/prisma");

const scanQRCode = async (req, res) => {
  const { qrCode } = req.body;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        transaction: {
          select: {
            amount: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticketInfo = {
      id: ticket.id,
      status: ticket.status,
      flightType: ticket.flightType,
      userEmail: ticket.user.email,
      createdAt: ticket.createdAt,
      transaction: ticket.transaction,
    };

    res.json({ ticket: ticketInfo });
  } catch (error) {
    console.error("Error scanning QR code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const invalidateTicket = async (req, res) => {
  const { ticketId } = req.body;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (ticket.status === "INVALID") {
      return res.status(400).json({ error: "Ticket is already invalidated" });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "INVALID" },
    });

    res.json({
      message: "Ticket invalidated successfully",
      ticket: {
        id: updatedTicket.id,
        status: updatedTicket.status,
        flightType: updatedTicket.flightType,
        updatedAt: updatedTicket.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error invalidating ticket:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  scanQRCode,
  invalidateTicket,
};
