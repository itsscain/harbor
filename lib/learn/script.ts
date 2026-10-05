import type { Activity, GradeId, Lesson, Option, SubjectId } from "./types";
import { bandOf } from "./types";
import { SOUNDS, soundOut } from "./sounds";
import { COURSES, unitById } from "./curriculum";
import { THEMES } from "./meta";
import { numberWord as numberWordFull } from "./gen";
import { refSpoken, verseSpeech } from "./bible";
import { CREATURES, EGG_LOOK } from "./reef";
import { DECOR, FOODS, TANKS } from "./aquarium";
import { NAME_ADJ, NAME_NOUN, SHOP } from "./boats";

// Everything Harbor Learn says out loud. Lines are pre-recorded in the Harbor voice
// (scripts/gen-learn-voice.mjs → /public/learn-voice), so a child who can't read yet always hears
// clear, identical speech — and letter sounds are true phonics sounds ("mmm", never "em").
//
// Clip keys: a line of text is its own key; a speech sound is `snd:<id>`; "~" in a say-list is a
// short breath. Lead-in lines end in a comma to keep the voice's rising "there's more" lilt.
// Little and middle sailors (Pre-K–2nd) get every prompt, choice and explanation recorded; big
// sailors read on their own (a "read to me" button uses the device voice for anything unrecorded).

export const SAY = {
  // Home + flow
  pickSubject: "What do you want to learn today?",
  reading: "Reading",
  code: "Code",
  math: "Math",
  manners: "Captain's Code",
  faith: "Lighthouse",
  science: "Discovery",
  mission: "Here's your mission!",
  fromGrownup: "A grown-up picked this one for you.",
  letsGo: "Let's go!",
  locked: "Pass the level before this one to unlock it.",
  worldLocked: "Finish the island before this one to sail here.",
  stickerBook: "Your sticker album!",
  keepGoing: "Keep going!",
  wantToLeave: "Do you want to stop this level?",
  welcomeBack: "Welcome back, captain!",
  dailyChest: "Your daily treasure chest is ready!",
  shop: "Welcome to the Shipyard!",
  sailHello: "Tap the water to sail your boat!",
  nameBoat: "Pick two words to name your boat!",
  dragHint: "Tap a block, or drag it into your program.",
  notEnough: "You need more shells for that one. Keep learning to earn more!",
  bought: "It's yours!",
  practiceCove: "Let's practice the tricky ones in Practice Cove!",
  practiceDone: "Practice makes perfect!",
  bossTime: "Boss level! You can do it!",
  reviewTime: "Treasure review! Let's remember what we learned.",
  goldenFish: "A golden fish! Tap it, quick!",
  lookFirst: "Whoa, slow down! Stop and look first. Listen.",
  netCheck: "Then tap the check.",
  netTooMany: "Too many! Take some out.",
  netNotEnough: "Not enough yet. Put more in.",
  fromBefore: "Here's one from before!",
  retryRound: "Let's try the tricky ones again!",
  greatTry: "Great try! Every mistake helps your brain grow.",
  worldUnlocked: "A new island is open!",
  hint: "Here's a hint.",
  showMe: "Let me show you.",
  tryTogether: "Now you try it.",
  almost: "So close! Let's practice a little, then try again.",
  youCanDoIt: "You can do it!",
  dailyLimit: "That's all the learning for today. Great job! Come back tomorrow.",
  newWorld: "A new island! Let's explore!",
  worldDone: "Island complete! On to a new adventure!",
  sailOn: "Sail on!",

  // Meet a letter
  thisLetterSays: "This letter says,",
  theseLettersSay: "These letters say,",
  tapEachPicture: "Tap each picture.",
  // Trace
  traceIt: "Trace the letter with your finger. Start at the green dot.",
  traceDone: "Beautiful writing!",
  // Find the letter
  tapLetterThatSays: "Tap the letter that says,",
  // First sound / rhyme
  whichStartsWith: "Which one starts with,",
  whichRhymesWith: "Which one rhymes with,",
  // Build
  spellIt: "Let's spell,",
  dragLetters: "Drag the letters into the boxes.",
  // Blend
  slideToBlend: "Slide the boat under the word to sound it out.",
  whichPicture: "Which picture is it?",
  // Read a word
  findTheWord: "Find the word,",
  // Pop
  popEvery: "Pop every bubble that says,",
  // Sentence
  readSentence: "Read the sentence. Tap a word if you need help.",
  readToMe: "Listen.",
  // Counting
  tapToCount: "Tap each one to count it.",
  howMany: "How many are there?",
  pushTogether: "Push them together!",
  howManyInAll: "How many in all?",
  tooMany: "That's too many. Take one out.",
  // New activity kinds
  sortIt: "Drag each one to where it belongs.",
  orderIt: "Drag them into the right order.",
  matchIt: "Tap two that go together.",
  memoryIt: "Flip two cards to find a match.",
  typeIt: "Type the answer.",
  buildNumber: "Build the number with tens and ones.",
  whatShouldYouDo: "What should you do?",
  whatHappens: "Here's what happens next.",
  listenAgain: "Listen again.",

  // Code
  codeTap: "Tap the blocks to build your program. Then press play!",
  codeBug: "Uh oh, this code has a bug. Can you fix it?",
  codePlay: "Press play to run your program!",
  bumped: "Bonk! Try a different way.",
  notThere: "Not there yet! Add more blocks.",
  overshoot: "Your boat got to the island, then kept going! It does every block, even the extra ones.",
  overshootLoop: "Your loop went around too many times! It got there, then kept going.",
  overshootGoal: "It got to the goal, then kept going! It does every block, even the extra ones.",
  tooManyMoves: "Too many! The robot does every move, even the extra ones.",
  tooManyNotes: "Too many! The bells play every note, even the extra ones.",
  stillGoing: "It made it… but there are more blocks!",
  // Boat School (the one tutorial nobody skips)
  bsMeet: "This is your boat. It goes where your blocks tell it to go. Tap the arrow block!",
  bsPlay1: "You made a program! Now press Play.",
  bsOneStep: "See? One block, one step.",
  bsCount: "The island is three steps away. Count the squares with me.",
  bsAddTwo: "Add two more arrows, so you have three.",
  bsPlay3: "Three blocks! Press Play.",
  bsMadeIt: "Three blocks, three steps. You made it!",
  bsTooMany: "Now watch what happens with too many blocks. Add two more arrows!",
  bsPlayExtra: "Press Play, and watch closely!",
  bsCrash: "Oh no! The boat did every block, even the extra ones. It sailed right past the island and crashed into the rock!",
  bsRemove: "Tap the red blocks to take the extra ones away.",
  bsTryAgain: "Now press Play again.",
  bsRule: "The boat does exactly what your blocks say. Not more, not less. Count the squares, then use that many blocks!",
  missedShells: "Get all the shells first!",
  missedFish: "Catch all the fish first!",
  lockedGate: "The gate is locked! Get the key first.",
  bridgeUp: "The bridge is up! Press the button first.",
  sharkGotYou: "Chomp! The shark got you. Watch where it swims, and wait for it to pass.",
  noFish: "No fish here! Catch when you're right on a fish.",
  outOfBounds: "Whoa, that's off the map! Try again.",
  codeWin: "It worked! You're a coder!",
  danceWrong: "Oops, that's not the same dance. Watch again!",
  songWrong: "That's not quite the song. Listen again!",
  drawWrong: "Not quite the same picture. Look closely!",
  pixelWrong: "Something's different. Look closely at the picture.",
  bugFixed: "You fixed the bug!",
  watchFirst: "Watch first!",
  listenFirst: "Listen first!",
  tryThisBlock: "Try this block next.",
  fewerBlocks: "It works! Can you do it with fewer blocks?",
  everyMap: "Your program has to work on every map!",
  useLoop: "Try a repeat block. It does things again and again!",
  recapLoop: "The loop did the repeating for you!",
  recapCheck: "Your program checked and decided, all by itself!",
  recapFunc: "Your function did lots of steps with just one name!",
  recapSteps: "Step by step, in order. That's a program!",

  // Code Lab
  conceptTime: "Let's learn a big coding idea!",
  predictEnd: "Be the computer! Where will the boat stop? Tap the square.",
  predictEndRover: "Be the computer! Where will the rover stop? Tap the square.",
  predictCountSong: "Be the computer! How many bells will ring?",
  predictCountDance: "Be the computer! How many moves will the robot do?",
  predictPick: "Which program works? Tap one to test it.",
  predictRight: "You thought just like a computer!",
  predictWatch: "Let's run it and see.",
  loopFindPart: "Find the part that repeats.",
  loopFindTimes: "How many times does it repeat?",
  loopFindDone: "One loop instead of all those blocks!",
  recipeIntro: "The robot does exactly what you say. Put the steps in order, then press play!",
  recipeOops: "Oops! The robot did exactly what you said. Fix the order!",
  recipeWin: "The robot did it!",
  factoryIntro: "Build the rule, then run the factory!",
  factoryWrong: "Some went to the wrong bin. Fix the rule and try again!",
  factoryWin: "Every one sorted! What a rule!",
  varIntro: "Follow the program. What will the box hold at the end?",
  varWatch: "Let's watch the box change.",
  eventsIntro: "Make your app! Pick what happens when you tap each one.",
  eventsPlay: "Now tap them and try your app!",
  eventsWrong: "Hmm, that's not what the app is supposed to do. Check the goal!",
  binaryMake: "Turn on lights to make the number.",
  binaryRead: "Add up the lights that are on. What number is it?",
  searchIntro: "I'm thinking of a number. Find it in as few guesses as you can!",
  higher: "Higher!",
  lower: "Lower!",
  searchFound: "You found it!",
  searchTip: "Pro tip: guess the middle. Each guess cuts the choices in half!",
  swapIntro: "Swap neighbors to put them in order, smallest first.",
  swapDone: "All in order!",
  cipherIntro: "Use the key to crack the secret code!",
  logicLight: "Flip the switches to turn on the light.",
  logicPredict: "Will the light be on?",
  machineOut: "What number will come out?",
  machineRule: "What rule is the machine using?",
  plotPlace: "Put the treasure on the spot. Go across first, then up.",
  plotRead: "Where is the treasure? Count across first, then up.",

  // Discovery labs
  labFloat: "Will it sink or float? Guess first, then drop it in!",
  labMagnet: "Will the magnet pull it? Guess first, then test it!",
  labCircuit: "Will the bulb light up? Guess first, then try it!",
  labStates: "Heat it up or cool it down!",
  labPlant: "Give the plant what it needs to grow!",
  labShadow: "Move the sun and watch the shadow!",
  labRamp: "Change the ramp, then roll the car!",
  itSinks: "It sinks!",
  itFloats: "It floats!",
  itSticks: "It sticks to the magnet!",
  noStick: "The magnet doesn't pull it.",
  bulbOn: "The bulb lights up!",
  bulbOff: "No light!",
  guessRight: "Your prediction was right!",
  guessOops: "Not what you guessed. That's how scientists learn!",
  melting: "Melting!",
  freezing: "Freezing!",
  evaporating: "Evaporating!",
  condensing: "Condensing!",
  plantSun: "Plants use sunlight to make their food.",
  plantWater: "Roots drink water. Without it, the plant wilts.",
  plantAir: "Leaves take in air to make food.",
  plantSoil: "Soil holds the roots and gives the plant nutrients.",
  rampFarther: "Can you make it go even farther?",
  rampSooner: "Can you make it stop even sooner?",

  // Stories, verses and character
  storyTime: "Story time!",
  tapNext: "Tap the arrow when you're ready.",
  listenVerse: "Listen to God's Word.",
  sayItWithMe: "Now say it with me!",
  whichWord: "Which word is missing?",
  buildVerse: "Build the verse. Tap the pieces in order.",
  whereVerse: "Where is this verse found?",
  meaningVerse: "What does this verse mean?",
  verseLearned: "You hid God's Word in your heart!",
  detective: "Truth Detective! Read carefully.",
  foundIt: "You found it!",
  thatsHonest: "That part is honest. Keep looking!",
  rewind: "Let's rewind and try again!",
  seeWhatHappens: "Let's see what happens.",
  buildIt: "Pick the best words for each part.",
  noWrong: "There's no wrong answer. Just think about you.",
  thanksSharing: "Thanks for sharing!",
  prayerLead: "Dear God, thank you for",
  challenge: "Here's your challenge for today!",
  // Collections
  newEgg: "You found an egg!",
  hatchIt: "Tap the egg to hatch it!",
  hatched: "It hatched! Say hello to your new friend!",
  pickBuddy: "Pick a buddy to come along on your voyage!",
  buddyGrew: "Your buddy is growing!",
  newCard: "A new hero card!",
  shinyCard: "A shiny hero card!",
  heroBinder: "Your hero cards!",
  newBadge: "You earned a badge!",
  trophies: "Your trophy room!",
  verseVault: "Your verse vault! Every gem is a verse in your heart.",
  // My Aquarium
  aquarium: "Welcome to your aquarium!",
  aqFood: "Pick a food. Then tap the water to feed your friends!",
  aqTapFriend: "Now tap the water to drop the food in!",
  aqAllFull: "Everyone is full! Come back tomorrow for more treats.",
  aqHungry: "Your friends are hungry! Tap the food to feed them.",
  aqYumFlakes: "Yum, flakes!",
  aqYumShrimp: "Shrimp! What a treat!",
  aqYumGolden: "Golden pellets! Sparkly and yummy!",
  aqFull: "I'm full! Thank you! Come back tomorrow.",
  aqOneBite: "Chomp, chomp! One bite at a time.",
  aqNoFood: "Out of that food! You can buy more with your shells.",
  aqNoFriends: "Hatch an egg first. Then you can feed your new friend!",
  aqGrew: "Look! Your friend grew bigger!",
  aqEggs: "Pick an egg! Every egg hatches a new friend.",
  aqNewEgg: "A new egg for your nest! Tap it to hatch it.",
  aqMachine: "The Mystery Egg machine! What will you get?",
  aqRollSea: "A Sea egg!",
  aqRollRare: "Wow! A Rare egg!",
  aqRollGolden: "Amazing! A Golden egg!",
  aqDecor: "Decorate your tank! Tap something to try it.",
  aqTanks: "Pick a tank for your friends!",
  aqNewTank: "A whole new tank!",
  aqPutAway: "Put away.",
  aqInTank: "It's in your tank!",
  aqBook: "Your fish book! Can you find every friend?",
  aqBuddy: "Your buddy will come along on your voyage!",
  aqNotFound: "Keep hatching eggs to find this friend!",
  aqTapAgain: "Tap again to buy it.",
  levelLock: "Keep learning to unlock this one!",
  // Brain Gym + Brain Boost
  gym: "Welcome to the Brain Gym!",
  ready: "Ready? Go!",
  timesUp: "Time's up!",
  newRecord: "New record!",
  gymLights: "Watch the lights, then copy them!",
  gymFish: "Tap the fish. Don't tap the sharks!",
  gymSwitch: "Sort them! Watch out — the rule can switch!",
  gymByColor: "Sort by color!",
  gymByShape: "Sort by shape!",
  gymCount: "How many? Look fast!",
  gymGrid: "Remember where the stars are!",
  gymFacts: "Answer as many as you can!",
  brainBoost: "Brain Boost! A little bit of everything.",
  arcade: "Welcome to the Game Arcade! Pick a game.",
  gameTen: "Tap two bubbles that add up to the goal number!",
  gameBigger: "Tap the bigger one, as fast as you can!",
  gameHop: "Tap where the number belongs on the line!",
  gameCoins: "Count the coins, then tap the total!",
  gameRocket: "Listen to the word, then tap the right rocket!",
  gameRhyme: "Tap every picture that rhymes!",
  gameOpposites: "Tap the word that means the opposite!",
  gameBits: "Turn on the lights to make the number!",
  gameBugs: "One arrow is wrong. Find the bug and squash it!",
  gameFloat: "Will it sink or float? Decide fast!",
  gameAnimals: "Put each animal in its group!",
  gamePython: "Read the code and tap what it prints. Go fast!",
  gameRobot: "Which program gets the robot to the star?",
  gameLoops: "Which loop makes this pattern?",

  // End of lesson
  lessonDone: "Level complete!",
  perfect: "Perfect! Three stars!",
  openChest: "Tap the treasure chest!",
  newSticker: "A new sticker for your album!",
  rareSticker: "Wow! A rare sticker!",
  epicSticker: "Whoa! An epic sticker!",
  legendarySticker: "Amazing! A legendary sticker!",
  shinySticker: "A shiny sticker! Super rare!",
  setComplete: "You finished a sticker set!",
  goalDone: "You reached your goal for today!",
  levelUp: "Level up!",
  streakUp: "Your streak keeps growing!",
  shellsEarned: "You earned shells!",
} as const;

/** Instant feedback, rotated so it never sounds like a machine. */
export const PRAISE = ["Yes!", "Great job!", "You got it!", "Awesome!", "Nice work!", "Super!", "Way to go!", "Perfect!", "Amazing!", "You're a star!", "Brilliant!", "Fantastic!"];
export const RETRY = ["Try again!", "Almost! Try again.", "Oops! Try another one.", "Not quite. Look again!"];
/** Bigger cheers for a combo (three right in a row and up). */
export const COMBO = ["You're on fire!", "Unstoppable!", "Three in a row!", "Combo!", "Keep it going!"];
/** World welcomes, one per theme. */
export const welcomeTo = (theme: keyof typeof THEMES) => `Welcome to ${THEMES[theme].name}!`;

export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);
/** "Put four in the net." — one line per number so it sounds natural. */
export const putInNet = (n: number) => `Put ${numberWord(n)} in the net.`;
/** "Two plus three." */
export const plusLine = (a: number, b: number) => `${numberWord(a)} plus ${numberWord(b)}.`;

export const sndKey = (id: string) => `snd:${id}`;
/** The "~" breath between parts of a say-list. */
export const GAP = "~";

export type Clip = { key: string; text?: string; ipa?: string; kind: "line" | "word" | "sound" | "sentence" };

/**
 * How much of an item is pre-recorded:
 *  all  (Pre-K, K)  — every prompt, choice and explanation (they can't read yet);
 *  core (1st, 2nd)  — prompts and choices (math is stitched from recorded number words, and
 *                     explanations use the device voice), plus manners stories and outcomes;
 *  keys (3rd–5th)   — only the voice keys an item names (they read on their own).
 */
export type VoiceLevel = "all" | "core" | "keys";
export const voiceLevelFor = (grade: GradeId): VoiceLevel => (bandOf(grade) === "little" ? "all" : bandOf(grade) === "middle" ? "core" : "keys");

function activityClips(a: Activity, level: VoiceLevel, subject: SubjectId, add: (c: Clip) => void) {
  const line = (t?: string) => t && t !== GAP && (t.startsWith("snd:") ? sound(t.slice(4)) : add({ key: t, text: verseSpeech(t), kind: t.includes(" ") ? "line" : "word" }));
  const lines = (ts?: string[]) => ts?.forEach(line);
  const word = (w: string) => w && add({ key: w, text: verseSpeech(w), kind: "word" });
  const sound = (id: string) => SOUNDS[id] && add({ key: sndKey(id), ipa: SOUNDS[id].ipa, kind: "sound" });
  // prompts + choices: all; core except math (stitched); explanations: all, and character + faith in core
  const full = level === "all" || (level === "core" && subject !== "math");
  const why = level === "all" || (level === "core" && (subject === "manners" || subject === "faith"));
  const opt = (o: Option) => (o.say ? lines(o.say) : full && o.text && !o.visual ? line(o.text) : undefined);
  switch (a.kind) {
    case "meet":
      sound(a.letter);
      a.pics.forEach((p) => word(p.word));
      break;
    case "trace":
      sound(a.letter);
      break;
    case "find-letter":
      a.options.forEach(sound);
      break;
    case "first-sound":
      sound(a.letter);
      a.options.forEach((p) => word(p.word));
      break;
    case "rhyme":
      word(a.target.word);
      a.options.forEach((p) => word(p.word));
      break;
    case "build":
    case "blend":
      word(a.word.word);
      soundOut(a.word.word).forEach((u) => u.sound && sound(u.sound));
      if (a.kind === "build") a.tiles.forEach((t) => soundOut(t).forEach((u) => u.sound && sound(u.sound)));
      if (a.kind === "blend") a.options.forEach((p) => word(p.word));
      break;
    case "read-word":
      a.options.forEach(word);
      break;
    case "pop":
      word(a.word);
      a.others.forEach(word);
      break;
    case "sentence":
      add({ key: a.text, text: a.text, kind: "sentence" });
      a.text.split(/\s+/).forEach((w) => word(w.replace(/[^A-Za-z']/g, "")));
      if (a.question) {
        line(a.question.prompt);
        a.question.options.forEach((p) => word(p.word));
      }
      break;
    case "count":
      for (let i = 1; i <= Math.max(a.n, ...a.options); i++) word(numberWord(i));
      break;
    case "make":
      line(putInNet(a.n));
      [SAY.netCheck, SAY.netTooMany, SAY.netNotEnough].forEach(line);
      for (let i = 1; i <= a.n + 3; i++) word(numberWord(i));
      break;
    case "add":
      line(plusLine(a.a, a.b));
      for (let i = 1; i <= Math.max(a.a + a.b, ...a.options); i++) word(numberWord(i));
      break;
    case "choice":
      if (a.say) lines(a.say);
      else if (full) line(a.prompt);
      a.options.forEach(opt);
      if (why) line(a.why);
      break;
    case "keypad":
      if (a.say) lines(a.say);
      else if (full) line(a.prompt);
      if (why) line(a.why);
      break;
    case "sort":
      if (a.say) lines(a.say);
      else if (full) line(a.prompt);
      a.items.forEach((it) => (it.say ? lines(it.say) : full && it.text && line(it.text)));
      if (level === "all") a.bins.forEach((b) => line(b.label));
      break;
    case "order":
      if (a.say) lines(a.say);
      else if (full) line(a.prompt);
      a.items.forEach((it) => (it.say ? lines(it.say) : full && it.text && line(it.text)));
      break;
    case "match":
      if (a.say) lines(a.say);
      else if (full) line(a.prompt);
      a.pairs.forEach((p) => (opt(p.a), opt(p.b)));
      break;
    case "scenario":
      if (a.say) lines(a.say);
      else if (full) line(a.story);
      if (a.askSay) lines(a.askSay);
      else if (full) line(a.question);
      a.options.forEach((o) => {
        opt(o);
        if (why) line(o.why);
        if (why && o.then) line(o.then.text);
      });
      break;
    case "place":
      break;
    case "code":
      if (level !== "keys") {
        line(a.level.goal);
        line(a.level.hint);
      }
      break;
    case "story":
      // Little and middle sailors hear every scene; big sailors read (and can tap to hear).
      if (level !== "keys") {
        line(a.title);
        for (const s of a.scenes) {
          line(s.text);
          if (s.act) line(s.act.prompt);
        }
      }
      break;
    case "verse": {
      // The verse itself and its reference are always recorded — they're what gets memorized.
      line(a.text);
      line(refSpoken(a.ref));
      if (full && a.meaning) line(a.meaning);
      const v = a.v;
      if (full && v.step === "blanks") v.blanks.forEach((b) => b.options.forEach(word));
      if (full && v.step === "tiles") [...v.chunks, ...(v.decoys ?? [])].forEach(line);
      if (full && v.step === "ref") v.options.forEach((r) => line(refSpoken(r)));
      if (full && v.step === "meaning") v.options.forEach(line);
      break;
    }
    case "spot":
      if (a.say) lines(a.say);
      else if (full) line(a.prompt);
      if (full) a.lines.forEach((l) => line(l.text));
      if (why) line(a.why);
      break;
    case "slots":
      if (a.say) lines(a.say);
      else if (full) line(a.prompt);
      if (full) {
        line(a.story);
        a.slots.forEach((s) => s.options.forEach(line));
      }
      if (why) a.slots.forEach((s) => line(s.why));
      break;
    case "reflect":
      if (a.say) lines(a.say);
      else if (full) line(a.prompt);
      if (full) {
        a.options.forEach((o) => {
          line(o.text);
          line(o.reply);
        });
        line(a.closing);
      }
      break;
    // Code Lab: the fixed instructions live in SAY; these are the item-specific lines.
    case "concept":
      if (level !== "keys") a.lines.forEach(line);
      break;
    case "recipe":
      if (level !== "keys") a.steps.forEach((s) => (line(s.text), line(s.fail)));
      break;
    case "factory":
    case "events":
      if (level !== "keys") line(a.kind === "factory" ? a.prompt : a.story);
      break;
    case "logic":
      if (level !== "keys") line(a.story);
      break;
    case "lab":
      if (full && (a.spec.lab === "float" || a.spec.lab === "magnet" || a.spec.lab === "circuit")) a.spec.things.forEach((t) => (line(t.name), line(t.why)));
      break;
    case "predict":
    case "loopfind":
    case "variable":
    case "binary":
    case "search":
    case "swapsort":
    case "cipher":
    case "machine":
    case "plot":
    case "coderead":
      break;
  }
}

const lessonVoice = (l: Lesson): VoiceLevel => {
  const u = unitById(l.unit);
  return u ? voiceLevelFor(u.grade) : "core";
};

/** The clips one lesson needs (preloaded when it opens, so every sound is instant). */
export function lessonClipKeys(lesson: Lesson): string[] {
  const keys = new Set<string>();
  const level = lessonVoice(lesson);
  if (lesson.intro && level !== "keys") keys.add(lesson.intro);
  for (const a of lesson.activities) activityClips(a, level, lesson.subject, (c) => keys.add(c.key));
  return [...keys];
}

/** The code words on the blocks — each is read aloud as it goes into a program. */
export const BLOCK_WORDS = ["Up", "Down", "Left", "Right", "Forward", "Turn left", "Turn right", "Repeat", "Repeat until", "If", "Catch", "Wait", "Paint", "Pen up", "Pen down", "Wave", "Spin", "Jump", "Clap", "Kick", "Bow", "Define", "Call"];

/** Words a stitched line can use: "7 + 5 = ?" → seven, plus, five, equals, what. */
export const MATH_WORDS = ["plus", "minus", "times", "divided by", "equals", "what", "is", "and", "more than", "less than", "point"];

/** Every clip Harbor Learn can say — what the generator records. */
export function allClips(): Clip[] {
  const out = new Map<string, Clip>();
  const add = (c: Clip) => {
    if (c.key && (c.text || c.ipa) && !out.has(c.key)) out.set(c.key, c);
  };
  for (const line of Object.values(SAY)) add({ key: line, text: line, kind: "line" });
  for (const line of [...PRAISE, ...RETRY, ...COMBO]) add({ key: line, text: line, kind: "line" });
  for (const t of Object.keys(THEMES) as (keyof typeof THEMES)[]) add({ key: welcomeTo(t), text: welcomeTo(t), kind: "line" });
  for (const s of Object.values(SOUNDS)) {
    add({ key: sndKey(s.id), ipa: s.ipa, kind: "sound" });
    s.pics.forEach((p) => add({ key: p.word, text: p.word, kind: "word" }));
  }
  // Every number word to 100 (and the math words), so any equation can be stitched together.
  for (let i = 0; i <= 100; i++) add({ key: numberWordFull(i), text: numberWordFull(i), kind: "word" });
  for (const w of MATH_WORDS) add({ key: w, text: w, kind: "word" });
  // My Aquarium: every friend, food, egg, decoration and tank says its name when it's tapped, and
  // every friend's ocean fact can be heard.
  for (const cr of CREATURES) {
    add({ key: cr.name, text: cr.name, kind: "word" });
    add({ key: cr.fact, text: cr.fact, kind: "line" });
  }
  for (const x of [...Object.values(FOODS), ...Object.values(EGG_LOOK), ...DECOR, ...TANKS]) add({ key: x.name, text: x.name, kind: "word" });
  // The Shipyard: every boat, color, paint, sail, flag, figurehead, gear, pet and trail says its
  // name; a boat's name is stitched from "The" + two picked words.
  for (const it of SHOP) add({ key: it.name, text: it.name, kind: "word" });
  for (const w of ["The", ...NAME_ADJ, ...NAME_NOUN, ...BLOCK_WORDS]) add({ key: w, text: w, kind: "word" });
  for (const course of Object.values(COURSES))
    for (const u of course.units) {
      const level = voiceLevelFor(u.grade);
      for (const l of u.lessons) {
        if (l.intro && level !== "keys") add({ key: l.intro, text: l.intro, kind: "line" });
        for (const a of l.activities) activityClips(a, level, course.id, add);
      }
      if (u.challenge && level !== "keys") add({ key: u.challenge, text: u.challenge, kind: "line" });
    }
  return [...out.values()];
}
