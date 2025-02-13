import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import User from "@/lib/models/User";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    await dbConnection();

    if (req.method === "GET") {
      const events = await Event.find()
        .sort({ date: 1 })
        .populate("createdBy", "nume prenume")
        .exec();

      return res.status(200).json({
        success: true,
        events: events.map((event) => ({
          ...event.toObject(),
          createdBy: event.createdBy || { nume: "Unknown", prenume: "User" },
        })),
      });
    }

    if (req.method === "POST") {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: No token provided",
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, "super_secret_key");
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }

      const user = await User.findById(decoded.id);
      if (!user || !["admin", "company"].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to create events",
        });
      }

      const {
        title,
        date,
        location,
        description,
        latitude,
        longitude,
        credits,
        actions,
        maxParticipants,
      } = req.body;

      if (!title || !date || !location || !description) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      console.log("Creating event with data:", {
        title,
        date,
        location,
        description,
        latitude,
        longitude,
        credits,
        actions,
        maxParticipants,
        createdBy: user._id,
      });

      const newEvent = new Event({
        title,
        date,
        location,
        description,
        latitude: latitude || null,
        longitude: longitude || null,
        credits: credits || 0,
        actions: actions || [],
        maxParticipants: maxParticipants || 0,
        createdBy: user._id,
        requests: [],
      });

      await newEvent.save();
      await newEvent.populate("createdBy", "nume prenume");

      return res.status(201).json({
        success: true,
        event: newEvent,
      });
    }

    if (req.method === "PATCH") {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: No token provided",
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, "super_secret_key");
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }

      const { id, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Event ID is required",
        });
      }

      const updatedEvent = await Event.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      ).populate("createdBy", "nume prenume");

      if (!updatedEvent) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      return res.status(200).json({
        success: true,
        event: updatedEvent,
      });
    }

    if (req.method === "DELETE") {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: No token provided",
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, "super_secret_key");
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }

      const { id } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Event ID is required",
        });
      }

      const deletedEvent = await Event.findByIdAndDelete(id);

      if (!deletedEvent) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Event deleted successfully",
      });
    }

    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
