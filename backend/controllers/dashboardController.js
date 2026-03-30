export const getDashboardData = async (req, res) => {
  try {
    // MOCK DATA (safe if DB not ready)
    res.json({
      user: {
        id: req.user.id,
        email: "test@test.com"
      },
      stats: {
        totalScans: 5,
        avgScore: 78,
        securityScore: 82,
        devopsScore: 74
      },
      history: [
        {
          id: 1,
          project: "Auth Service",
          score: 75,
          date: "2024-03-01"
        },
        {
          id: 2,
          project: "Payment API",
          score: 82,
          date: "2024-03-03"
        }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: "Dashboard fetch failed" });
  }
};
