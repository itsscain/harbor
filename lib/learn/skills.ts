import type { SubjectId } from "./types";
import { CODE_SKILL_LABEL } from "./code";
import { boxOf, isMastered, isShaky, skillSubject, strength, type SkillStat, type Skills } from "./mastery";

// Skills in plain English for parents: "m:add:7+8" → "7 + 8", "r:sight:the" → "Sight word: the",
// "h:apology" → "Saying sorry". Plus the strong/shaky picture per subject that the parent app shows.

const FAMILY: Record<string, string> = {
  "m:add": "Addition facts", "m:sub": "Subtraction facts", "m:mul": "Multiplication facts", "m:div": "Division facts",
  "m:count": "Counting", "m:numeral": "Reading numbers", "m:tenframe": "Ten-frames", "m:make10": "Making 10", "m:teen": "Teen numbers",
  "m:compare": "Comparing", "m:order": "Ordering numbers", "m:pattern": "Patterns", "m:shape": "Shapes", "m:skip": "Skip counting",
  "m:place": "Place value", "m:time": "Telling time", "m:money": "Money", "m:frac": "Fractions", "m:dec": "Decimals", "m:story": "Word problems",
  "m:area": "Area", "m:perimeter": "Perimeter", "m:volume": "Volume", "m:angle": "Angles", "m:lines": "Lines", "m:coords": "Coordinates",
  "m:round": "Rounding", "m:evenodd": "Even & odd", "m:factors": "Factors", "m:multiples": "Multiples", "m:prime": "Prime numbers",
  "m:orderops": "Order of operations", "m:add2d": "2-digit adding", "m:sub2d": "2-digit subtracting", "m:mul2x1": "Multi-digit ×", "m:mul2x2": "2-digit × 2-digit",
  "m:array": "Arrays", "m:missing": "Missing numbers", "m:length": "Measuring length", "m:count100": "Counting to 100",
  "r:sound": "Letter sounds", "r:write": "Writing letters", "r:word": "Reading words", "r:sight": "Sight words", "r:family": "Word families",
  "r:pattern": "Phonics patterns", "r:vowel": "Short vowels", "r:rhyme": "Rhyming", "r:syllables": "Syllables", "r:blend-oral": "Blending sounds",
  "r:read": "Reading sentences", "r:comp": "Comprehension", "r:magic-e": "Magic e", "r:ending": "Endings (-ing, -ed)", "r:compound": "Compound words",
  "r:contraction": "Contractions", "r:prefix": "Prefixes", "r:suffix": "Suffixes", "r:root": "Word roots", "r:synonym": "Synonyms",
  "r:antonym": "Opposites", "r:homophone": "Homophones", "r:abc": "ABC order", "r:pos": "Parts of speech", "r:context": "Context clues",
  "r:idiom": "Idioms", "r:figurative": "Figurative language", "r:grammar": "Grammar", "r:fact-opinion": "Fact or opinion",
};
const MANNERS: Record<string, string> = {
  "magic-words": "Please & thank you", sharing: "Sharing & turns", kindness: "Kindness", listening: "Listening", calm: "Calming down",
  feelings: "Naming feelings", "big-feelings": "Big feelings", apology: "Saying sorry", honesty: "Honesty", table: "Table manners",
  helping: "Helping out", safety: "Staying safe", crossing: "Street safety", respect: "Respect", empathy: "Empathy", friendship: "Friendship",
  attitude: "Good attitude", "fix-attitude": "Turning attitude around", disagree: "Disagreeing kindly", responsibility: "Responsibility",
  growth: "Growth mindset", "peer-pressure": "Peer pressure", digital: "Screens & online", emergency: "Emergencies", money: "Money sense",
  "common-sense": "Common sense",
};
const COMP: Record<string, string> = { detail: "details", cause: "cause & effect", feeling: "characters' feelings", infer: "inferring", sequence: "sequence", main: "main idea", vocab: "vocabulary" };

export function skillLabel(skill: string): string {
  const parts = skill.split(":");
  const fam = parts.slice(0, 2).join(":");
  const rest = parts.slice(2).join(":");
  if (skill.startsWith("c:")) return CODE_SKILL_LABEL[skill] ?? parts[1];
  if (skill.startsWith("h:")) return MANNERS[parts[1]] ?? parts[1].replace(/-/g, " ");
  switch (fam) {
    case "m:add": return rest ? rest.replace("+", " + ") : FAMILY[fam];
    case "m:sub": return rest ? rest.replace("-", " − ") : FAMILY[fam];
    case "m:mul": return rest && /\d+x\d+/.test(rest) ? rest.replace("x", " × ") : `Multiplying${rest ? ` (${rest})` : ""}`;
    case "m:div": return rest && /\d+\/\d+/.test(rest) ? rest.replace("/", " ÷ ") : "Dividing";
    case "m:make10": return rest ? `${rest} + ? = 10` : FAMILY[fam];
    case "m:count": return rest ? `Counting to ${rest}` : FAMILY[fam];
    case "m:numeral": return rest ? `The number ${rest}` : FAMILY[fam];
    case "m:teen": return rest ? `The number ${rest}` : FAMILY[fam];
    case "m:tenframe": return rest ? `Ten-frame: ${rest}` : FAMILY[fam];
    case "m:skip": return rest ? `Counting by ${rest}s` : FAMILY[fam];
    case "r:sound": return `Sound of "${rest.replace("_e", " (long)")}"`;
    case "r:write": return `Writing "${rest}"`;
    case "r:word": return `Reading "${rest}"`;
    case "r:sight": return `Sight word "${rest}"`;
    case "r:family": return `-${rest} words`;
    case "r:pattern": return `Phonics: ${rest.replace(/-/g, " / ").replace(/_/g, "–")}`;
    case "r:vowel": return `Short ${rest}`;
    case "r:comp": return `Comprehension: ${COMP[rest] ?? rest}`;
    case "r:prefix": return `Prefix ${rest}-`;
    case "r:suffix": return `Suffix -${rest}`;
    case "r:root": return `Root "${rest}"`;
  }
  const base = FAMILY[fam] ?? fam.slice(2).replace(/-/g, " ");
  return rest ? `${base}: ${rest}` : base;
}

export type SkillInsight = { skill: string; label: string; strength: number; total: number; mastered: boolean; shaky: boolean };

/** A subject's skills, sorted for parents: the strongest, and the ones that need practice. */
export function skillPicture(skills: Skills, subject: SubjectId) {
  const mine = Object.entries(skills).filter(([k, s]) => skillSubject(k) === subject && s.total > 0);
  const toInsight = ([k, s]: [string, SkillStat]): SkillInsight => ({ skill: k, label: skillLabel(k), strength: strength(s), total: s.total, mastered: isMastered(s), shaky: isShaky(s) });
  const all = mine.map(toInsight);
  const shaky = all.filter((x) => x.shaky).sort((a, b) => a.strength - b.strength || b.total - a.total);
  const strong = all.filter((x) => !x.shaky).sort((a, b) => b.strength - a.strength || b.total - a.total);
  return { practiced: all.length, mastered: all.filter((x) => x.mastered).length, shaky, strong, solid: mine.filter(([, s]) => boxOf(s) >= 2).length };
}

/** Skill stats from result rows (oldest first), the same way the wall's engine keeps them. */
export function skillsFromResults(rows: { skills?: unknown; completed_at: string }[]): Skills {
  const out: Skills = {};
  const sorted = [...rows].sort((a, b) => a.completed_at.localeCompare(b.completed_at));
  for (const r of sorted) {
    if (!r.skills || typeof r.skills !== "object") continue;
    for (const [k, v] of Object.entries(r.skills as Record<string, unknown>)) {
      if (!Array.isArray(v)) continue;
      const right = Number(v[0]) || 0;
      const total = Number(v[1]) || 0;
      if (!total) continue;
      const cur = out[k] ?? { right: 0, total: 0, last: null, recent: "" };
      out[k] = { right: cur.right + right, total: cur.total + total, last: r.completed_at, recent: ((right >= total ? "1" : "0") + cur.recent).slice(0, 6) };
    }
  }
  return out;
}
