const Stripe = require("stripe");

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const emailTemplates = {
  pt: {
    subject: "O teu ebook: BYD - A Invasão dos Deuses",
    body: function(url) {
      return '<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:40px 20px;color:#2A2520;">'
        + '<h1 style="font-size:24px;margin-bottom:8px;">Obrigado pela tua compra!</h1>'
        + '<p style="color:#5A5045;line-height:1.7;">O teu exemplar de <strong>BYD: A Invasão dos Deuses</strong> está pronto para download.</p>'
        + '<a href="' + url + '" style="display:inline-block;margin:24px 0;padding:14px 36px;background:#2A2520;color:#F5F0E8;text-decoration:none;border-radius:40px;font-family:sans-serif;font-size:15px;">Descarregar Ebook (PDF)</a>'
        + '<p style="font-size:13px;color:#8B7355;margin-top:24px;">Guarda este email. Podes usar o link para descarregar o ebook sempre que precisares.</p>'
        + '<hr style="border:none;border-top:1px solid #E8E0D0;margin:32px 0 16px;" />'
        + '<p style="font-size:12px;color:#B8A080;">Build Your Dreams. Constrói os Teus Sonhos.</p></div>';
    }
  },
  en: {
    subject: "Your ebook: BYD - The Invasion of the Gods",
    body: function(url) {
      return '<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:40px 20px;color:#2A2520;">'
        + '<h1 style="font-size:24px;margin-bottom:8px;">Thank you for your purchase!</h1>'
        + '<p style="color:#5A5045;line-height:1.7;">Your copy of <strong>BYD: The Invasion of the Gods</strong> is ready for download.</p>'
        + '<a href="' + url + '" style="display:inline-block;margin:24px 0;padding:14px 36px;background:#2A2520;color:#F5F0E8;text-decoration:none;border-radius:40px;font-family:sans-serif;font-size:15px;">Download Ebook (PDF)</a>'
        + '<p style="font-size:13px;color:#8B7355;margin-top:24px;">Save this email. You can use the link to download the ebook whenever you need.</p>'
        + '<hr style="border:none;border-top:1px solid #E8E0D0;margin:32px 0 16px;" />'
        + '<p style="font-size:12px;color:#B8A080;">Build Your Dreams.</p></div>';
    }
  }
};

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.payment_status === "paid") {
      const email = session.customer_details?.email;
      const lang = session.client_reference_id === "en" ? "en" : "pt";
      const sessionId = session.id;
      const siteUrl = process.env.SITE_URL || "https://byd-ebook.vercel.app";
      const downloadUrl = siteUrl + "/obrigado.html?session_id=" + sessionId;
      const template = emailTemplates[lang];

      if (email) {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: "Bearer " + process.env.RESEND_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "BYD Ebook <onboarding@resend.dev>",
              to: [email],
              subject: template.subject,
              html: template.body(downloadUrl),
            }),
          });

          const result = await response.json();
          console.log("Email sent to:", email, "lang:", lang, "result:", JSON.stringify(result));
        } catch (emailErr) {
          console.error("Email send error:", emailErr.message);
        }
      }
    }
  }

  return res.json({ received: true });
}

module.exports = handler;

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
