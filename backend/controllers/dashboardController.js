// backend/controllers/dashboardController.js
import Report from "../models/Report.js";
import User   from "../models/User.js";

export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all the reports
    const reports = await Report.find({ userId })
      .sort({ createdAt: -1 })   
      .lean();                   

    const totalScans = reports.length;
    let avgScore    = 0;
    let avgSecurity = 0;
    let avgDevops   = 0;

    if (totalScans > 0) {
      const sum = reports.reduce(
        (acc, r) => {
          const s = r.scores ?? {};
          acc.quality  += s.codeQuality    ?? 0;
          acc.security += s.security       ?? 0;
          acc.perf     += s.performance    ?? 0;
          acc.maint    += s.maintainability ?? 0;
          return acc;
        },
        { quality: 0, security: 0, perf: 0, maint: 0 }
      );

      avgScore    = Math.round((sum.quality + sum.perf + sum.maint) / (totalScans * 3));
      avgSecurity = Math.round(sum.security / totalScans);
      avgDevops   = Math.round((sum.perf + sum.maint) / (totalScans * 2));
    }

    const recentReports = reports.slice(0, 5).map((r) => ({
      _id:             r._id,
      repoUrl:         r.repoUrl,
      grade:           r.grade,
      scores:          r.scores,
      summary:         r.summary,
      architecture:    r.architecture,
      bugs:            r.bugs,
      securityIssues:  r.securityIssues,
      futureRoadmap:   r.futureRoadmap,
      toolsAndPackages:r.toolsAndPackages,
      finalVerdict:    r.finalVerdict,
      createdAt:       r.createdAt,
    }));

    // Grade Distribution
    const gradeDistribution = reports.reduce((acc, r) => {
      const g = (r.grade ?? "N/A")[0];
      acc[g]  = (acc[g] ?? 0) + 1;
      return acc;
    }, {});

    const user = await User.findById(userId).select("name email createdAt").lean();
    res.json({
      user: {
        id:    userId,
        name:  user?.name  ?? "",
        email: user?.email ?? req.user.email ?? "",
      },
      stats: {
        totalScans,
        avgScore,
        securityScore:   avgSecurity,
        devopsScore:     avgDevops,
        gradeDistribution,
      },
      recentReports,
    });

  } catch (err) {
    console.error("Dashboard fetch failed:", err.message);
    res.status(500).json({ error: "Dashboard fetch failed" });
  }
};