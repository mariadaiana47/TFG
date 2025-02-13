// src/pages/api/events/request.js
import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import User from "@/lib/models/User";
import jwt from "jsonwebtoken";

const JWT_SECRET = "super_secret_key";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    await dbConnection();

    // Debug authorization header
    console.log("Auth Header:", req.headers.authorization);
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("Extracted token:", token);

    // Try to parse the token if it's a JSON string
    let tokenToVerify = token;
    try {
      if (token.startsWith('"') && token.endsWith('"')) {
        tokenToVerify = JSON.parse(token);
        console.log("Parsed token:", tokenToVerify);
      }
    } catch (e) {
      console.log("Token parse error:", e);
    }

    let decoded;
    try {
      decoded = jwt.verify(tokenToVerify, JWT_SECRET);
      console.log("Decoded token:", decoded);
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({
        success: false,
        message: "Invalid token",
        details: error.message
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role !== "volunteer") {
      return res.status(403).json({
        success: false,
        message: "Only volunteers can apply to events",
      });
    }

    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required",
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (
      event.requests &&
      event.requests.some(
        (request) => request.volunteerId.toString() === user._id.toString()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "You have already applied to this event",
      });
    }

    const newRequest = {
      volunteerId: user._id,
      volunteerName: `${user.nume} ${user.prenume}`,
      status: "pending",
      appliedAt: new Date(),
    };

    if (!event.requests) {
      event.requests = [];
    }
    event.requests.push(newRequest);
    await event.save();

    return res.status(200).json({
      success: true,
      message: "Application submitted successfully",
      event: event,
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit application",
      error: error.message,
    });
  }
}