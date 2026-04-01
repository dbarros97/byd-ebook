const Stripe = require("stripe");
const fs = require("fs");
const path = require("path");

module.exports = async (req, res) => {
  const sessionId = req.query.session_id;

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return res.status(400).json({ error: "session_id inválido" });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(403).json({ error: "Pagamento não confirmado" });
    }

    // Determine language from client_reference_id
    const lang = session.client_reference_id === "en" ? "en" : "pt";
    const filename = "byd_invasao_dos_deuses_" + lang + ".pdf";
    const pdfPath = path.join(process.cwd(), "_files", filename);

    if (!fs.existsSync(pdfPath)) {
      return res.status(500).json({ error: "Ficheiro não encontrado" });
    }

    const pdf = fs.readFileSync(pdfPath);
    const downloadName = lang === "en"
      ? "BYD_The_Invasion_of_the_Gods.pdf"
      : "BYD_A_Invasao_dos_Deuses.pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="' + downloadName + '"');
    res.setHeader("Content-Length", pdf.length);
    res.setHeader("Cache-Control", "no-store");

    return res.send(pdf);
  } catch (err) {
    if (err.type === "StripeInvalidRequestError") {
      return res.status(403).json({ error: "Sessão inválida" });
    }
    console.error("Download error:", err.message);
    return res.status(500).json({ error: "Erro ao validar pagamento" });
  }
};
