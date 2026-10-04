import type { Course } from "./types";
import { buildWorlds, makeItemsFor, pick, pickN, shuffle, type Topic, type WorldDef } from "./gen";
import { storyLesson, storyTopic } from "./stories";
import {
  scn, scenarioT, sortT, politeT, orderT, matchT, rewindT, spotT, slotsT, reflectT,
  type Scn, type SortBank, type Pol, type MatchBank,
  PRETEND, TRUTH_LITTLE, HONEST_SORT_LITTLE, FIB_CASES, HAPPY_STEPS, HAPPY_HEART, WHINE_SORT,
  TRUST, TRUST_STEPS, TRUST_POL, WOLF, SNEAKY_SORT, SNEAKY_CASES, WATCHING, TATTLE_SORT, TATTLE,
  ATTITUDE_KIDS, TONE, RESPECT_KIT, LIE_TYPES, LIE_EXAMPLES, INTEGRITY_CASES, DILEMMA, BEST_REASON,
  HARDEST_TRUTH, RESPECT_BIG, RESPECT_SORT_BIG, DISAGREE_KIT, STOP_STEPS, SELF_CONTROL, FUTURE_YOU,
  OWN_SORT, APOLOGY_KIT, FAKE_APOLOGY, THINK_STEPS, WORDS, WORDS_SORT, TOOTHPASTE,
} from "./behavior";

// Captain's Code — manners, kindness, honesty, respect, handling big feelings, safety and common
// sense, and (for big kids) how to drop the attitude. Children learn character the way they
// learn anything: real situations, a choice, and WHY — every answer, right or wrong, explains
// itself. Honesty, sneakiness, respect and attitude get their own islands at every age, with
// rewind scenes, Truth Detective cases, a repair kit for real apologies and reason-picking
// dilemmas (see behavior.ts). Little sailors get everything read aloud; big sailors read and
// think it through. For every family — no religious content (that's the Lighthouse course).
// Skill keys: "h:<topic>".

const FEELINGS: [string, string, string][] = [
  ["😀", "happy", "Something good happened!"], ["😢", "sad", "Feeling down — maybe something was lost or someone left."], ["😠", "angry", "Something felt unfair or frustrating."],
  ["😨", "scared", "Something felt dangerous or unknown."], ["😮", "surprised", "Something unexpected happened!"], ["😳", "embarrassed", "Feeling shy after something awkward."],
  ["😴", "tired", "The body needs rest."], ["🤩", "excited", "Something fun is coming!"], ["😟", "worried", "Thinking about something that might go wrong."], ["😌", "calm", "Peaceful and relaxed."],
];
const feelingsT = (voiced: boolean): Topic => ({
  key: "feelings",
  gen: (r) => {
    const [emoji, name] = pick(r, FEELINGS);
    const wrong = pickN(r, FEELINGS, 2, (f) => f[1] === name).map((f) => f[1]);
    return { kind: "choice", prompt: "How does this face feel?", say: voiced ? ["How does this face feel?"] : undefined, visual: { type: "emoji", emoji, size: "xl" }, options: shuffle(r, [name, ...wrong]).map((t) => ({ id: t, text: t, say: voiced ? [t] : undefined })), answer: name, layout: "row", skill: "h:feelings", why: `That face looks ${name}.` };
  },
});
// ── Little sailors (Pre-K–K) ──────────────────────────────────────────────────────────────────
const MAGIC_WORDS: Scn[] = [
  scn("Mom hands Ava a cup of juice.", "👩🧃👧", "What should Ava say?", "Thank you!", ["Give me more.", "Nothing."], "Saying thank you shows we're grateful.", ["That's not kind — say thank you first.", "Saying nothing can feel rude. A thank you makes people happy."]),
  scn("Leo wants the red crayon. His friend has it.", "🖍️👦🧒", "What should Leo say?", "May I please use the red crayon?", ["Give it to me!", "Grab it."], "Asking with please is polite and kind.", ["Bossy words can hurt feelings.", "Grabbing isn't okay — we ask first."]),
  scn("Max bumps into a girl in the hallway.", "🧒💥👧", "What should Max say?", "Excuse me, I'm sorry!", ["Watch out!", "Keep walking."], "We say sorry when we bump someone, even by accident.", ["That blames her — it was an accident.", "She might be hurt. Stop and say sorry."]),
  scn("Grandpa says, \"Good morning!\"", "👴☀️👦", "What should you say?", "Good morning, Grandpa!", ["Ignore him.", "Go away."], "Greeting people back is friendly and polite.", ["Ignoring people can hurt their feelings.", "That's unkind — say good morning back."]),
  scn("Mia's friend gives her a birthday present.", "🎁👧👧", "What should Mia say?", "Thank you so much!", ["I wanted a different one.", "Open it and say nothing."], "A thank you shows you care about the gift and the giver.", ["That could hurt your friend's feelings.", "Always thank someone for a gift."]),
  scn("Sam needs to get past people standing in the doorway.", "🚪👦👫", "What should Sam say?", "Excuse me, please.", ["Move!", "Push through."], "\"Excuse me\" is the polite way to get by.", ["That sounds bossy.", "Pushing isn't safe or kind."]),
  scn("Zoe spilled her friend's paint by accident.", "🎨😟👧", "What should Zoe do?", "Say sorry and help clean it up.", ["Hide.", "Say it wasn't me."], "Saying sorry and helping fixes the problem.", ["Hiding doesn't fix it.", "That's not true — we tell the truth."]),
];
const SHARING: Scn[] = [
  scn("Eli has lots of blocks. His sister has none.", "🧱👦👧", "What is a kind thing to do?", "Share some blocks with her.", ["Keep them all.", "Knock down her tower."], "Sharing helps everyone have fun.", ["Keeping everything can make others sad.", "That's unkind — it would make her sad."]),
  scn("Two kids both want the swing.", "🎠👦🧒", "What is a fair thing to do?", "Take turns on the swing.", ["Push the other kid off.", "Cry until you get it."], "Taking turns is fair — everyone gets a chance.", ["Pushing can hurt someone.", "Crying won't solve it. Use words and take turns."]),
  scn("Lily is playing a game. Ben asks to play too.", "🎲👧👦", "What should Lily say?", "Sure, you can play with me!", ["No, go away.", "Pretend not to hear."], "Including others makes them feel welcome.", ["That could make Ben feel left out.", "Ignoring someone hurts feelings."]),
  scn("Nora has the last cookie. Her friend looks hungry.", "🍪👧👧", "What could Nora do?", "Break it and share half.", ["Eat it fast.", "Hide it."], "Sharing even a little shows kindness.", ["Your friend might feel sad.", "Hiding it isn't kind."]),
  scn("It's Max's turn to pick the game, but he picked last time too.", "🎮👦👦", "What is fair?", "Let my friend pick this time.", ["I always pick!", "Quit playing."], "Taking turns choosing is fair.", ["Always choosing yourself isn't fair.", "Quitting doesn't help. Take turns."]),
];
const KIND_SORT: SortBank = { prompt: "Kind or unkind?", bins: ["Kind", "Unkind", "💖", "💔"], items: [["Sharing toys", 1, "🧸"], ["Saying thank you", 1, "🙏"], ["Helping a friend up", 1, "🤝"], ["Giving a hug", 1, "🤗"], ["Taking turns", 1, "🔁"], ["Saying please", 1, "😊"], ["Hitting", 0, "👊"], ["Grabbing toys", 0, "✋"], ["Calling names", 0, "😠"], ["Pushing in line", 0, "😤"], ["Leaving someone out", 0, "🚫"], ["Breaking things", 0, "💥"]] };
const LISTEN_HANDS: Scn[] = [
  scn("The teacher is reading a story.", "📖👩‍🏫🧒", "What should you do?", "Sit still and listen.", ["Talk to a friend.", "Run around."], "Listening ears help everyone hear the story.", ["Talking makes it hard for others to hear.", "Running isn't safe in the classroom."]),
  scn("Mom says, \"Time to clean up!\"", "🧹👩🧒", "What should you do?", "Start cleaning up right away.", ["Keep playing.", "Say no."], "Listening the first time shows respect.", ["Pretending not to hear isn't respectful.", "We can share feelings, but still listen."]),
  scn("Leo is mad that his tower fell.", "🧱😠👦", "What can Leo do with his hands?", "Take a deep breath and build again.", ["Throw the blocks.", "Hit his brother."], "Gentle hands and a deep breath help us calm down.", ["Throwing things can hurt someone.", "Hitting is never okay."]),
  scn("A friend is talking to you.", "👧💬👦", "What do good listeners do?", "Look at them and listen.", ["Walk away.", "Talk over them."], "Good listeners look and listen.", ["Walking away can hurt feelings.", "Wait your turn to talk."]),
  scn("The puppy is sleeping.", "🐶😴🧒", "How should you touch the puppy?", "Gently, or let it sleep.", ["Pull its tail.", "Squeeze it hard."], "Gentle hands keep animals safe and happy.", ["That hurts the puppy.", "Squeezing hurts — be gentle."]),
];
const CALM_STEPS: [string, string][] = [["Stop", "🛑"], ["Take a deep breath", "🌬️"], ["Name my feeling", "💭"], ["Choose what to do", "✅"]];
const TABLE: Pol[] = [
  { q: "How should you eat at the table?", e: "🍽️🧒", a: "Chew with my mouth closed.", w: ["Talk with food in my mouth.", "Throw my food."], why: "Closed-mouth chewing is polite at the table." },
  { q: "You want the bread. It's far away.", e: "🍞🍽️", a: "Can you please pass the bread?", w: ["Reach across everyone.", "Yell for it."], why: "Asking to pass things is polite." },
  { q: "You're done eating. What do you say?", e: "🍽️✅", a: "May I please be excused?", w: ["Just leave.", "I'm done, bye!"], why: "Asking to be excused is good table manners." },
  { q: "Grandma made dinner. You don't love it.", e: "👵🥘", a: "Try a bite and say thank you.", w: ["Say \"Yuck!\"", "Push the plate away."], why: "Trying a bite and thanking the cook is kind." },
  { q: "Where does your napkin go?", e: "🧻🍽️", a: "On my lap.", w: ["On my head.", "On the floor."], why: "A napkin goes on your lap to catch crumbs." },
];
const HELP_HOME: SortBank = { prompt: "Helping or not helping?", bins: ["Helping", "Not helping", "🙌", "🙅"], items: [["Picking up toys", 1, "🧸"], ["Feeding the pet", 1, "🐟"], ["Setting the table", 1, "🍽️"], ["Putting clothes in the hamper", 1, "🧺"], ["Watering plants", 1, "🌱"], ["Leaving toys on the stairs", 0, "🪜"], ["Making a mess and walking away", 0, "💥"], ["Hiding when it's clean-up time", 0, "🙈"], ["Leaving the door open", 0, "🚪"]] };

// ── Middle sailors (1st–2nd) ──────────────────────────────────────────────────────────────────
const FRIEND: Scn[] = [
  scn("A new kid is sitting alone at lunch.", "🍱🧒", "What would a good friend do?", "Invite them to sit with you.", ["Point and laugh.", "Ignore them."], "Inviting someone in can make their whole day better.", ["Laughing at someone is hurtful.", "They might feel lonely. A small invite helps a lot."]),
  scn("Your friend made a mistake reading out loud. Some kids giggle.", "📖😳🧒", "What should you do?", "Encourage your friend: \"Good try!\"", ["Giggle too.", "Say \"You're bad at reading.\""], "Everyone makes mistakes. Encouraging helps them try again.", ["Laughing makes them feel worse.", "That's unkind and not true — everyone is learning."]),
  scn("Your friend is crying because their dog is sick.", "🐕😢🧒", "What could you say?", "\"I'm sorry. Do you want to talk?\"", ["\"It's just a dog.\"", "\"Stop crying.\""], "Showing you care helps friends feel less alone.", ["That dismisses their feelings.", "It's okay to cry. Be kind instead."]),
  scn("You and your friend both want to be the leader of the game.", "🏴‍☠️👦👧", "What's a good solution?", "Take turns being the leader.", ["Say you'll quit if you can't lead.", "Boss them around."], "Taking turns keeps it fair and fun.", ["Threatening to quit isn't fair.", "Bossing people makes the game no fun."]),
  scn("A classmate drops all their papers in the hallway.", "📄📄🧒", "What should you do?", "Help pick them up.", ["Step on them.", "Walk past."], "Helping out is what good friends and classmates do.", ["That's mean and makes it worse.", "A quick hand means a lot."]),
];
const HONEST: Scn[] = [
  scn("You broke a dish while no one was looking.", "🍽️💔🧒", "What's the honest thing to do?", "Tell a grown-up what happened.", ["Hide the pieces.", "Blame your little brother."], "Telling the truth builds trust — even when it's hard.", ["Hiding it can make things worse later.", "Blaming someone else is unfair and dishonest."]),
  scn("You found a $5 bill on the classroom floor.", "💵🏫", "What should you do?", "Give it to the teacher.", ["Keep it.", "Spend it on candy."], "It belongs to someone. Honest people return what isn't theirs.", ["Someone might be looking for it.", "It's not yours to spend."]),
  scn("Mom asks if you finished your homework. You didn't.", "📚👩🧒", "What should you say?", "\"Not yet, but I'll do it now.\"", ["\"Yes!\" (but you didn't)", "Change the subject."], "Being honest — and making a plan — is the right move.", ["Lying breaks trust.", "Avoiding the question isn't honest."]),
  scn("You won a game, but you peeked at the cards.", "🃏👀🧒", "What should you do?", "Admit it and play again fairly.", ["Celebrate anyway.", "Peek again next time."], "A win only feels good when it's fair.", ["That's not a real win.", "Cheating makes games no fun."]),
];
const RESPECT_SORT: SortBank = { prompt: "Respectful or disrespectful?", bins: ["Respectful", "Disrespectful", "👍", "👎"], items: [["Listening when a grown-up talks", 1, "👂"], ["Using a calm voice", 1, "🗣️"], ["Saying \"Okay, I'll do it\"", 1, "✅"], ["Knocking before you go in", 1, "🚪"], ["Waiting your turn to talk", 1, "✋"], ["Rolling your eyes", 0, "🙄"], ["Yelling \"No!\" at a parent", 0, "😤"], ["Interrupting", 0, "🗯️"], ["Slamming the door", 0, "💢"], ["Ignoring when someone talks to you", 0, "🙉"]] };
const BIG_FEELINGS: Scn[] = [
  scn("You lost a board game and you feel really mad.", "🎲😠🧒", "What's a good way to handle it?", "Take deep breaths and say \"Good game.\"", ["Throw the board.", "Yell that it's not fair."], "Calming down and being a good sport shows real strength.", ["Throwing things can hurt someone and breaks the game.", "Losing is part of playing. Calm down first."]),
  scn("Your tower keeps falling down and you want to give up.", "🧱😣🧒", "What could you tell yourself?", "\"I can try a different way.\"", ["\"I'm terrible at this.\"", "Knock it all over."], "Trying a new way is how we learn.", ["That's not true — you're still learning.", "Breaking it won't help you feel better."]),
  scn("Your friend can't come over today. You feel sad.", "😢📅🧒", "What can you do?", "Tell someone how you feel, then find something else fun.", ["Stay mad all day.", "Be mean to your family."], "Naming feelings and making a new plan helps.", ["Feelings pass faster when we talk about them.", "It's not your family's fault."]),
  scn("Your brother took your seat and you feel angry.", "🛋️😠👦", "What should you do?", "Use words: \"That was my seat. Can I have it back?\"", ["Push him off.", "Scream."], "Calm words solve problems better than pushing.", ["Pushing can hurt.", "Screaming makes it harder to solve."]),
];
const SAFETY: Scn[] = [
  scn("A stranger in a car says, \"Come here, I have candy!\"", "🚗🍬🧒", "What should you do?", "Say no, get away, and tell a trusted grown-up.", ["Go see the candy.", "Get in the car."], "Never go with a stranger. Get away and tell an adult right away.", ["That's not safe, even for candy.", "Never get in a car with a stranger."]),
  scn("You're at the store and can't find your parent.", "🏬😟🧒", "What's the safest thing to do?", "Stay where you are or ask a worker for help.", ["Leave the store to look outside.", "Hide in the toy aisle."], "Store workers can help find your grown-up.", ["Going outside makes it harder to find you.", "Hiding makes it harder for them to find you."]),
  scn("You need to cross the street.", "🚦🧒", "What should you do?", "Stop, look both ways, and cross with a grown-up.", ["Run across fast.", "Cross while looking at a phone."], "Stopping and looking keeps you safe from cars.", ["Running into the street is dangerous.", "Always look up and pay attention."]),
  scn("You smell smoke and hear the smoke alarm.", "🔥🚨🏠", "What should you do?", "Get out fast and stay out.", ["Hide under the bed.", "Go back for a toy."], "In a fire, get out and stay out — firefighters will help.", ["Hiding makes it hard for firefighters to find you.", "Toys can be replaced. You can't."]),
  scn("You find a lighter on the floor.", "🔥🧒", "What should you do?", "Don't touch it — tell a grown-up.", ["Try to light it.", "Put it in your pocket."], "Lighters and matches are for grown-ups only.", ["Fire is dangerous.", "Tell a grown-up instead."]),
];
const CROSS_STEPS: [string, string][] = [["Stop at the curb", "🛑"], ["Look left", "👈"], ["Look right", "👉"], ["Look left again", "👀"], ["Walk across", "🚶"]];
const RESPONSIBLE: Scn[] = [
  scn("You promised to feed the fish every morning. You forgot today.", "🐟😬🧒", "What should you do?", "Feed it now and set a reminder.", ["Hope someone else does it.", "Say the fish isn't hungry."], "Owning your job — and fixing a slip — is responsibility.", ["The fish depends on you.", "Fish need food every day."]),
  scn("Your toys are all over the living room.", "🧸🧸🛋️", "What's the responsible thing?", "Put them away without being asked.", ["Wait until someone yells.", "Shove them under the couch."], "Cleaning up your own mess is a big-kid move.", ["You don't need to wait to be asked.", "Hiding a mess isn't cleaning it."]),
  scn("You knocked over your friend's drink by accident.", "🥤💦🧒", "What should you do?", "Say sorry and help clean it up.", ["Say \"Not my fault.\"", "Walk away."], "Accidents happen. Owning it and helping is responsible.", ["Blaming doesn't fix it.", "Help fix what happened."]),
  scn("You left your bike out in the rain, and now the chain is rusty.", "🚲🌧️🧒", "What's the responsible thing to do?", "Tell your parent and help clean and oil it.", ["Blame the weather.", "Hide it in the garage."], "Owning it — and helping fix it — is what responsible people do.", ["The rain didn't leave the bike out — you did.", "Hiding it won't fix the chain."]),
  scn("Your class job this week is watering the plants. It's Friday, and you forgot all week.", "🪴🏫🧒", "What should you do?", "Tell your teacher and water them right away.", ["Hope nobody notices.", "Say someone else had the job."], "Admitting it and fixing it fast is the responsible move.", ["The plants need water now — and honesty helps.", "That isn't true, and it's unfair to others."]),
  scn("You borrowed a library book and lost it.", "📚❓🧒", "What's the responsible choice?", "Tell the librarian and offer to help pay for it.", ["Never go back to the library.", "Say you already returned it."], "Being responsible means facing the problem and making it right.", ["Avoiding it doesn't fix it.", "That's a lie — and the library will know."]),
];
const APOLOGY_STEPS: [string, string][] = [["Say \"I'm sorry\"", "🙏"], ["Say what you did", "🗣️"], ["Make it right", "🛠️"], ["Do better next time", "⭐"]];
const MAGIC_MATCH: MatchBank = [["Someone gives you a gift", "Thank you"], ["You want a turn", "May I please?"], ["You bump someone", "Excuse me"], ["You hurt someone", "I'm sorry"], ["You see a friend", "Hello!"], ["Someone sneezes", "Bless you!"]];

// ── Big sailors (3rd–5th) ─────────────────────────────────────────────────────────────────────
const ATTITUDE: Pol[] = [
  { q: "Dad asks you to unload the dishwasher. Which response shows a good attitude?", e: "🍽️👨", a: "\"Okay. Can I finish this page first?\"", w: ["\"Ugh. Why do I always have to do everything?\"", "\"Fine. Whatever.\" (rolls eyes)"], why: "You can ask a fair question in a calm voice and still cooperate." },
  { q: "Your mom says no more video games today. What's the respectful reply?", e: "🎮👩", a: "\"Okay. Can I play tomorrow?\"", w: ["\"That's so unfair! You never let me do anything!\"", "Slam the door."], why: "Accepting no calmly — and asking about later — gets better results than arguing." },
  { q: "Your teacher corrects your math. What's a good-attitude response?", e: "📐👩‍🏫", a: "\"Oh, I see. Thanks for showing me.\"", w: ["\"I don't care.\"", "\"That's dumb.\""], why: "Being open to feedback is how you get better." },
  { q: "Your little sister knocks over your project by accident. What do you say?", e: "🎨👧", a: "\"I'm frustrated, but I know it was an accident. Can you help me fix it?\"", w: ["\"You ruin EVERYTHING!\"", "\"Get out of my room!\""], why: "Name your feeling without attacking — and work on a fix together." },
  { q: "You're told it's time for bed. Which is the best response?", e: "🛏️👨", a: "\"Can I finish this chapter, then go to bed?\"", w: ["Groan loudly and stomp off.", "\"You're the worst!\""], why: "Asking politely for a small compromise works better than a tantrum." },
  { q: "Your coach puts you on the bench for a while. What shows a good attitude?", e: "⚽🧢", a: "Cheer for your team and stay ready.", w: ["Sulk and refuse to talk.", "Complain loudly to everyone."], why: "Supporting your team shows maturity — and coaches notice." },
];
const FIX_ATTITUDE: Pol[] = [
  { q: "Turn this into a respectful sentence: \"Whatever. I'll do it later.\"", e: "🙄➡️😊", a: "\"Okay. Can I do it after dinner?\"", w: ["\"I'll do it when I feel like it.\"", "\"Why do I have to?\""], why: "Same idea — but polite, specific, and cooperative." },
  { q: "Turn this into a respectful sentence: \"You never listen to me!\"", e: "😤➡️🗣️", a: "\"I feel like you didn't hear me. Can I explain again?\"", w: ["\"You're so annoying.\"", "\"Forget it!\""], why: "Using \"I feel\" explains your side without blaming." },
  { q: "Turn this into a respectful sentence: \"That's a stupid rule.\"", e: "📜➡️🤔", a: "\"Can you help me understand why we have that rule?\"", w: ["\"I'm not following it.\"", "\"Rules are dumb.\""], why: "Asking why opens a conversation instead of starting a fight." },
  { q: "Turn this into a respectful sentence: \"Ugh, fine!\" (stomps away)", e: "💢➡️🙂", a: "\"Okay, I'll do it.\"", w: ["\"I guess.\" (sighs loudly)", "\"Leave me alone!\""], why: "A calm \"okay\" without the sigh shows respect." },
];
const DISAGREE: Scn[] = [
  scn("Your group wants to do the project on volcanoes. You wanted sharks.", "🌋🦈👥", "What's a respectful way to disagree?", "\"I think sharks could be cool too. Can we vote?\"", ["\"Volcanoes are boring. I'm not helping.\"", "Say nothing and do a bad job."], "Sharing your idea politely — and accepting the group's choice — is teamwork.", ["Refusing to help hurts the whole team.", "Doing a bad job on purpose isn't fair to others."]),
  scn("You hurt your friend's feelings by teasing them. They look upset.", "😔👦👧", "What's a real apology?", "\"I'm sorry I teased you. It wasn't kind, and I won't do it again.\"", ["\"Sorry if you got upset.\"", "\"It was just a joke!\""], "A real apology names what you did and how you'll do better.", ["\"Sorry IF\" doesn't take responsibility.", "If it hurt them, it wasn't a good joke."]),
  scn("A friend says something you think is wrong about a book you both read.", "📘🗣️👥", "What's the best response?", "\"I saw it differently — here's why.\"", ["\"You're wrong, obviously.\"", "\"That's a dumb idea.\""], "You can disagree with an idea while respecting the person.", ["That shuts down the conversation.", "Calling ideas dumb hurts feelings."]),
  scn("Your coach puts you in a position you didn't want.", "⚽🧢🧑", "What's a respectful way to disagree?", "\"Could I try defense sometime? I'd love a chance.\"", ["\"That's a dumb choice.\"", "Stop trying at practice."], "Asking politely shows respect — and might earn you a chance.", ["Insulting the coach shuts down the conversation.", "Giving up hurts your team and you."]),
  scn("Your friend wants to play a game you think is boring.", "🎲😐🧑", "What's a kind way to share your opinion?", "\"How about we play yours first, then mine?\"", ["\"Your games are always boring.\"", "Walk away without saying anything."], "Compromise keeps the fun going for both of you.", ["That hurts your friend's feelings.", "Leaving without a word confuses your friend."]),
  scn("Your little brother insists a whale is a fish. You know it's a mammal.", "🐳🤔🧒", "What's a respectful way to correct him?", "\"Cool fact: whales are mammals — they breathe air like us!\"", ["\"You're so dumb.\"", "Laugh at him in front of his friends."], "You can share the truth kindly, without making someone feel small.", ["Name-calling makes people stop listening.", "Embarrassing him isn't kind."]),
];
const DIGITAL: Scn[] = [
  scn("Someone you don't know online asks for your address.", "💻❓", "What should you do?", "Don't answer, and tell a trusted grown-up.", ["Send it — they seem nice.", "Send your school name instead."], "Never share personal information online. Tell an adult.", ["People online aren't always who they say they are.", "Your school name is personal info too."]),
  scn("A classmate posts a mean comment about another kid.", "📱😢", "What should you do?", "Don't join in — tell a trusted adult or report it.", ["Like the comment.", "Add a mean comment too."], "Being an upstander online means not spreading hurtful posts.", ["Liking it spreads the hurt.", "Piling on makes cyberbullying worse."]),
  scn("A pop-up says you won a free tablet — just enter your parent's password.", "🎁💻", "What should you do?", "Close it and tell a grown-up.", ["Enter the password to get the prize.", "Click it to see what happens."], "Prizes that ask for passwords are scams.", ["Never share passwords.", "Clicking can be risky. Close it."]),
  scn("You've been playing a game for two hours and your parent says time's up.", "🎮⏰", "What's the right move?", "Save the game and log off.", ["Keep playing until you get caught.", "Argue for another hour."], "Respecting screen limits builds trust.", ["Sneaking breaks trust.", "Arguing rarely works — save and stop."]),
  scn("A friend sends you an embarrassing photo of a classmate.", "📸😳", "What should you do?", "Don't share it, and delete it.", ["Send it to the group chat.", "Post it so everyone sees."], "Sharing embarrassing photos can really hurt someone.", ["Spreading it hurts your classmate.", "Once it's online, it's hard to take back."]),
];
const PEER: Scn[] = [
  scn("Older kids dare you to throw a rock at a car.", "🪨🚗👥", "What should you do?", "Say no and walk away.", ["Do it so they think you're cool.", "Throw it, but not very hard."], "Saying no to something dangerous takes real courage.", ["It could hurt someone — that's not cool.", "Any rock thrown at a car is dangerous."]),
  scn("Your friends are making fun of a kid's clothes. They look at you to join.", "👕👥", "What could you do?", "Say \"Not cool\" or change the subject.", ["Laugh along.", "Make a joke about it too."], "Standing up for others, even a little, matters.", ["Laughing along still hurts.", "Joining in makes it worse."]),
  scn("A friend wants to copy your homework.", "📝👀", "What's the best response?", "\"I can help you understand it instead.\"", ["Let them copy.", "Copy theirs too."], "Helping a friend learn is better than helping them cheat.", ["Copying doesn't help them learn.", "Cheating gets everyone in trouble."]),
  scn("Your friends plan to sneak into a movie without paying and want you to come.", "🎬🤫👥", "What should you do?", "Say no — and suggest something else to do.", ["Go, but stay quiet.", "Go because everyone else is."], "Sneaking in is stealing. Real friends can find another fun plan.", ["Being quiet doesn't make it okay.", "Everyone doing it doesn't make it right."]),
  scn("Some kids say you can sit with them only if you stop hanging out with your old friend.", "🍱👥🧑", "What's the best response?", "Stay with your old friend — real friends don't make you choose.", ["Ditch your old friend to fit in.", "Pretend to agree, then sneak around."], "Loyalty is worth more than fitting in with a group that leaves people out.", ["Your old friend would be hurt.", "Sneaking around isn't honest."]),
  scn("Someone dares you to say something rude to the teacher.", "🗯️👩‍🏫🧑", "What do you do?", "Say no — it's not worth it.", ["Do it to look brave.", "Whisper it so she might not hear."], "Real courage is saying no to something disrespectful.", ["Disrespect isn't bravery.", "It's still disrespectful, even whispered."]),
];
const EMPATHY: Scn[] = [
  scn("Your classmate didn't make the team. They're quiet at lunch.", "⚽😔", "What would show empathy?", "\"That's really disappointing. Want to shoot hoops together?\"", ["\"I made the team!\"", "\"You weren't that good anyway.\""], "Empathy means imagining how they feel — and showing you care.", ["Bragging rubs it in.", "That's hurtful."]),
  scn("Your grandma has trouble hearing at dinner.", "👵👂", "What's a kind thing to do?", "Face her and speak clearly.", ["Get annoyed and stop talking to her.", "Mumble anyway."], "Small changes help everyone feel included.", ["That leaves her out.", "Mumbling makes it harder for her."]),
  scn("A kid in a wheelchair can't reach the art supplies.", "♿🎨", "What could you do?", "Ask, \"Can I help you get anything?\"", ["Stare.", "Grab everything for yourself."], "Asking first respects them and helps.", ["Staring can feel uncomfortable.", "Think about others, too."]),
  scn("A classmate's grandma just passed away. They come back to school quiet.", "🕯️😔🧑", "What would show empathy?", "\"I'm really sorry about your grandma. I'm here if you want to talk.\"", ["Act like nothing happened.", "Ask lots of questions about how it happened."], "A simple, caring word helps someone feel less alone.", ["Ignoring it can feel lonely to them.", "Too many questions can hurt."]),
  scn("A kid in your class stutters, and some kids imitate him.", "🗣️😢🧑", "What could you do?", "Don't join in, be patient when he talks, and tell an adult if it keeps happening.", ["Laugh along.", "Finish his sentences for him."], "Patience and kindness help him feel respected.", ["Laughing joins in the hurt.", "Let him finish — it shows respect."]),
  scn("Your friend's family is moving away, and they're nervous.", "📦😟🧑", "What's an empathetic response?", "\"That sounds hard. Want to make a plan to stay in touch?\"", ["\"At least you'll get a new room.\"", "\"I don't care.\""], "Empathy means understanding their feelings first.", ["That brushes off their worry.", "That's unkind."]),
];
const GROWTH: Pol[] = [
  { q: "Which sentence shows a growth mindset?", e: "🧠🌱", a: "\"I can't do it YET.\"", w: ["\"I'm just bad at math.\"", "\"I give up.\""], why: "\"Yet\" means you're still learning — your brain grows with practice." },
  { q: "You got a low score on a test. What's the growth-mindset thought?", e: "📝🌱", a: "\"I'll figure out what I missed and practice.\"", w: ["\"I'm not smart.\"", "\"Tests are pointless.\""], why: "Mistakes show you what to practice next." },
  { q: "Your friend is better at drawing. What's a growth-mindset reaction?", e: "🎨🌱", a: "\"Can you show me how you did that?\"", w: ["\"I'll never be that good.\"", "\"Drawing is dumb.\""], why: "Learning from others helps you grow." },
  { q: "You've practiced piano all week and still mess up the song. What's the growth-mindset thought?", e: "🎹🌱", a: "\"I'm getting better every time I practice.\"", w: ["\"I'll never get it.\"", "\"Piano is stupid.\""], why: "Progress takes practice — mistakes are part of learning." },
  { q: "Your teacher gives you ideas to improve your story. How do you respond?", e: "📝💬", a: "\"Thanks! I'll try that.\"", w: ["\"My story was already good.\"", "Crumple it up."], why: "Feedback helps you grow." },
  { q: "Which sentence shows a growth mindset about a hard math problem?", e: "➗🌱", a: "\"Let me try a different strategy.\"", w: ["\"I'm not a math person.\"", "\"This is too hard, I quit.\""], why: "Trying new strategies is how brains grow." },
];
const MONEY_GRATITUDE: Scn[] = [
  scn("You have $10 saved. You want a $25 toy.", "🐷💵", "What's a smart plan?", "Keep saving a little each week until you have enough.", ["Beg every day until someone buys it.", "Spend the $10 on candy."], "Saving up teaches patience — and feels great when you reach your goal.", ["Begging isn't a plan.", "Then you'd be further from your goal."]),
  scn("Your aunt gives you a sweater you don't love.", "🧶🎁", "What do you say?", "\"Thank you for thinking of me!\"", ["\"I don't like this.\"", "\"Can I have money instead?\""], "Gratitude is about the kindness behind the gift.", ["That could hurt her feelings.", "That's not grateful."]),
  scn("Your family can't afford the shoes everyone at school has.", "👟💭", "What's a healthy way to think about it?", "\"I'm thankful for what I have.\"", ["\"My family is the worst.\"", "Hide your shoes from everyone."], "Gratitude helps you notice the good things you already have.", ["Your family works hard for you.", "You don't need to hide — your worth isn't your shoes."]),
  scn("You get $20 for your birthday.", "💵🎂🧑", "What's a wise plan?", "Save some, give some, and spend some.", ["Spend it all today.", "Carry it loose in your pocket."], "Saving, giving and spending a little is a smart money habit.", ["It's gone fast — and nothing is saved.", "Keep money somewhere safe."]),
  scn("Your friend has a newer game console than you.", "🎮😕🧑", "What's a healthy way to think?", "\"I'm thankful for what I have — and it's fun to play together.\"", ["\"I hate my old console.\"", "Beg your parents every day."], "Comparing steals joy. Gratitude brings it back.", ["Complaining makes you feel worse.", "Begging isn't fair to your parents."]),
];
const EMERGENCY: Scn[] = [
  scn("Grandpa falls and won't wake up. No other adults are home.", "👴🚨", "What should you do?", "Call 911 and tell them your address.", ["Wait until someone comes home.", "Text your friend."], "911 is for emergencies — they'll send help fast.", ["Waiting could be dangerous.", "Call 911 first."]),
  scn("Your friend cuts their finger and it's bleeding a little.", "🩸🤕", "What's a good first step?", "Get a grown-up and press a clean cloth on it.", ["Ignore it.", "Put dirt on it."], "Pressure and a grown-up's help stop bleeding.", ["Even small cuts should be cleaned.", "Dirt can cause infection."]),
  scn("Thunder is booming while you're swimming outside.", "⛈️🏊", "What should you do?", "Get out of the water and go inside.", ["Keep swimming.", "Stand under a tall tree."], "Water and lightning are dangerous together. Get inside.", ["Lightning can strike water.", "Tall trees attract lightning."]),
  scn("You smell gas in the kitchen.", "👃🏠", "What should you do?", "Get out of the house and tell a grown-up right away.", ["Turn on the stove to check.", "Ignore it."], "A gas smell means danger — get out and get help.", ["That could start a fire!", "Gas smells always need a grown-up."]),
  scn("Your friend falls off the monkey bars and can't move their arm.", "🎠🤕🧑", "What should you do first?", "Stay with them and get an adult right away.", ["Pull their arm to fix it.", "Tell them to walk it off."], "Don't move an injury — get a grown-up fast.", ["Moving it could make it worse.", "An injury needs help, not walking off."]),
];
const COMMON_SENSE_SORT: SortBank = { prompt: "Smart choice or risky choice?", bins: ["Smart", "Risky", "🧠", "⚠️"], items: [["Wearing a helmet on a bike", 1, "🚲"], ["Telling a parent where you're going", 1, "🗺️"], ["Washing hands before eating", 1, "🧼"], ["Wearing sunscreen at the beach", 1, "🧴"], ["Charging the tablet before a trip", 1, "🔋"], ["Swimming without a grown-up", 0, "🏊"], ["Sharing your password", 0, "🔑"], ["Touching a hot stove", 0, "🔥"], ["Riding in a car without a seatbelt", 0, "🚗"], ["Petting a dog you don't know without asking", 0, "🐕"]] };

const WORLDS: WorldDef[] = [
  // Little sailors
  { id: "magic-words", title: "Magic Word Cove", emoji: "✨", grade: "prek", blurb: "Please, thank you, excuse me and sorry.", stages: [
    { title: "Magic words", emoji: "🙏", topics: [scenarioT("magic-words", MAGIC_WORDS, true)], levels: 3 },
    { title: "Match the magic word", emoji: "🧩", topics: [matchT("magic-words", "Match what to say", MAGIC_MATCH, true), scenarioT("magic-words", MAGIC_WORDS, true)], levels: 2 },
  ] },
  { id: "sharing", title: "Sharing Sands", emoji: "🧸", grade: "prek", blurb: "Sharing, taking turns and including others.", stages: [
    { title: "Take turns", emoji: "🔁", topics: [scenarioT("sharing", SHARING, true)], levels: 2 },
    { title: "Kind or unkind?", emoji: "💖", topics: [sortT("kindness", KIND_SORT, true)], levels: 2 },
  ] },
  { id: "truth-tree", title: "Truth Treehouse", emoji: "🌳", grade: "prek", items: 5, blurb: "True, pretend, or a fib? Telling the truth even when it's hard.",
    talk: ["What's the difference between pretending and a fib?", "When was telling the truth hard for you? What happened after?"],
    challenge: "Tell the truth all day today — even about the little things!",
    stages: [
      { title: "True or pretend?", emoji: "🎭", topics: [politeT("pretend", PRETEND, true)], levels: 2 },
      { title: "Tell the truth", emoji: "🗣️", topics: [rewindT("truth", TRUTH_LITTLE, true, { trust: true })], levels: 2 },
      { title: "Honest or not?", emoji: "😊", topics: [sortT("honest", HONEST_SORT_LITTLE, true)], levels: 1 },
      { title: "Spot the fib", emoji: "🔍", topics: [spotT("fib", "Tap the part that's a fib", FIB_CASES, true), rewindT("truth", TRUTH_LITTLE, true, { trust: true })], levels: 2 },
    ] },
  { id: "listening", title: "Listening Lighthouse", emoji: "👂", grade: "k", blurb: "Listening ears and gentle hands.", stages: [
    { title: "Listening ears", emoji: "👂", topics: [scenarioT("listening", LISTEN_HANDS, true)], levels: 2 },
    { title: "Calm-down steps", emoji: "🌬️", topics: [orderT("calm", "Put the calm-down steps in order", CALM_STEPS, true), scenarioT("listening", LISTEN_HANDS, true)], levels: 2 },
  ] },
  { id: "feelings", title: "Feelings Fjord", emoji: "😊", grade: "k", blurb: "Name feelings and know what to do with them.", stages: [
    { title: "Name that feeling", emoji: "😊", topics: [feelingsT(true)], levels: 2 },
    { title: "Big feelings", emoji: "🌊", topics: [scenarioT("big-feelings", BIG_FEELINGS, true), feelingsT(true)], levels: 2 },
  ] },
  { id: "table", title: "Table Manners Isle", emoji: "🍽️", grade: "k", blurb: "Polite eating, asking and helping at home.", stages: [
    { title: "At the table", emoji: "🍽️", topics: [politeT("table", TABLE, true)], levels: 2 },
    { title: "Home helpers", emoji: "🙌", topics: [sortT("helping", HELP_HOME, true)], levels: 2 },
  ] },
  { id: "happy-heart", title: "Happy Heart Harbor", emoji: "😊", grade: "k", items: 5, blurb: "Listen right away, all the way, with a happy heart.",
    talk: ["What does “right away, all the way, with a happy heart” mean?", "What's a big-kid way to ask for something?"],
    challenge: "Next time a grown-up asks you to do something, say “Okay!” and do it right away.",
    stages: [
      { title: "Happy-heart steps", emoji: "👂", topics: [orderT("happy-heart", "Put the happy-heart steps in order", HAPPY_STEPS, true), rewindT("obey", HAPPY_HEART, true)], levels: 2 },
      { title: "Right away!", emoji: "🏃", topics: [rewindT("obey", HAPPY_HEART, true)], levels: 2 },
      { title: "Big-kid voice", emoji: "😊", topics: [sortT("whining", WHINE_SORT, true)], levels: 1 },
    ] },
  // Middle sailors
  { id: "friends", title: "Good Friend Island", emoji: "🤝", grade: "1", blurb: "Including others, encouraging, and caring.", stages: [
    { title: "Being a good friend", emoji: "🤝", topics: [scenarioT("friendship", FRIEND, true)], levels: 3 },
    { title: "Kind choices", emoji: "💖", topics: [sortT("kindness", KIND_SORT, true), scenarioT("friendship", FRIEND, true)], levels: 1 },
  ] },
  { id: "honesty", title: "Honesty Harbor", emoji: "🧭", grade: "1", blurb: "Telling the truth, even when it's hard.", stages: [
    { title: "Tell the truth", emoji: "🧭", topics: [scenarioT("honesty", HONEST, true)], levels: 3 },
  ] },
  { id: "respect", title: "Respect Reef", emoji: "👍", grade: "1", blurb: "Respectful words, voices and actions.", stages: [
    { title: "Respectful or not?", emoji: "👍", topics: [sortT("respect", RESPECT_SORT, true)], levels: 2 },
    { title: "Saying sorry", emoji: "🙏", topics: [orderT("apology", "Put the steps of a real apology in order", APOLOGY_STEPS, true), scenarioT("responsibility", RESPONSIBLE, true)], levels: 2 },
  ] },
  { id: "safety", title: "Safety Shoals", emoji: "⛑️", grade: "1", blurb: "Strangers, streets, fire and getting lost.", stages: [
    { title: "Stay safe", emoji: "⛑️", topics: [scenarioT("safety", SAFETY, true)], levels: 3 },
    { title: "Crossing the street", emoji: "🚦", topics: [orderT("crossing", "Put the street-crossing steps in order", CROSS_STEPS, true), scenarioT("safety", SAFETY, true)], levels: 1 },
  ] },
  { id: "trust-bridge", title: "Trust Bridge", emoji: "🌉", grade: "1", blurb: "How lies break trust — and how honesty builds it back.",
    talk: ["Why didn't anyone believe the boy who cried wolf?", "What's one thing you can do this week to build trust?"],
    challenge: "Do exactly what you say you'll do today — every single time.",
    stages: [
      { title: "The Boy Who Cried Wolf", emoji: "🐺", topics: [storyTopic(WOLF, "middle", true)], levels: 1, fixed: (r) => storyLesson(r, WOLF, "middle", true) },
      { title: "Build the bridge", emoji: "🌉", topics: [rewindT("trust", TRUST, true, { trust: true })], levels: 2 },
      { title: "Trust builders", emoji: "🔨", topics: [politeT("trust-builders", TRUST_POL, true), orderT("rebuild-trust", "How do you rebuild trust? Put the steps in order", TRUST_STEPS, true)], levels: 2 },
    ] },
  { id: "tattle-tell", title: "Tattle-or-Tell Bay", emoji: "📢", grade: "1", blurb: "When to tell a grown-up — and when to solve it yourself.",
    talk: ["What's the difference between tattling and telling?", "What small problem could you solve with kind words?"],
    challenge: "Try solving one small problem with kind words before asking for help.",
    stages: [
      { title: "Tell or solve?", emoji: "🚨", topics: [sortT("tattle-tell", TATTLE_SORT, true)], levels: 2 },
      { title: "Tattling vs. telling", emoji: "📢", topics: [politeT("tattle-tell", TATTLE, true)], levels: 2 },
    ] },
  { id: "responsible", title: "Responsibility Rock", emoji: "🪨", grade: "2", blurb: "Doing your part and owning mistakes.", stages: [
    { title: "Own it", emoji: "🪨", topics: [scenarioT("responsibility", RESPONSIBLE, true)], levels: 2 },
    { title: "Big feelings, calm choices", emoji: "🌬️", topics: [scenarioT("big-feelings", BIG_FEELINGS, true), orderT("calm", "Put the calm-down steps in order", CALM_STEPS, true)], levels: 2 },
  ] },
  { id: "sneaky", title: "Sneaky Shoals", emoji: "🕵️", grade: "2", blurb: "No sneaking: be the same whether anyone is watching or not.",
    talk: ["What's the “watching test”?", "Why do people sneak? What could they do instead?"],
    challenge: "Before you do something, ask: “Would I do this if a grown-up were watching?”",
    stages: [
      { title: "Sneaky or honest?", emoji: "🕵️", topics: [sortT("sneaky", SNEAKY_SORT, true)], levels: 1 },
      { title: "The watching test", emoji: "👀", topics: [politeT("watching", WATCHING, true)], levels: 2 },
      { title: "Truth Detective", emoji: "🔍", topics: [spotT("sneaky", "Tap the sneaky part", SNEAKY_CASES, true)], levels: 2 },
    ] },
  { id: "attitude-kids", title: "Attitude Bay", emoji: "🔧", grade: "2", blurb: "Tone of voice, accepting no, and dropping the attitude.",
    talk: ["What does your tone of voice tell people?", "What's a good way to answer when you hear “no”?"],
    challenge: "When you hear “no” today, try: “Okay. Can we do it another time?”",
    stages: [
      { title: "Tone matters", emoji: "🗣️", topics: [politeT("tone", TONE, true)], levels: 2 },
      { title: "Rewind the attitude", emoji: "⏪", topics: [rewindT("attitude-kids", ATTITUDE_KIDS, true)], levels: 2 },
      { title: "Respect builder", emoji: "🧱", topics: [slotsT("respect-builder", "Build a respectful answer", RESPECT_KIT, true), politeT("tone", TONE, true)], levels: 1 },
    ] },
  // Big sailors
  { id: "attitude", title: "Attitude Atoll", emoji: "😎", grade: "3", blurb: "Tone of voice, accepting no, and dropping the attitude.", stages: [
    { title: "Good attitude", emoji: "😎", topics: [politeT("attitude", ATTITUDE, false)], levels: 3 },
    { title: "Fix the attitude", emoji: "🔧", topics: [politeT("fix-attitude", FIX_ATTITUDE, false)], levels: 2 },
  ] },
  { id: "disagree", title: "Respectful Rapids", emoji: "🗣️", grade: "3", blurb: "Disagreeing kindly and apologizing for real.", stages: [
    { title: "Disagree kindly", emoji: "🗣️", topics: [scenarioT("disagree", DISAGREE, false)], levels: 2 },
    { title: "Respect check", emoji: "👍", topics: [sortT("respect", RESPECT_SORT, false), politeT("attitude", ATTITUDE, false)], levels: 1 },
  ] },
  { id: "integrity", title: "Integrity Isle", emoji: "🧭", grade: "3", blurb: "Half-truths, excuses and sneaky lies — and the strength to be honest.",
    talk: ["What's a half-truth? Why is it still a lie?", "What's the best reason to be honest when no one would ever find out?"],
    challenge: "Catch yourself if you start to exaggerate or make an excuse — and say it the honest way.",
    stages: [
      { title: "Kinds of lies", emoji: "🎭", topics: [matchT("lie-types", "Match each kind of lie to what it means", LIE_TYPES, false), matchT("lie-examples", "Match each example to its kind of lie", LIE_EXAMPLES, false)], levels: 2 },
      { title: "Truth Detective", emoji: "🔍", topics: [spotT("integrity", "Find the dishonest part", INTEGRITY_CASES, false)], levels: 2 },
      { title: "Tough choices", emoji: "⚖️", topics: [politeT("dilemma", DILEMMA, false), politeT("best-reason", BEST_REASON, false)], levels: 2 },
      { title: "Think about it", emoji: "💭", topics: [reflectT("honesty-me", HARDEST_TRUTH, false), politeT("dilemma", DILEMMA, false), spotT("integrity", "Find the dishonest part", INTEGRITY_CASES, false)], levels: 1 },
    ] },
  { id: "digital", title: "Digital Deep", emoji: "💻", grade: "4", blurb: "Online safety, kindness and screen time.", stages: [
    { title: "Safe online", emoji: "🔐", topics: [scenarioT("digital", DIGITAL, false)], levels: 3 },
  ] },
  { id: "choices", title: "Choice Channel", emoji: "🧭", grade: "4", blurb: "Peer pressure, empathy and growth mindset.", stages: [
    { title: "Peer pressure", emoji: "👥", topics: [scenarioT("peer-pressure", PEER, false)], levels: 2 },
    { title: "Empathy", emoji: "💗", topics: [scenarioT("empathy", EMPATHY, false)], levels: 2 },
    { title: "Growth mindset", emoji: "🌱", topics: [politeT("growth", GROWTH, false)], levels: 1 },
  ] },
  { id: "honor", title: "Honor Harbor", emoji: "🎖️", grade: "4", blurb: "Respecting parents, teachers, coaches and elders — and when to say no.",
    talk: ["How can you disagree with a grown-up respectfully?", "When is it right NOT to do what an older person says?"],
    challenge: "Thank a teacher, coach or grandparent this week — and mean it.",
    stages: [
      { title: "Respect rewind", emoji: "⏪", topics: [rewindT("respect-authority", RESPECT_BIG, false)], levels: 2 },
      { title: "Respect check", emoji: "🙌", topics: [sortT("respect-big", RESPECT_SORT_BIG, false)], levels: 1 },
      { title: "Disagree with respect", emoji: "🗣️", topics: [slotsT("disagree-kit", "Build a respectful disagreement", DISAGREE_KIT, false), rewindT("respect-authority", RESPECT_BIG, false)], levels: 2 },
    ] },
  { id: "self-control", title: "Self-Control Straits", emoji: "🛑", grade: "4", blurb: "Stop, breathe, think, choose — even when feelings are huge.",
    talk: ["What helps you calm down when you're really mad?", "What would Future You thank you for?"],
    challenge: "Next time a big feeling hits, try Stop · Breathe · Think · Choose.",
    stages: [
      { title: "Stop · Breathe · Think · Choose", emoji: "🛑", topics: [orderT("stop-think", "Put the self-control steps in order", STOP_STEPS, false), rewindT("self-control", SELF_CONTROL, false)], levels: 2 },
      { title: "Rewind it", emoji: "⏪", topics: [rewindT("self-control", SELF_CONTROL, false)], levels: 2 },
      { title: "Future You", emoji: "🔮", topics: [politeT("future-you", FUTURE_YOU, false), rewindT("self-control", SELF_CONTROL, false)], levels: 1 },
    ] },
  { id: "life-skills", title: "Captain's Quarters", emoji: "⚓", grade: "5", blurb: "Money sense, gratitude, emergencies and common sense.", stages: [
    { title: "Money and gratitude", emoji: "🐷", topics: [scenarioT("money", MONEY_GRATITUDE, false)], levels: 2 },
    { title: "Emergencies", emoji: "🚨", topics: [scenarioT("emergency", EMERGENCY, false)], levels: 2 },
    { title: "Common sense", emoji: "🧠", topics: [sortT("common-sense", COMMON_SENSE_SORT, false)], levels: 1 },
  ] },
  { id: "owning-it", title: "Owning-It Outpost", emoji: "🙋", grade: "5", blurb: "No excuses, no blame — real apologies that make it right.",
    talk: ["What are the four parts of a real apology?", "Why isn't “sorry, but…” a real apology?"],
    challenge: "If you mess up this week, try a four-part apology: say it, own it, make it right, next time.",
    stages: [
      { title: "Own it or excuse it?", emoji: "🙋", topics: [sortT("own-it", OWN_SORT, false)], levels: 1 },
      { title: "Repair kit", emoji: "🧰", topics: [slotsT("apology-kit", "Build a real apology", APOLOGY_KIT, false), sortT("own-it", OWN_SORT, false)], levels: 2 },
      { title: "Real or fake?", emoji: "🔍", topics: [spotT("fake-apology", "Tap the fake apologies", FAKE_APOLOGY, false), sortT("own-it", OWN_SORT, false)], levels: 1 },
    ] },
  { id: "words-matter", title: "Words Matter Wharf", emoji: "💬", grade: "5", blurb: "Gossip, group chats and the power of words.",
    talk: ["What does THINK stand for?", "How could you use words to build someone up this week?"],
    challenge: "Say one specific, kind thing to each person in your family today.",
    stages: [
      { title: "The Toothpaste Test", emoji: "🪥", topics: [storyTopic(TOOTHPASTE, "big", false)], levels: 1, fixed: (r) => storyLesson(r, TOOTHPASTE, "big", false) },
      { title: "THINK first", emoji: "💭", topics: [orderT("think", "Put THINK in order", THINK_STEPS, false), sortT("words", WORDS_SORT, false)], levels: 2 },
      { title: "Words rewind", emoji: "⏪", topics: [rewindT("words", WORDS, false)], levels: 2 },
    ] },
];

export const MANNERS: Course = {
  id: "manners",
  title: "Captain's Code",
  emoji: "⚓",
  tagline: "Honesty, respect & good choices",
  units: buildWorlds("manners", "char", WORLDS, 0),
  itemsFor: makeItemsFor(WORLDS),
};
