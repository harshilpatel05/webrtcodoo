const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.handleNylasWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const event = req.body;
    
    // (Optional) Verify webhook signature here
    // https://developer.nylas.com/docs/developer-tools/webhooks/verify-signatures/

    await admin.firestore().collection("scheduler-events").add({
      type: event.type,
      data: event.data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).send("Event logged");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Error processing webhook");
  }
});