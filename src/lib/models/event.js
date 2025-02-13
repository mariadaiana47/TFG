import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    latitude: {
      type: Number,
      required: false,
    },
    longitude: {
      type: Number,
      required: false,
    },
    credits: {
      type: Number,
      default: 0,
    },
    maxParticipants: {
      type: Number,
      required: false,
      default: 0,
    },
    actions: [
      {
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        requiredVolunteers: {
          type: Number,
          required: true,
          min: 1,
        },
        credits: {
          type: Number,
          required: true,
          default: 0,
        },

        assignedVolunteers: [
          {
            volunteerId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            volunteerName: String,
            assignedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    requests: [
      {
        volunteerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        volunteerName: String,
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        appliedAt: {
          type: Date,
          default: Date.now,
        },

        actionId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        processedAt: {
          type: Date,
        },
        processedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ location: "text" });
eventSchema.index({ latitude: 1, longitude: 1 });

const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);

export default Event;
