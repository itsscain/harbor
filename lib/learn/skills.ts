import type { SubjectId } from "./types";
import { CODE_SKILL_LABEL } from "./code";
import { VERSE_BY_ID } from "./bible";
import { STORY_BY_ID } from "./stories";
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
  pretend: "Pretend vs. a fib", truth: "Telling the truth", honest: "Honest choices", fib: "Spotting fibs", "happy-heart": "Obeying with a happy heart",
  obey: "Obeying right away", whining: "Asking nicely (no whining)", trust: "Building trust", "trust-builders": "Building trust", "rebuild-trust": "Rebuilding trust",
  "tattle-tell": "Tattling vs. telling", sneaky: "Not sneaking", watching: "Doing right when no one's watching", tone: "Tone of voice", "attitude-kids": "Attitude",
  "respect-builder": "Respectful answers", "lie-types": "Kinds of lies", "lie-examples": "Spotting lies", integrity: "Integrity", dilemma: "Tough choices",
  "best-reason": "Choosing for the right reasons", "honesty-me": "Honesty (thinking it over)", "respect-authority": "Respecting authority", "respect-big": "Respect",
  "disagree-kit": "Disagreeing respectfully", "stop-think": "Stop · Breathe · Think · Choose", "self-control": "Self-control", "future-you": "Thinking ahead",
  "own-it": "Owning mistakes", "apology-kit": "Real apologies", "fake-apology": "Real vs. fake apologies", think: "THINK before speaking", words: "Words that build up",
};
const FAITH: Record<string, string> = {
  "god-made": "God made everything", creation: "Creation", "made-me": "God made me", "god-loves": "God's love", "loved-by": "Loved by family",
  promises: "Keeping promises", "ark-count": "Counting with Noah", "bible-little": "God's Word", "prayer-little": "Prayer", thanks: "Thankfulness",
  brave: "Courage", christmas: "Christmas", "gift-jesus": "Giving to Jesus", "jesus-power": "Jesus' power", easter: "Easter", "happy-heart": "Obeying with a happy heart",
  obey: "Obeying parents", truth: "Telling the truth", wordless: "The gospel in colors", "wordless-order": "The gospel in colors", sin: "What sin is",
  gospel: "The good news", abc: "The ABCs of salvation", rescue: "Salvation", saved: "Trusting Jesus (thinking it over)", "bible-books": "Books of the Bible",
  "bible-facts": "Bible facts", "first-five": "The first five books", gospels: "The four Gospels", heroes: "Bible heroes", commandments: "The Ten Commandments",
  forgive: "Forgiveness", miracles: "Jesus' miracles", neighbor: "Loving our neighbor", parables: "Parables", "parable-q": "What the parables mean", fruit: "Fruit of the Spirit",
  "fruit-match": "Fruit of the Spirit", "which-fruit": "Fruit of the Spirit", "prayer-parts": "Kinds of prayer", "lords-prayer": "The Lord's Prayer", prayer: "Prayer",
  timeline: "The Bible's big story", sections: "Sections of the Bible", "big-facts": "Bible facts", "i-am": "Jesus' “I am” sayings", prophecy: "Prophecies about Jesus",
  "god-man": "Jesus: fully God, fully man", grace: "Saved by grace", assurance: "Assurance of salvation", "romans-road": "The Romans Road", "romans-match": "Romans Road verses", romans: "The Romans Road", explain: "Sharing the gospel",
  "bible-detective": "Spotting deception (Bible)", integrity: "Integrity", tongue: "Taming the tongue", "soft-answer": "A soft answer", complain: "Gratitude vs. grumbling",
  armor: "Armor of God", "armor-order": "Armor of God", "armor-use": "Using God's armor", beatitudes: "The Beatitudes", "golden-rule": "The Golden Rule",
  worry: "Trusting instead of worrying", "salt-light": "Salt and light", acts: "The book of Acts", proverbs: "Proverbs", "apply-proverbs": "Living the Proverbs",
  serve: "Serving others", humble: "Humility",
};
const CHARACTER_STORIES: Record<string, string> = { wolf: "The Boy Who Cried Wolf", toothpaste: "The Toothpaste Test" };
const COMP: Record<string, string> = { detail: "details", cause: "cause & effect", feeling: "characters' feelings", infer: "inferring", sequence: "sequence", main: "main idea", vocab: "vocabulary" };

export function skillLabel(skill: string): string {
  const parts = skill.split(":");
  const fam = parts.slice(0, 2).join(":");
  const rest = parts.slice(2).join(":");
  if (skill.startsWith("c:")) return CODE_SKILL_LABEL[skill] ?? parts[1];
  if (fam === "h:story") return `Story: ${CHARACTER_STORIES[rest] ?? rest}`;
  if (skill.startsWith("h:")) return MANNERS[parts[1]] ?? parts[1].replace(/-/g, " ");
  if (fam === "f:verse") return `Verse: ${VERSE_BY_ID.get(rest)?.ref ?? rest}`;
  if (fam === "f:story") return `Story: ${STORY_BY_ID.get(rest)?.title ?? rest}`;
  if (skill.startsWith("f:")) return FAITH[parts[1]] ?? parts[1].replace(/-/g, " ");
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
