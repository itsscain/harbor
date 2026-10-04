import type { Activity, Band, Course } from "./types";
import { buildWorlds, int, makeItemsFor, type Stage, type Topic, type WorldDef } from "./gen";
import { VERSE_BY_ID, verseItem, verseLadder, versesTopic } from "./bible";
import { STORY_BY_ID, storyLesson, storyTopic } from "./stories";
import {
  politeT, sortT, sortManyT, orderT, orderWindowT, matchT, rewindT, spotT, slotsT, reflectT, rw, kase,
  type Pol, type Rw, type SortBank, type Reflect, type Kit, type Case, type MatchBank,
  TRUTH_LITTLE, HAPPY_STEPS,
} from "./behavior";

// Lighthouse — Jesus & the Bible, for families who want it (it's opt-in per child). Built on the
// shape of the classic children's Bible clubs (Awana and friends): three age tracks that grow with
// the child, the gospel first and often, Bible stories children can retell, and memory verses said
// again and again until they're "hid in the heart" (Psalm 119:11).
//
//   Little Lights (Pre-K–K)      — God made me, God loves me, Jesus helps; stories acted out,
//                                  short verses heard and said, obeying with a happy heart.
//   Bright Beams (1st–2nd)       — the good news, the Bible as a library, heroes, miracles,
//                                  parables, the fruit of the Spirit, prayer, truth and trust.
//   Lighthouse Keepers (3rd–5th) — the Bible's big story, who Jesus is, grace, integrity, taming
//                                  the tongue, the armor of God, the Sermon on the Mount, Acts,
//                                  Proverbs, and serving like Jesus.
//
// How it teaches: every story is an experience (tap, gather, march — then retell it); every verse
// climbs a vanishing-cue ladder and comes back on a spaced schedule; every truth gets lived out in
// a real-life choice with a consequence you can rewind; and reflection questions with no wrong
// answers (including where a child is with Jesus) send them to talk with their grown-ups.
// Scripture is the KJV, word for word. Skill keys: "f:<topic>".

const V = (band: Band) => band !== "big";

/** A story level (the story, then retelling it). Earns the hero's card. */
function storyStage(id: string): Stage {
  const s = STORY_BY_ID.get(id);
  if (!s) throw new Error(`Unknown story ${id}`);
  return { title: s.title, emoji: s.emoji, topics: [storyTopic(s, s.band, V(s.band))], levels: 1, fixed: (r) => storyLesson(r, s, s.band, V(s.band)), cards: [s.hero] };
}

/** One level per verse: the memory ladder, plus the verse before it (say your old verses!). */
function versesStage(ids: string[], band: Band): Stage {
  for (const id of ids) if (!VERSE_BY_ID.has(id)) throw new Error(`Unknown verse ${id}`);
  return {
    title: "Memory verse",
    emoji: "📜",
    topics: [versesTopic(ids.join("+"), ids, band)],
    levels: ids.length,
    fixed: (r, li) => {
      const x = VERSE_BY_ID.get(ids[li])!;
      const out: Activity[] = verseLadder(x, band, `ladder:${x.id}:${band}`);
      if (li > 0) out.push(verseItem(r, VERSE_BY_ID.get(ids[li - 1])!, band, 0.3 + r() * 0.5));
      return out;
    },
    titles: ids.map((id) => VERSE_BY_ID.get(id)!.ref),
    emojis: ids.map((id) => VERSE_BY_ID.get(id)!.pic),
  };
}

const stage = (title: string, emoji: string, topics: Topic[], levels = 1): Stage => ({ title, emoji, topics, levels });

// ═══ Little Lights ═════════════════════════════════════════════════════════════════════════
const GOD_MADE: SortBank = { prompt: "Who made it — God or people?", bins: ["God made", "People made", "🌍", "🛠️"], items: [["The sun", 1, "☀️"], ["Trees", 1, "🌳"], ["Puppies", 1, "🐶"], ["The ocean", 1, "🌊"], ["You!", 1, "🧒"], ["Flowers", 1, "🌷"], ["Stars", 1, "⭐"], ["Mountains", 1, "⛰️"], ["Cars", 0, "🚗"], ["Houses", 0, "🏠"], ["Phones", 0, "📱"], ["Teddy bears", 0, "🧸"], ["Bikes", 0, "🚲"], ["Crayons", 0, "🖍️"], ["Airplanes", 0, "✈️"], ["Shoes", 0, "👟"]] };
const CREATION_POL: Pol[] = [
  { q: "Who made you?", e: "🧒✨", a: "God made me", w: ["I made myself", "A robot made me"], why: "God made you — and He made you wonderfully!" },
  { q: "Is anything too hard for God to make?", e: "🌌", a: "No — God can make anything", w: ["Yes, stars are too hard", "Yes, oceans are too hard"], why: "God made everything from nothing!" },
  { q: "How can we say thank you for God's world?", e: "🌍🙏", a: "Take care of it and thank Him", w: ["Throw trash on the ground", "Never go outside"], why: "Taking care of God's world shows we're thankful." },
  { q: "God made people so they could…", e: "👫❤️", a: "Know Him and love Him", w: ["Be bored", "Stay all alone"], why: "God made us to know and love Him — and each other." },
];
const MADE_ME: Reflect[] = [
  { q: "God made you special! What do you love doing with the body God gave you?", e: "🧒🌟", options: [["Running and jumping", "🏃", "God made your legs strong! Thank Him for them."], ["Singing", "🎤", "God gave you a voice — use it to praise Him!"], ["Drawing and building", "🎨", "God is the greatest Maker — and He made you creative too!"], ["Hugging my family", "🤗", "God made you to love people. That's beautiful!"]] },
];
const GOD_LOVES: Pol[] = [
  { q: "Does God love you when you make a mistake?", e: "💖🙂", a: "Yes — God always loves me", w: ["No, only when I'm good", "Only on Sundays"], why: "God's love doesn't stop when we mess up. He loves you all the time!" },
  { q: "How much does God love you?", e: "🌍💖", a: "More than anything!", w: ["A tiny bit", "Only a little"], why: "God loves you more than you can imagine." },
  { q: "Who does God love?", e: "🧑‍🤝‍🧑💖", a: "Everyone — including me!", w: ["Only grown-ups", "Only good kids"], why: "God loves everyone in the whole world — and that means you!" },
  { q: "God loves us like a good shepherd loves his…", e: "🧑‍🌾🐑", a: "Sheep", w: ["Rocks", "Clouds"], why: "A shepherd takes care of every sheep. God takes care of you!" },
  { q: "What can you do with your worries?", e: "😟🎈", a: "Give them to God in prayer", w: ["Hide them forever", "Yell at someone"], why: "God cares for you — you can tell Him anything." },
];
const LOVE_REFLECT: Reflect[] = [
  { q: "Who are some people God gave you to love you? Tap them all!", e: "💖👨‍👩‍👧", multi: true, closing: "Thank You, God, for the people who love me. In Jesus' name, amen.", options: [["Mom", "👩", ""], ["Dad", "👨", ""], ["Grandma and Grandpa", "👵", ""], ["Brothers and sisters", "🧒", ""], ["Friends", "🧑‍🤝‍🧑", ""], ["My teacher", "👩‍🏫", ""]] },
];
const PROMISE: Rw[] = [
  rw("You promised your little brother you'd play blocks with him after lunch. Now a cartoon is on.", "🧱📺👦", "What do you do?", ["Turn it off and play blocks like you promised.", "Your brother squeals with joy. Keeping promises is like God — He always keeps His!", "😄"], [["Watch the cartoon and forget.", "Your brother waits and waits, then cries. Broken promises hurt.", "😢"], ["Say, “I never promised.”", "That's not true — and now your brother can't trust your promises.", "💔"]], "God always keeps His promises — and we can keep ours too!"),
  rw("You told Mom you'd pick up your toys before bath.", "🧸🛁👧", "What do you do?", ["Pick them up before bath.", "Mom says, “You kept your word!” You feel proud.", "⭐"], [["Hide them under the bed.", "Mom finds them later. Hiding isn't keeping a promise.", "🙈"], ["Say you'll do it tomorrow.", "Toys get stepped on, and Mom feels sad.", "😕"]], "Keeping your word shows love — just like God keeps His word."),
  rw("You promised to share your snack with a friend at the park.", "🍎🧒🧒", "What do you do?", ["Share it like you said.", "Your friend smiles, and you both enjoy it!", "😊"], [["Eat it all yourself.", "Your friend feels tricked and sad.", "😞"], ["Share just one tiny crumb.", "That's not really keeping your promise.", "🤏"]], "When we keep promises, people can trust us."),
  rw("You told your friend you'd save her a seat on the bus. Another kid wants it.", "🚌💺👧", "What do you do?", ["Say, “Sorry, I saved it for my friend.”", "Your friend sits down beside you, smiling. She knows she can count on you!", "😊"], [["Let the other kid sit there.", "Your friend has nowhere to sit. She feels forgotten.", "😢"], ["Pretend you never said it.", "Your friend remembers. Now she isn't sure your words mean anything.", "💔"]], "God never forgets His promises — and we can remember ours!"),
  rw("You promised Grandpa you'd call him after your soccer game.", "📞👴⚽", "What do you do?", ["Call him and tell him all about it.", "Grandpa laughs at your story. He was waiting by the phone!", "😄"], [["Forget and play video games.", "Grandpa waits and waits. He feels sad.", "😔"], ["Say, “I'll call next week.”", "Grandpa wanted to hear about today's game.", "📅"]], "Keeping our word shows people we love them."),
];
const arkCount: Topic = {
  key: "ark-count",
  gen: (r) => {
    const pairs = int(r, 1, 4);
    const emoji = ["🦒", "🐘", "🦁", "🐧", "🐢", "🐰"][int(r, 0, 5)];
    const n = pairs * 2;
    const options = [...new Set([n, n + 1, Math.max(1, n - 1), n + 2])].slice(0, 3).sort((a, b) => a - b);
    return { kind: "count", emoji, n, options, skill: "f:ark-count" };
  },
};
const BIBLE_LITTLE: Pol[] = [
  { q: "What is the Bible?", e: "📖✨", a: "God's Word — His true story for us", w: ["A comic book", "A phone book"], why: "The Bible is God's Word. Everything in it is true!" },
  { q: "How is the Bible like a flashlight?", e: "📖🔦", a: "It shows us the right way to go", w: ["It needs batteries", "It's shiny"], why: "Psalm 119:105 says God's Word is a lamp unto my feet!" },
  { q: "Who can learn from the Bible?", e: "🧒📖", a: "Everyone — even kids!", w: ["Only grown-ups", "Only teachers"], why: "God gave the Bible to everyone, even little kids." },
  { q: "Who gave us the words in the Bible?", e: "✍️📖", a: "God — He gave His words to people to write down", w: ["A robot", "A cartoon character"], why: "God used people to write down His words. That's why we call it God's Word!" },
  { q: "What's the Bible's BIG story about?", e: "📖💖", a: "God loving and rescuing people through Jesus", w: ["Dinosaurs", "Superheroes"], why: "From the first page to the last, the Bible points to Jesus!" },
  { q: "What should we do with God's Word?", e: "📖🤲", a: "Listen to it and do what it says", w: ["Use it as a doorstop", "Never open it"], why: "Jesus said wise people hear His words and do them." },
  { q: "Is everything in the Bible true?", e: "📖✅", a: "Yes — God's Word is true", w: ["Only the short parts", "No, it's pretend"], why: "Jesus said, “Thy word is truth.”" },
];
const PRAYER_LITTLE: Pol[] = [
  { q: "When can you talk to God?", e: "🙏⏰", a: "Any time, anywhere!", w: ["Only at church", "Only at bedtime"], why: "God is always listening. You can pray any time!" },
  { q: "Does God hear kids' prayers?", e: "👂🧒", a: "Yes, every single one!", w: ["No, He's too busy", "Only loud ones"], why: "God loves to hear from you!" },
  { q: "What can you tell God?", e: "🙏💭", a: "Anything — happy, sad, or scared", w: ["Only happy things", "Nothing"], why: "You can tell God everything. He cares about all of it." },
  { q: "Do you need fancy words to pray?", e: "🙏💬", a: "No — just talk to God from your heart", w: ["Yes, very big words", "Yes, you have to sing"], why: "God loves simple prayers from your heart." },
  { q: "How do we often end our prayers?", e: "🙏✨", a: "“In Jesus' name, amen.”", w: ["“Goodbye, see you!”", "“The end, that's all.”"], why: "We pray in Jesus' name because He made the way for us to come to God." },
  { q: "Your friend is sick. What can you do?", e: "🤒🙏", a: "Pray for my friend", w: ["Nothing", "Laugh"], why: "We can pray for other people too — God cares about them!" },
  { q: "Can God hear you if you pray with your eyes open?", e: "👀🙏", a: "Yes! God hears every prayer", w: ["No, never", "Only if you're standing up"], why: "Closing your eyes can help you think about God, but He hears you either way!" },
];
const THANKS: Reflect[] = [
  { q: "What do you want to thank God for today? Tap them all!", e: "🙏✨", multi: true, closing: "Thank You, God, for all Your good gifts. In Jesus' name, amen.", options: [["My family", "👨‍👩‍👧", ""], ["My friends", "🧑‍🤝‍🧑", ""], ["Yummy food", "🍎", ""], ["My home", "🏠", ""], ["Jesus", "✝️", ""], ["Sunshine", "☀️", ""], ["My pet", "🐶", ""], ["My toys", "🧸", ""]] },
];
const BRAVE: Rw[] = [
  rw("It's dark at bedtime, and Zoe feels scared.", "🌙🛏️👧", "What can Zoe do?", ["Pray: “God, help me not be afraid.”", "Zoe remembers God is with her. She feels peaceful and falls asleep.", "😴"], [["Scream until morning.", "Everyone is tired and grumpy the next day.", "😫"], ["Hide under the covers all night.", "Hiding doesn't make the scared feeling go away.", "🙈"]], "“What time I am afraid, I will trust in thee.” God is always with you."),
  rw("Leo is nervous about his first day at a new school.", "🏫😟👦", "What can Leo do?", ["Ask Mom to pray with him, then go bravely.", "Leo makes a new friend by lunch!", "😊"], [["Refuse to go.", "Leo misses a fun day and still has to go tomorrow.", "😞"], ["Pretend to be sick.", "That's not true — and the worry is still there tomorrow.", "🤒"]], "God goes with us everywhere — even to new places."),
  rw("A big dog barks at Mia on her walk.", "🐕😨👧", "What should Mia do?", ["Stay close to Dad and pray.", "Dad holds her hand, and they walk past safely.", "🤝"], [["Run into the street.", "That's dangerous! Running away can lead to worse trouble.", "🚗"], ["Cry and refuse to move.", "Dad has to carry her. Next time she can trust God and stay close.", "😭"]], "When we're scared, we can trust God and stay close to the grown-ups He gave us."),
  rw("Ben has to sing in front of the church.", "🎤😬👦", "What can Ben do?", ["Take a deep breath and sing for God.", "Ben sings his best, and Grandma claps the loudest!", "👏"], [["Run off the stage.", "Ben misses the chance and feels sad afterward.", "😔"], ["Mumble so no one hears.", "Nobody can hear the song Ben practiced.", "🤐"]], "God gives us courage. We can be brave because He's with us!"),
];
const CHRISTMAS: Pol[] = [
  { q: "Why do we celebrate Christmas?", e: "🎄⭐", a: "It's Jesus' birthday!", w: ["Just for presents", "Because it's cold"], why: "At Christmas we celebrate Jesus being born." },
  { q: "What did the angels tell the shepherds?", e: "👼🧑‍🌾", a: "Good news — a Savior is born!", w: ["Go to sleep", "It's going to rain"], why: "The angels brought the best news ever!" },
  { q: "Why did God send Jesus?", e: "👶💖", a: "Because He loves us so much", w: ["By accident", "To live in a castle"], why: "God sent Jesus because He loves the whole world — and you!" },
  { q: "Where was baby Jesus laid to sleep?", e: "🐄🌾", a: "In a manger", w: ["In a castle bed", "On a boat"], why: "There was no room in the inn, so Mary laid Jesus in a manger." },
  { q: "The name “Jesus” tells what He came to do. What?", e: "👶✝️", a: "Save His people from their sins", w: ["Live in a palace", "Become famous"], why: "“Thou shalt call his name JESUS: for he shall save his people from their sins.”" },
  { q: "What led the wise men to Jesus?", e: "⭐🐪", a: "A star", w: ["A flashlight", "A rainbow"], why: "The wise men followed the star to find Jesus!" },
  { q: "Jesus is called “Emmanuel.” What does that mean?", e: "👶💖", a: "God with us", w: ["Happy birthday", "Good night"], why: "Jesus is God who came to be with us!" },
];
const GIFT_JESUS: Reflect[] = [
  { q: "The wise men brought gifts to Jesus. What gift can YOU give Jesus?", e: "🎁⭐", options: [["My love", "❤️", "Jesus loves that gift most of all!"], ["Kind words to others", "💬", "When you're kind to others, it's like being kind to Jesus!"], ["Obeying my parents", "👍", "Obeying with a happy heart pleases Jesus!"], ["Singing to Him", "🎶", "Jesus loves to hear you sing!"]] },
];
const JESUS_POWER: Pol[] = [
  { q: "What did the wind and waves do when Jesus spoke?", e: "🌊🤫", a: "They obeyed and got calm", w: ["They got bigger", "They ignored Him"], why: "Jesus is so powerful, even storms obey Him!" },
  { q: "Is anything too hard for Jesus?", e: "⭐💪", a: "No! With God all things are possible", w: ["Yes, storms", "Yes, feeding lots of people"], why: "Jesus can do anything!" },
  { q: "What can you share, like the boy shared his lunch?", e: "🧺🤲", a: "My toys, my snack, or my time", w: ["Nothing ever", "Only things I don't like"], why: "Jesus can do big things with what we share!" },
  { q: "When you feel scared like the disciples in the storm, who can you call on?", e: "⛵🙏", a: "Jesus", w: ["No one", "A cartoon"], why: "Jesus is with you in every storm." },
];
const EASTER: Pol[] = [
  { q: "What is the BEST news ever?", e: "🌅🎉", a: "Jesus is alive!", w: ["It's snack time", "It's raining"], why: "Jesus died for our sins and rose again — He's alive!" },
  { q: "Jesus died on the cross because…", e: "✝️💖", a: "He loves us and took the punishment for our sins", w: ["He was weak", "He did something wrong"], why: "Jesus chose to die for us because He loves us so much." },
  { q: "What was inside the tomb on Sunday morning?", e: "🪨🕳️", a: "Nothing — it was empty!", w: ["Jesus, sleeping", "Treasure"], why: "The tomb was empty because Jesus rose from the dead!" },
  { q: "Who can you tell the good news to?", e: "📣😊", a: "My family and friends!", w: ["Nobody", "Only grown-ups"], why: "Good news is for sharing!" },
];
const OBEY_FAITH: Rw[] = [
  rw("Mom says, “Please come set the table.” Sam is drawing.", "🍽️🎨👦", "What should Sam do?", ["Say “Okay, Mom!” and come right away.", "Mom smiles. Obeying with a happy heart makes God and Mom glad!", "😊"], [["Say “In a minute…” and keep drawing.", "Mom has to ask again and again. Dinner is late.", "⏳"], ["Grumble, “Why me?”", "The table gets set, but Sam's grumpy heart makes everyone sad.", "😠"]], "“Children, obey your parents in the Lord: for this is right.”"),
  rw("Dad says it's time to leave the park.", "🎠👨👧", "What should Ella do?", ["Say “Okay!” and walk to the car.", "Dad says, “Thank you for listening the first time!” and plans another park day.", "🎉"], [["Run away and hide.", "Dad has to search, and everyone feels upset.", "😟"], ["Throw a fit on the ground.", "The fun day ends with tears.", "😭"]], "Obeying right away shows love — to your parents and to God."),
  rw("Grandma asks you to help carry groceries.", "🛍️👵🧒", "What should you do?", ["Help right away with a smile.", "Grandma hugs you: “What a helper!”", "🤗"], [["Pretend you didn't hear.", "Grandma carries the heavy bags alone.", "😔"], ["Help, but stomp and sigh.", "The bags get carried, but your grumpy heart isn't happy.", "😤"]], "God loves a happy helper!"),
  rw("Lily broke Mom's flower pot. Mom asks what happened.", "🪴💔👧", "What should Lily say?", ["Tell the truth and say sorry.", "Mom forgives her. Lily remembers: God loves it when we tell the truth!", "😊"], [["Say the wind did it.", "Mom knows the window was closed. Now there's a broken pot AND a fib.", "🤨"], ["Hide the pieces.", "Mom finds them. Hiding made it worse.", "🙈"]], "“Lie not one to another.” God wants us to always tell the truth."),
];

// ═══ Bright Beams ══════════════════════════════════════════════════════════════════════════
const WORDLESS: MatchBank = [["🟨 Gold", "Heaven — God's perfect home"], ["⬛ Dark", "Sin — the wrong things we do"], ["🟥 Red", "Jesus died for our sins"], ["⬜ White", "A clean heart — forgiven"], ["🟩 Green", "Growing closer to God"]];
const WORDLESS_STEPS: [string, string][] = [["Gold: heaven, God's perfect home", "🟨"], ["Dark: our sin", "⬛"], ["Red: Jesus died for our sins", "🟥"], ["White: a clean, forgiven heart", "⬜"], ["Green: growing in God", "🟩"]];
const SIN_SORT: SortBank = { prompt: "Is it a sin (choosing wrong) — or not a sin?", bins: ["Sin", "Not a sin", "💔", "🙂"], items: [["Lying", 1, "🤥"], ["Disobeying parents", 1, "🙉"], ["Stealing", 1, "🍬"], ["Being mean on purpose", 1, "😠"], ["Cheating", 1, "👀"], ["Hitting", 1, "👊"], ["Getting sick", 0, "🤒"], ["Missing a math problem", 0, "✏️"], ["Feeling sad", 0, "😢"], ["Being hungry", 0, "🍽️"], ["Spilling milk by accident", 0, "🥛"], ["Feeling scared", 0, "😨"]] };
const GOSPEL: Pol[] = [
  { q: "What is sin?", e: "💔❓", a: "Choosing to do what God says not to do", w: ["Making a mistake on a test", "Being sick"], why: "Sin is choosing wrong — and everyone has sinned (Romans 3:23)." },
  { q: "What does sin do?", e: "💔⛰️", a: "It separates us from God", w: ["Nothing at all", "It makes us stronger"], why: "Sin is like a wall between us and God — but Jesus made a way!" },
  { q: "What is God's free gift?", e: "🎁✨", a: "Eternal life through Jesus", w: ["A new bike", "A trophy"], why: "Romans 6:23 — the gift of God is eternal life through Jesus Christ our Lord." },
  { q: "Can we earn God's gift by being good?", e: "🎁❌", a: "No — it's a free gift", w: ["Yes, if we do enough chores", "Yes, if we never cry"], why: "A gift is free — we receive it by trusting Jesus." },
  { q: "Who does God love so much that He gave His Son?", e: "🌍❤️", a: "The whole world", w: ["Only some people", "Only grown-ups"], why: "“For God so loved the world…” — that's everyone!" },
];
const ABC: [string, string][] = [["A — Admit I have sinned", "🙇"], ["B — Believe Jesus died and rose for me", "✝️"], ["C — Call on Jesus to save me", "🙏"]];
const RESCUE: Pol[] = [
  { q: "How is Jesus like a lifeguard?", e: "🏊🌊", a: "He rescues us from sin we can't escape on our own", w: ["He teaches swimming", "He sits in a tall chair"], why: "We can't save ourselves from sin — Jesus rescues us!" },
  { q: "What happened on the third day after Jesus died?", e: "🌅🪨", a: "He rose again!", w: ["He stayed in the tomb", "He went fishing"], why: "1 Corinthians 15:4 — He rose again the third day." },
  { q: "Who can become a child of God?", e: "👨‍👩‍👧‍👦✨", a: "Everyone who receives and believes in Jesus", w: ["Only people born in a church", "Only grown-ups"], why: "John 1:12 — as many as received Him, to them gave He power to become the sons of God." },
  { q: "When we sin after trusting Jesus, what should we do?", e: "🧼🙏", a: "Confess it to God — He forgives", w: ["Hide it from God", "Give up"], why: "1 John 1:9 — if we confess our sins, He is faithful and just to forgive us." },
];
const SAVED: Reflect[] = [
  { q: "Have you trusted Jesus to be your Savior?", e: "✝️💭", options: [["Yes, I have!", "🙌", "That's wonderful! Tell your grown-up about it — they'd love to hear."], ["I want to — can I talk to my grown-up?", "🙋", "Great idea! Your grown-up would love to talk with you about Jesus."], ["I'm still thinking about it", "🤔", "That's okay! God loves you, and you can keep learning and asking questions."], ["I have questions", "❓", "Questions are good! Ask your grown-up or your pastor — God loves curious hearts."]] },
];
const BOOKS: SortBank = { prompt: "Old Testament or New Testament?", bins: ["Old Testament", "New Testament", "📜", "✝️"], items: [["Genesis", 1, "🌍"], ["Exodus", 1, "🌊"], ["Psalms", 1, "🎶"], ["Proverbs", 1, "🦉"], ["Isaiah", 1, "📯"], ["Jonah", 1, "🐋"], ["Daniel", 1, "🦁"], ["Ruth", 1, "🌾"], ["Matthew", 0, "✝️"], ["Mark", 0, "📖"], ["Luke", 0, "🩺"], ["John", 0, "❤️"], ["Acts", 0, "🔥"], ["Romans", 0, "🏛️"], ["Ephesians", 0, "🛡️"], ["Revelation", 0, "🌅"]] };
const FIRST5: [string, string][] = [["Genesis", "🌍"], ["Exodus", "🌊"], ["Leviticus", "⛺"], ["Numbers", "🔢"], ["Deuteronomy", "📜"]];
const GOSPELS: [string, string][] = [["Matthew", "👑"], ["Mark", "🦁"], ["Luke", "🩺"], ["John", "🕊️"]];
const BIBLE_FACTS: Pol[] = [
  { q: "How many books are in the Bible?", e: "📚", a: "66", w: ["10", "100"], why: "The Bible has 66 books — like a whole library!" },
  { q: "Which part of the Bible tells about Jesus' life on earth?", e: "✝️📖", a: "The New Testament", w: ["The Old Testament", "The dictionary"], why: "Matthew, Mark, Luke and John tell about Jesus' life." },
  { q: "What's the first book of the Bible?", e: "🌍📖", a: "Genesis", w: ["Revelation", "Psalms"], why: "Genesis means “beginning” — it starts with creation!" },
  { q: "What's the last book of the Bible?", e: "🌅📖", a: "Revelation", w: ["Genesis", "Exodus"], why: "Revelation tells how God will make everything new." },
  { q: "Which book is full of songs and prayers?", e: "🎶📖", a: "Psalms", w: ["Numbers", "Acts"], why: "Psalms has 150 songs and prayers!" },
  { q: "Which book tells about the very first church?", e: "🔥📖", a: "Acts", w: ["Genesis", "Proverbs"], why: "Acts tells what Jesus' followers did after He went back to heaven." },
];
const HEROES_MATCH: MatchBank = [["Noah", "Obeyed God and built the ark"], ["Moses", "Led God's people out of Egypt"], ["Joshua", "Marched around Jericho"], ["Miriam", "Watched over baby Moses"], ["David", "Trusted God against a giant"], ["Daniel", "Kept praying, even with lions"]];
const COMMANDMENTS: SortBank = { prompt: "Is this commandment about loving God or loving others?", bins: ["Loving God", "Loving others", "🙏", "🤝"], items: [["Have no other gods", 1, "☝️"], ["Don't worship idols", 1, "🗿"], ["Honor God's name", 1, "✨"], ["Keep a day to rest and worship", 1, "⛪"], ["Honor your parents", 0, "👨‍👩‍👧"], ["Don't murder", 0, "🚫"], ["Don't steal", 0, "🙅"], ["Don't lie", 0, "🤐"], ["Don't want what others have", 0, "🎁"]] };
const FORGIVE: Rw[] = [
  rw("Your friend broke your favorite toy and said sorry.", "🧸💔👦", "What do you do?", ["Say, “I forgive you,” and keep being friends.", "Your friend hugs you. Forgiving felt better than staying mad.", "🤗"], [["Stay mad and never play again.", "You lose a friend, and the mad feeling sticks around.", "😠"], ["Break their toy to get even.", "Now two toys are broken, and two friends are sad.", "💔"]], "Like Joseph, we can forgive — because God forgives us."),
  rw("Your sister said something mean, then apologized.", "👧💬👦", "What do you do?", ["Forgive her and move on.", "The rest of the day is fun together.", "😊"], [["Say, “I'll never forgive you!”", "The house feels grumpy all day.", "☁️"], ["Tell everyone what she said.", "Now she's embarrassed, and you're both hurt.", "😢"]], "Forgiving doesn't mean it didn't hurt — it means you let God handle it."),
  rw("A kid at school pushed you, and the teacher made him apologize.", "🏫🧒", "What do you do?", ["Accept the apology and be kind.", "The next day he asks you to play. Forgiveness changed things!", "⚽"], [["Push him back later.", "You both end up in trouble.", "⚡"], ["Ignore him forever.", "He never gets the chance to show he's changed.", "😶"]], "God forgives us — so we forgive others."),
  rw("Your friend forgot to come to your birthday party and feels terrible.", "🎂😔🧒", "What do you do?", ["Say, “It's okay — I forgive you. Come play Saturday!”", "Your friend's face lights up. Forgiving made your friendship stronger.", "🤗"], [["Say, “You're not my friend anymore.”", "You lose a good friend over one mistake.", "💔"], ["Act okay but stay mad inside.", "The mad feeling sits in your heart like a heavy rock.", "🪨"]], "“Even as Christ forgave you, so also do ye.”"),
  rw("Your brother scribbled on your drawing, and he keeps saying sorry.", "🖍️👦🧒", "What do you do?", ["Forgive him and draw a new one together.", "The new drawing is even better — and so is your brother's smile.", "🎨"], [["Scribble on his drawing too.", "Now both drawings are ruined, and you're both upset.", "😠"], ["Remind him about it every day.", "Forgiving means letting it go — not bringing it up again and again.", "📢"]], "When God forgives us, He doesn't keep bringing it up. We can forgive like that too."),
];
const MIRACLES: MatchBank = [["Calmed the storm", "Jesus has power over nature"], ["Fed five thousand people", "Jesus gives what we need"], ["Healed blind Bartimaeus", "Jesus heals and cares"], ["Raised Lazarus", "Jesus has power over death"], ["Filled the fishing nets", "Jesus blesses those who obey"], ["Walked on water", "Jesus is the Son of God"]];
const PARABLES: MatchBank = [["The Lost Sheep", "God searches for every person"], ["The Good Samaritan", "Show mercy to anyone in need"], ["The Son Who Came Home", "God forgives when we turn back"], ["The Wise Builder", "Hear Jesus' words and do them"], ["The Mustard Seed", "God's kingdom grows from something small"], ["The Sower", "Hearts that welcome God's Word grow fruit"], ["The Hidden Treasure", "Knowing God is worth more than anything"], ["The Unforgiving Servant", "Forgive others, because God forgave you"], ["The Talents", "Use what God gives you"]];
const PARABLE_Q: Pol[] = [
  { q: "In the Lost Sheep story, who is the shepherd like?", e: "🐑🧑‍🌾", a: "God, who looks for every lost person", w: ["A grumpy farmer", "A wolf"], why: "God never stops looking for people who are lost." },
  { q: "In the Good Samaritan, who was a real neighbor to the hurt man?", e: "🩹🐴", a: "The Samaritan who stopped to help", w: ["The priest who walked by", "The robbers"], why: "Jesus said, “Go, and do thou likewise.”" },
  { q: "When the father saw his son coming home, what did he do?", e: "🏃🤗", a: "Ran to hug him and threw a party", w: ["Locked the door", "Said, “Go away!”"], why: "That's how God welcomes us when we turn back to Him!" },
  { q: "In the Wise Builder story, what is building on the rock like?", e: "🪨🏠", a: "Hearing Jesus' words and doing them", w: ["Having a big house", "Being rich"], why: "Doing what Jesus says keeps us strong when storms come." },
  { q: "Why did Jesus tell stories called parables?", e: "📖💭", a: "To teach big truths about God in a way people remember", w: ["Just to pass the time", "To trick people"], why: "A parable is an earthly story with a heavenly meaning." },
  { q: "In the Mustard Seed story, what grows from a tiny seed?", e: "🌱🌳", a: "A big tree where birds can rest", w: ["Nothing at all", "A rock"], why: "God can do big things from small beginnings!" },
];
const NEIGHBOR: Rw[] = [
  rw("A new kid falls on the playground and drops his lunch.", "🎠🍱🧒", "What do you do?", ["Help him up and share your snack.", "He smiles. You just did what the Good Samaritan did!", "😊"], [["Walk past like you didn't see.", "He sits alone and hungry — like the man on the road.", "😔"], ["Laugh with your friends.", "He feels even worse. That's the opposite of mercy.", "😢"]], "Jesus said our neighbor is anyone who needs help."),
  rw("An older neighbor is struggling to roll her trash cans to the curb.", "🗑️👵🧒", "What do you do?", ["Offer to help roll them.", "She thanks you with a big smile. Mercy can be simple!", "🤝"], [["Keep playing.", "She makes three slow trips alone.", "😓"], ["Watch and do nothing.", "Seeing someone struggle and walking by is what the priest did.", "🚶"]], "Showing mercy means stopping to help."),
  rw("A classmate forgot her lunch and is just sitting there.", "🍱😔👧", "What do you do?", ["Share half of your sandwich.", "She smiles so big. You just loved your neighbor!", "😊"], [["Eat fast so she doesn't ask.", "She stays hungry all afternoon.", "😞"], ["Say, “That's what you get for forgetting.”", "That's not mercy — that's mean.", "💔"]], "“Go, and do thou likewise.” Mercy shares."),
  rw("A boy who speaks a different language looks lost on the first day of school.", "🏫🌍🧒", "What do you do?", ["Smile, wave, and walk him to the office.", "He finds his class — and you've made a new friend.", "🤝"], [["Ignore him — you can't understand him anyway.", "He wanders the halls, scared and alone.", "😟"], ["Point and laugh with your friends.", "That's the opposite of being a good neighbor.", "😢"]], "Jesus' neighbor rule includes everyone — even people who seem different from us."),
  rw("Your neighbor's puppy got loose and is running toward the street.", "🐶🚗🧒", "What do you do?", ["Call a grown-up right away to help catch it.", "Together you catch the puppy. Your neighbor is so thankful!", "🙏"], [["Chase it into the street yourself.", "That's dangerous! Getting a grown-up is the safe way to help.", "⚠️"], ["Keep playing — it's not your dog.", "Being a neighbor means caring about other people's troubles.", "🚶"]], "Love your neighbor — and help in a wise, safe way."),
];
const FRUIT: [string, string][] = [["Love", "❤️"], ["Joy", "😄"], ["Peace", "🕊️"], ["Patience (longsuffering)", "⏳"], ["Kindness (gentleness)", "🤲"], ["Goodness", "👍"], ["Faithfulness (faith)", "🤝"], ["Gentleness (meekness)", "🐑"], ["Self-control (temperance)", "🛑"]];
const FRUIT_MATCH: MatchBank = [["Patience", "Waiting your turn without whining"], ["Kindness", "Helping a classmate who dropped her books"], ["Self-control", "Not grabbing the last cookie"], ["Joy", "Singing even on a rainy day"], ["Peace", "Staying calm instead of fighting"], ["Love", "Hugging your sad brother"], ["Goodness", "Doing right when no one is watching"], ["Faithfulness", "Keeping your promise"], ["Gentleness", "Speaking softly to a scared puppy"]];
const WHICH_FRUIT: Pol[] = [
  { q: "Your sister knocks over your tower. Which fruit of the Spirit do you need most?", e: "🧱💥", a: "Patience and self-control", w: ["Joy", "Faithfulness"], why: "Patience helps you wait, and self-control stops angry reactions." },
  { q: "A kid at school has no one to play with. Which fruit can you show?", e: "🎠🧒", a: "Kindness", w: ["Self-control", "Patience"], why: "Kindness invites others in." },
  { q: "You promised to help Dad rake leaves, but a friend invites you over.", e: "🍂🤝", a: "Faithfulness — keep your promise", w: ["Joy — go have fun", "Peace — stay home and nap"], why: "Faithfulness means keeping your word." },
  { q: "Your little brother is scared of the thunder.", e: "⛈️👦", a: "Gentleness and love", w: ["Self-control", "Goodness"], why: "Speak gently and comfort him with love." },
  { q: "You lost the game, but you smile and say, “Good game!” Which fruit is that?", e: "🎲😊", a: "Self-control", w: ["Faithfulness", "Gentleness"], why: "Self-control keeps a sore-loser reaction from taking over." },
  { q: "Where does the fruit of the Spirit come from?", e: "🍇🕊️", a: "God's Spirit growing it in us", w: ["Trying really hard all alone", "Eating fruit"], why: "The Holy Spirit grows good fruit in people who follow Jesus." },
];
const PRAYER_PARTS = {
  prompt: "Sort each prayer: Praise, Sorry, Thanks, or Please?",
  bins: [{ id: "praise", label: "Praise", emoji: "🙌" }, { id: "sorry", label: "Sorry", emoji: "😔" }, { id: "thanks", label: "Thanks", emoji: "🙏" }, { id: "please", label: "Please", emoji: "🙋" }],
  items: [
    ["God, You are so great!", "praise", "✨"], ["You made the whole world!", "praise", "🌍"], ["You are always good.", "praise", "💛"],
    ["Please forgive me for being mean to my brother.", "sorry", "💔"], ["I'm sorry I didn't obey.", "sorry", "🙇"], ["Forgive me for telling a lie.", "sorry", "🤥"],
    ["Thank You for my family.", "thanks", "👨‍👩‍👧"], ["Thank You for my food.", "thanks", "🍎"], ["Thank You for Jesus.", "thanks", "✝️"],
    ["Please help Grandma feel better.", "please", "👵"], ["Please help me be brave at school.", "please", "🏫"], ["Please help my friend who is sad.", "please", "😢"],
  ] as [string, string, string][],
};
const LORDS_PRAYER: [string, string][] = [["Our Father which art in heaven,", "☁️"], ["Hallowed be thy name.", "✨"], ["Thy kingdom come.", "👑"], ["Thy will be done in earth, as it is in heaven.", "🌍"], ["Give us this day our daily bread.", "🍞"], ["And forgive us our debts, as we forgive our debtors.", "🤝"], ["And lead us not into temptation, but deliver us from evil.", "🛡️"]];
const PRAYER_MID: Pol[] = [
  { q: "When can you pray?", e: "🙏⏰", a: "Any time, anywhere", w: ["Only at church", "Only before meals"], why: "“Pray without ceasing” — talk to God all day!" },
  { q: "What if God's answer is “wait”?", e: "⏳🙏", a: "Keep trusting Him — His timing is best", w: ["Stop praying", "Get mad at God"], why: "God always hears. Sometimes His answer is yes, sometimes no, sometimes wait." },
  { q: "Jesus taught His disciples a prayer. What do we call it?", e: "📜🙏", a: "The Lord's Prayer", w: ["The Bedtime Song", "The Thank-You Note"], why: "Jesus taught it in Matthew 6." },
  { q: "Why do we pray?", e: "💬❤️", a: "To talk with God, who loves us", w: ["To get whatever we want", "Because we have to"], why: "Prayer is talking with our Father in heaven." },
];
const TRUTH_MID: Rw[] = [
  rw("Eli broke a window playing ball. His dad asks who did it.", "⚾🪟👦", "What should Eli say?", ["“It was me. I'm sorry.”", "Dad is upset about the window but proud of Eli. They fix it together.", "🛠️"], [["Blame the neighbor kid.", "The neighbor gets in trouble for nothing. When the truth comes out, Eli has two wrongs to fix.", "😞"], ["Say, “I don't know.”", "Dad asks the neighbors. The truth comes out anyway.", "🔦"]], "“They that deal truly are his delight.” God loves honest hearts."),
  rw("Maya found a $10 bill in a library book.", "💵📚👧", "What should Maya do?", ["Give it to the librarian.", "The librarian finds the owner — an older man who's so grateful!", "😊"], [["Keep it — no one will know.", "God knows. Maya feels uneasy every time she thinks about it.", "😕"], ["Spend it quickly.", "The money's gone, but the guilty feeling isn't.", "💸"]], "God sees everything. Honesty pleases Him, even when no one else is looking."),
  rw("Your teacher asks if you finished your reading log. You didn't.", "📖📝🧒", "What do you say?", ["“Not yet — I'll finish it tonight.”", "Your teacher thanks you for being honest and gives you one more day.", "📅"], [["“Yes!” (you didn't)", "Your teacher asks to see it. Now it's a missing log AND a lie.", "😬"], ["Fill it in with made-up books.", "That's lying on paper. God sees what's true.", "✏️"]], "Honest words please God — even when they're hard."),
  rw("Your friend asks if you ate the last cookie. You did.", "🍪👧🧒", "What do you say?", ["“Yes, I did. Sorry — I'll share mine next time.”", "Your friend shrugs and smiles. Honesty keeps friendships strong.", "🤝"], [["“Your dog must have eaten it.”", "The dog was outside all day. Now she knows you lied.", "🐶"], ["“What cookie?”", "Playing dumb is still lying. She's hurt and confused.", "😕"]], "“Putting away lying, speak every man truth with his neighbour.”"),
  rw("You got a bad grade on a spelling test. Mom asks how it went.", "📝😬🧒", "What do you say?", ["“Not great — can you help me study?”", "Mom helps you practice. Next week you do much better!", "📈"], [["“Great!” — and hide the test.", "Mom finds it in your backpack. Now there's a lie to fix too.", "🎒"], ["“The teacher graded it wrong.”", "Blaming isn't honest. God sees the truth.", "👉"]], "Honest words open the door to help."),
];
const OBEY_MID: Rw[] = [
  rw("Mom says no tablet until homework is done.", "📱📚🧒", "What do you do?", ["Do homework first, then ask for the tablet.", "Homework is done fast, and you get to play with nothing to hide.", "😊"], [["Sneak the tablet into your room.", "Mom finds it under your pillow. No tablet for a week.", "🔒"], ["Argue until Mom gives in.", "Mom doesn't give in, and now everyone's frustrated.", "😤"]], "“Children, obey your parents in all things: for this is well pleasing unto the Lord.”"),
  rw("Dad asks you to take out the trash during your favorite show.", "🗑️📺🧒", "What do you do?", ["Pause the show and do it right away.", "Dad says, “Thanks, buddy!” and the show is still there when you get back.", "👍"], [["Say “after this” and forget.", "The trash overflows, and Dad is disappointed.", "😞"], ["Do it, grumbling the whole time.", "The trash goes out, but the attitude stinks worse than the trash!", "😖"]], "Honoring your parents means obeying with a good attitude."),
  rw("Your parents said no to a certain show. A friend says, “Come watch it at my house!”", "📺🏠🧒", "What do you do?", ["“My parents said no, so I'll pass. Want to play outside?”", "Your friend says sure. You kept your parents' trust — even when they weren't there.", "🌳"], [["Watch it — your parents will never know.", "God knows — and you feel uneasy every time you see your parents.", "😕"], ["Watch it, then tell your parents you didn't.", "Now it's disobeying AND lying.", "🤥"]], "Obeying when no one is watching shows real honor."),
  rw("Mom asks you to practice piano for 15 minutes.", "🎹⏰🧒", "What do you do?", ["Practice the whole 15 minutes.", "You learn a new song — and Mom knows she can trust you.", "🎶"], [["Play for 5 minutes and say you did 15.", "Mom heard how short it was. Now there's a trust problem.", "⏳"], ["Set the timer and bang random notes.", "That's obeying on the outside, not on the inside.", "🎭"]], "Obey with your whole heart — as if you're doing it for the Lord."),
  rw("Grandma asks you to stop jumping on her couch.", "🛋️👵🧒", "What do you do?", ["Stop right away: “Sorry, Grandma!”", "Grandma hugs you and gets out the board games.", "🎲"], [["Keep jumping when she leaves the room.", "A couch spring breaks. Grandma is sad, and you're in trouble.", "💥"], ["Say, “Mom lets me at home!”", "Honoring Grandma means following her rules in her house.", "🏠"]], "Honoring our parents includes the grown-ups who care for us."),
];

// ═══ Lighthouse Keepers ════════════════════════════════════════════════════════════════════
const TIMELINE: [string, string][] = [["Creation — God makes everything", "🌍"], ["The Fall — sin enters the world", "🍎"], ["The Flood — Noah and the ark", "🌈"], ["God's promise to Abraham", "⭐"], ["Moses and the Exodus", "🌊"], ["King David", "👑"], ["Exile to Babylon", "⛓️"], ["Jesus is born, dies and rises again", "✝️"], ["The church begins", "🔥"], ["Jesus will make all things new", "🌅"]];
const SECTIONS: MatchBank = [["Genesis", "Law"], ["Joshua", "History"], ["Psalms", "Poetry"], ["Isaiah", "Prophets"], ["Matthew", "Gospels"], ["Romans", "Letters"], ["Acts", "The early church"], ["Revelation", "Prophecy of the future"]];
const BIG_FACTS: Pol[] = [
  { q: "How many books are in the Old Testament?", e: "📜", a: "39", w: ["27", "66"], why: "39 in the Old Testament + 27 in the New = 66." },
  { q: "How many books are in the New Testament?", e: "✝️", a: "27", w: ["39", "12"], why: "Matthew through Revelation — 27 books." },
  { q: "About how long did it take to write the whole Bible?", e: "⏳📖", a: "About 1,500 years", w: ["About a week", "About 10 years"], why: "Around 40 writers over about 1,500 years — telling one story from God." },
  { q: "What languages was the Bible first written in?", e: "🗣️📜", a: "Hebrew, Aramaic and Greek", w: ["English and Spanish", "Latin only"], why: "The Old Testament mostly in Hebrew, the New Testament in Greek." },
  { q: "What's the main story of the whole Bible?", e: "🗺️✝️", a: "God rescuing people through Jesus", w: ["A list of rules", "Ancient battles"], why: "From Genesis to Revelation, the Bible points to Jesus." },
  { q: "What does “given by inspiration of God” mean in 2 Timothy 3:16?", e: "🌬️📖", a: "God breathed out the Scriptures through the writers", w: ["The writers felt excited", "It puts you in a good mood"], why: "The Bible's words come from God Himself." },
];
const IAM: MatchBank = [["“I am the bread of life”", "Jesus satisfies our deepest needs"], ["“I am the light of the world”", "Jesus shows the way out of darkness"], ["“I am the door”", "Jesus is the way into God's family"], ["“I am the good shepherd”", "Jesus protects us and gave His life for us"], ["“I am the resurrection, and the life”", "Jesus has power over death"], ["“I am the way, the truth, and the life”", "Jesus is the only way to the Father"], ["“I am the vine”", "Stay connected to Jesus to grow fruit"]];
const PROPHECY: MatchBank = [["Born in Bethlehem", "Micah 5:2"], ["Called “The mighty God, The Prince of Peace”", "Isaiah 9:6"], ["Born of a virgin", "Isaiah 7:14"], ["Rode into Jerusalem on a donkey", "Zechariah 9:9"], ["Wounded for our sins", "Isaiah 53:5"]];
const GOD_MAN: SortBank = { prompt: "Does it show Jesus is God, or that He is human? (He's both!)", bins: ["Shows He's God", "Shows He's human", "✨", "🧑"], items: [["Calmed a storm with words", 1, "🌊"], ["Forgave sins", 1, "✝️"], ["Rose from the dead", 1, "🌅"], ["Walked on water", 1, "🚶"], ["Raised Lazarus", 1, "🪨"], ["Got hungry", 0, "🍞"], ["Got tired and slept", 0, "😴"], ["Wept with friends", 0, "😢"], ["Grew up as a kid", 0, "🌱"], ["Was born as a baby", 0, "👶"]] };
const GIFT_SORT: SortBank = { prompt: "Is this how we're saved — or not?", bins: ["How we're saved", "Not how we're saved", "🎁", "🚫"], items: [["Trusting Jesus", 1, "🙏"], ["Believing He died and rose for me", 1, "✝️"], ["Receiving God's free gift", 1, "🎁"], ["Calling on the name of the Lord", 1, "📣"], ["Being good enough", 0, "😇"], ["Going to church a lot", 0, "⛪"], ["Having Christian parents", 0, "👨‍👩‍👧"], ["Doing lots of chores", 0, "🧹"], ["Giving money", 0, "💰"], ["Being nicer than others", 0, "😊"]] };
const ROMANS: [string, string][] = [["Romans 3:23 — All have sinned", "💔"], ["Romans 6:23 — Sin pays death; God gives life", "🎁"], ["Romans 5:8 — Christ died for us while we were sinners", "✝️"], ["Romans 10:9 — Confess Jesus is Lord and believe", "🗣️"], ["Romans 10:13 — Whoever calls on the Lord will be saved", "📣"]];
const ROMANS_MATCH: MatchBank = [["Romans 3:23", "All have sinned"], ["Romans 6:23", "The gift of God is eternal life"], ["Romans 5:8", "Christ died for us while we were yet sinners"], ["Romans 10:9", "Confess Jesus as Lord; believe God raised Him"], ["Romans 10:13", "Whosoever calls on the Lord shall be saved"]];
const ROMANS_Q: Pol[] = [
  { q: "Which Romans Road verse says everyone has sinned?", e: "💔📜", a: "Romans 3:23", w: ["Romans 10:13", "Romans 5:8"], why: "“For all have sinned, and come short of the glory of God.”" },
  { q: "Romans 6:23 says sin pays a terrible wage. What does God give instead?", e: "🎁✨", a: "The free gift of eternal life through Jesus", w: ["A second chance to try harder", "A list of rules"], why: "“The wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.”" },
  { q: "According to Romans 5:8, when did Christ die for us?", e: "✝️⏳", a: "While we were still sinners", w: ["After we became perfect", "Once we'd earned it"], why: "God loved us first — before we did anything good." },
  { q: "Who does Romans 10:13 say shall be saved?", e: "📣🌍", a: "Whosoever calls on the name of the Lord", w: ["Only very good people", "Only grown-ups"], why: "“Whosoever” means anyone — including you." },
  { q: "What does Romans 10:9 say to do?", e: "🗣️❤️", a: "Confess Jesus as Lord and believe God raised Him from the dead", w: ["Try harder to be good", "Keep it a secret"], why: "Salvation is believing in your heart and confessing with your mouth." },
];
const EXPLAIN: Kit[] = [
  { e: "💬✝️", story: "Your friend asks, “What do Christians believe about Jesus?”", slots: [["God", "“God made us and loves us.”", ["“God is mad at everyone.”", "“God doesn't care about us.”"], "Start with who God is."], ["The problem", "“Everyone has sinned, and sin separates us from God.”", ["“Only really bad people sin.”", "“Sin doesn't matter.”"], "Sin is the problem we all share."], ["The rescue", "“Jesus died for our sins and rose again.”", ["“Jesus was just a good teacher.”", "“Jesus stayed dead.”"], "Jesus is the rescue."], ["The response", "“Anyone who trusts Jesus is forgiven and has eternal life.”", ["“You have to be good enough first.”", "“Only some people can be saved.”"], "It's a gift received by faith."]] },
  { e: "🎁❓", story: "A friend says, “I think you get to heaven by being a good person.”", slots: [["Start kindly", "“Being kind is great — God loves kindness.”", ["“That's dumb.”", "“You're so wrong.”"], "Start with kindness, not an argument."], ["The problem", "“But the Bible says all have sinned — nobody is good enough on their own.”", ["“Most people are good enough.”", "“Only bad people need Jesus.”"], "Romans 3:23 — all have sinned."], ["The gift", "“That's why Jesus died and rose again. Salvation is a free gift.”", ["“So you just have to try harder.”", "“Go to church every week to earn it.”"], "By grace through faith — not of works."], ["Invite", "“Want to come to church with me sometime?”", ["“Fine, believe what you want.”", "“I can't be friends with you anymore.”"], "Invite with love, and trust God with the rest."]] },
  { e: "😢✝️", story: "Your cousin says, “God could never forgive me. I've done too many bad things.”", slots: [["Listen", "“That sounds really heavy. I'm glad you told me.”", ["“Yeah, you have been pretty bad.”", "“Just stop thinking about it.”"], "Swift to hear — care first."], ["God's love", "“God loves you more than you know.”", ["“God only loves good people.”", "“God is just mad at you.”"], "Christ died for us while we were yet sinners."], ["God's promise", "“If we confess our sins, He is faithful to forgive us.”", ["“Maybe if you're good for a whole year.”", "“Some sins are too big.”"], "1 John 1:9 — He forgives all who confess."], ["Next step", "“Want to talk with my mom or our pastor about it?”", ["“Good luck with that.”", "“Don't tell anyone.”"], "Point them to people who can help them follow Jesus."]] },
];
const SAVED_BIG: Reflect[] = [
  { q: "Where are you with Jesus right now?", e: "✝️💭", options: [["I've trusted Jesus as my Savior", "🙌", "Amazing! Keep growing — and tell your grown-up how God is working in you."], ["I want to trust Him — I'd like to talk with my grown-up", "🙋", "That's a wonderful step. Your grown-up would love to talk and pray with you."], ["I'm still figuring it out", "🤔", "That's okay. Keep reading, asking and learning — God welcomes honest questions."], ["I have big questions", "❓", "Great questions deserve great conversations. Bring them to your grown-up or pastor."]] },
];
const ASSURANCE: Pol[] = [
  { q: "Can a believer KNOW they have eternal life?", e: "✅", a: "Yes — 1 John 5:13 says “that ye may know”", w: ["No, nobody can know", "Only if you're perfect"], why: "God wants His children to be confident in His promise." },
  { q: "If we're saved by grace, why do good works?", e: "🎁🤲", a: "To thank God and show His love — not to earn it", w: ["To earn heaven", "Good works don't matter"], why: "Good works are the fruit of salvation, not the root." },
  { q: "What does “grace” mean?", e: "🎁💛", a: "God's kindness we don't deserve and can't earn", w: ["Being graceful at dancing", "A reward for being good"], why: "Grace is a gift — that's what makes it amazing." },
];
const BIBLE_DETECTIVE: Case[] = [
  kase("Gehazi's Errand", "💰🏃", [["Naaman offered gifts, but Elisha refused them.", "🙅"], ["Gehazi ran after Naaman's chariot.", "🏃"], ["He said, “My master sent me — he needs silver and clothes.”", "🗣️"], ["He hid the gifts at home.", "🏠"], ["When Elisha asked where he'd been, he said, “Nowhere.”", "❓"]], [2, 3, 4], "Three dishonest moves: a lie to Naaman, hiding the gifts, and a lie to Elisha. One lie led to another."),
  kase("The Blessing Trick", "🐐🧥", [["Isaac asked Esau to cook him a meal.", "👴"], ["Rebekah dressed Jacob in Esau's clothes.", "🧥"], ["Jacob covered his arms with goatskin.", "🐐"], ["Jacob said, “I am Esau.”", "🗣️"]], [1, 2, 3], "The disguise and the words were all deception — planned to fool a man who couldn't see."),
  kase("Achan's Tent", "⛺💰", [["God said to take nothing from Jericho.", "🚫"], ["Achan saw a beautiful robe and gold.", "👀"], ["He took them.", "💰"], ["He buried them under his tent and told no one.", "⛺"]], [2, 3], "Taking what God forbade, then hiding it — the sin, then the cover-up."),
  kase("The Pretend Gift", "🎭💰", [["Ananias and Sapphira sold some land.", "💰"], ["They kept part of the money for themselves.", "🤲"], ["Ananias brought the rest and acted like it was everything.", "🎭"], ["Sapphira told Peter the same story.", "🗣️"]], [2, 3], "Keeping money was allowed. Pretending it was all of it was the lie."),
  kase("Peter by the Fire", "🔥🐓", [["Peter followed Jesus to the courtyard.", "🚶"], ["A servant girl said, “You were with Jesus.”", "👧"], ["Peter said, “I don't know Him.”", "🗣️"], ["Later, Peter wept — and Jesus forgave him.", "😢"]], [2], "Fear pushed Peter to lie. But his story didn't end there — Jesus restored him."),
];
const DILEMMA_FAITH: Pol[] = [
  { q: "You could get a better grade by copying a friend's homework. No one would know. What does Luke 16:10 say?", e: "📝🪙", a: "Faithful in little things means faithful in big things — do your own work", w: ["Little things don't count", "It's fine if no one knows"], why: "Integrity in small things builds integrity for big things." },
  { q: "You broke something at a friend's house, and nobody saw. What does Proverbs 28:13 point you to?", e: "🏠💔", a: "Confess it — covering sin won't prosper", w: ["Keep quiet", "Blame the dog"], why: "Confessing brings mercy; covering up brings trouble." },
  { q: "Why does God care about “small” lies?", e: "🤥❓", a: "Because God is truth, and every lie breaks trust", w: ["He doesn't", "Only big lies count"], why: "“Lying lips are abomination to the LORD.”" },
  { q: "A friend asks you to lie for them so they won't get in trouble. What's the loving choice?", e: "🤝🤥", a: "Don't lie — but help them tell the truth", w: ["Lie to protect them", "Lie, but feel bad about it"], why: "Real friends help each other do right — not cover up wrong." },
];
const TONGUE: Rw[] = [
  rw("Your brother takes the last waffle. You're furious.", "🧇😠🧑", "What do you say?", ["Take a breath: “Could we split it?”", "He shrugs and splits it. Breakfast stays peaceful.", "🤝"], [["Yell, “You're so selfish!”", "He yells back. Mom sends you both to your rooms.", "📢"], ["Mutter something mean under your breath.", "He hears it. Now he's hurt and the morning is ruined.", "💔"]], "“A soft answer turneth away wrath: but grievous words stir up anger.”"),
  rw("Mom asks you to redo a chore you did sloppily.", "🧹👩🧑", "What do you say?", ["“Okay, I'll fix it.”", "You finish fast, and Mom thanks you for your attitude.", "😊"], [["“Ugh, I already did it! You're never happy!”", "Mom is hurt, and now there are extra chores.", "😞"], ["Roll your eyes and stomp off.", "Your face said everything. Disrespect damages trust.", "🙄"]], "“Do all things without murmurings and disputings.”"),
  rw("Your friend made a mistake in the game, and your team lost.", "🏀😩🧑", "What do you say?", ["“It's okay — we'll get 'em next time.”", "Your friend smiles with relief. You just built him up.", "🏗️"], [["“You cost us the game!”", "Your friend is crushed and wants to quit the team.", "😢"], ["Make fun of him in the group chat.", "Everyone sees it. Words online spread like fire.", "🔥"]], "“Let no corrupt communication proceed out of your mouth, but that which is good to the use of edifying.”"),
  rw("Your teacher gives extra homework, and everyone groans.", "📚😩🧑", "What do you do?", ["Stay quiet and get started.", "You finish early and have the evening free.", "😎"], [["Complain loudly to everyone.", "The complaining spreads, and the whole class's mood sinks.", "☁️"], ["Say something sarcastic to the teacher.", "The teacher is hurt, and you've damaged a relationship.", "😬"]], "Complaining spreads like a small fire. Contentment puts it out."),
];
const SOFT_KIT: Kit[] = [
  { e: "🕊️💬", story: "Your sister snaps, “You ALWAYS hog the TV!”", slots: [["Listen first", "“Okay, I hear you.”", ["“No I don't!”", "“You're the hog!”"], "“Swift to hear, slow to speak.”"], ["A soft answer", "“Want to pick the next show?”", ["“Too bad, I was here first.”", "“Stop whining.”"], "A soft answer turns away wrath."], ["Build her up", "“We can take turns — that's fair.”", ["“Whatever, you're annoying.”", "“Fine, I'll leave.” (slams door)"], "Edifying words build people up."]] },
  { e: "👓😖", story: "A classmate teases you about your new glasses.", slots: [["Pause", "Take a breath before answering", ["Shout an insult right away", "Shove them"], "Slow to wrath."], ["A soft answer", "“I like them. They help me see.”", ["“At least I'm not ugly like you.”", "“Shut up!”"], "A soft answer stays strong without hurting."], ["Next step", "Walk away, and tell a teacher if it keeps happening", ["Plan revenge", "Spread a rumor about them"], "Overcome evil with good."]] },
  { e: "⚽😤", story: "At recess, a kid yells, “You cheated! That ball was out!”", slots: [["Stay calm", "Take a breath and keep your voice low", ["Yell back louder", "Kick the ball away"], "Slow to wrath."], ["A soft answer", "“I thought it was in — want to redo the point?”", ["“You're just a sore loser!”", "“Whatever, cry about it.”"], "A soft answer turneth away wrath."], ["Make peace", "“Let's keep playing — it's more fun together.”", ["Quit and take the ball home", "Tell everyone he's a cheater"], "Blessed are the peacemakers."]] },
  { e: "📱💬", story: "Someone posts a rude comment about your drawing online.", slots: [["Pause", "Wait before you reply", ["Reply right away in all caps", "Post something meaner about them"], "Swift to hear, slow to speak, slow to wrath."], ["A soft answer", "Don't reply — or just say, “Thanks for looking.”", ["“Your art is way worse.”", "“Nobody asked you.”"], "You don't have to win the argument."], ["Next step", "Tell a parent, and block them if it keeps happening", ["Get your friends to pile on", "Delete all your art forever"], "Let your grown-ups help you."]] },
];
const COMPLAIN: SortBank = { prompt: "Grateful, or grumbling?", bins: ["Grateful", "Grumbling", "😊", "😩"], items: [["“Thanks for dinner!”", 1, "🍽️"], ["“I'll do it.”", 1, "👍"], ["“At least we get to go somewhere.”", 1, "🚗"], ["“I'm thankful for homework help.”", 1, "📚"], ["“That was fun — thanks!”", 1, "🎉"], ["“This is SO boring.”", 0, "🥱"], ["“Why do I always have to?”", 0, "😤"], ["“Ugh, not this again.”", 0, "🙄"], ["“Everyone else gets more.”", 0, "😒"], ["“This is the worst day ever.”", 0, "☁️"]] };
const ARMOR: MatchBank = [["🪢 Belt of truth", "Living and speaking honestly"], ["🦺 Breastplate of righteousness", "Right choices guard your heart"], ["🥾 Shoes of the gospel of peace", "Ready to share the good news"], ["🛡️ Shield of faith", "Trusting God blocks fiery darts"], ["⛑️ Helmet of salvation", "Belonging to Jesus guards your mind"], ["⚔️ Sword of the Spirit", "God's Word fights temptation"]];
const ARMOR_ORDER: [string, string][] = [["Belt of truth", "🪢"], ["Breastplate of righteousness", "🦺"], ["Shoes of peace", "🥾"], ["Shield of faith", "🛡️"], ["Helmet of salvation", "⛑️"], ["Sword of the Spirit", "⚔️"]];
const ARMOR_USE: Pol[] = [
  { q: "A friend dares you to lie to your mom about where you're going. Which armor helps most?", e: "🤥🧭", a: "🪢 Belt of truth", w: ["🥾 Shoes of peace", "⛑️ Helmet of salvation"], why: "Truth holds everything together." },
  { q: "You start wondering if God could really love you after you messed up. Which armor helps?", e: "😔💭", a: "⛑️ Helmet of salvation", w: ["🪢 Belt of truth", "🥾 Shoes of peace"], why: "Knowing you belong to Jesus guards your mind against that lie." },
  { q: "You're tempted to cheat, and you remember, “Thy word have I hid in mine heart.” Which armor is that?", e: "📖⚔️", a: "⚔️ Sword of the Spirit", w: ["🛡️ Shield of faith", "🦺 Breastplate of righteousness"], why: "Like Jesus said, “It is written…” — God's Word is your sword." },
  { q: "A classmate asks why you go to church. Which armor gets you ready to answer?", e: "⛪💬", a: "🥾 Shoes of the gospel of peace", w: ["⚔️ Sword of the Spirit", "🪢 Belt of truth"], why: "Being ready to share the good news is like wearing shoes of peace." },
  { q: "Scary thoughts and doubts fly at you like arrows. Which armor blocks them?", e: "🏹😨", a: "🛡️ Shield of faith", w: ["🥾 Shoes of peace", "🦺 Breastplate of righteousness"], why: "Faith quenches the fiery darts of the wicked." },
  { q: "Choosing to do right when it's hard protects your heart. Which armor is that?", e: "💗🦺", a: "🦺 Breastplate of righteousness", w: ["⛑️ Helmet of salvation", "🥾 Shoes of peace"], why: "Righteous choices guard your heart." },
];
const BEATITUDES: MatchBank = [["Blessed are the poor in spirit", "for theirs is the kingdom of heaven"], ["Blessed are they that mourn", "for they shall be comforted"], ["Blessed are the meek", "for they shall inherit the earth"], ["Blessed are the merciful", "for they shall obtain mercy"], ["Blessed are the pure in heart", "for they shall see God"], ["Blessed are the peacemakers", "for they shall be called the children of God"]];
const GOLDEN: Rw[] = [
  rw("The new kid sits alone at lunch every day.", "🍱🧑", "What do you do?", ["Invite him to sit with you.", "He opens up and turns out to be hilarious. Treat others how you'd want to be treated!", "😄"], [["Ignore him — he's not your friend.", "He keeps eating alone. Imagine if that were you.", "😔"], ["Whisper about him with your friends.", "He notices. That's the opposite of the Golden Rule.", "💔"]], "“Whatsoever ye would that men should do to you, do ye even so to them.”"),
  rw("Your teammate keeps missing passes in practice.", "🏀😓🧑", "What do you do?", ["Offer to practice with him after school.", "He improves fast — and he never forgets you helped.", "🤝"], [["Roll your eyes every time.", "He feels judged and plays even worse.", "🙄"], ["Ask the coach to bench him.", "He finds out, and the team feels divided.", "😞"]], "Treat others the way you'd want to be treated — with patience and help."),
  rw("A classmate who was mean to you drops her books in the hall.", "📚🧑", "What do you do?", ["Help her pick them up.", "She's surprised — and later she apologizes for being mean.", "🌟"], [["Laugh and walk away.", "That felt good for a second, but it didn't make anything better.", "😐"], ["Kick a book further away.", "Now you've returned evil for evil.", "⚡"]], "“Love your enemies… do good to them that hate you.” Overcome evil with good."),
  rw("Your friend tells you a secret and asks you not to share it.", "🤫🧑‍🤝‍🧑", "What do you do?", ["Keep it — unless someone could get hurt.", "Your friend trusts you even more. That's how you'd want to be treated!", "🤝"], [["Tell a few people — it's juicy.", "Your friend finds out and feels betrayed.", "💔"], ["Drop hints so people can guess.", "Hints spread secrets too. Would you want that done to you?", "👀"]], "“As ye would that men should do to you, do ye also to them likewise.”"),
  rw("You're way ahead in a board game against your little cousin.", "🎲👧🧑", "What do you do?", ["Play fair, cheer her on, and help her learn.", "She has so much fun she asks to play again tomorrow.", "😄"], [["Brag after every turn.", "She quits the game in tears. Would you want to be treated like that?", "😢"], ["Cheat a little to win bigger.", "Winning by cheating isn't winning — and it isn't kind.", "🚫"]], "Treat others the way you'd want to be treated — even when you're winning."),
];
const WORRY: Pol[] = [
  { q: "You're worried about a big test. What does Matthew 6:33 encourage?", e: "📝😟", a: "Put God first, pray, prepare — and trust Him with the rest", w: ["Panic all night", "Skip the test"], why: "Seek God first; He takes care of what we need." },
  { q: "What's the difference between worry and planning?", e: "🗓️🤔", a: "Planning takes wise steps; worry replays fears without trusting God", w: ["There's no difference", "Worry helps you prepare"], why: "Jesus said not to worry about tomorrow — He never said don't plan." },
  { q: "When you feel anxious, what can you do first?", e: "🙏💭", a: "Tell God about it in prayer", w: ["Keep it bottled up", "Scroll a screen until it goes away"], why: "Cast your cares on Him, because He cares for you." },
];
const SALT_LIGHT: Pol[] = [
  { q: "Jesus said, “Ye are the light of the world.” What does that mean for you?", e: "💡🌍", a: "Let my good actions point people to God", w: ["Be the center of attention", "Hide my faith"], why: "Matthew 5:16 — let your light shine so people glorify your Father." },
  { q: "How is a Christian like salt?", e: "🧂✨", a: "We bring out what's good and keep things from going bad", w: ["We make people thirsty", "We're bitter"], why: "Salt flavors and preserves — Christians bring goodness into the world." },
  { q: "Which is an example of letting your light shine at school?", e: "🏫💡", a: "Standing up for a kid who's being teased", w: ["Bragging about going to church", "Telling people they're bad"], why: "Light shines through kind, brave actions." },
];
const ACTS: [string, string][] = [["Jesus goes back to heaven", "☁️"], ["The Holy Spirit comes at Pentecost", "🔥"], ["Peter and John heal a man who couldn't walk", "🦵"], ["Stephen bravely tells about Jesus", "🗣️"], ["Saul meets Jesus on the road", "💡"], ["Paul travels and starts churches", "🗺️"], ["Paul and Silas sing in jail", "🎶"], ["Paul is shipwrecked on the way to Rome", "🚢"]];
const PROVERBS: MatchBank = [["“A soft answer turneth away wrath”", "Gentle words calm anger"], ["“Pride goeth before destruction”", "Showing off leads to a fall"], ["“Go to the ant, thou sluggard”", "Work hard, like the ant"], ["“A friend loveth at all times”", "True friends stick with you"], ["“A good name is rather to be chosen than great riches”", "Honesty is worth more than money"], ["“He that is slow to anger is better than the mighty”", "Self-control is real strength"], ["“Trust in the LORD with all thine heart”", "Trust God more than your own ideas"]];
const APPLY: Pol[] = [
  { q: "You want to brag about your test score to a friend who failed. Which proverb applies?", e: "📝😏", a: "“Pride goeth before destruction”", w: ["“Go to the ant”", "“A friend loveth at all times”"], why: "Bragging is pride — and pride leads to a fall." },
  { q: "You've been putting off your project for weeks. Which proverb applies?", e: "🐜📅", a: "“Go to the ant, thou sluggard; consider her ways”", w: ["“A soft answer turneth away wrath”", "“Pride goeth before destruction”"], why: "The ant works ahead without being told." },
  { q: "Your friend is having a terrible week. Which proverb tells you what to do?", e: "🤝😢", a: "“A friend loveth at all times”", w: ["“Go to the ant”", "“Pride goeth before destruction”"], why: "Friends love in hard times too." },
  { q: "You could win the game by cheating. Which proverb helps?", e: "🏆🤔", a: "“A good name is rather to be chosen than great riches”", w: ["“Go to the ant”", "“A friend loveth at all times”"], why: "Your name for honesty is worth more than any prize." },
  { q: "You're about to snap at your little brother. Which proverb helps?", e: "😠🛑", a: "“He that is slow to anger is better than the mighty”", w: ["“Go to the ant”", "“A good name is rather to be chosen”"], why: "Ruling your temper takes more strength than winning a fight." },
];
const SERVE: Rw[] = [
  rw("After dinner, everyone leaves the table. The dishes are piled up.", "🍽️🧑", "What do you do?", ["Start clearing without being asked.", "Mom notices, and her whole face lights up. Serving brings joy!", "😊"], [["Slip off to your room.", "Mom does them alone — again.", "😓"], ["Wait to be asked, then complain.", "The dishes get done, but no one feels served.", "😒"]], "Jesus came “not to be ministered unto, but to minister.”"),
  rw("Your little sister can't reach the cereal.", "🥣👧🧑", "What do you do?", ["Get it for her and pour it too.", "She grins. Small acts of service are big to little people.", "🤗"], [["Tell her to figure it out.", "She tries to climb the counter. Uh-oh.", "😬"], ["Get it, but complain that she's annoying.", "You helped, but your words hurt more than the help helped.", "💔"]], "Serving with love — not grumbling — is what Jesus showed us."),
  rw("In a group project, one kid isn't doing anything.", "📊🧑‍🤝‍🧑", "What do you do?", ["Invite him in: “Could you make the title? You're great at art.”", "He jumps in and does an awesome job. Including him served the whole group.", "🎨"], [["Complain to the teacher right away.", "The teacher says to work it out together first.", "🤷"], ["Do all his work and grumble about it later.", "The project gets done, but resentment grows.", "😤"]], "Humble leaders look out for others too (Philippians 2:4)."),
  rw("Your church is collecting food for families who need it.", "🥫⛪🧑", "What do you do?", ["Use some of your own money to buy cans.", "The shelves fill up. Serving others is serving Jesus!", "🙏"], [["Say, “That's for grown-ups.”", "Kids can serve too — and God sees every gift.", "🤷"], ["Give only the cans nobody in your family likes.", "God loves a cheerful, generous giver — not leftovers.", "😕"]], "“Inasmuch as ye have done it unto one of the least of these… ye have done it unto me.”"),
  rw("Your coach needs someone to put away the equipment after practice.", "⚽🧺🧑", "What do you do?", ["Volunteer to help.", "Coach says, “That's a real team player.” Serving makes the whole team better.", "🏆"], [["Run to the car before he asks.", "Coach does it alone — again.", "😓"], ["Help, but only if you get more playing time.", "Serving to get something back isn't really serving.", "🤨"]], "“By love serve one another.”"),
];
const HUMBLE: SortBank = { prompt: "Humble or proud?", bins: ["Humble", "Proud", "🙇", "🦚"], items: [["Letting someone else go first", 1, "🚪"], ["Saying “Great job!” when a friend wins", 1, "👏"], ["Admitting you were wrong", 1, "🙋"], ["Asking for help when you need it", 1, "🤲"], ["Doing a job no one notices", 1, "🧹"], ["Bragging about your grades", 0, "📢"], ["Refusing to say sorry", 0, "🙅"], ["Always needing to be first", 0, "🏃"], ["Making fun of someone's mistake", 0, "😏"], ["Taking credit for someone else's work", 0, "🏆"]] };

// ═══ The voyage ════════════════════════════════════════════════════════════════════════════
const f = "f" as const;
const WORLDS: WorldDef[] = [
  // Little Lights
  { id: "creation", title: "Creation Cove", emoji: "🌍", grade: "prek", items: 5, theme: "kelp", blurb: "God made everything — and He made you!",
    talk: ["What's your favorite thing God made?", "Why do you think God made people?"], challenge: "Go outside and find three things God made. Thank Him for them!",
    stages: [storyStage("creation"), versesStage(["gen1-1"], "little"), stage("Who made it?", "🛠️", [sortT("god-made", GOD_MADE, true, 6, f), politeT("creation", CREATION_POL, true, f)]), versesStage(["ps139-14", "gen1-31"], "little"), stage("God made me", "🧒", [reflectT("made-me", MADE_ME, true, f), politeT("creation", CREATION_POL, true, f)])] },
  { id: "loves-me", title: "God Loves Me Lagoon", emoji: "💖", grade: "prek", items: 5, theme: "coral", blurb: "God loves me, cares for me, and never stops looking for me.",
    talk: ["How do you know God loves you?", "Who are some people God gave you to love you?"], challenge: "Tell someone in your family, “God loves you, and so do I!”",
    stages: [storyStage("lost-sheep"), versesStage(["1jn4-8", "1jn4-19"], "little"), stage("God loves me", "💖", [politeT("god-loves", GOD_LOVES, true, f), reflectT("loved-by", LOVE_REFLECT, true, f)]), versesStage(["ps23-1", "1pet5-7"], "little")] },
  { id: "rainbow", title: "Rainbow Harbor", emoji: "🌈", grade: "prek", items: 5, theme: "sky", blurb: "Noah's big boat and the God who keeps His promises.",
    talk: ["What promise did God make to Noah?", "What's a promise you can keep this week?"], challenge: "Make a promise to someone today — and keep it!",
    stages: [storyStage("noah"), versesStage(["1cor1-9"], "little"), stage("Count the animals", "🦒", [arkCount], 1), stage("Keep your promises", "🤝", [rewindT("promises", PROMISE, true, { ns: f })]), versesStage(["ps136-1a"], "little")] },
  { id: "lamp-light", title: "Lamp & Light Lagoon", emoji: "🔦", grade: "k", items: 5, theme: "night", blurb: "God's Word lights the way — and we can talk to God any time.",
    talk: ["How is the Bible like a flashlight?", "What can you thank God for tonight?"], challenge: "Pray with your grown-up tonight — say thank you for three things.",
    stages: [versesStage(["ps119-105"], "little"), stage("God's Word", "📖", [politeT("bible-little", BIBLE_LITTLE, true, f)]), storyStage("jesus-kids"), stage("Talking to God", "🙏", [politeT("prayer-little", PRAYER_LITTLE, true, f), reflectT("thanks", THANKS, true, f)], 2), versesStage(["ps150-6"], "little")] },
  { id: "brave-heart", title: "Brave Heart Bay", emoji: "🦁", grade: "k", items: 5, theme: "jungle", blurb: "David, Daniel, and trusting God when you're scared.",
    talk: ["What makes you feel scared? What can you remember then?", "How did God help David and Daniel?"], challenge: "Tonight at bedtime, say Psalm 56:3 with your grown-up.",
    stages: [storyStage("david-goliath"), versesStage(["ps56-3"], "little"), storyStage("daniel-lions"), versesStage(["josh1-9", "ps4-8"], "little"), stage("Brave with God", "🛡️", [rewindT("brave", BRAVE, true, { ns: f })], 2)] },
  { id: "bethlehem", title: "Bethlehem Bay", emoji: "⭐", grade: "k", items: 5, theme: "night", blurb: "Baby Jesus is born — the best news ever!",
    talk: ["Why did Jesus come as a baby?", "What gift can you give Jesus?"], challenge: "Do one kind thing for someone today, as a gift to Jesus.",
    stages: [storyStage("jesus-born"), versesStage(["luke2-11"], "little"), stage("Good news!", "👼", [politeT("christmas", CHRISTMAS, true, f), reflectT("gift-jesus", GIFT_JESUS, true, f)]), versesStage(["john3-16a"], "little")] },
  { id: "jesus-helps", title: "Jesus Helps Harbor", emoji: "⛵", grade: "k", items: 5, theme: "storm", blurb: "Jesus calms the storm and feeds five thousand.",
    talk: ["Which miracle was your favorite? Why?", "What could you share, like the boy shared his lunch?"], challenge: "Share something of yours with someone today.",
    stages: [storyStage("calm-storm"), versesStage(["mark4-39"], "little"), storyStage("feeding-5000"), versesStage(["matt19-26"], "little"), stage("Jesus can do anything", "⭐", [politeT("jesus-power", JESUS_POWER, true, f)], 2)] },
  { id: "sunrise", title: "Sunrise Shore", emoji: "🌅", grade: "k", items: 5, theme: "shallows", blurb: "Jesus died for us and rose again — He is alive!",
    talk: ["Why did Jesus die on the cross?", "How does it feel to know Jesus is alive?"], challenge: "Tell someone the good news: “Jesus is alive!”",
    stages: [storyStage("easter"), versesStage(["matt28-6"], "little"), stage("The best news", "🎉", [politeT("easter", EASTER, true, f)], 2), versesStage(["heb13-5a"], "little")] },
  { id: "happy-heart", title: "Happy Heart Island", emoji: "😊", grade: "k", items: 5, theme: "candy", blurb: "Obey right away with a happy heart, and always tell the truth.",
    talk: ["What does it mean to obey with a happy heart?", "Why did Zacchaeus give the money back?"], challenge: "When your grown-up asks you to do something today, say “Okay!” and do it right away.",
    stages: [storyStage("jonah"), versesStage(["eph6-1"], "little"), stage("Happy-heart steps", "👂", [orderT("happy-heart", "Put the happy-heart steps in order", HAPPY_STEPS, true, f), rewindT("obey", OBEY_FAITH, true, { ns: f })], 2), storyStage("zacchaeus"), versesStage(["col3-9a", "eph4-32a"], "little"), stage("Tell the truth", "🗣️", [rewindT("truth", [...TRUTH_LITTLE.slice(0, 4), OBEY_FAITH[3]], true, { ns: f, trust: true })], 2), versesStage(["ps118-24"], "little")] },

  // Bright Beams
  { id: "good-news", title: "Good News Bay", emoji: "🎁", grade: "1", theme: "pirate", blurb: "God's love, our sin, and His free gift — the good news in color.",
    talk: ["What is sin? What does it do?", "What is God's free gift?"], challenge: "Tell your grown-up the colors of the good news and what each one means.",
    stages: [versesStage(["john3-16"], "middle"), stage("The good news in color", "🟨", [matchT("wordless", "Match each color to its meaning", WORDLESS, true, f), orderT("wordless-order", "Tell the good news in color order", WORDLESS_STEPS, true, f)], 2), versesStage(["rom3-23"], "middle"), stage("What is sin?", "💔", [sortT("sin", SIN_SORT, true, 6, f), politeT("gospel", GOSPEL, true, f)], 2), versesStage(["rom6-23"], "middle"), stage("God's free gift", "🎁", [politeT("gospel", GOSPEL, true, f)])] },
  { id: "rescue-reef", title: "Rescue Reef", emoji: "⛑️", grade: "1", theme: "shallows", blurb: "Jesus died, rose again, and rescues everyone who trusts Him.",
    talk: ["What does it mean that Jesus died and rose again?", "What questions do you have about trusting Jesus?"], challenge: "Ask your grown-up how they came to know Jesus.",
    stages: [versesStage(["rom5-8"], "middle"), stage("The ABCs", "🔤", [orderT("abc", "Put the ABCs of the good news in order", ABC, true, f), politeT("rescue", RESCUE, true, f)], 2), versesStage(["1cor15-3", "john1-12"], "middle"), stage("Rescued!", "⛑️", [politeT("rescue", RESCUE, true, f), reflectT("saved", SAVED, true, f)]), versesStage(["acts16-31", "1jn1-9"], "middle")] },
  { id: "bible-library", title: "Bible Library Lighthouse", emoji: "📚", grade: "1", theme: "sky", blurb: "66 books, two testaments, one true story — God's Word.",
    talk: ["What's your favorite Bible story?", "Why is it important to read the Bible?"], challenge: "Find the book of Psalms in a real Bible with your grown-up.",
    stages: [versesStage(["2tim3-16a"], "middle"), stage("Old or New?", "📜", [sortT("bible-books", BOOKS, true, 6, f), politeT("bible-facts", BIBLE_FACTS, true, f)], 2), stage("Books in order", "🔢", [orderT("first-five", "Put the first five books in order", FIRST5, true, f), orderT("gospels", "Put the four Gospels in order", GOSPELS, true, f), politeT("bible-facts", BIBLE_FACTS, true, f)], 2), storyStage("samuel"), versesStage(["ps119-11", "1sam3-10"], "middle")] },
  { id: "heroes", title: "Heroes Harbor", emoji: "🦸", grade: "1", theme: "pirate", blurb: "Baby Moses, the Red Sea, and the walls of Jericho.",
    talk: ["Which hero would you like to be like? Why?", "How did God take care of baby Moses?"], challenge: "Be brave and obey God in one hard thing today, like Joshua.",
    stages: [storyStage("moses-baby"), storyStage("red-sea"), stage("Hero match", "🃏", [matchT("heroes", "Match each hero to what they did", HEROES_MATCH, true, f)]), storyStage("jericho"), versesStage(["josh24-15", "1sam17-47"], "middle")] },
  { id: "promise-point", title: "Promise Point", emoji: "✨", grade: "1", theme: "night", blurb: "Abraham's stars and God's Ten Commandments.",
    talk: ["What did God promise Abraham?", "Which commandment is hardest for you? Why?"], challenge: "Honor your parents with an extra-kind word today.",
    stages: [storyStage("abraham-stars"), versesStage(["gen15-6"], "middle"), storyStage("commandments"), stage("Love God, love others", "📜", [sortT("commandments", COMMANDMENTS, true, 6, f)], 2), versesStage(["ex20-12", "ex20-16"], "middle")] },
  { id: "faithful-fjord", title: "Faithful Fjord", emoji: "🧥", grade: "2", theme: "ice", blurb: "Joseph forgives, Ruth stays loyal, Esther is brave.",
    talk: ["How did Joseph forgive his brothers?", "Is there someone you need to forgive?"], challenge: "Forgive someone today — even for something small.",
    stages: [storyStage("joseph"), versesStage(["gen50-20"], "middle"), stage("Forgive like Joseph", "🤗", [rewindT("forgive", FORGIVE, true, { ns: f })], 2), storyStage("ruth"), versesStage(["ruth1-16"], "middle"), storyStage("esther"), versesStage(["esther4-14"], "middle")] },
  { id: "miracles", title: "Miracle Marina", emoji: "🎣", grade: "2", theme: "deep", blurb: "Full nets, walking on water, eyes opened, and Lazarus alive.",
    talk: ["What does walking on water teach about keeping our eyes on Jesus?", "What would you ask Jesus for, like Bartimaeus?"], challenge: "When you feel scared today, whisper, “Jesus, help me.”",
    stages: [storyStage("fishers"), versesStage(["matt4-19"], "middle"), storyStage("walking-water"), storyStage("bartimaeus"), versesStage(["mark4-41"], "middle"), storyStage("lazarus"), stage("What miracles show", "✨", [matchT("miracles", "Match each miracle to what it shows about Jesus", MIRACLES, true, f)], 2)] },
  { id: "parables", title: "Parable Point", emoji: "🌱", grade: "2", theme: "kelp", blurb: "Stories Jesus told: the Good Samaritan, the son who came home, the wise builder.",
    talk: ["Who is your neighbor?", "How is God like the father who ran to his son?"], challenge: "Show mercy to someone who needs help today.",
    stages: [storyStage("good-samaritan"), versesStage(["matt22-39"], "middle"), stage("Be a good neighbor", "🩹", [rewindT("neighbor", NEIGHBOR, true, { ns: f })]), storyStage("prodigal-son"), versesStage(["luke19-10"], "middle"), storyStage("wise-builder"), stage("Story meanings", "🌱", [matchT("parables", "Match each story to its lesson", PARABLES, true, f), politeT("parable-q", PARABLE_Q, true, f)], 2)] },
  { id: "fruit-grove", title: "Fruit Grove Isle", emoji: "🍇", grade: "2", theme: "jungle", blurb: "Love, joy, peace, patience… the fruit God's Spirit grows in us.",
    talk: ["Which fruit of the Spirit is easiest for you? Hardest?", "Which fruit did you see in someone today?"], challenge: "Pick one fruit of the Spirit and show it on purpose today.",
    stages: [versesStage(["gal5-22"], "middle"), stage("Fruit in order", "🍇", [orderWindowT("fruit", "Put the fruit of the Spirit in order", FRUIT, 4, true, f), matchT("fruit-match", "Match each fruit to what it looks like", FRUIT_MATCH, true, f)], 2), stage("Which fruit?", "🍎", [politeT("which-fruit", WHICH_FRUIT, true, f)], 2), versesStage(["prov3-5a", "luke10-27"], "middle")] },
  { id: "prayer-pier", title: "Prayer Pier", emoji: "🙏", grade: "2", theme: "sky", blurb: "Praise, sorry, thanks and please — and the prayer Jesus taught.",
    talk: ["What's one thing you can thank God for and one thing you can ask Him for?", "What did Jesus teach us to pray?"], challenge: "Pray a “Praise, Sorry, Thanks, Please” prayer with your family tonight.",
    stages: [versesStage(["1thes5-17"], "middle"), stage("Four kinds of prayer", "🙌", [sortManyT("prayer-parts", PRAYER_PARTS, true, 2, f)], 2), versesStage(["matt6-9"], "middle"), stage("The Lord's Prayer", "📜", [orderWindowT("lords-prayer", "Put the Lord's Prayer in order", LORDS_PRAYER, 4, true, f), politeT("prayer", PRAYER_MID, true, f)], 2), stage("Thank You, God", "🙏", [reflectT("thanks", THANKS, true, f), politeT("prayer", PRAYER_MID, true, f)])] },
  { id: "truth-trust", title: "Truth & Trust Isle", emoji: "🧭", grade: "2", theme: "pirate", blurb: "Honest words, obeying parents, and doing right when no one sees.",
    talk: ["Why does God care so much about telling the truth?", "What does it look like to honor your parents?"], challenge: "Be honest about something hard today — and see how it feels.",
    stages: [versesStage(["prov12-22"], "middle"), stage("Truth tellers", "🗣️", [rewindT("truth", TRUTH_MID, true, { ns: f, trust: true })], 2), versesStage(["col3-20"], "middle"), stage("Honor and obey", "👍", [rewindT("obey", OBEY_MID, true, { ns: f })], 2), versesStage(["prov20-11", "john14-15", "matt5-16"], "middle")] },

  // Lighthouse Keepers
  { id: "big-story", title: "The Big Story", emoji: "🗺️", grade: "3", theme: "pirate", blurb: "From creation to new creation: how the whole Bible fits together.",
    talk: ["Where are we in God's big story today?", "How does the Old Testament point to Jesus?"], challenge: "Read the first chapter of John with your family.",
    stages: [versesStage(["john1-1"], "big"), stage("The timeline", "🗺️", [orderWindowT("timeline", "Put the Bible's big story in order", TIMELINE, 5, false, f)], 2), versesStage(["2tim3-16"], "big"), stage("Bible sections", "📚", [matchT("sections", "Match each book to its section", SECTIONS, false, f), politeT("big-facts", BIG_FACTS, false, f)], 2), versesStage(["heb11-1"], "big")] },
  { id: "who-is-jesus", title: "Who Is Jesus?", emoji: "👑", grade: "3", theme: "sky", blurb: "The Son of God: promised, baptized, fully God and fully human.",
    talk: ["Which “I am” statement means the most to you?", "Why does it matter that Jesus is fully God AND fully human?"], challenge: "Ask a grown-up which name of Jesus is their favorite, and why.",
    stages: [storyStage("baptism"), versesStage(["john14-6"], "big"), stage("“I am…”", "💡", [matchT("i-am", "Match each “I am” to what it means", IAM, false, f)], 2), storyStage("temple-boy"), versesStage(["luke2-52", "isa9-6"], "big"), stage("Promises kept", "📜", [matchT("prophecy", "Match each promise to where it was written", PROPHECY, false, f), sortT("god-man", GOD_MAN, false, 6, f)], 2), versesStage(["john8-12", "matt1-21"], "big")] },
  { id: "grace", title: "Grace Gulf", emoji: "✝️", grade: "3", theme: "deep", blurb: "Saved by grace through faith — a gift, not a paycheck.",
    talk: ["What's the difference between a gift and a paycheck?", "How would you explain the gospel to a friend?"], challenge: "Explain the gospel to your grown-up in four parts: God, sin, Jesus, trust.",
    stages: [versesStage(["eph2-8"], "big"), stage("Gift or earned?", "🎁", [sortT("grace", GIFT_SORT, false, 6, f), politeT("assurance", ASSURANCE, false, f)], 2), versesStage(["isa53-6"], "big"), stage("The Romans Road", "🛤️", [orderT("romans-road", "Walk the Romans Road in order", ROMANS, false, f), matchT("romans-match", "Match each verse to what it says", ROMANS_MATCH, false, f), politeT("romans", ROMANS_Q, false, f)]), versesStage(["rom10-9", "rom10-13"], "big"), stage("Share it", "💬", [slotsT("explain", "Build the good news, part by part", EXPLAIN, false, f), politeT("assurance", ASSURANCE, false, f), politeT("romans", ROMANS_Q, false, f), reflectT("saved", SAVED_BIG, false, f)], 2), versesStage(["1jn5-13", "2cor5-17"], "big")] },
  { id: "integrity", title: "Integrity Isle", emoji: "🧭", grade: "4", theme: "volcano", blurb: "Jacob, Achan, Gehazi and David — what lies cost, and how confession heals.",
    talk: ["Which story showed most clearly that lies come out?", "Why is confessing better than covering up?"], challenge: "If you've been hiding something, tell your grown-up today. Truth sets you free.",
    stages: [storyStage("jacob-esau"), versesStage(["prov10-9"], "big"), storyStage("achan"), versesStage(["num32-23"], "big"), stage("Bible detective", "🔍", [spotT("bible-detective", "Find the dishonest moves", BIBLE_DETECTIVE, false, f)], 2), storyStage("gehazi"), versesStage(["luke16-10"], "big"), storyStage("david-nathan"), versesStage(["prov28-13"], "big"), stage("Integrity choices", "⚖️", [politeT("integrity", DILEMMA_FAITH, false, f)], 2), versesStage(["eph4-25", "ps34-13"], "big")] },
  { id: "tongue", title: "Tongue Tamer Straits", emoji: "🔥", grade: "4", theme: "storm", blurb: "A small rudder steers a big ship: attitude, complaining and words that build.",
    talk: ["How is your tongue like a ship's rudder?", "When is it hardest to give a soft answer?"], challenge: "Go a whole day without complaining. Notice how it changes your mood.",
    stages: [versesStage(["james3-4", "james3-5"], "big"), stage("Rewind your words", "⏪", [rewindT("tongue", TONGUE, false, { ns: f })], 2), versesStage(["prov15-1"], "big"), stage("A soft answer", "🕊️", [slotsT("soft-answer", "Build a soft answer", SOFT_KIT, false, f), rewindT("tongue", TONGUE, false, { ns: f })], 2), versesStage(["eph4-29", "phil2-14"], "big"), stage("Grateful or grumbling?", "😊", [sortT("complain", COMPLAIN, false, 6, f)]), versesStage(["james1-19", "ps141-3", "ps19-14"], "big")] },
  { id: "armor", title: "Armor Isle", emoji: "🛡️", grade: "4", theme: "ice", blurb: "Belt, breastplate, shoes, shield, helmet and sword — the armor of God.",
    talk: ["Which piece of armor do you need most this week?", "How did Jesus use God's Word against temptation?"], challenge: "Memorize one verse you can use when you're tempted.",
    stages: [versesStage(["eph6-11"], "big"), stage("The armor", "🛡️", [matchT("armor", "Match each piece of armor to what it means", ARMOR, false, f), orderT("armor-order", "Put on the armor in the order Paul lists it", ARMOR_ORDER, false, f)], 2), storyStage("temptation"), versesStage(["eph6-17", "matt4-4"], "big"), stage("Suit up!", "⚔️", [politeT("armor-use", ARMOR_USE, false, f)], 2), versesStage(["1cor10-13"], "big")] },
  { id: "mountain", title: "Mountain Teachings", emoji: "⛰️", grade: "5", theme: "sky", blurb: "The Sermon on the Mount: blessed people, salt, light, and the Golden Rule.",
    talk: ["Which Beatitude surprises you most?", "Who is hard to love? How could you treat them like you'd want to be treated?"], challenge: "Do something kind for someone who isn't always kind to you.",
    stages: [versesStage(["matt5-9", "matt5-8"], "big"), stage("The Beatitudes", "🌄", [matchT("beatitudes", "Match each blessing to its promise", BEATITUDES, false, f)], 2), versesStage(["matt7-12"], "big"), stage("The Golden Rule", "🔄", [rewindT("golden-rule", GOLDEN, false, { ns: f })], 2), versesStage(["matt5-44", "matt6-33"], "big"), stage("Salt, light and worry", "💡", [politeT("salt-light", SALT_LIGHT, false, f), politeT("worry", WORRY, false, f)], 2), versesStage(["matt7-24"], "big")] },
  { id: "acts", title: "Acts Adventure", emoji: "⛵", grade: "5", theme: "storm", blurb: "Wind and fire, a light on the road, songs in jail, and a shipwreck.",
    talk: ["How did the Holy Spirit change Peter?", "What gives you courage to talk about Jesus?"], challenge: "Tell one person something true about Jesus this week.",
    stages: [storyStage("pentecost"), versesStage(["acts1-8"], "big"), storyStage("saul"), storyStage("jail-songs"), versesStage(["rom1-16"], "big"), storyStage("shipwreck"), stage("The story of Acts", "🗺️", [orderWindowT("acts", "Put the events of Acts in order", ACTS, 5, false, f)], 2), versesStage(["matt28-19"], "big")] },
  { id: "wisdom", title: "Wisdom Wharf", emoji: "🦉", grade: "5", theme: "pirate", blurb: "Proverbs for real life: trust, pride, hard work, friendship and self-control.",
    talk: ["Which proverb do you need most right now?", "What's the difference between being smart and being wise?"], challenge: "Pick one proverb and live it out on purpose this week.",
    stages: [versesStage(["prov3-5"], "big"), stage("Proverb match", "🦉", [matchT("proverbs", "Match each proverb to its meaning", PROVERBS, false, f)], 2), versesStage(["prov1-7", "prov22-1"], "big"), stage("Wisdom in action", "🧠", [politeT("apply-proverbs", APPLY, false, f)], 2), versesStage(["prov16-18", "prov16-32", "prov6-6", "prov1-8"], "big")] },
  { id: "servant", title: "Servant's Harbor", emoji: "🤝", grade: "5", theme: "coral", blurb: "Jesus washes feet: humble, honest, serving love.",
    talk: ["How did Jesus show greatness by serving?", "Where could you serve without being asked this week?"], challenge: "Do a secret act of service at home — don't tell anyone.",
    stages: [storyStage("foot-washing"), versesStage(["mark10-45"], "big"), stage("Serve like Jesus", "🤲", [rewindT("serve", SERVE, false, { ns: f })], 2), versesStage(["phil2-3"], "big"), stage("Humble or proud?", "🙇", [sortT("humble", HUMBLE, false, 6, f)]), storyStage("peter-restored"), versesStage(["john13-34", "col3-23"], "big"), storyStage("ananias"), versesStage(["1jn3-18", "1tim4-12", "micah6-8", "matt22-37"], "big")] },
];

export const FAITH: Course = {
  id: "faith",
  title: "Lighthouse",
  emoji: "✝️",
  tagline: "Jesus & the Bible",
  units: buildWorlds("faith", "faith", WORLDS, 0),
  itemsFor: makeItemsFor(WORLDS),
};
