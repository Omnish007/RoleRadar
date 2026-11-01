import type { SearchIntent } from "@roleradar/contracts";

export type SearchTemplate = { id: string; name: string; description: string; category: string; intent: SearchIntent };

const base = (name: string, primaryRole: string, locations: string[], mustHaveSkills: string[], alternativeRoles: string[] = []): SearchIntent => ({
  name, primaryRole, alternativeRoles, mustHaveSkills, preferredSkills: [], excludedTerms: ["internship", "fresher"],
  locations, minExperience: 3, maxExperience: 5, workModes: [], employmentTypes: ["full-time"],
  postedWithinDays: 7, currency: "INR", intent: "both", precision: "balanced"
});

export const searchTemplates: SearchTemplate[] = [
  { id: "mern-ahmedabad", name: "MERN · Ahmedabad", description: "Full-stack openings across Ahmedabad and Gandhinagar.", category: "MERN", intent: base("MERN · Ahmedabad", "MERN Stack Developer", ["Ahmedabad", "Gandhinagar"], ["React", "Node.js"], ["Full Stack Developer", "React Developer"]) },
  { id: "react-gujarat", name: "React · Gujarat", description: "Frontend and React-focused roles across Gujarat.", category: "Frontend", intent: base("React · Gujarat", "React Developer", ["Ahmedabad", "Gandhinagar", "Vadodara"], ["React"], ["Frontend Developer", "JavaScript Developer"]) },
  { id: "node-backend", name: "Node.js · Backend", description: "Backend engineering roles using Node and Express.", category: "Backend", intent: base("Node.js · Backend", "Node.js Developer", ["Ahmedabad", "Remote India"], ["Node.js", "Express.js"], ["Backend Developer", "API Developer"]) },
  { id: "typescript-fullstack", name: "TypeScript · Full Stack", description: "Full-stack positions where TypeScript is an important skill.", category: "Full Stack", intent: base("TypeScript · Full Stack", "Full Stack Developer", ["Ahmedabad", "Remote India"], ["TypeScript"], ["MERN Developer", "JavaScript Developer"]) },
  { id: "remote-india", name: "Remote · India", description: "Remote roles that explicitly allow hiring in India.", category: "Remote", intent: { ...base("Remote · India", "Full Stack Developer", ["Remote India"], ["React", "Node.js"], ["MERN Developer"]), workModes: ["remote"] } },
  { id: "startup-engineering", name: "Startup · Engineering", description: "Startup-friendly product engineering opportunities.", category: "Startups", intent: base("Startup · Engineering", "Software Engineer", ["Ahmedabad", "Remote India"], ["JavaScript"], ["Full Stack Developer", "MERN Developer"]) },
  { id: "urgent-hiring", name: "Urgent · Hiring posts", description: "Find recent hiring announcements rather than only job listings.", category: "Hiring posts", intent: { ...base("Urgent · Hiring posts", "MERN Stack Developer", ["Ahmedabad", "Gandhinagar"], ["React", "Node.js"]), intent: "hiring_posts", postedWithinDays: 3 } },
  { id: "broad-discovery", name: "Broad · Full Stack", description: "Wider role-title coverage to reduce missed opportunities.", category: "Discovery", intent: { ...base("Broad · Full Stack", "Full Stack Developer", ["Ahmedabad", "Gandhinagar", "Remote India"], [], ["MERN Developer", "React Developer", "Node.js Developer"]), precision: "broad", excludedTerms: [] } }
];
