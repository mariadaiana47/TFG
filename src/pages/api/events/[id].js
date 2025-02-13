import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import jwt from "jsonwebtoken";

const JWT_SECRET = "super_secret_key";

export default async function handler(req, res) {
  // Add debug logging
  console.log("API Route hit:", req.method, req.query);

  if (req.method !== "PATCH") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    await dbConnection();

    const { eventId, id } = req.query;
    const { status, actionId } = req.body;

    // Add debug logging
    console.log("Query params:", { eventId, id });
    console.log("Request body:", req.body);

    const token = req.headers.authorization?.split(" ")[1];
    let tokenToVerify = token;

    try {
      if (token.startsWith('"') && token.endsWith('"')) {
        tokenToVerify = JSON.parse(token);
      }
    } catch (e) {
      console.log("Token parse error:", e);
    }

    let decoded;
    try {
      decoded = jwt.verify(tokenToVerify, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const requestIndex = event.requests.findIndex(
      (req) => req._id.toString() === id
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    event.requests[requestIndex].status = status;
    event.requests[requestIndex].processedAt = new Date();
    event.requests[requestIndex].processedBy = decoded.id;

    await event.save();

    return res.status(200).json({
      success: true,
      message: `Request ${status} successfully`,
      event: event,
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process request",
      error: error.message,
    });
  }
}
