// Per-class extraction of a phonics sound from a synthesized carrier, by acoustic signature:
// hiss = high zero-crossing rate; voicing = strong periodicity; bursts = brightness spikes.
import * as D from "./dsp.mjs";

export const HOP = 240; // 10 ms frames
const ms = (n) => Math.round((n / 1000) * D.RATE);
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;

function runsOf(flags) {
  const out = [];
  let st = -1;
  flags.forEach((f, i) => {
    if (f && st < 0) st = i;
    if (!f && st >= 0) {
      out.push([st, i]);
      st = -1;
    }
  });
  if (st >= 0) out.push([st, flags.length]);
  return out;
}
/** Merge runs separated by tiny gaps (a brief dip in voicing mid-vowel shouldn't split it). */
function bridge(rs, gap = 3) {
  const out = [];
  for (const r of rs) {
    const last = out[out.length - 1];
    if (last && r[0] - last[1] <= gap) last[1] = r[1];
    else out.push([...r]);
  }
  return out;
}
const longestRun = (rs, fb) => rs.reduce((m, r) => (r[1] - r[0] > m[1] - m[0] ? r : m), fb);

export function extract(x, cls, hold) {
  const F = D.features(x);
  const maxdb = Math.max(...F.map((f) => f.db));
  const slice = (i, j) => x.slice(Math.max(0, i) * HOP, Math.min(F.length, j) * HOP);
  const period = (i, j) => median(F.slice(Math.max(0, i), j).filter((f) => f.per > 0.6).map((f) => f.lag)) || 100;
  // the main vowel: the longest strongly voiced, loud run
  const [v0, v1] = longestRun(bridge(runsOf(F.map((f) => f.per > 0.65 && f.zcr < 0.15 && f.db > maxdb - 24))), [0, 0]);
  const hiss = (f, zcr = 0.3) => f.zcr > zcr && f.db > -60;
  let a = 0;
  let b = 0;
  let clip;
  let info = "";
  switch (cls) {
    case "vowel": {
      const pad = Math.floor((v1 - v0) * 0.22);
      a = v0 + pad;
      b = v1 - pad;
      clip = D.sustainPSOLA(slice(a, b), ms(hold), period(a, b));
      info = `vowel ${(v1 - v0) * 10}ms`;
      break;
    }
    case "glide-vowel": {
      // the whole (gliding) vowel, stopping before the final consonant's closure
      const pk = Math.max(...F.slice(v0, v1).map((f) => f.db));
      let end = v1;
      while (end < F.length && F[end].per > 0.5 && F[end].zcr < 0.2 && F[end].db > pk - 14) end++;
      while (end > v0 + 6 && F[end - 1].db < pk - 10) end--;
      a = v0;
      b = end;
      clip = slice(a, b);
      info = `vowel ${(b - a) * 10}ms`;
      break;
    }
    case "open-vowel": {
      // an open syllable ("hi", "car"): the vowel runs to the natural end of the word
      a = v0;
      b = v1;
      const pk = Math.max(...F.slice(v0, v1).map((f) => f.db));
      while (b < F.length && F[b].per > 0.45 && F[b].db > pk - 18) b++;
      clip = slice(a, b);
      info = `vowel ${(b - a) * 10}ms`;
      break;
    }
    case "nasal":
    case "liquid": {
      // the consonant: voiced, darker frames right before the vowel brightens/gets louder
      let st = v0;
      while (st > 0 && F[st - 1].per > 0.7 && F[st - 1].zcr < 0.1 && F[st - 1].db > maxdb - 32) st--;
      const start = F.slice(st, v1).findIndex((f) => f.per > 0.8) + st;
      const lvl = median(F.slice(start, start + 3).map((f) => f.db));
      const base = median(F.slice(start, start + 3).map((f) => f.centroid));
      let end = start + 2;
      while (end < F.length && F[end].db < lvl + 5 && F[end].centroid < base * 1.7) end++;
      a = start;
      b = Math.max(start + 4, end - 1);
      clip = D.sustainPSOLA(slice(a, b), ms(hold), period(a, b));
      info = `consonant ${(b - a) * 10}ms (${Math.round(median(F.slice(a, b).map((f) => f.centroid)))} Hz)`;
      break;
    }
    case "final-nasal": {
      const vc = median(F.slice(v0, Math.min(v1, v0 + 10)).map((f) => f.centroid));
      let st = v0 + 5;
      while (st < F.length && !(F[st].centroid < vc * 0.55 && F[st].per > 0.6)) st++;
      a = st;
      b = st;
      while (b < F.length && F[b].per > 0.55 && F[b].db > maxdb - 36 && F[b].centroid < vc * 0.75) b++;
      clip = D.sustainPSOLA(slice(a, b), ms(hold), period(a, b));
      info = `nasal ${(b - a) * 10}ms (${Math.round(median(F.slice(a, b).map((f) => f.centroid)))} Hz vs vowel ${Math.round(vc)})`;
      break;
    }
    case "final-fric": {
      // the hiss after the vowel
      [a, b] = longestRun(runsOf(F.map((f, i) => i >= v1 && hiss(f))), [v1, v1 + 10]);
      const seg = slice(a, b);
      clip = D.sustainNoise(seg, ms(hold));
      info = `hiss ${(b - a) * 10}ms; 2-5k/6-11k ${(D.bandEnergy(seg, 2000, 5000) / D.bandEnergy(seg, 6000, 11000)).toFixed(2)}`;
      break;
    }
    case "vfric": {
      // buzzing hiss before the vowel: bright and noisy but voiced
      [a, b] = longestRun(runsOf(F.map((f, i) => i < v0 + 2 && f.centroid > 2500 && f.zcr > 0.1 && f.db > -55)), [v0 - 10, v0]);
      clip = D.sustainVoicedFricative(slice(a, b), ms(hold), period(a - 5, v0 + 5));
      info = `buzz ${(b - a) * 10}ms`;
      break;
    }
    case "stop":
    case "affricate": {
      // burst + aspiration: the noisy run right before the vowel (no leading silence)
      const r = runsOf(F.map((f, i) => i < v0 && f.db > -60 && (f.zcr > 0.2 || f.centroid > 3000))).filter((q) => q[1] >= v0 - 3);
      a = r.length ? r[r.length - 1][0] : v0 - 12;
      b = v0 + 1;
      clip = slice(a, b);
      info = `burst+aspiration ${(b - a) * 10}ms`;
      break;
    }
    case "vstop":
    case "affricate-v": {
      let rel = v0;
      let best = -1;
      for (let i = 1; i < Math.min(F.length, v1); i++) {
        const jump = F[i].centroid - F[i - 1].centroid;
        if (F[i].db > -45 && jump > best) {
          best = jump;
          rel = i;
        }
      }
      // the vowel after the release: first strongly voiced frame
      let vo = rel + 1;
      while (vo < F.length && !(F[vo].per > 0.75 && F[vo].zcr < 0.1)) vo++;
      a = rel - (cls === "affricate-v" ? 3 : 0);
      b = vo + 6;
      clip = slice(a, b);
      info = `release+vowel ${(b - a) * 10}ms`;
      break;
    }
    case "breath": {
      const r = runsOf(F.map((f, i) => i < v0 && f.db > -62 && f.zcr > 0.1 && f.centroid > 1500)).filter((q) => q[1] >= v0 - 4);
      a = r.length ? r[r.length - 1][0] : v0 - 10;
      b = v0 + 5;
      clip = slice(a, b);
      info = `breath+vowel ${(b - a) * 10}ms`;
      break;
    }
    case "glide": {
      let st = v0;
      while (st > 0 && F[st - 1].per > 0.45 && F[st - 1].db > maxdb - 36) st--;
      // "qu": include the k burst before the voicing
      const r = runsOf(F.map((f, i) => i < st && f.db > -60 && (f.zcr > 0.2 || f.centroid > 3000))).filter((q) => q[1] >= st - 2);
      a = r.length ? r[r.length - 1][0] : st;
      b = st + 14;
      clip = slice(a, b);
      info = `glide+vowel ${(b - a) * 10}ms`;
      break;
    }
    case "final-ks": {
      a = v1;
      b = F.length;
      while (b > a + 2 && F[b - 1].db < -60) b--;
      clip = slice(a, b);
      info = `ks ${(b - a) * 10}ms`;
      break;
    }
  }
  return { clip: D.normalize(D.fadeEnds(clip, 8, 35)), a, b, info };
}
