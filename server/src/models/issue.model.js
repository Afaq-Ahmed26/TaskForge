import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Issue title is required"],
      trim: true,
      minlength: [2, "Issue title must be at least 2 characters long"],
      maxlength: [200, "Issue title cannot exceed 200 characters"]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, "Issue description cannot exceed 5000 characters"],
      default: ""
    },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "DONE"],
      default: "TODO"
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM"
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Issue project is required"]
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Issue creator is required"]
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    labels: {
      type: [String],
      default: []
    },
    dueDate: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

issueSchema.index({ project: 1, status: 1 });
issueSchema.index({ project: 1, priority: 1 });
issueSchema.index({ project: 1, assignee: 1 });

export const Issue = mongoose.model("Issue", issueSchema);
