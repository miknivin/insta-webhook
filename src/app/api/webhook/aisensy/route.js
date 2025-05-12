import sendWhatsAppMessage from "@/app/utils/sendWhatsApp";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const name = searchParams.get("name");
    const address = searchParams.get("address");
    console.log(request.body, "body");

    // if (!phone || !name) {
    //   return NextResponse.json(
    //     { error: "Missing required query parameters: phone or name" },
    //     { status: 400 }
    //   );
    // }

    // Template parameters for second message
    const templateParams = [name, phone, address];

    // First WhatsApp message
    await sendWhatsAppMessage(
      phone,
      "cust_enquire_mal",
      [], // no template params
      name,
      {} // empty media
    );

    // Internal lead notification
    await sendWhatsAppMessage(
      "9567678465",
      "new lead message",
      templateParams,
      "sytro",
      {} // empty media
    );

    return NextResponse.json(
      {
        status: "success",
        message: `Messages sent successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
