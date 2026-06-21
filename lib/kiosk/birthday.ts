/** Next occurrence of a child's birthday (month/day), with days-until and the age
 *  they'll turn. Pure + timezone-safe (local date math). Used for the wall's
 *  "N sleeps until {name}'s birthday" countdown. */
export function nextBirthday(birthday: string | null | undefined): {
  daysUntil: number;
  turning: number | null;
} | null {
  if (!birthday) return null;
  const [y, m, d] = birthday.split("-").map(Number);
  if (!m || !d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), m - 1, d);
  next.setHours(0, 0, 0, 0);
  if (next.getTime() < today.getTime()) next = new Date(today.getFullYear() + 1, m - 1, d);
  const daysUntil = Math.round((next.getTime() - today.getTime()) / 86_400_000);
  const turning = y ? next.getFullYear() - y : null;
  return { daysUntil, turning };
}
