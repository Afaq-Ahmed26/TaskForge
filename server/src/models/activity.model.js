import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: [true, "Activity issue is required"]
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Activity actor is required"]
    },
    type: {
      type: String,
      enum: [
        "ISSUE_CREATED",
        "STATUS_CHANGED",
        "PRIORITY_CHANGED",
        "ASSIGNED",
        "COMMENT_ADDED"
      ],
      required: [true, "Activity type is required"]
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

activitySchema.index({ issue: 1, createdAt: 1 });

export const Activity = mongoose.model("Activity", activitySchema);

