import type { InstId, Meter, Score } from "./types";

// Songs every kid can know — all in the public domain (folk songs, nursery songs, hymns, spirituals
// and classical themes). Pitches are MIDI (null = rest), lengths in beats (quarter = 1). `tonic` is
// do (for solfège); `words` has one syllable per sounding note (for karaoke and lyric lessons).
// Several are about the sea and boats, because Harbor.

export type Song = {
  id: string;
  title: string;
  meter: Meter;
  tonic: number;
  /** Beats before the first full bar (a pickup), if any. */
  pickup?: number;
  pitches: (number | null)[];
  durs: number[];
  words?: string[];
  /** Who wrote it / where it's from (for the history lessons). */
  from?: string;
};

// Pitch names used below (C4 = 60).
const G3 = 55, A3 = 57, B3 = 59, C4 = 60, C_4 = 61, D4 = 62, D_4 = 63, E4 = 64, F4 = 65, F_4 = 66, G4 = 67, G_4 = 68, A4 = 69, B4 = 71, C5 = 72, D5 = 74, D_5 = 75, E5 = 76, F5 = 77, F_5 = 78, G5 = 79;
const R = null;

export const SONGS: Song[] = [
  {
    id: "twinkle",
    title: "Twinkle, Twinkle, Little Star",
    meter: [4, 4],
    tonic: C4,
    pitches: [C4, C4, G4, G4, A4, A4, G4, F4, F4, E4, E4, D4, D4, C4],
    durs: [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2],
    words: ["Twin", "kle", "twin", "kle", "lit", "tle", "star", "how", "I", "won", "der", "what", "you", "are"],
    from: "French folk tune (Mozart wrote variations on it)",
  },
  {
    id: "mary",
    title: "Mary Had a Little Lamb",
    meter: [4, 4],
    tonic: C4,
    pitches: [E4, D4, C4, D4, E4, E4, E4, D4, D4, D4, E4, G4, G4, E4, D4, C4, D4, E4, E4, E4, E4, D4, D4, E4, D4, C4],
    durs: [1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4],
    words: ["Ma", "ry", "had", "a", "lit", "tle", "lamb", "lit", "tle", "lamb", "lit", "tle", "lamb", "Ma", "ry", "had", "a", "lit", "tle", "lamb", "its", "fleece", "was", "white", "as", "snow"],
    from: "American nursery song",
  },
  {
    id: "hotcross",
    title: "Hot Cross Buns",
    meter: [4, 4],
    tonic: C4,
    pitches: [E4, D4, C4, E4, D4, C4, C4, C4, C4, C4, D4, D4, D4, D4, E4, D4, C4],
    durs: [1, 1, 2, 1, 1, 2, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 2],
    words: ["Hot", "cross", "buns", "hot", "cross", "buns", "one", "a", "pen", "ny", "two", "a", "pen", "ny", "hot", "cross", "buns"],
    from: "English street song",
  },
  {
    id: "rainrain",
    title: "Rain, Rain, Go Away",
    meter: [2, 4],
    tonic: C4,
    pitches: [G4, E4, G4, G4, E4, G4, G4, E4, E4, G4, G4, E4],
    durs: [1, 1, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1],
    words: ["Rain", "rain", "go", "a", "way", "come", "a", "gain", "a", "noth", "er", "day"],
    from: "Nursery rhyme",
  },
  {
    id: "cuckoo",
    title: "Cuckoo",
    meter: [2, 4],
    tonic: C4,
    pitches: [G4, E4, R, G4, E4, R],
    durs: [1, 1, 2, 1, 1, 2],
    words: ["Cuc", "koo", "cuc", "koo"],
    from: "The cuckoo bird's own song (so–mi)",
  },
  {
    id: "rosie",
    title: "Ring Around the Rosie",
    meter: [2, 4],
    tonic: C4,
    pitches: [G4, G4, E4, A4, G4, E4, G4, G4, E4, A4, G4, E4, G4, E4, G4, E4, G4, G4, G4, C4],
    durs: [0.5, 0.5, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 1, 1, 0.5, 0.5, 1, 2],
    words: ["Ring", "a", "round", "the", "ro", "sie", "pock", "et", "full", "of", "po", "sies", "ash", "es", "ash", "es", "we", "all", "fall", "down"],
    from: "Playground singing game",
  },
  {
    id: "frere",
    title: "Are You Sleeping? (Frère Jacques)",
    meter: [4, 4],
    tonic: C4,
    pitches: [C4, D4, E4, C4, C4, D4, E4, C4, E4, F4, G4, E4, F4, G4, G4, A4, G4, F4, E4, C4, G4, A4, G4, F4, E4, C4, C4, G3, C4, C4, G3, C4],
    durs: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 0.5, 0.5, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 2, 1, 1, 2],
    words: ["Are", "you", "sleep", "ing", "are", "you", "sleep", "ing", "Bro", "ther", "John", "Bro", "ther", "John", "Morn", "ing", "bells", "are", "ring", "ing", "morn", "ing", "bells", "are", "ring", "ing", "ding", "dang", "dong", "ding", "dang", "dong"],
    from: "French round",
  },
  {
    id: "rowboat",
    title: "Row, Row, Row Your Boat",
    meter: [6, 8],
    tonic: C4,
    pitches: [C4, C4, C4, D4, E4, E4, D4, E4, F4, G4, C5, C5, C5, G4, G4, G4, E4, E4, E4, C4, C4, C4, G4, F4, E4, D4, C4],
    durs: [1.5, 1.5, 1, 0.5, 1.5, 1, 0.5, 1, 0.5, 3, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 1, 0.5, 3],
    words: ["Row", "row", "row", "your", "boat", "gent", "ly", "down", "the", "stream", "mer", "ri", "ly", "mer", "ri", "ly", "mer", "ri", "ly", "mer", "ri", "ly", "life", "is", "but", "a", "dream"],
    from: "American round (1852)",
  },
  {
    id: "lightlyrow",
    title: "Lightly Row",
    meter: [4, 4],
    tonic: C4,
    pitches: [G4, E4, E4, F4, D4, D4, C4, D4, E4, F4, G4, G4, G4, G4, E4, E4, F4, D4, D4, C4, E4, G4, G4, C4],
    durs: [1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 4],
    words: ["Light", "ly", "row", "light", "ly", "row", "o'er", "the", "glass", "y", "waves", "we", "go", "smooth", "ly", "glide", "smooth", "ly", "glide", "on", "the", "si", "lent", "tide"],
    from: "German folk song",
  },
  {
    id: "oldmac",
    title: "Old MacDonald Had a Farm",
    meter: [4, 4],
    tonic: C4,
    pitches: [C4, C4, C4, G3, A3, A3, G3, E4, E4, D4, D4, C4],
    durs: [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 4],
    words: ["Old", "Mac", "Don", "ald", "had", "a", "farm", "E", "I", "E", "I", "O"],
    from: "American folk song",
  },
  {
    id: "london",
    title: "London Bridge",
    meter: [4, 4],
    tonic: C4,
    pitches: [G4, A4, G4, F4, E4, F4, G4, D4, E4, F4, E4, F4, G4, G4, A4, G4, F4, E4, F4, G4, D4, G4, E4, C4],
    durs: [1.5, 0.5, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1.5, 0.5, 1, 1, 1, 1, 2, 2, 2, 1, 3],
    words: ["Lon", "don", "Bridge", "is", "fall", "ing", "down", "fall", "ing", "down", "fall", "ing", "down", "Lon", "don", "Bridge", "is", "fall", "ing", "down", "my", "fair", "la", "dy"],
    from: "English singing game",
  },
  {
    id: "baabaa",
    title: "Baa, Baa, Black Sheep",
    meter: [4, 4],
    tonic: C4,
    pitches: [C4, C4, G4, G4, A4, A4, A4, A4, G4, F4, F4, E4, E4, D4, D4, C4],
    durs: [1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 2, 1, 1, 1, 1, 1, 1, 2],
    words: ["Baa", "baa", "black", "sheep", "have", "you", "an", "y", "wool", "yes", "sir", "yes", "sir", "three", "bags", "full"],
    from: "English nursery rhyme",
  },
  {
    id: "thisoldman",
    title: "This Old Man",
    meter: [4, 4],
    tonic: C4,
    pitches: [G4, E4, G4, G4, E4, G4, A4, G4, F4, E4, D4, E4, F4],
    durs: [1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2],
    words: ["This", "old", "man", "he", "played", "one", "he", "played", "knick", "knack", "on", "my", "thumb"],
    from: "English counting song",
  },
  {
    id: "birthday",
    title: "Happy Birthday",
    meter: [3, 4],
    tonic: C4,
    pickup: 1,
    pitches: [G4, G4, A4, G4, C5, B4, G4, G4, A4, G4, D5, C5, G4, G4, G5, E5, C5, B4, A4, F5, F5, E5, C5, D5, C5],
    durs: [0.75, 0.25, 1, 1, 1, 2, 0.75, 0.25, 1, 1, 1, 2, 0.75, 0.25, 1, 1, 1, 1, 1, 0.75, 0.25, 1, 1, 1, 3],
    words: ["Hap", "py", "birth", "day", "to", "you", "hap", "py", "birth", "day", "to", "you", "hap", "py", "birth", "day", "dear", "friend", "", "hap", "py", "birth", "day", "to", "you"],
    from: "Mildred and Patty Hill (1893)",
  },
  {
    id: "jingle",
    title: "Jingle Bells",
    meter: [4, 4],
    tonic: C4,
    pitches: [E4, E4, E4, E4, E4, E4, E4, G4, C4, D4, E4, F4, F4, F4, F4, F4, E4, E4, E4, E4, E4, D4, D4, E4, D4, G4],
    durs: [1, 1, 2, 1, 1, 2, 1, 1, 1.5, 0.5, 4, 1, 1, 1.5, 0.5, 1, 1, 1, 0.5, 0.5, 1, 1, 1, 1, 2, 2],
    words: ["Jin", "gle", "bells", "jin", "gle", "bells", "jin", "gle", "all", "the", "way", "oh", "what", "fun", "it", "is", "to", "ride", "in", "a", "one", "horse", "o", "pen", "sleigh", "hey"],
    from: "James Lord Pierpont (1857)",
  },
  {
    id: "saints",
    title: "When the Saints Go Marching In",
    meter: [4, 4],
    tonic: C4,
    pickup: 3,
    pitches: [C4, E4, F4, G4, C4, E4, F4, G4, C4, E4, F4, G4, E4, C4, E4, D4],
    durs: [1, 1, 1, 5, 1, 1, 1, 5, 1, 1, 1, 2, 2, 2, 2, 4],
    words: ["Oh", "when", "the", "saints", "go", "march", "ing", "in", "oh", "when", "the", "saints", "go", "march", "ing", "in"],
    from: "African American spiritual",
  },
  {
    id: "bonnie",
    title: "My Bonnie Lies Over the Ocean",
    meter: [3, 4],
    tonic: C4,
    pickup: 1,
    pitches: [G4, E5, D5, C5, D5, C5, A4, G4, E4, R, G4, E5, D5, C5, C5, B4, C5, D5],
    durs: [1, 1.5, 0.5, 1, 1, 1, 1, 1, 2, 2, 1, 1.5, 0.5, 1, 1, 1, 1, 3],
    words: ["My", "Bon", "nie", "lies", "o", "ver", "the", "o", "cean", "my", "Bon", "nie", "lies", "o", "ver", "the", "sea"],
    from: "Scottish folk song",
  },
  {
    id: "grace",
    title: "Amazing Grace",
    meter: [3, 4],
    tonic: C4,
    pickup: 1,
    pitches: [G3, C4, E4, C4, E4, D4, C4, A3, G3, G3, C4, E4, C4, E4, D4, G4],
    durs: [1, 2, 0.5, 0.5, 2, 1, 2, 1, 2, 1, 2, 0.5, 0.5, 2, 1, 3],
    words: ["A", "maz", "ing", "", "grace", "how", "sweet", "the", "sound", "that", "saved", "a", "", "wretch", "like", "me"],
    from: "John Newton (hymn, 1779)",
  },
  {
    id: "odetojoy",
    title: "Ode to Joy",
    meter: [4, 4],
    tonic: C4,
    pitches: [E4, E4, F4, G4, G4, F4, E4, D4, C4, C4, D4, E4, E4, D4, D4, E4, E4, F4, G4, G4, F4, E4, D4, C4, C4, D4, E4, D4, C4, C4],
    durs: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2],
    from: "Ludwig van Beethoven, Symphony No. 9 (1824)",
  },
  {
    id: "minuet",
    title: "Minuet in G",
    meter: [3, 4],
    tonic: G4,
    pitches: [D5, G4, A4, B4, C5, D5, G4, G4, E5, C5, D5, E5, F_5, G5, G4, G4, C5, D5, C5, B4, A4, B4, C5, B4, A4, G4, F_4, G4, A4, B4, G4, A4],
    durs: [1, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 3],
    from: "From Anna Magdalena Bach's notebook (1725)",
  },
  {
    id: "furelise",
    title: "Für Elise",
    meter: [3, 8],
    tonic: A4,
    pickup: 0.5,
    pitches: [E5, D_5, E5, D_5, E5, B4, D5, C5, A4, R, C4, E4, A4, B4, R, E4, G_4, B4, C5, R, E4, E5, D_5, E5, D_5, E5, B4, D5, C5, A4, R, C4, E4, A4, B4, R, E4, C5, B4, A4],
    durs: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.5, 0.25, 0.25, 0.25, 0.25, 0.5, 0.25, 0.25, 0.25, 0.25, 0.5, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.5, 0.25, 0.25, 0.25, 0.25, 0.5, 0.25, 0.25, 0.25, 0.25, 1.5],
    from: "Ludwig van Beethoven (1810)",
  },
  {
    id: "mountainking",
    title: "In the Hall of the Mountain King",
    meter: [4, 4],
    tonic: B3,
    pitches: [B3, C_4, D4, E4, F_4, D4, F_4, F4, C_4, F4, E4, C4, E4, B3, C_4, D4, E4, F_4, D4, F_4, B4, A4, F_4, D4, F_4, A4],
    durs: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 2],
    from: "Edvard Grieg, Peer Gynt (1875)",
  },
  {
    id: "entertainer",
    title: "The Entertainer",
    meter: [2, 4],
    tonic: C4,
    pickup: 0.5,
    pitches: [D4, D_4, E4, C5, E4, C5, E4, C5, C5, D5, D_5, E5, C5, D5, E5, B4, D5, C5],
    durs: [0.25, 0.25, 0.25, 0.5, 0.25, 0.5, 0.25, 1.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.5, 0.25, 0.5, 2.25],
    from: "Scott Joplin (ragtime, 1902)",
  },
];

export const SONG_BY_ID = new Map(SONGS.map((s) => [s.id, s]));
export const song = (id: string): Song => {
  const s = SONG_BY_ID.get(id);
  if (!s) throw new Error(`no song ${id}`);
  return s;
};

/** A song (or its first `n` notes) as something to hear. */
export function songScore(id: string, o: { inst?: InstId; bpm?: number; n?: number; transpose?: number } = {}): Score {
  const s = song(id);
  const k = o.n ?? s.pitches.length;
  const t = o.transpose ?? 0;
  return {
    bpm: o.bpm ?? (s.meter[1] === 8 ? 132 : 104),
    meter: s.meter,
    tracks: [{ kind: "notes", inst: o.inst ?? "piano", notes: s.pitches.slice(0, k).map((p, i) => ({ p: p === null ? null : p + t, d: s.durs[i] })) }],
  };
}
/** The total beats of a song (or its first n notes). */
export const songBeats = (id: string, n?: number) => song(id).durs.slice(0, n ?? undefined).reduce((a, b) => a + b, 0);
