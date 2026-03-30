import mongoose from "mongoose";

const ArchitectureSchema = new mongoose.Schema(
  {
    component: String,
    description: String,
    recommendation: String,
  },
  { _id: false }
);

const ReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    repoUrl: {
      type: String,
      required: true,
    },

    summary: String,

    architecture: {
      type: [ArchitectureSchema],
      default: [],
    },

    bugs: {
      type: Array,
      default: [],
    },

    securityIssues: {
      type: Array,
      default: [],
    },

    futureRoadmap: {
      type: Array,
      default: [],
    },

    toolsAndPackages: {
      type: [String],
      default: [],
    },

    scores: {
      codeQuality: { type: Number, default: 0 },
      security: { type: Number, default: 0 },
      performance: { type: Number, default: 0 },
      maintainability: { type: Number, default: 0 },
    },

    grade: {
      type: String,
      default: "C",
    },

    finalVerdict: String,
  },
  { timestamps: true }
);

export default mongoose.model("Report", ReportSchema);
