import type { Activity, Course, Lesson, Unit, GradeId } from "./types";

// The Math course — number sense with things to touch: count them, fill the net to a number,
// then push two groups together to add. Every answer is a picture you can count, never a
// number pulled from thin air.

const opts = (n: number, spread = 2): number[] => {
  const set = new Set([n]);
  for (let d = 1; set.size < 3; d++) {
    if (n - d >= 1 && set.size < 3) set.add(n - d);
    if (n + d <= 20 && set.size < 3) set.add(n + Math.min(d, spread));
  }
  return [...set];
};

const L = (unit: string, slug: string, title: string, emoji: string, activities: Activity[], skills: string[]): Lesson => ({
  id: `math.${unit}.${slug}`,
  subject: "math",
  unit: `math.${unit}`,
  title,
  emoji,
  activities,
  skills,
});

const U = (id: string, title: string, emoji: string, grade: GradeId, blurb: string, lessons: Lesson[]): Unit => ({ id: `math.${id}`, subject: "math", title, emoji, grade, blurb, lessons });

const count = (emoji: string, n: number): Activity => ({ kind: "count", emoji, n, options: opts(n) });
const make = (emoji: string, n: number): Activity => ({ kind: "make", emoji, n });
const add = (emoji: string, a: number, b: number): Activity => ({ kind: "add", emoji, a, b, options: opts(a + b) });

export const MATH: Course = {
  id: "math",
  title: "Math",
  emoji: "🔢",
  tagline: "Count, build and add",
  units: [
    U("c5", "Count to 5", "🖐️", "prek", "Count things one by one.", [
      L("c5", "1", "Count with me", "🐟", [count("🐟", 2), count("🍎", 3), count("🐤", 1), count("⭐", 4), count("🎈", 5)], ["count:5"]),
      L("c5", "2", "Fill the net", "🥅", [make("🐟", 3), make("🐚", 2), make("🍓", 4), make("🦀", 5)], ["count:5"]),
    ]),
    U("c10", "Count to 10", "🔟", "k", "Bigger numbers, same counting.", [
      L("c10", "1", "Count to 10", "🐠", [count("🐠", 6), count("🍪", 8), count("🦋", 7), count("🌸", 10), count("🐞", 9)], ["count:10"]),
      L("c10", "2", "Fill it up", "🧺", [make("🍎", 6), make("🐚", 8), make("⭐", 7), make("🐟", 10)], ["count:10"]),
    ]),
    U("add5", "Adding", "➕", "k", "Put two groups together and count them all.", [
      L("add5", "1", "Adding to 5", "➕", [add("🐟", 1, 1), add("🍎", 2, 1), add("⭐", 2, 2), add("🐤", 3, 1), add("🎈", 3, 2)], ["add:5"]),
      L("add5", "2", "Adding to 10", "🧮", [add("🐠", 4, 3), add("🍓", 5, 2), add("🐚", 3, 4), add("🌸", 6, 2), add("🦀", 5, 4)], ["add:10"]),
    ]),
  ],
};
