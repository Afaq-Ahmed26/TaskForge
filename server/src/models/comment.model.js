import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: [true, "Comment issue is required"]
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Comment author is required"]
    },
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      minlength: [1, "Comment text cannot be empty"],
      maxlength: [5000, "Comment text cannot exceed 5000 characters"]
    }
  },
  {
    timestamps: true
  }
);

commentSchema.index({ issue: 1, createdAt: 1 });

export const Comment = mongoose.model("Comment", commentSchema);

