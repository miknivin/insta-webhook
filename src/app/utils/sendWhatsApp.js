export async function sendWhatsAppMessage(
  phoneNumber,
  campaignName,
  templateParams,
  userName,
  media
) {
  const AISENSY_API_KEY = process.env.AISENSY_API_KEY;

  if (!AISENSY_API_KEY) {
    throw new Error("Please define the AISENSY_API_KEY environment variable");
  }

  try {
    const response = await fetch(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AISENSY_API_KEY}`,
        },
        body: JSON.stringify({
          apiKey: AISENSY_API_KEY,
          campaignName,
          destination: phoneNumber,
          userName,
          templateParams,
          source: "Aisensy",
          media,
          buttons: [],
          carouselCards: [],
          location: {},
          attributes: {},
          paramsFallbackValue: {},
        }),
      }
    );

    if (!response.ok) {
      console.error(await response.text()); 
      throw new Error(`AiSensy API request failed: ${response.statusText}`);
    }

    console.log(`WhatsApp message sent to ${phoneNumber}`);
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    throw error;
  }
}

export default sendWhatsAppMessage;
