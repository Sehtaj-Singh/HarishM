const axios = require("axios");

//Env
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const TEMPLATE_NAME = process.env.TEMPLATE_NAME;
const LANGUAGE_CODE = "en_US";


const sendOTP = async (phone, otp) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone, // Should be in international format like "919876543210"
        type: "template",
        template: {
          name: TEMPLATE_NAME,
          language: {
            code: LANGUAGE_CODE,
          },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }],
            },
            {
              type: "button",
              sub_type: "url",
              index: 0,
              parameters: [{ type: "text", text: otp }],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ WhatsApp message sent:", response.data);
  } catch (error) {
    console.error(
      "❌ Failed to send WhatsApp OTP:",
      error.response?.data || error.message
    );
  }
};


module.exports = sendOTP;