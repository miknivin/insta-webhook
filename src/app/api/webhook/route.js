import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    if (!VERIFY_TOKEN) {
      throw new Error("Please define the VERIFY_TOKEN environment variable");
    }

    // Extract query parameters from the URL
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    // Handle webhook verification
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully");
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.log("Webhook verification failed");
      return NextResponse.json(
        { error: "Verification token mismatch" },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("Error processing GET request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    console.log("Raw payload:", JSON.stringify(payload, null, 2)); // Log full payload for debugging

    // Function to send WhatsApp message via AiSensy API
    async function sendWhatsAppMessage(phoneNumber, messageText) {
      const AISENSY_API_KEY = process.env.AISENSY_API_KEY;
      const CAMPAIGN_NAME = process.env.CAMPAIGN_NAME;

      if (!AISENSY_API_KEY) {
        throw new Error(
          "Please define the AISENSY_API_KEY environment variable"
        );
      }
      if (!CAMPAIGN_NAME) {
        throw new Error("Please define the CAMPAIGN_NAME environment variable");
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
              campaignName: CAMPAIGN_NAME,
              destination: phoneNumber,
              userName: "Sytro Bags",
              templateParams: [], // No template parameters as per the cURL
              source: "new-landing-page form",
              media: {
                url: "https://whatsapp-media-library.s3.ap-south-1.amazonaws.com/IMAGE/6353da2e153a147b991dd812/4958901_highanglekidcheatingschooltestmin.jpg",
                filename: "sample_media",
              },
              buttons: [],
              carouselCards: [],
              location: {},
              attributes: {},
              paramsFallbackValue: {},
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`AiSensy API request failed: ${response.statusText}`);
        }

        console.log(`WhatsApp message sent to ${phoneNumber}`);
      } catch (error) {
        console.error("Error sending WhatsApp message:", error);
      }
    }

    // Handle WhatsApp messages (field: "messages")
    if (payload.field === "messages") {
      const messageValue = payload.value;

      // Skip if no message text is present
      if (!messageValue.message || !messageValue.message.text) {
        console.log("Skipping WhatsApp message without text:", messageValue);
        return NextResponse.json({ status: "ignored" }, { status: 200 });
      }

      const messageData = {
        senderId: messageValue.sender?.id || "unknown",
        recipientId: messageValue.recipient?.id || "unknown",
        timestamp: new Date(parseInt(messageValue.timestamp) * 1000), // Timestamp in seconds, convert to milliseconds
        message: messageValue.message.text || "No text content",
        mid: messageValue.message.mid || `whatsapp_${Date.now()}`,
        eventType: "whatsapp_message",
      };

      // Check for Indian phone number in message text (with or without +91 prefix)
      const phoneRegex = /(?:\+91)?\d{10}\b/;
      const phoneMatch = messageData.message.match(phoneRegex);
      if (phoneMatch) {
        let phoneNumber = phoneMatch[0];
        // Add +91 prefix if missing
        if (!phoneNumber.startsWith("+91")) {
          phoneNumber = `+91${phoneNumber}`;
        }
        await sendWhatsAppMessage(phoneNumber, messageData.message);
      } else {
        console.log(
          "No Indian phone number found in WhatsApp message:",
          messageData.message
        );
      }

      return NextResponse.json({ status: "success" }, { status: 200 });
    }

    // Handle Instagram messages
    if (payload.object === "instagram") {
      for (const entry of payload.entry) {
        // Handle direct messages (messaging field)
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            if (!messagingEvent.sender?.id || !messagingEvent.recipient?.id) {
              console.log("Skipping message: Missing sender or recipient ID");
              continue;
            }
            // Log whether the message is an echo
            console.log(
              `Message is echo: ${!!messagingEvent.message?.is_echo}`
            );

            const messageData = {
              senderId: messagingEvent.sender.id,
              recipientId: messagingEvent.recipient.id,
              timestamp: new Date(parseInt(messagingEvent.timestamp)), // Timestamp in milliseconds
              message: messagingEvent.message.text || "No text content",
              mid: messagingEvent.message.mid,
              eventType: "message",
            };

            // Check for Indian phone number in message text (with or without +91 prefix)
            const phoneRegex = /(?:\+91)?\d{10}\b/;
            const phoneMatch = messageData.message.match(phoneRegex);
            if (phoneMatch) {
              let phoneNumber = phoneMatch[0];
              // Add +91 prefix if missing
              if (!phoneNumber.startsWith("+91")) {
                phoneNumber = `+91${phoneNumber}`;
              }
              await sendWhatsAppMessage(phoneNumber, messageData.message);
            } else {
              console.log(
                "No Indian phone number found in DM:",
                messageData.message
              );
            }
          }
        }

        // Handle other Instagram events (changes field, e.g., comments, mentions)
        if (entry.changes) {
          for (const change of entry.changes) {
            const messageValue = change.value;

            // Skip if the change doesn't contain a message
            if (!messageValue.message || !messageValue.message.text) {
              console.log("Skipping change event without message:", change);
              continue;
            }

            const messageData = {
              senderId: messageValue.sender?.id || "unknown",
              recipientId: messageValue.recipient?.id || entry.id,
              timestamp: new Date(parseInt(messageValue.timestamp) * 1000), // Timestamp in seconds, convert to milliseconds
              message: messageValue.message.text || "No text content",
              mid: messageValue.message.mid || `change_${Date.now()}`,
              eventType: change.field || "unknown_event",
            };

            // Check for Indian phone number in message text (with or without +91 prefix)
            const phoneRegex = /(?:\+91)?\d{10}\b/;
            const phoneMatch = messageData.message.match(phoneRegex);
            if (phoneMatch) {
              let phoneNumber = phoneMatch[0];
              // Add +91 prefix if missing
              if (!phoneNumber.startsWith("+91")) {
                phoneNumber = `+91${phoneNumber}`;
              }
              await sendWhatsAppMessage(phoneNumber, messageData.message);
            } else {
              console.log(
                "No Indian phone number found in change event:",
                messageData.message
              );
            }
          }
        }
      }

      return NextResponse.json({ status: "success" }, { status: 200 });
    }

    // If neither Instagram nor WhatsApp payload
    console.log("Invalid payload");
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (error) {
    console.error("Error processing POST request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
