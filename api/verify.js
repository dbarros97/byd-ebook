const Stripe = require("stripe");

module.exports = async (req, res) => {
  const sessionId = req.query.session_id;

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return res.status(400).json({ paid: false, error: "session_id inválido" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return res.json({
      paid: session.payment_status === "paid",
      lang: session.client_reference_id || "pt",
      customer_email: session.customer_details?.email || null,
    });
  } catch (err) {
    return res.status(400).json({ paid: false, error: "Sessão não encontrada" });
  }
};
