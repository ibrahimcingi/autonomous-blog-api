import Stripe from "stripe";

console.log("🔥 SUBSCRIPTION ENDPOINT HIT");
console.log("Stripe key length:", process.env.STRIPE_SECRET_KEY?.length);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


export const createSubscription = async (req, res) => {
  try {
    const { email, paymentMethodId, priceId } = req.body;

    if (!email || !paymentMethodId || !priceId) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // 1. Customer oluştur
    const customer = await stripe.customers.create({
      email,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // 2. Subscription oluştur
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ["latest_invoice.payment_intent"],
    });

    return res.status(200).json({
      success: true,
      subscription,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message,
    });
  }
};
