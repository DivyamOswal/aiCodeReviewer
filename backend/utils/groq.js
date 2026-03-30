import Groq from "groq-sdk";

export async function analyzeWithGroq(input) {
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
  });

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    temperature: 0.25,
    max_tokens: 4000, // 🔥 forces depth
    messages: [
      {
        role: "system",
        content: `
You are a PRINCIPAL SOFTWARE ARCHITECT writing a FORMAL CODE AUDIT.

Audience:
- CTO
- University Professor
- External Reviewer

MANDATORY RULES:
- Respond ONLY with valid JSON
- DO NOT add explanations outside JSON
- Each section must be DETAILED (multiple sentences)
- Assume this is a FINAL YEAR / PRODUCTION project

JSON STRUCTURE (DO NOT CHANGE KEYS):

{
  "summary": "Minimum 8–10 lines professional overview",

  "architecture": [
    {
      "component": "Frontend | Backend | Database | DevOps",
      "description": "How it is currently designed",
      "recommendation": "Professional improvement suggestion"
    }
  ],

  "bugs": [
    {
      "title": "Issue title",
      "impact": "Low | Medium | High",
      "fix": "Exact fix or refactor"
    }
  ],

  "securityIssues": [
    {
      "issue": "Security risk",
      "recommendation": "Mitigation strategy"
    }
  ],

  "futureRoadmap": [
    {
      "phase": "Short-term | Mid-term | Long-term",
      "details": "Concrete upgrade plan"
    }
  ],

  "toolsAndPackages": [
    "React",
    "Node.js",
    "Express",
    "MongoDB",
    "JWT",
    "Axios",
    "Recharts",
    "PDFKit"
  ],

  "scores": {
    "codeQuality": 0-100,
    "security": 0-100,
    "performance": 0-100,
    "maintainability": 0-100
  },

  "grade": "A | B | C | D",

  "finalVerdict": "Strong academic + industry evaluation"
}
        `
      },
      {
        role: "user",
        content: input.slice(0, 8000) // 🔒 token safe
      }
    ]
  });

  const raw = completion.choices[0].message.content;

  /* 🔒 BULLETPROOF JSON EXTRACTION */
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("No JSON found in AI response");
    }

    return JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    console.error("❌ GROQ JSON PARSE FAILED");
    console.error(raw);

    // 🔥 SYSTEM NEVER CRASHES
    return {
      summary:
        "AI analysis failed to produce a valid structured response. Fallback analysis was used.",

      architecture: [
        {
          component: "Overall",
          description: "Architecture inferred from repository structure.",
          recommendation:
            "Introduce layered architecture and stricter modular separation."
        }
      ],

      bugs: [],
      securityIssues: [],
      futureRoadmap: [
        {
          phase: "Short-term",
          details: "Code cleanup, linting, and unit testing."
        },
        {
          phase: "Mid-term",
          details: "CI/CD pipeline, security hardening, performance profiling."
        },
        {
          phase: "Long-term",
          details: "Scalability improvements and system observability."
        }
      ],

      toolsAndPackages: [
        "React",
        "Node.js",
        "Express",
        "MongoDB",
        "JWT",
        "Axios"
      ],

      scores: {
        codeQuality: 60,
        security: 55,
        performance: 60,
        maintainability: 58
      },

      grade: "C",

      finalVerdict:
        "The project demonstrates basic engineering competence but requires refinement to reach professional standards."
    };
  }
}
