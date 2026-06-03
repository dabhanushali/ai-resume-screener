export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  currentRole?: string;
  currentCompany?: string;
  totalExperience: number; // in years
  skills: Array<string | { name: string; evidence?: string; confidence?: number }>;
  certifications: string[];
  education: Array<{
    degree: string;
    institution: string;
    gradYear: string;
    gpa?: string;
    evidence?: string;
    confidence?: number;
  }>;
  employmentHistory: Array<{
    company: string;
    designation: string;
    duration: string;
    evidence?: string;
  }>;
  projects: Array<{
    name: string;
    technologies: string[];
    evidence?: string;
    confidence?: number;
  }>;
  noticePeriod?: string;
  confidence?: {
    emailConfidence?: number;
    experienceConfidence?: number;
    skillsConfidence?: number;
    educationConfidence?: number;
    employmentConfidence?: number;
    projectsConfidence?: number;
  };
  evidence?: {
    skillsEvidence?: Record<string, string>;
    rolesEvidence?: Record<string, string>;
    projectsEvidence?: Record<string, string>;
    educationEvidence?: Record<string, string>;
    weaknessesEvidence?: Record<string, string>;
  };
  resumeText?: string;
}

export interface JobRequirements {
  title: string;
  department: string;
  employmentType: string;
  location: string;
  minExperience: number;
  maxExperience: number;
  requiredSkills: string[];
  preferredSkills: string[];
  minDegree: string;
  minGpa?: string;
  noticePeriod: string;
  certifications: string[];
  keywords: string[];

  // Weights (Configurable)
  weightSkills?: number;
  weightExperience?: number;
  weightRelevance?: number;
  weightPreferred?: number;
  weightEducation?: number;
  weightNoticePeriod?: number;

  // Thresholds (Configurable)
  thresholdShortlist?: number;
  thresholdReview?: number;
}

export interface ScreeningDetails {
  matchScore: number; // 0 - 100
  recommendation: 'SHORTLIST' | 'REVIEW' | 'REJECT';
  aiSummary: string;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
}

export interface AIService {
  parseResume(resumeText: string): Promise<ParsedResume>;
  screenCandidate(parsedResume: ParsedResume, jobRequirements: JobRequirements): Promise<ScreeningDetails>;
  parseJobDescription(jdText: string): Promise<JobRequirements>;
}

// --------------------------------------------------------
// DETERMINISTIC SCORING ENGINE (Shared across Heuristic & LLM)
// --------------------------------------------------------
export function calculateDetailedScore(resume: ParsedResume, job: JobRequirements) {
  // Retrieve config weights (defaulting to PRD)
  const wSkills = job.weightSkills !== undefined ? job.weightSkills : 40;
  const wExp = job.weightExperience !== undefined ? job.weightExperience : 25;
  const wRelevance = job.weightRelevance !== undefined ? job.weightRelevance : 15;
  const wPref = job.weightPreferred !== undefined ? job.weightPreferred : 10;
  const wEdu = job.weightEducation !== undefined ? job.weightEducation : 5;
  const wNP = job.weightNoticePeriod !== undefined ? job.weightNoticePeriod : 5;

  // Helpers to get flat skills
  const candidateSkills = (resume.skills || []).map(s => {
    if (typeof s === 'string') return s.toLowerCase();
    if (s && typeof s === 'object' && s.name) return s.name.toLowerCase();
    return '';
  }).filter(Boolean);

  // A. Required Skills Match
  const reqSkills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
  const missingSkills = reqSkills.filter(s => !candidateSkills.some(cs => cs.includes(s.toLowerCase()) || s.toLowerCase().includes(cs)));
  const matchedRequiredCount = reqSkills.length - missingSkills.length;
  const skillScore = reqSkills.length > 0 ? (matchedRequiredCount / reqSkills.length) * 100 : 100;

  // B. Experience Match
  let expScore = 0;
  const totalExp = Number(resume.totalExperience) || 0;
  if (totalExp >= job.minExperience) {
    expScore = 100;
  } else if (totalExp > 0 && job.minExperience > 0) {
    expScore = (totalExp / job.minExperience) * 100;
  }

  // C. Role Relevance (Heuristic designation overlap)
  let relevanceScore = 50; // Default baseline
  if (resume.currentRole && job.title) {
    const roleTokens = resume.currentRole.toLowerCase().split(/\s+/);
    const titleTokens = job.title.toLowerCase().split(/\s+/);
    const matches = roleTokens.filter(t => titleTokens.includes(t) && t.length > 2);
    if (matches.length > 0) {
      relevanceScore = 100;
    } else if (candidateSkills.some(s => job.title.toLowerCase().includes(s))) {
      relevanceScore = 80;
    }
  }

  // D. Preferred Skills Match
  const prefSkills = Array.isArray(job.preferredSkills) ? job.preferredSkills : [];
  const matchedPreferred = prefSkills.filter(s => candidateSkills.some(cs => cs.includes(s.toLowerCase()) || s.toLowerCase().includes(cs)));
  const preferredScore = prefSkills.length > 0 ? (matchedPreferred.length / prefSkills.length) * 100 : 100;

  // E. Education Match
  let eduScore = 40; // unknown education should not score as a confirmed match
  if (resume.education && resume.education.length > 0) {
    const highestDegree = resume.education.map(e => (e.degree || '').toLowerCase()).join(" ");
    const reqDegree = (job.minDegree || '').toLowerCase();
    const rank = (degreeText: string) => {
      if (degreeText.includes("doctor") || degreeText.includes("ph.d")) return 5;
      if (degreeText.includes("master") || degreeText.includes("m.tech") || degreeText.includes("m.s") || degreeText.includes("mba")) return 4;
      if (degreeText.includes("bachelor") || degreeText.includes("b.tech") || degreeText.includes("b.e") || degreeText.includes("b.s")) return 3;
      if (degreeText.includes("associate")) return 2;
      if (degreeText.includes("high school")) return 1;
      return 0;
    };
    if (!reqDegree || rank(highestDegree) >= rank(reqDegree) || highestDegree.includes(reqDegree)) {
      eduScore = 100;
    }
  }

  // F. Notice Period Match
  let npScore = 60; // Unknown notice period is uncertain, not perfect
  const noticeText = (resume.noticePeriod || '').toLowerCase();
  if (noticeText.includes("immediate") || noticeText.includes("no notice")) {
    npScore = 100;
  } else if (noticeText.includes("90 days") || noticeText.includes("3 months")) {
    npScore = 40;
  } else if (noticeText.includes("60 days") || noticeText.includes("2 months")) {
    npScore = 70;
  } else if (noticeText.includes("30 days") || noticeText.includes("1 month")) {
    npScore = 85;
  }

  // Calculate overall match score
  const finalScore = Math.round(
    (skillScore * (wSkills / 100)) +
    (expScore * (wExp / 100)) +
    (relevanceScore * (wRelevance / 100)) +
    (preferredScore * (wPref / 100)) +
    (eduScore * (wEdu / 100)) +
    (npScore * (wNP / 100))
  );

  // Classification
  const threshShort = job.thresholdShortlist !== undefined ? job.thresholdShortlist : 75;
  const threshRev = job.thresholdReview !== undefined ? job.thresholdReview : 50;

  let recommendation: ScreeningDetails["recommendation"] = "REJECT";
  if (finalScore >= threshShort) {
    recommendation = "SHORTLIST";
  } else if (finalScore >= threshRev) {
    recommendation = "REVIEW";
  }

  return {
    matchScore: finalScore,
    recommendation,
    missingSkills,
    categoryScores: {
      skillScore,
      skillsWeighted: Math.round(skillScore * (wSkills / 100)),
      experienceScore: expScore,
      experienceWeighted: Math.round(expScore * (wExp / 100)),
      relevanceScore,
      relevanceWeighted: Math.round(relevanceScore * (wRelevance / 100)),
      preferredScore,
      preferredWeighted: Math.round(preferredScore * (wPref / 100)),
      educationScore: eduScore,
      educationWeighted: Math.round(eduScore * (wEdu / 100)),
      noticePeriodScore: npScore,
      noticePeriodWeighted: Math.round(npScore * (wNP / 100)),
    }
  };
}

// Runtime Validator for ParsedResume
export function validateAndCleanParsedResume(raw: any, textContent: string = ""): ParsedResume {
  const safeString = (val: any, fallback: string | undefined = ""): string | undefined => typeof val === 'string' ? val.trim() : fallback;
  const safeArray = (val: any): any[] => Array.isArray(val) ? val : [];
  const isPresentString = (val: string | undefined): val is string => Boolean(val);
  
  const parsed: ParsedResume = {
    name: safeString(raw.name, "Candidate") || "Candidate",
    email: safeString(raw.email, "") || "",
    phone: safeString(raw.phone, "") || "",
    location: safeString(raw.location, "") || "",
    linkedinUrl: safeString(raw.linkedinUrl, undefined),
    portfolioUrl: safeString(raw.portfolioUrl, undefined),
    currentRole: safeString(raw.currentRole || raw.currentDesignation, undefined),
    currentCompany: safeString(raw.currentCompany, undefined),
    totalExperience: Number(raw.totalExperience) || 0,
    skills: safeArray(raw.skills).map((s: any) => {
      if (typeof s === 'string') return s.trim();
      if (s && typeof s === 'object' && s.name) {
        return {
          name: safeString(s.name) || "",
          evidence: safeString(s.evidence, undefined),
          confidence: Number(s.confidence) || 0.8
        };
      }
      return "";
    }).filter(Boolean),
    certifications: safeArray(raw.certifications).map((c: any) => safeString(c)).filter(isPresentString),
    education: safeArray(raw.education).map((e: any) => ({
      degree: safeString(e.degree, "") || "",
      institution: safeString(e.institution, "") || "",
      gradYear: safeString(e.gradYear, "") || "",
      gpa: safeString(e.gpa, undefined),
      evidence: safeString(e.evidence, undefined),
      confidence: Number(e.confidence) || 0.8
    })).filter((e: any) => e.degree || e.institution),
    employmentHistory: safeArray(raw.employmentHistory || raw.workHistory).map((w: any) => ({
      company: safeString(w.company, "") || "",
      designation: safeString(w.designation || w.role || w.title, "") || "",
      duration: safeString(w.duration, "") || "",
      evidence: safeString(w.evidence, undefined)
    })).filter((w: any) => w.company || w.designation),
    projects: safeArray(raw.projects).map((p: any) => ({
      name: safeString(p.name, "") || "",
      technologies: safeArray(p.technologies).map((t: any) => safeString(t)).filter(isPresentString),
      evidence: safeString(p.evidence, undefined),
      confidence: Number(p.confidence) || 0.8
    })).filter((p: any) => p.name),
    noticePeriod: safeString(raw.noticePeriod, undefined),
    confidence: raw.confidence ? {
      emailConfidence: Number(raw.confidence.emailConfidence) || 0.9,
      experienceConfidence: Number(raw.confidence.experienceConfidence) || 0.9,
      skillsConfidence: Number(raw.confidence.skillsConfidence) || 0.8,
      educationConfidence: Number(raw.confidence.educationConfidence) || 0.8,
      employmentConfidence: Number(raw.confidence.employmentConfidence) || 0.8,
      projectsConfidence: Number(raw.confidence.projectsConfidence) || 0.8,
    } : undefined,
    evidence: raw.evidence ? {
      skillsEvidence: raw.evidence.skillsEvidence || {},
      rolesEvidence: raw.evidence.rolesEvidence || {},
      projectsEvidence: raw.evidence.projectsEvidence || {},
      educationEvidence: raw.evidence.educationEvidence || {},
      weaknessesEvidence: raw.evidence.weaknessesEvidence || {},
    } : undefined,
    resumeText: textContent
  };

  return parsed;
}

// --------------------------------------------------------
// HEURISTIC ENGINE (Offline Zero-Config Fallback)
// --------------------------------------------------------
class HeuristicAIService implements AIService {
  async parseResume(resumeText: string): Promise<ParsedResume> {
    const text = resumeText || "";

    // 1. Email Regex (no default fake value)
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : "";

    // 2. Phone Regex
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : "";

    // 3. URLs
    const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_.]+/i);
    const linkedinUrl = linkedinMatch
      ? `https://${linkedinMatch[0].replace(/^https?:\/\//i, "").replace(/^www\./, "")}`
      : undefined;

    const portfolioMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:github\.com\/[a-zA-Z0-9\-_.]+(?:\/[a-zA-Z0-9\-_.]+)?|(?:[a-zA-Z0-9\-]+\.(?:io|dev|me|com|net|co))\/[a-zA-Z0-9\-_/.]+)/i);
    const portfolioUrl = portfolioMatch
      ? `https://${portfolioMatch[0].replace(/^https?:\/\//i, "").replace(/^www\./, "")}`
      : undefined;

    // 4. Name extraction
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    let name = "Candidate";
    for (const line of lines.slice(0, 5)) {
      if (!line.includes("@") && !line.includes("/") && !line.includes(":") && line.length > 2 && line.length < 40) {
        name = line;
        break;
      }
    }

    // 5. Location
    let location = "";
    const cities = ["New York", "San Francisco", "London", "Bangalore", "Mumbai", "Delhi", "Bengaluru", "San Jose", "Austin", "Boston", "Singapore", "Berlin", "Toronto"];
    for (const city of cities) {
      if (new RegExp(`\\b${city}\\b`, "i").test(text)) {
        location = city;
        break;
      }
    }

    // 6. Experience
    let totalExperience = 0;
    const expMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)\b\s*(?:of)?\s*(?:exp|experience)/i);
    if (expMatch) {
      totalExperience = parseFloat(expMatch[1]);
    } else {
      const years = text.match(/\b(20\d{2})\b/g);
      if (years && years.length >= 2) {
        const uniqueYears = Array.from(new Set(years.map(Number))).sort((a, b) => a - b);
        totalExperience = Math.min(Math.max(uniqueYears[uniqueYears.length - 1] - uniqueYears[0], 0), 15);
      }
    }

    // 7. Notice Period
    let noticePeriod = "";
    if (/90\s*days|3\s*months/i.test(text)) noticePeriod = "90 Days";
    else if (/60\s*days|2\s*months/i.test(text)) noticePeriod = "60 Days";
    else if (/30\s*days|1\s*month/i.test(text)) noticePeriod = "30 Days";
    else if (/immediate|no\s*notice/i.test(text)) noticePeriod = "Immediate";

    // 8. Skills keyword matching
    const commonSkills = [
      "React", "JavaScript", "TypeScript", "HTML", "CSS", "Next.js", "Vue", "Angular",
      "Node.js", "Express", "Python", "Django", "Flask", "Java", "Spring Boot", "C++", "C#",
      "Ruby", "Go", "Rust", "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Prisma",
      "Git", "Docker", "Kubernetes", "AWS", "Google Cloud", "Azure", "CI/CD", "QA", "Jest",
      "Figma", "UI/UX", "Scrum", "Agile", "Redux", "GraphQL", "TailwindCSS", "Sass"
    ];
    const skills: string[] = [];
    for (const skill of commonSkills) {
      const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      if (new RegExp(`\\b${escaped}\\b`, "i").test(text)) {
        skills.push(skill);
      }
    }

    // 9. Education (honest parser, no fake values)
    const education: ParsedResume["education"] = [];
    const eduKeywords = ["Bachelor", "Master", "B.S.", "B.Tech", "B.E.", "M.S.", "M.Tech", "Ph.D.", "MBA", "Degree"];
    for (const line of lines) {
      if (eduKeywords.some(k => line.includes(k))) {
        const yearMatch = line.match(/\b(20\d{2})\b/);
        const gradYear = yearMatch ? yearMatch[1] : "N/A";
        education.push({
          degree: line.split("from")[0]?.trim() || line,
          institution: line.split("from")[1]?.trim() || "N/A",
          gradYear
        });
        if (education.length >= 2) break;
      }
    }

    // 10. Employment history (honest parser, no fake values)
    const employmentHistory: ParsedResume["employmentHistory"] = [];
    const companyKeywords = ["Inc.", "Corp.", "Ltd.", "Company", "Technologies", "Solutions", "Software"];
    for (const line of lines) {
      if (companyKeywords.some(k => line.includes(k)) || line.toLowerCase().includes("engineer") || line.toLowerCase().includes("developer")) {
        const parts = line.split(" at ");
        const designation = parts[0]?.trim() || "";
        const company = parts[1]?.replace(/[\d\-\(\)]/g, "")?.trim() || "";
        employmentHistory.push({
          company,
          designation,
          duration: ""
        });
        if (employmentHistory.length >= 3) break;
      }
    }

    const currentRole = employmentHistory[0]?.designation;
    const currentCompany = employmentHistory[0]?.company;

    return validateAndCleanParsedResume({
      name,
      email,
      phone,
      location,
      linkedinUrl,
      portfolioUrl,
      currentRole,
      currentCompany,
      totalExperience,
      skills,
      certifications: [],
      education,
      employmentHistory,
      projects: [],
      noticePeriod
    }, text);
  }

  async screenCandidate(parsedResume: ParsedResume, job: JobRequirements): Promise<ScreeningDetails> {
    const { matchScore, recommendation, missingSkills } = calculateDetailedScore(parsedResume, job);

    const strengths = [];
    if (parsedResume.totalExperience >= job.minExperience) {
      strengths.push(`Experience of ${parsedResume.totalExperience} years meets target min of ${job.minExperience} years.`);
    }
    const reqSkills = job.requiredSkills || [];
    const matchedCount = reqSkills.length - missingSkills.length;
    if (matchedCount > 0) {
      strengths.push(`Matches required stack elements: ${reqSkills.filter(s => !missingSkills.includes(s)).slice(0, 4).join(", ")}`);
    }

    const weaknesses = [];
    if (parsedResume.totalExperience < job.minExperience) {
      weaknesses.push(`Total experience (${parsedResume.totalExperience} yrs) is lower than target requirement (${job.minExperience} yrs).`);
    }
    if (missingSkills.length > 0) {
      weaknesses.push(`Lacks explicit skills: ${missingSkills.slice(0, 3).join(", ")}.`);
    }

    const aiSummary = `Evaluation summary of ${parsedResume.name}. Match score computed as ${matchScore}% with recommendation ${recommendation}. Matched ${matchedCount}/${reqSkills.length} required skills.`;

    return {
      matchScore,
      recommendation,
      aiSummary,
      strengths,
      weaknesses,
      missingSkills
    };
  }

  async parseJobDescription(jdText: string): Promise<JobRequirements> {
    const text = jdText || '';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const title = lines.find(l => l.length > 3 && l.length < 80) || 'Untitled Position';
    let minExperience = 2, maxExperience = 8;
    const expMatch = text.match(/(\d+)\+?\s*(?:to|-)?\s*(\d+)?\s*years?/i);
    if (expMatch) {
      minExperience = parseInt(expMatch[1]) || 2;
      maxExperience = expMatch[2] ? parseInt(expMatch[2]) : minExperience + 4;
    }
    const knownSkills = ['React','Angular','Vue','Next.js','TypeScript','JavaScript','Node.js','Express','NestJS','Python','Java','C#','Go','MySQL','PostgreSQL','MongoDB','Redis','Docker','Kubernetes','AWS','Azure','GCP','Git','Jest','Cypress','Redux','GraphQL','Agile','Scrum','MERN','CI/CD','REST APIs'];
    const reqSkills: string[] = [];
    for (const s of knownSkills) {
      const escaped = s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) reqSkills.push(s);
    }
    return {
      title,
      department: 'Engineering',
      employmentType: /part.?time/i.test(text) ? 'Part-time' : /contract/i.test(text) ? 'Contract' : 'Full-time',
      location: /remote/i.test(text) ? 'Remote' : /hybrid/i.test(text) ? 'Hybrid' : 'On-site',
      minExperience, maxExperience,
      requiredSkills: reqSkills,
      preferredSkills: [],
      minDegree: /master|m\.s\.|m\.tech/i.test(text) ? 'Master' : 'Bachelor',
      minGpa: '',
      noticePeriod: 'Immediate',
      certifications: [], keywords: [],
    };
  }
}

// --------------------------------------------------------
// GEMINI / OPENAI REST-BASED ENGINES
// --------------------------------------------------------
class LLMAIService implements AIService {
  private provider: "gemini" | "openai";
  private apiKey: string;

  constructor(provider: "gemini" | "openai", apiKey: string) {
    this.provider = provider;
    this.apiKey = apiKey;
  }

  async parseResume(resumeText: string): Promise<ParsedResume> {
    const prompt = `
You are a high-performance HR resume parser. Analyze this resume text and extract all details in a strictly schema-compliant JSON format.
Make sure you parse years of experience correctly as a numeric float value.
Do not invent or assume credentials. If a field is not explicitly mentioned, return null or empty values. Do not write dummy emails (e.g. unknown@candidate.com) or default education years.
CRITICAL: Include a "noticePeriod" field if mentioned (e.g., "Immediate", "30 Days", "60 Days", etc.), or null if not found.
CRITICAL: Under "education", also search for and extract any GPA, CGPA, college marks, grades, or percentages if listed, under the "gpa" field.
Cite a snippet of "evidence" for every skill, project, and education degree extracted. Also include a confidence score (from 0.0 to 1.0) for the main sections.

RESUME TEXT:
${resumeText}

EXPECTED SCHEMA FORMAT:
{
  "name": "Candidate Full Name",
  "email": "email@domain.com (null if not found)",
  "phone": "Phone Number (null if not found)",
  "location": "City, Country or Remote (null if not found)",
  "linkedinUrl": "Link to LinkedIn (null if not found)",
  "portfolioUrl": "Link to Github/Portfolio (null if not found)",
  "currentRole": "Current Designation/Title",
  "currentCompany": "Current Workplace/Company",
  "totalExperience": 4.5,
  "noticePeriod": "Immediate or 30 Days (null if not found)",
  "skills": [
    {"name": "SkillName", "evidence": "Resume phrase showing usage", "confidence": 0.95}
  ],
  "certifications": ["Cert1"],
  "education": [
    {"degree": "B.S. Computer Science", "institution": "State Univ", "gradYear": "2021", "gpa": "3.8/4.0", "evidence": "Evidence quote", "confidence": 0.9}
  ],
  "employmentHistory": [
    {"company": "Google", "designation": "Software Eng", "duration": "2 years", "evidence": "Evidence quote"}
  ],
  "projects": [
    {"name": "E-Commerce site", "technologies": ["React", "Tailwind"], "evidence": "Evidence quote", "confidence": 0.85}
  ],
  "confidence": {
    "emailConfidence": 0.95,
    "experienceConfidence": 0.9,
    "skillsConfidence": 0.85,
    "educationConfidence": 0.9,
    "employmentConfidence": 0.9,
    "projectsConfidence": 0.85
  },
  "evidence": {
    "skillsEvidence": {
      "React": "Evidence text snippet..."
    }
  }
}
`;

    try {
      let rawJsonText = "";
      if (this.provider === "gemini") {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${this.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json"
              }
            })
          }
        );
        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error?.message || "Gemini API returned error");
        }
        rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      } else {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "You are a specialized HR resume parsing tool." },
              { role: "user", content: prompt }
            ]
          })
        });
        const data = await response.json();
        rawJsonText = data.choices?.[0]?.message?.content ?? "";
      }
      
      const cleanJson = rawJsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      const parsedRaw = JSON.parse(cleanJson);
      return validateAndCleanParsedResume(parsedRaw, resumeText);
    } catch (e) {
      console.warn("LLM Parsing failed, falling back to heuristic parser:", e);
      return new HeuristicAIService().parseResume(resumeText);
    }
  }

  async screenCandidate(parsedResume: ParsedResume, job: JobRequirements): Promise<ScreeningDetails> {
    // 1. Separate Extraction from Judgment: Pass the pre-parsed resume to the LLM to get strengths, weaknesses, and evidence
    const prompt = `
You are a highly critical, elite Technical Recruiter. Analyze this parsed candidate record against the hiring requirements.
Be extremely critical. Do not write generic feedback. Cite evidence snippets from candidate's profile/resume for strengths and weaknesses.

JOB REQUIREMENTS:
${JSON.stringify(job, null, 2)}

PRE-PARSED CANDIDATE DETAILS:
${JSON.stringify(parsedResume, null, 2)}

EXPECTED JSON SCHEMA FORMAT (No markdown wrapper, pure JSON):
{
  "strengths": ["Matched required skills because... (cite evidence)", "Notice period matches... (cite evidence)"],
  "weaknesses": ["Deficient in min experience because... (cite evidence)", "Missing skill X because...", "GPA/marks are low/omitted because..."],
  "missingSkills": ["List of required skills not found in candidate skills"],
  "aiSummary": "Auditable explanation. Match because... Missing because..."
}
`;

    try {
      let rawJsonText = "";
      if (this.provider === "gemini") {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${this.apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json"
              }
            })
          }
        );
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error?.message || "Gemini error");
        rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      } else {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "You are a professional candidate matcher." },
              { role: "user", content: prompt }
            ]
          })
        });
        const data = await response.json();
        rawJsonText = data.choices?.[0]?.message?.content ?? "";
      }

      const cleanJson = rawJsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      const evaluation = JSON.parse(cleanJson);

      // 2. Deterministic programmatically calculated score (no model score delegation)
      const scoring = calculateDetailedScore(parsedResume, job);

      return {
        matchScore: scoring.matchScore,
        recommendation: scoring.recommendation,
        aiSummary: evaluation.aiSummary || `Match score is ${scoring.matchScore}%.`,
        strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths : [],
        weaknesses: Array.isArray(evaluation.weaknesses) ? evaluation.weaknesses : [],
        missingSkills: Array.isArray(evaluation.missingSkills) ? evaluation.missingSkills : scoring.missingSkills
      };
    } catch (e) {
      console.warn("LLM Screening failed, falling back to heuristic evaluation:", e);
      return new HeuristicAIService().screenCandidate(parsedResume, job);
    }
  }

  async parseJobDescription(jdText: string): Promise<JobRequirements> {
    return parseJobDescriptionWithAI(jdText);
  }
}

// --------------------------------------------------------
// ABSTRACTED EXPORTER
// --------------------------------------------------------
const activeProvider = process.env.ACTIVE_AI_PROVIDER || "heuristic";
const geminiKey = process.env.GEMINI_API_KEY || "";
const openaiKey = process.env.OPENAI_API_KEY || "";

let exportedService: AIService;

if (activeProvider === "gemini" && geminiKey) {
  exportedService = new LLMAIService("gemini", geminiKey);
} else if (activeProvider === "openai" && openaiKey) {
  exportedService = new LLMAIService("openai", openaiKey);
} else {
  exportedService = new HeuristicAIService();
}

export const aiService = exportedService;
export const heuristicService = new HeuristicAIService();

// --------------------------------------------------------
// STANDALONE JD PARSER
// --------------------------------------------------------
export async function parseJobDescriptionWithAI(jdText: string): Promise<JobRequirements> {
  const activeProvider = process.env.ACTIVE_AI_PROVIDER || "heuristic";
  const geminiKey = process.env.GEMINI_API_KEY || "";
  const openaiKey = process.env.OPENAI_API_KEY || "";

  const prompt = `
You are an expert technical recruiter. Analyze the job description below and extract all requirement details into a strictly schema-compliant JSON object.
Do NOT add markdown, code fences, or wrappers — output pure JSON only.

JOB DESCRIPTION TEXT:
${jdText}

EXTRACT INTO THIS EXACT JSON SCHEMA:
{
  "title": "Exact job title from JD",
  "department": "One of: Engineering, Product Management, Quality Assurance, Design, Human Resources, Sales, Marketing, Finance, Operations, DevOps, Data Science",
  "employmentType": "One of: Full-time, Part-time, Contract, Internship",
  "location": "One of: Remote, Hybrid, On-site, or the specific city if mentioned",
  "minExperience": 4,
  "maxExperience": 10,
  "minDegree": "One of: Associate, Bachelor, Master, Doctorate, High School",
  "minGpa": "e.g. 7.5 CGPA or 70% or leave empty string if not mentioned",
  "noticePeriod": "One of: Immediate, 15 Days, 30 Days, 60 Days, 90 Days",
  "requiredSkills": ["Skill1", "Skill2"],
  "preferredSkills": ["Skill1"],
  "certifications": ["Cert1"],
  "keywords": ["keyword1"]
}
`;

  try {
    let rawText = "";
    if ((activeProvider === "gemini") && geminiKey) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error?.message || "Gemini API error");
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } else if ((activeProvider === "openai") && openaiKey) {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are a technical recruiter parsing job descriptions." },
            { role: "user", content: prompt }
          ]
        })
      });
      const data = await resp.json();
      rawText = data.choices?.[0]?.message?.content ?? "";
    } else {
      throw new Error("No LLM provider configured");
    }
    const cleanJson = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(cleanJson);
    return {
      title: parsed.title || "Untitled Position",
      department: parsed.department || "Engineering",
      employmentType: parsed.employmentType || "Full-time",
      location: parsed.location || "Remote",
      minExperience: Number(parsed.minExperience) || 2,
      maxExperience: Number(parsed.maxExperience) || 8,
      minDegree: parsed.minDegree || "Bachelor",
      minGpa: parsed.minGpa || "",
      noticePeriod: parsed.noticePeriod || "Immediate",
      requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
      preferredSkills: Array.isArray(parsed.preferredSkills) ? parsed.preferredSkills : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };
  } catch (e) {
    console.warn("[parseJobDescriptionWithAI] LLM failed, using heuristic fallback:", e);
    return new HeuristicAIService().parseJobDescription(jdText);
  }
}
