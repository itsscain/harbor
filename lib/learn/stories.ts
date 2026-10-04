import type { Activity, Band, StoryScene } from "./types";
import { pick, pickN, shuffle, type Rng, type Topic } from "./gen";

// Bible stories as experiences: told scene by scene (in our own words, faithful to the passage),
// with something to DO in most scenes — hammer the ark, gather the five stones, march around
// Jericho seven times, roll the stone away. Doing beats watching: acting a story out is one of the
// best-studied ways children understand and remember it. Then the story comes back as retrieval
// practice — put it in order, quick true-or-not, and "why" questions — under one skill per story
// ("f:story:<id>"), so a story that's slipping returns in review.

export type StoryQ = { q: string; a: string; w: [string, string]; why: string; e?: string };
export type Story = {
  id: string;
  title: string;
  emoji: string;
  ref: string;
  band: Band;
  scenes: StoryScene[];
  /** Events in order. */
  order: [string, string][];
  quiz: StoryQ[];
  /** Quick true-or-not statements. */
  tf: [string, boolean][];
  /** The big idea in one line. */
  lesson: string;
  /** A hero card earned by passing its level. */
  hero?: string;
  /** Skill namespace: "f" (Lighthouse, the default) or "h" (Captain's Code stories). */
  ns?: "f" | "h";
};

const sq = (q: string, a: string, w: [string, string], why: string, e?: string): StoryQ => ({ q, a, w, why, e });

export const STORIES: Story[] = [
  // ── Little Lights ─────────────────────────────────────────────────────────────────────────
  {
    id: "creation", title: "God Makes Everything", emoji: "🌍", ref: "Genesis 1–2", band: "little",
    scenes: [
      { sky: "night", art: "🌑", text: "In the beginning, there was nothing at all — only God. Then God spoke: “Let there be light!”", act: { type: "tap", prompt: "Tap to make light!", target: "🌑", n: 1, after: "☀️", afterSky: "day" } },
      { sky: "sea", top: "☁️☁️", art: "🌊", text: "God made the big blue sky. He gathered the waters into seas, and dry land popped up!", act: { type: "tap", prompt: "Tap the water to make land!", target: "🌊", n: 3, after: "🏝️" } },
      { sky: "garden", art: "🌳", ground: "🌷🌱🌻", text: "God covered the land with grass, flowers, and trees full of fruit.", act: { type: "collect", prompt: "Tap the seeds to plant them!", items: ["🌱", "🌱", "🌱", "🌱"], into: "🌳" } },
      { sky: "night", top: "🌙", art: "☀️", text: "God made the sun to shine in the day, and the moon and stars to glow at night.", act: { type: "collect", prompt: "Tap the stars to light up the night!", items: ["⭐", "⭐", "⭐", "⭐", "⭐"], into: "🌙" } },
      { sky: "sea", top: "🐦🦜", art: "🐳", ground: "🐟🐠🐙", text: "God filled the seas with fish and whales, and the sky with birds.", act: { type: "collect", prompt: "Tap the fish to send them swimming!", items: ["🐟", "🐠", "🐡", "🐙"], into: "🌊" } },
      { sky: "garden", art: "🦁🐘👫", ground: "🐶🐰🐢", text: "God made all the animals. Then God made people — a man and a woman — to know Him and love Him." },
      { sky: "dawn", art: "🌄", text: "God looked at everything He made and said, “It is very good!” On the seventh day, God rested." },
    ],
    order: [["God made light", "💡"], ["God made the sky and the sea", "🌊"], ["God made plants and trees", "🌳"], ["God made the sun, moon and stars", "🌙"], ["God made fish and birds", "🐟"], ["God made animals and people", "👫"], ["God rested", "😌"]],
    quiz: [
      sq("Who made everything?", "God", ["People", "The animals"], "God made everything — the sky, the sea, the animals, and you!", "🌍"),
      sq("What did God make first?", "Light", ["Animals", "People"], "First God said, “Let there be light!”", "💡"),
      sq("What did God say about everything He made?", "It is very good!", ["It is boring.", "It is broken."], "God looked at all He made and said it was very good.", "🌈"),
      sq("What did God do on the seventh day?", "He rested", ["He made more animals", "He went far away"], "On the seventh day, God rested.", "😌"),
      sq("Who did God make to know Him and love Him?", "People", ["Rocks", "Clouds"], "God made people to know and love Him — that includes you!", "👫"),
    ],
    tf: [["God made the sun and the moon.", true], ["People made the ocean.", false], ["God made the animals.", true], ["The trees made themselves.", false]],
    lesson: "God made everything, and everything He made is very good.",
  },
  {
    id: "noah", title: "Noah's Big Boat", emoji: "🚢", ref: "Genesis 6–9", band: "little", hero: "noah",
    scenes: [
      { sky: "day", art: "🧔🙏", ground: "🌿🌳🌿", text: "A long time ago, people forgot about God and did lots of wrong things. But Noah loved God and obeyed Him." },
      { sky: "day", art: "🔨", ground: "🪵🪵🪵", text: "God told Noah, “Build a giant boat called an ark.” So Noah got to work!", act: { type: "tap", prompt: "Tap to help Noah build!", target: "🔨", n: 5, after: "🚢" } },
      { sky: "day", art: "🚢", ground: "🦁🦒🐘🐧", text: "God sent the animals to the ark, two by two.", act: { type: "collect", prompt: "Tap the animals to fill the ark!", items: ["🦁", "🦁", "🦒", "🦒", "🐘", "🐘"], into: "🚢" } },
      { sky: "storm", top: "⛈️🌧️⛈️", art: "🚢", ground: "🌊🌊🌊", text: "Then the rain came down for forty days and forty nights. Water covered everything — but God kept Noah's family and the animals safe inside the ark." },
      { sky: "day", top: "☀️", art: "🚢🕊️", ground: "⛰️", text: "At last the rain stopped. Noah sent out a dove, and it came back with a green leaf. Dry land!", act: { type: "tap", prompt: "Tap the dove!", target: "🕊️", n: 1, after: "🌿" } },
      { sky: "day", top: "🌈", art: "🧔👨‍👩‍👧‍👦", ground: "🐾🐾", text: "God put a rainbow in the sky. It was His promise: He would never flood the whole earth again. God always keeps His promises!" },
    ],
    order: [["Noah loved and obeyed God", "🙏"], ["Noah built the ark", "🔨"], ["The animals came two by two", "🦒"], ["It rained for forty days", "🌧️"], ["The dove brought a leaf", "🕊️"], ["God made a rainbow promise", "🌈"]],
    quiz: [
      sq("Why did God choose Noah?", "Noah loved and obeyed God", ["Noah was the tallest", "Noah had the biggest house"], "Noah loved God and obeyed Him, even when no one else did.", "🙏"),
      sq("What did Noah build?", "A giant boat called an ark", ["A tall tower", "A castle"], "God told Noah to build an ark, and Noah obeyed.", "🚢"),
      sq("How did the animals come to the ark?", "Two by two", ["All in a big pile", "One giant elephant at a time"], "The animals came two by two.", "🦒"),
      sq("What did the dove bring back?", "A green leaf", ["A fish", "A shiny rock"], "The leaf meant dry land was coming back!", "🌿"),
      sq("What does the rainbow remind us?", "God keeps His promises", ["It's time for lunch", "It's going to snow"], "The rainbow is God's promise — and God always keeps His promises.", "🌈"),
      sq("How long did it rain?", "Forty days and forty nights", ["Five minutes", "One afternoon"], "It rained for forty days and forty nights.", "🌧️"),
    ],
    tf: [["Noah obeyed God.", true], ["Noah's ark could fly.", false], ["God kept Noah safe.", true], ["God forgot His promise.", false]],
    lesson: "God keeps His promises, and He blesses people who obey Him.",
  },
  {
    id: "lost-sheep", title: "The Lost Sheep", emoji: "🐑", ref: "Luke 15:3–7", band: "little",
    scenes: [
      { sky: "garden", art: "🧑‍🌾", ground: "🐑🐑🐑🐑🐑", text: "Jesus told a story about a shepherd who had one hundred sheep. He loved every single one." },
      { sky: "dusk", art: "🧑‍🌾❓", ground: "🐑🐑🐑🐑", text: "One evening he counted them… ninety-seven, ninety-eight, ninety-nine… One sheep was missing!" },
      { sky: "dusk", art: "⛰️🌳", text: "The shepherd left the ninety-nine safe and went searching — over hills, behind rocks, through the bushes.", act: { type: "find", prompt: "Find the lost sheep!", target: "🐑", decoys: ["🪨", "🌳", "🪨", "🌵", "🌳", "🪨"] } },
      { sky: "day", art: "🧑‍🌾🐑", text: "He found it! He lifted the little sheep onto his shoulders and carried it all the way home." },
      { sky: "day", art: "🎉🧑‍🌾🐑", ground: "🧑‍🤝‍🧑🧑‍🤝‍🧑", text: "He called his friends: “Be happy with me — I found my lost sheep!” Jesus said God is like that shepherd. He loves you and never stops looking for you." },
    ],
    order: [["The shepherd had 100 sheep", "🐑"], ["One sheep got lost", "❓"], ["He searched everywhere", "🔍"], ["He found it and carried it home", "🧑‍🌾"], ["He had a happy party", "🎉"]],
    quiz: [
      sq("How many sheep did the shepherd have?", "One hundred", ["Two", "Ten"], "He had one hundred sheep — and he loved every one.", "🐑"),
      sq("What did the shepherd do when one was lost?", "Searched until he found it", ["Said, “Oh well”", "Bought a new sheep"], "He looked and looked until he found it.", "🔍"),
      sq("How did the shepherd feel when he found it?", "Very happy", ["Grumpy", "Bored"], "He was so happy he threw a party!", "🎉"),
      sq("Who is like the shepherd in the story?", "God", ["A wolf", "A grumpy farmer"], "God loves us like that shepherd and never stops looking for us.", "💖"),
    ],
    tf: [["The shepherd loved his sheep.", true], ["The shepherd gave up looking.", false], ["God loves you that much.", true]],
    lesson: "God loves every one of us and never stops looking for us.",
  },
  {
    id: "david-goliath", title: "David and the Giant", emoji: "🪨", ref: "1 Samuel 17", band: "little", hero: "david",
    scenes: [
      { sky: "day", top: "📢", art: "🛡️⚔️", ground: "⛺⛺", text: "A giant soldier named Goliath stomped out every day and shouted, “Who will fight me?” Everyone in God's army was afraid." },
      { sky: "day", art: "👦🐑", text: "A shepherd boy named David brought food to his brothers. He heard Goliath and said, “I'm not afraid. God will help me!”" },
      { sky: "day", art: "🏞️", ground: "🪨🪨🪨🪨🪨", text: "David went down to the stream and chose five smooth stones.", act: { type: "collect", prompt: "Tap five smooth stones!", items: ["🪨", "🪨", "🪨", "🪨", "🪨"], into: "👝" } },
      { sky: "day", art: "👦💫", text: "David put a stone in his sling, swung it around and around, and let it fly!", act: { type: "tap", prompt: "Tap to swing the sling!", target: "💫", n: 3, after: "💥" } },
      { sky: "day", art: "🎉👦", ground: "🙌🙌🙌", text: "The stone hit Goliath, and the giant fell down — BOOM! David said, “The battle is the LORD's!”" },
    ],
    order: [["Goliath shouted, “Who will fight me?”", "📢"], ["David said God would help him", "🙏"], ["David picked five smooth stones", "🪨"], ["David swung his sling", "💫"], ["The giant fell down", "💥"]],
    quiz: [
      sq("Who was the giant?", "Goliath", ["Noah", "Daniel"], "Goliath was the giant who scared everyone.", "🛡️"),
      sq("Why wasn't David afraid?", "He trusted God to help him", ["He was taller than Goliath", "He had the biggest sword"], "David trusted God — that's what made him brave.", "🙏"),
      sq("What did David use?", "A sling and a stone", ["A rocket", "A giant sword"], "David used a sling and one smooth stone.", "🪨"),
      sq("How many stones did David pick up?", "Five", ["One", "Twenty"], "He picked five smooth stones from the stream.", "🖐️"),
      sq("Who really won the battle?", "God", ["The giant", "The other soldiers"], "David said, “The battle is the LORD's!”", "⭐"),
    ],
    tf: [["David trusted God.", true], ["David used a big rocket.", false], ["God helped David.", true]],
    lesson: "When we face giant problems, God is bigger.",
  },
  {
    id: "daniel-lions", title: "Daniel and the Lions", emoji: "🦁", ref: "Daniel 6", band: "little", hero: "daniel",
    scenes: [
      { sky: "indoor", top: "🪟", art: "🧔🙏", text: "Daniel loved God. Three times every day, he knelt by his window and prayed." },
      { sky: "indoor", art: "🤴📜", ground: "😠😠", text: "Some jealous men tricked the king into making a new rule: “No one may pray to God — only to the king!”" },
      { sky: "indoor", art: "🧔🙏", text: "But Daniel kept praying to God, just like always. The men ran to tell the king." },
      { sky: "night", art: "🦁🧔🦁", text: "Daniel was put into a den of hungry lions! But God sent an angel to shut the lions' mouths.", act: { type: "tap", prompt: "Tap the lion to close its mouth!", target: "🦁", n: 3, after: "😴" } },
      { sky: "dawn", art: "🤴😃🧔", text: "In the morning, the king ran to the den. “Daniel, did your God save you?” “Yes! God shut the lions' mouths!” The king was so happy." },
    ],
    order: [["Daniel prayed three times a day", "🙏"], ["Jealous men tricked the king", "📜"], ["Daniel kept praying anyway", "🧔"], ["Daniel went into the lions' den", "🦁"], ["God shut the lions' mouths", "😴"], ["The king was glad in the morning", "🤴"]],
    quiz: [
      sq("What did Daniel do three times a day?", "Prayed to God", ["Ate cake", "Took a nap"], "Daniel prayed to God every day — even when it was hard.", "🙏"),
      sq("What did the tricky new rule say?", "Pray only to the king", ["Eat more vegetables", "Feed the lions"], "The tricky rule said to pray only to the king.", "📜"),
      sq("What did Daniel do about the rule?", "He kept praying to God", ["He stopped praying", "He hid under his bed"], "Daniel kept obeying God, no matter what.", "🧔"),
      sq("Who shut the lions' mouths?", "God's angel", ["The king", "A zookeeper"], "God sent an angel to shut the lions' mouths.", "😇"),
      sq("How did the king feel in the morning?", "Glad", ["Angry", "Sleepy"], "The king was glad Daniel was safe!", "🤴"),
    ],
    tf: [["Daniel loved God.", true], ["Daniel stopped praying.", false], ["God kept Daniel safe.", true]],
    lesson: "Keep loving and praying to God — He is with you.",
  },
  {
    id: "jesus-born", title: "Baby Jesus Is Born", emoji: "⭐", ref: "Luke 1–2; Matthew 2", band: "little", hero: "mary",
    scenes: [
      { sky: "indoor", art: "👼👩", text: "An angel visited a young woman named Mary. “Don't be afraid! You will have a baby boy, and you will name Him Jesus. He is God's Son!”" },
      { sky: "desert", art: "🐴👩🧔", ground: "🌵", text: "Mary and Joseph traveled a long way to the little town of Bethlehem." },
      { sky: "night", top: "⭐", art: "🏠🚫", text: "The town was so crowded, there was no room for them anywhere. So they stayed where the animals slept." },
      { sky: "night", top: "⭐", art: "👶", ground: "🐄🐑🐴", text: "That night, baby Jesus was born! Mary wrapped Him in cloths and laid Him in a manger — a feeding box for animals." },
      { sky: "night", top: "✨", art: "🧑‍🌾🐑", text: "Angels appeared to shepherds in the fields: “Good news! A Savior is born today!” The shepherds hurried to see Him.", act: { type: "tap", prompt: "Tap the sky to see the angels!", target: "✨", n: 3, after: "👼" } },
      { sky: "night", top: "🌟", art: "🐫🐫🐫", text: "Wise men followed a bright star from far away. They brought gifts for King Jesus: gold, frankincense, and myrrh.", act: { type: "collect", prompt: "Tap the gifts for baby Jesus!", items: ["🎁", "🎁", "🎁"], into: "👶" } },
    ],
    order: [["An angel visited Mary", "👼"], ["Mary and Joseph went to Bethlehem", "🐴"], ["Jesus was born and laid in a manger", "👶"], ["Angels told the shepherds", "🧑‍🌾"], ["Wise men brought gifts", "🎁"]],
    quiz: [
      sq("Where was Jesus born?", "Bethlehem", ["A big city castle", "On a boat"], "Jesus was born in the little town of Bethlehem.", "⭐"),
      sq("Where did Mary lay baby Jesus?", "In a manger", ["In a race car", "In a treehouse"], "A manger is a feeding box for animals — that was Jesus' first bed.", "👶"),
      sq("Who told the shepherds the good news?", "Angels", ["A dog", "The king"], "Angels told the shepherds, “A Savior is born!”", "👼"),
      sq("What led the wise men to Jesus?", "A bright star", ["A map from the store", "A kite"], "The wise men followed a bright star.", "🌟"),
      sq("Who is Jesus?", "God's Son, our Savior", ["Just a regular baby", "A shepherd boy"], "Jesus is God's Son, born to be our Savior.", "✝️"),
    ],
    tf: [["Jesus was born in Bethlehem.", true], ["Jesus was born in a castle.", false], ["Angels told the shepherds about Jesus.", true]],
    lesson: "Jesus, God's Son, was born to be our Savior.",
  },
  {
    id: "calm-storm", title: "Jesus Calms the Storm", emoji: "⛵", ref: "Mark 4:35–41", band: "little",
    scenes: [
      { sky: "dusk", art: "⛵", ground: "🌊", text: "One evening, Jesus and His friends climbed into a boat to cross the lake." },
      { sky: "dusk", art: "⛵😴", ground: "🌊", text: "Jesus was tired, so He lay down in the back of the boat and fell asleep." },
      { sky: "storm", top: "⛈️⚡⛈️", art: "⛵", ground: "🌊🌊🌊", text: "Suddenly — WHOOSH! A huge storm! Wind howled and waves crashed into the boat. His friends were so scared!" },
      { sky: "storm", art: "😨🙏", text: "They woke Jesus up: “Teacher, help! Don't you care that we're sinking?”" },
      { sky: "storm", art: "🌊", text: "Jesus stood up and said to the wind and the waves, “Peace, be still.”", act: { type: "tap", prompt: "Tap the waves with Jesus: “Peace, be still!”", target: "🌊", n: 3, after: "🌤️", afterSky: "day" } },
      { sky: "day", art: "⛵😮", text: "Everything became calm. His friends whispered, “Who is this? Even the wind and the sea obey Him!”" },
    ],
    order: [["Jesus and His friends got in a boat", "⛵"], ["Jesus fell asleep", "😴"], ["A big storm came", "⛈️"], ["His friends woke Him up", "😨"], ["Jesus said, “Peace, be still”", "🌊"], ["The sea became calm", "🌤️"]],
    quiz: [
      sq("What was Jesus doing when the storm came?", "Sleeping", ["Fishing", "Swimming"], "Jesus was asleep in the back of the boat.", "😴"),
      sq("What did Jesus say to the storm?", "“Peace, be still.”", ["“Go away, rain!”", "“Help!”"], "Jesus said, “Peace, be still.” And the storm stopped!", "🌊"),
      sq("What happened after Jesus spoke?", "Everything became calm", ["The boat sank", "It started to snow"], "The wind and waves obeyed Jesus.", "🌤️"),
      sq("Why can we trust Jesus when we're scared?", "He is more powerful than any storm", ["Storms aren't real", "He was scared too"], "Even the wind and the sea obey Jesus!", "⛵"),
    ],
    tf: [["Jesus calmed the storm.", true], ["Jesus was afraid of the waves.", false], ["The wind obeyed Jesus.", true]],
    lesson: "Jesus is more powerful than any storm — we can trust Him when we're scared.",
  },
  {
    id: "feeding-5000", title: "Five Loaves and Two Fish", emoji: "🍞", ref: "John 6:1–14", band: "little", hero: "lunch-boy",
    scenes: [
      { sky: "day", art: "🧑‍🤝‍🧑🧑‍🤝‍🧑", ground: "⛰️", text: "A huge crowd — more than five thousand people! — followed Jesus up a hill to hear Him teach." },
      { sky: "day", art: "😋❓", text: "It got late, and everyone was hungry. Where could they find food for so many people?" },
      { sky: "day", art: "👦🧺", text: "A boy offered his lunch: five small loaves of bread and two little fish.", act: { type: "collect", prompt: "Tap the boy's lunch to give it to Jesus!", items: ["🍞", "🍞", "🍞", "🍞", "🍞", "🐟", "🐟"], into: "🙏" } },
      { sky: "day", art: "🙏🍞", text: "Jesus thanked God for the food and began to pass it out… and it kept going, and going, and going!" },
      { sky: "day", art: "😄🍞🐟", ground: "🧺🧺🧺", text: "Everyone ate until they were full! Then the disciples gathered the leftovers — twelve baskets full!" },
    ],
    order: [["A big crowd came to hear Jesus", "🧑‍🤝‍🧑"], ["Everyone got hungry", "😋"], ["A boy shared his lunch", "👦"], ["Jesus thanked God", "🙏"], ["Everyone ate, with twelve baskets left", "🧺"]],
    quiz: [
      sq("Who shared his lunch?", "A boy", ["A king", "A lion"], "A boy gave his lunch to Jesus.", "👦"),
      sq("What was in the boy's lunch?", "Five loaves and two fish", ["Pizza and ice cream", "Ten apples"], "Five small loaves and two little fish.", "🍞"),
      sq("What did Jesus do before passing out the food?", "He thanked God", ["He ate it all", "He threw it away"], "Jesus gave thanks to God first.", "🙏"),
      sq("How many baskets were left over?", "Twelve", ["Zero", "One"], "Twelve baskets of leftovers! Jesus gave more than enough.", "🧺"),
    ],
    tf: [["The boy shared his lunch.", true], ["Only one person got to eat.", false], ["There were leftovers.", true]],
    lesson: "Give what you have to Jesus — He can do amazing things with it.",
  },
  {
    id: "easter", title: "Jesus Is Alive!", emoji: "🌅", ref: "Matthew 21; 27–28", band: "little",
    scenes: [
      { sky: "day", art: "🐴", ground: "🌿🌿🌿", text: "Jesus rode into Jerusalem on a donkey. Crowds waved palm branches and shouted, “Hosanna!”", act: { type: "collect", prompt: "Tap the palm branches to wave them!", items: ["🌿", "🌿", "🌿", "🌿"], into: "🐴" } },
      { sky: "dusk", art: "✝️", text: "Jesus never did anything wrong. But because He loves us so much, He chose to die on a cross to take the punishment for our sins." },
      { sky: "night", art: "🪨", ground: "🌿", text: "His friends gently laid His body in a tomb, and a giant stone was rolled in front of the door. They were very sad." },
      { sky: "dawn", art: "🪨", text: "Early on Sunday morning, the third day, some women came to the tomb… and the stone was rolled away!", act: { type: "tap", prompt: "Tap to roll the stone away!", target: "🪨", n: 3, after: "🕳️" } },
      { sky: "glory", art: "👼", text: "An angel said, “Don't be afraid! He is not here: for He is risen, as He said!”" },
      { sky: "glory", art: "😃🙌", text: "Jesus is alive! His friends saw Him and were so happy. Jesus beat sin and death — and He is alive forever!" },
    ],
    order: [["Crowds waved palm branches", "🌿"], ["Jesus died on the cross for our sins", "✝️"], ["Jesus was laid in a tomb", "🪨"], ["The stone was rolled away", "🕳️"], ["Jesus is alive!", "🌅"]],
    quiz: [
      sq("Why did Jesus die on the cross?", "To take the punishment for our sins", ["Because He did something wrong", "By accident"], "Jesus never sinned. He died for our sins because He loves us.", "✝️"),
      sq("What did the women find on Sunday morning?", "The stone was rolled away", ["A picnic", "A locked door"], "The stone was rolled away — the tomb was empty!", "🪨"),
      sq("What did the angel say?", "“He is risen!”", ["“Go home.”", "“He is sleeping.”"], "“He is not here: for he is risen, as he said.”", "👼"),
      sq("Is Jesus alive today?", "Yes! Jesus is alive forever", ["No", "Only on holidays"], "Jesus rose again, and He is alive forever!", "🌅"),
      sq("How did the crowd welcome Jesus?", "They waved palm branches", ["They threw snowballs", "They hid"], "They waved palm branches and shouted, “Hosanna!”", "🌿"),
    ],
    tf: [["Jesus died for our sins.", true], ["Jesus stayed in the tomb.", false], ["Jesus is alive!", true]],
    lesson: "Jesus died for our sins and rose again — He is alive!",
  },
  {
    id: "jesus-kids", title: "Jesus Loves the Children", emoji: "🤗", ref: "Mark 10:13–16", band: "little",
    scenes: [
      { sky: "day", art: "👨‍👩‍👧‍👦", ground: "🧒👧🧒", text: "Moms and dads brought their children to see Jesus. They wanted Jesus to bless them." },
      { sky: "day", art: "🙅", text: "But Jesus' disciples said, “Shoo! Jesus is too busy for kids.”" },
      { sky: "day", art: "🙌", text: "Jesus said, “Let the little children come to me! Don't stop them. God's kingdom belongs to people like them.”" },
      { sky: "day", art: "🤗", text: "Jesus hugged the children, put His hands on them, and blessed them. Jesus loves kids — and He loves you!", act: { type: "collect", prompt: "Tap the kids to bring them to Jesus!", items: ["🧒", "👧", "👦", "👶"], into: "🤗" } },
    ],
    order: [["Families brought kids to Jesus", "👨‍👩‍👧‍👦"], ["The disciples said, “Go away”", "🙅"], ["Jesus said, “Let the children come”", "🙌"], ["Jesus hugged and blessed them", "🤗"]],
    quiz: [
      sq("What did the disciples say to the children?", "“Jesus is too busy”", ["“Come on in!”", "“Have a snack”"], "The disciples thought Jesus was too busy for kids.", "🙅"),
      sq("What did Jesus say?", "“Let the little children come to me”", ["“Come back later”", "“Only grown-ups allowed”"], "Jesus wanted the children to come to Him.", "🙌"),
      sq("How does Jesus feel about kids?", "He loves them", ["He's too busy", "He likes grown-ups more"], "Jesus loves kids — and He loves you!", "🤗"),
    ],
    tf: [["Jesus loves children.", true], ["Jesus sent the kids away.", false]],
    lesson: "Jesus loves children — He always has time for you.",
  },
  {
    id: "jonah", title: "Jonah and the Big Fish", emoji: "🐋", ref: "Jonah 1–3", band: "little", hero: "jonah",
    scenes: [
      { sky: "day", art: "🧔", text: "God told Jonah, “Go to the city of Nineveh and tell them to stop doing wrong.” But Jonah didn't want to go." },
      { sky: "sea", art: "🧔🚢", ground: "🌊", text: "Instead, Jonah ran the other way and got on a ship sailing far, far away." },
      { sky: "storm", top: "⛈️", art: "🚢", ground: "🌊🌊🌊", text: "God sent a big storm. Jonah knew it was because he ran from God. “Throw me into the sea,” he said — and the storm stopped." },
      { sky: "sea", art: "🐋", text: "God sent a huge fish to swallow Jonah! Jonah was inside the fish for three days and three nights.", act: { type: "tap", prompt: "Tap the big fish!", target: "🐋", n: 2, after: "🐳" } },
      { sky: "sea", art: "🙏", text: "Inside the fish, Jonah prayed: “I'm sorry, God. I'll obey You.” God heard him. The fish spit Jonah out onto dry land!" },
      { sky: "day", art: "🧔🏙️", text: "This time Jonah obeyed right away. He went to Nineveh, and the people turned back to God!" },
    ],
    order: [["God told Jonah to go to Nineveh", "🧔"], ["Jonah ran away on a ship", "🚢"], ["A big storm came", "⛈️"], ["A big fish swallowed Jonah", "🐋"], ["Jonah prayed and said sorry", "🙏"], ["Jonah obeyed and went to Nineveh", "🏙️"]],
    quiz: [
      sq("Did Jonah obey God at first?", "No, he ran away", ["Yes, right away", "He forgot"], "Jonah ran the other way — but God gave him another chance.", "🚢"),
      sq("What swallowed Jonah?", "A huge fish", ["A giant frog", "A cloud"], "God sent a huge fish to swallow Jonah.", "🐋"),
      sq("What did Jonah do inside the fish?", "He prayed", ["He played games", "He took a bath"], "Jonah prayed and told God he was sorry.", "🙏"),
      sq("What did Jonah do the second time?", "He obeyed right away", ["He ran away again", "He went fishing"], "Jonah obeyed, and the people listened to God.", "🏙️"),
      sq("What does Jonah teach us?", "Obey God — and God gives second chances", ["Big fish are scary", "Running away is fun"], "God wants us to obey, and He forgives when we're sorry.", "⭐"),
    ],
    tf: [["Jonah ran away from God at first.", true], ["Jonah lived in the fish forever.", false], ["God gave Jonah a second chance.", true]],
    lesson: "Obey God right away — and when we mess up, God gives second chances.",
  },
  {
    id: "zacchaeus", title: "Zacchaeus Climbs a Tree", emoji: "🌳", ref: "Luke 19:1–10", band: "little", hero: "zacchaeus",
    scenes: [
      { sky: "day", art: "🧔💰", text: "Zacchaeus collected taxes, and he cheated people — he took more money than he should. Nobody liked him." },
      { sky: "day", art: "🧑‍🤝‍🧑🧑‍🤝‍🧑", text: "One day Jesus came to town! Zacchaeus wanted to see Him, but he was too short to see over the crowd." },
      { sky: "day", art: "🌳", text: "So Zacchaeus climbed up a tree to get a better look!", act: { type: "tap", prompt: "Tap to help Zacchaeus climb!", target: "🌳", n: 4, after: "🧔" } },
      { sky: "day", art: "🌳🧔", text: "Jesus stopped right under the tree and looked up: “Zacchaeus, come down! I'm coming to your house today!”" },
      { sky: "indoor", art: "🧔💰", text: "Zacchaeus's heart changed. He said, “I'll give half of my things to the poor. And if I cheated anyone, I'll pay them back four times as much!”", act: { type: "collect", prompt: "Tap the coins to give them back!", items: ["🪙", "🪙", "🪙", "🪙"], into: "🧑‍🤝‍🧑" } },
      { sky: "day", art: "😊", text: "Jesus said, “I came to find and save people who are lost.” When Jesus changes our hearts, we want to make things right." },
    ],
    order: [["Zacchaeus cheated people", "💰"], ["He was too short to see Jesus", "🧑‍🤝‍🧑"], ["He climbed a tree", "🌳"], ["Jesus called him by name", "🗣️"], ["Zacchaeus paid people back", "🪙"]],
    quiz: [
      sq("Why did Zacchaeus climb a tree?", "He was too short to see Jesus", ["To pick apples", "To hide from his mom"], "He was short and wanted to see Jesus over the crowd.", "🌳"),
      sq("What had Zacchaeus been doing wrong?", "Cheating people out of money", ["Climbing trees", "Singing too loud"], "He took more money than he should have.", "💰"),
      sq("What did Jesus say to him?", "“Come down! I'm coming to your house”", ["“Stay up there!”", "“Go away”"], "Jesus wanted to be his friend — even before he changed.", "🗣️"),
      sq("How did Zacchaeus make things right?", "He paid people back four times", ["He said nothing", "He climbed another tree"], "A changed heart wants to make things right.", "🪙"),
    ],
    tf: [["Zacchaeus climbed a tree.", true], ["Jesus didn't notice Zacchaeus.", false], ["Zacchaeus paid people back.", true]],
    lesson: "Jesus loves us before we change — and His love makes us want to make things right.",
  },

  // ── Bright Beams ──────────────────────────────────────────────────────────────────────────
  {
    id: "moses-baby", title: "Baby in a Basket", emoji: "🧺", ref: "Exodus 2:1–10", band: "middle", hero: "miriam",
    scenes: [
      { sky: "day", art: "🤴😠", text: "In Egypt, a cruel king named Pharaoh made a terrible rule against the Hebrew baby boys." },
      { sky: "indoor", art: "👩👶", text: "One Hebrew mother loved her baby boy so much. She hid him for three months — but he was getting too big to hide!" },
      { sky: "day", art: "🧺👶", ground: "🌾🌊🌾", text: "She made a basket, sealed it so it wouldn't leak, and gently set her baby in it among the tall reeds of the Nile River.", act: { type: "tap", prompt: "Tap to float the basket gently!", target: "🧺", n: 2, after: "🌾" } },
      { sky: "day", art: "👧👀", text: "His big sister Miriam hid nearby and watched to see what would happen." },
      { sky: "day", art: "👸🧺", text: "Pharaoh's daughter came down to the river, found the crying baby, and felt sorry for him." },
      { sky: "day", art: "👧👸👩", text: "Brave Miriam stepped up: “Should I find a Hebrew woman to nurse him?” She brought the baby's own mother! The princess named him Moses." },
    ],
    order: [["Pharaoh made a cruel rule", "🤴"], ["Moses' mother hid him", "👶"], ["She set him in a basket on the river", "🧺"], ["Miriam watched", "👀"], ["The princess found baby Moses", "👸"], ["Moses' mother got to care for him", "👩"]],
    quiz: [
      sq("Where did Moses' mother put him?", "In a basket on the river", ["In a tree", "In a castle tower"], "She set him in a waterproof basket among the reeds.", "🧺"),
      sq("Who watched over the baby?", "His sister Miriam", ["A crocodile", "Pharaoh"], "Miriam watched to see what would happen.", "👧"),
      sq("Who found baby Moses?", "Pharaoh's daughter", ["A fisherman", "A shepherd"], "The princess found him and felt kind toward him.", "👸"),
      sq("What was brave about Miriam?", "She spoke up to the princess", ["She fought a lion", "She hid forever"], "Miriam spoke up — and brought Moses' own mother!", "👧"),
      sq("Who was really protecting Moses the whole time?", "God", ["Nobody", "The river"], "God was protecting Moses because He had a big plan for him.", "✨"),
    ],
    tf: [["Moses floated in a basket.", true], ["Miriam ran away.", false], ["God had a plan for Moses.", true]],
    lesson: "God watches over us, even when things look scary.",
  },
  {
    id: "red-sea", title: "Through the Red Sea", emoji: "🌊", ref: "Exodus 14", band: "middle", hero: "moses",
    scenes: [
      { sky: "desert", art: "🧔🧑‍🤝‍🧑", text: "God used Moses to lead His people out of slavery in Egypt. They were free at last!" },
      { sky: "desert", top: "🐎🐎", art: "🌊", ground: "🧑‍🤝‍🧑", text: "But Pharaoh changed his mind and chased them with his chariots. God's people were trapped between the army and the Red Sea!" },
      { sky: "desert", art: "🧔🌬️", text: "Moses said, “Don't be afraid. Watch what God will do!” He stretched his staff out over the sea.", act: { type: "tap", prompt: "Tap the sea to part it!", target: "🌊", n: 4, after: "🏜️" } },
      { sky: "desert", art: "🧑‍🤝‍🧑", ground: "🌊🏜️🌊", text: "God sent a strong wind all night. The water split into two walls, and the people walked through on DRY ground!" },
      { sky: "day", art: "🙌🎶", text: "When everyone was safe on the other side, the water rushed back. God's people sang and danced to thank Him!" },
    ],
    order: [["God's people left Egypt", "🧑‍🤝‍🧑"], ["Pharaoh's army chased them", "🐎"], ["Moses stretched out his staff", "🧔"], ["God split the sea", "🌊"], ["They walked through on dry ground", "🏜️"], ["They sang to thank God", "🎶"]],
    quiz: [
      sq("Who chased God's people?", "Pharaoh's army", ["A big fish", "Friendly shepherds"], "Pharaoh changed his mind and sent his army.", "🐎"),
      sq("What did Moses say?", "“Don't be afraid. Watch what God will do!”", ["“Run back to Egypt!”", "“Let's give up.”"], "Moses trusted God to rescue them.", "🧔"),
      sq("How did they cross the sea?", "On dry ground between walls of water", ["They swam", "They built a bridge"], "God split the sea so they could walk on dry ground!", "🏜️"),
      sq("What did the people do on the other side?", "Sang and thanked God", ["Complained", "Went back"], "They praised God for saving them.", "🎶"),
    ],
    tf: [["God split the Red Sea.", true], ["The people swam across.", false], ["God rescued His people.", true]],
    lesson: "When it looks like there's no way out, God can make a way.",
  },
  {
    id: "jericho", title: "The Walls of Jericho", emoji: "🎺", ref: "Joshua 6", band: "middle", hero: "joshua",
    scenes: [
      { sky: "day", art: "🏰", text: "The city of Jericho had huge, thick walls. How could God's people ever get in?" },
      { sky: "day", art: "🧔", text: "God gave Joshua an unusual plan: “March around the city once a day for six days. On the seventh day, march around seven times, blow the trumpets, and shout!”" },
      { sky: "day", art: "🎺🧑‍🤝‍🧑", ground: "🏰", text: "So they obeyed. Day after day they marched — quietly — around the walls." },
      { sky: "day", art: "🏰", text: "On the seventh day, they marched around seven times!", act: { type: "tap", prompt: "Tap seven times to march around Jericho!", target: "🏰", n: 7, after: "🧱" } },
      { sky: "day", art: "🎺📣", ground: "🧱💥🧱", text: "The priests blew their trumpets, the people SHOUTED — and the walls came tumbling down! God's plan worked." },
    ],
    order: [["Jericho had huge walls", "🏰"], ["God gave Joshua a plan", "🧔"], ["They marched for six days", "🚶"], ["They marched seven times on day seven", "7️⃣"], ["Trumpets blew, people shouted, walls fell", "🎺"]],
    quiz: [
      sq("How many days did they march around Jericho?", "Seven", ["One", "Twenty"], "Once a day for six days, then seven times on the seventh day.", "7️⃣"),
      sq("What happened when they shouted?", "The walls fell down", ["It rained", "The gate got locked"], "God made the walls tumble down!", "🧱"),
      sq("Why did the plan work?", "Because they obeyed God", ["Because they were strong", "Because the walls were old"], "God's plan works when we trust and obey.", "🙌"),
      sq("Who led God's people at Jericho?", "Joshua", ["Noah", "Jonah"], "Joshua led them and obeyed God's plan.", "🧔"),
    ],
    tf: [["They marched around Jericho.", true], ["They knocked down the walls with hammers.", false], ["God made the walls fall.", true]],
    lesson: "God's plans might seem strange, but obeying Him always works out.",
  },
  {
    id: "joseph", title: "Joseph's Colorful Coat", emoji: "🧥", ref: "Genesis 37–50", band: "middle", hero: "joseph",
    scenes: [
      { sky: "day", art: "🧥🧒", text: "Jacob gave his son Joseph a special, colorful coat. Joseph's older brothers were jealous." },
      { sky: "desert", art: "😠😠😠", ground: "🐫", text: "One day the brothers grabbed Joseph and sold him to traders headed for Egypt!" },
      { sky: "indoor", art: "🧥👴", text: "Then the brothers LIED. They dipped Joseph's coat in goat's blood and let their father believe a wild animal got him. Jacob was heartbroken." },
      { sky: "indoor", art: "⛓️🧒", text: "In Egypt, Joseph was a slave, and he was even put in jail for something he didn't do. But God was with Joseph." },
      { sky: "indoor", art: "🤴💭", text: "God helped Joseph explain Pharaoh's dreams: seven years of plenty, then seven hungry years. Pharaoh put Joseph in charge of saving food!", act: { type: "collect", prompt: "Tap the grain to store it up!", items: ["🌾", "🌾", "🌾", "🌾", "🌾"], into: "🏛️" } },
      { sky: "indoor", art: "🧔🤗", ground: "🧔🧔🧔", text: "Years later, his hungry brothers came to buy food. They were sorry for what they did. Joseph forgave them: “You meant it for evil, but God meant it for good.”" },
    ],
    order: [["Jacob gave Joseph a colorful coat", "🧥"], ["The jealous brothers sold Joseph", "😠"], ["The brothers lied to their father", "🤥"], ["Joseph went to jail in Egypt", "⛓️"], ["Joseph explained Pharaoh's dreams", "💭"], ["Joseph forgave his brothers", "🤗"]],
    quiz: [
      sq("Why were Joseph's brothers jealous?", "Their dad gave Joseph a special coat", ["Joseph was taller", "Joseph had a pet camel"], "Their jealousy grew into doing something terrible.", "🧥"),
      sq("What lie did the brothers tell?", "That a wild animal got Joseph", ["That Joseph went fishing", "That Joseph became king"], "They covered their sin with a lie — and it hurt their father deeply.", "🤥"),
      sq("Was God with Joseph in jail?", "Yes, God was with him", ["No, God forgot him", "Only on weekends"], "Even in jail, God was with Joseph and had a plan.", "⛓️"),
      sq("What did Joseph do when his brothers came?", "He forgave them", ["He threw them in jail", "He tricked them back forever"], "Joseph forgave — and saw how God brought good out of it.", "🤗"),
      sq("What did Joseph say about all that happened?", "“You meant it for evil, but God meant it for good”", ["“I'll get you back”", "“It was all luck”"], "God can bring good even out of bad things.", "🌈"),
    ],
    tf: [["Joseph's brothers lied to their dad.", true], ["Joseph never forgave them.", false], ["God was with Joseph.", true]],
    lesson: "Lies hurt people, but God can bring good from bad — and forgiveness heals.",
  },
  {
    id: "samuel", title: "God Calls Samuel", emoji: "👂", ref: "1 Samuel 3", band: "middle", hero: "samuel",
    scenes: [
      { sky: "night", top: "🕯️", art: "🧒😴", text: "Young Samuel lived at the temple and helped the old priest Eli. One night, Samuel was sleeping." },
      { sky: "night", art: "🧒❗", text: "“Samuel!” a voice called. Samuel ran to Eli: “Here I am!” But Eli said, “I didn't call you. Go back to bed.”" },
      { sky: "night", art: "🧒🏃👴", text: "It happened again — and again! Three times. Then Eli understood: God was calling Samuel!", act: { type: "tap", prompt: "Tap three times — “Samuel! Samuel!”", target: "🧒", n: 3, after: "👂" } },
      { sky: "night", art: "🧒🙏", text: "Eli said, “Next time, say: ‘Speak; for thy servant heareth.’” So Samuel did — and God spoke to him." },
      { sky: "day", art: "🧔📖", text: "Samuel grew up listening to God, and he became a great prophet who told people God's words." },
    ],
    order: [["Samuel was sleeping at the temple", "😴"], ["A voice called his name", "❗"], ["He ran to Eli three times", "🏃"], ["Eli said it was God calling", "👴"], ["Samuel said, “Speak, I'm listening”", "👂"]],
    quiz: [
      sq("Who was calling Samuel?", "God", ["Eli", "His mom"], "God was calling young Samuel!", "✨"),
      sq("How many times did Samuel run to Eli?", "Three", ["One", "Ten"], "Three times, before Eli understood.", "3️⃣"),
      sq("What did Samuel finally say to God?", "“Speak; for thy servant heareth.”", ["“Not now, I'm sleeping.”", "“Who's there?”"], "Samuel was ready to listen to God.", "👂"),
      sq("How can we listen to God today?", "By reading the Bible and praying", ["By turning up the TV", "By never being quiet"], "God speaks to us through His Word, the Bible.", "📖"),
    ],
    tf: [["God called Samuel's name.", true], ["Eli was the one calling Samuel.", false], ["Kids can listen to God.", true]],
    lesson: "Even kids can listen to God and obey.",
  },
  {
    id: "ruth", title: "Ruth Stays Loyal", emoji: "🌾", ref: "Ruth 1–4", band: "middle", hero: "ruth",
    scenes: [
      { sky: "desert", art: "👵👩👩", text: "Naomi's husband and sons had died. She decided to go back home to Bethlehem, sad and alone." },
      { sky: "desert", art: "👩🤝👵", text: "Her daughter-in-law Ruth said, “Where you go, I will go. Your people will be my people, and your God my God.” Ruth stayed loyal." },
      { sky: "garden", art: "👩🌾", text: "In Bethlehem, Ruth worked hard, picking up leftover grain in the fields to feed Naomi.", act: { type: "collect", prompt: "Tap the grain to help Ruth gather it!", items: ["🌾", "🌾", "🌾", "🌾", "🌾"], into: "🧺" } },
      { sky: "garden", art: "🧔🤲", text: "The owner of the field, Boaz, saw how kind and loyal Ruth was. He made sure she had plenty of food." },
      { sky: "day", art: "💒👶", text: "Boaz and Ruth got married and had a baby boy! Naomi was happy again. That baby became the great-grandpa of King David." },
    ],
    order: [["Naomi had to go home alone", "👵"], ["Ruth said, “Where you go, I will go”", "🤝"], ["Ruth gathered grain in the fields", "🌾"], ["Boaz was kind to Ruth", "🧔"], ["Ruth and Boaz had a baby", "👶"]],
    quiz: [
      sq("What did Ruth promise Naomi?", "“Where you go, I will go”", ["“I'm going back home”", "“You're on your own”"], "Ruth stayed loyal to Naomi.", "🤝"),
      sq("How did Ruth get food?", "She worked hard gathering grain", ["She took it from others", "She waited for someone else"], "Ruth worked hard to take care of Naomi.", "🌾"),
      sq("Why was Boaz kind to Ruth?", "He saw her kindness and loyalty", ["She was rich", "She asked for money"], "People noticed Ruth's good character.", "🧔"),
      sq("Who was Ruth's great-grandson?", "King David", ["Noah", "Moses"], "Ruth's family line led to King David — and later to Jesus!", "👑"),
    ],
    tf: [["Ruth stayed with Naomi.", true], ["Ruth was lazy.", false], ["God blessed Ruth's loyalty.", true]],
    lesson: "Loyal love and hard work honor God.",
  },
  {
    id: "esther", title: "Brave Queen Esther", emoji: "👑", ref: "Esther 2–9", band: "middle", hero: "esther",
    scenes: [
      { sky: "indoor", art: "👸", text: "Esther was a Jewish girl who became queen of Persia. Her cousin Mordecai had raised her." },
      { sky: "indoor", art: "😠📜", text: "A proud man named Haman tricked the king into making a law to destroy all the Jewish people!" },
      { sky: "indoor", art: "🧔👸", text: "Mordecai told Esther, “Maybe you became queen for such a time as this!” But going to the king without being called could cost her life." },
      { sky: "indoor", art: "👸🙏", text: "Esther asked everyone to pray and fast for three days. Then she said, “I will go to the king.”" },
      { sky: "indoor", art: "🤴👸", text: "The king held out his golden scepter — she was welcome! Esther bravely told the truth about Haman's plan.", act: { type: "tap", prompt: "Tap the golden scepter!", target: "✨", n: 1, after: "👑" } },
      { sky: "day", art: "🎉🧑‍🤝‍🧑", text: "The king stopped the plan, and God's people were saved! They still celebrate it every year." },
    ],
    order: [["Esther became queen", "👸"], ["Haman made an evil plan", "📜"], ["Mordecai said, “for such a time as this”", "🧔"], ["Esther prayed and fasted", "🙏"], ["Esther went to the king", "👑"], ["God's people were saved", "🎉"]],
    quiz: [
      sq("What did Mordecai tell Esther?", "“Maybe you became queen for such a time as this”", ["“Hide and stay quiet”", "“Run away”"], "God had put Esther in the right place at the right time.", "👑"),
      sq("What did Esther do before going to the king?", "She prayed and fasted", ["She threw a party", "She packed to leave"], "Esther asked God for help first.", "🙏"),
      sq("Why was going to the king brave?", "She could have lost her life", ["The king was a bear", "She was late"], "Going without being called was dangerous — Esther was brave.", "💪"),
      sq("What happened in the end?", "God's people were saved", ["Haman's plan worked", "Esther stopped being queen"], "God used Esther's courage to save His people.", "🎉"),
    ],
    tf: [["Esther was brave.", true], ["Esther told the king a lie.", false], ["God saved His people.", true]],
    lesson: "God puts you where you are for a reason — be brave and do what's right.",
  },
  {
    id: "abraham-stars", title: "Count the Stars", emoji: "✨", ref: "Genesis 12; 15; 21", band: "middle", hero: "abraham",
    scenes: [
      { sky: "desert", art: "🧔👵", ground: "🐪⛺", text: "God told Abram, “Leave your home and go to a land I will show you.” Abram obeyed, even though he didn't know where he was going." },
      { sky: "night", top: "⭐⭐⭐", art: "🧔", text: "One night God said, “Look up at the sky and count the stars — if you can! Your family will be like that.” But Abram and Sarai had no children, and they were very old.", act: { type: "collect", prompt: "Tap the stars to count them!", items: ["⭐", "⭐", "⭐", "⭐", "⭐", "⭐"], into: "🌌" } },
      { sky: "night", art: "🧔🙏", text: "Abram believed God's promise, and God counted his faith as righteousness. God changed his name to Abraham — “father of many.”" },
      { sky: "day", art: "👵👶😂", text: "Years later, when Abraham was 100 years old, God kept His promise! Sarah had a baby boy named Isaac, which means “laughter.”" },
    ],
    order: [["God told Abram to leave home", "🐪"], ["Abram obeyed", "🧔"], ["God said, “Count the stars”", "⭐"], ["Abram believed God", "🙏"], ["Sarah had baby Isaac", "👶"]],
    quiz: [
      sq("What did God tell Abram to count?", "The stars", ["His sheep", "His coins"], "God promised Abram a family as big as the stars!", "⭐"),
      sq("Did Abram believe God's promise?", "Yes, he believed", ["No, he laughed it off", "He forgot"], "Abram believed God, and God counted it as righteousness.", "🙏"),
      sq("How old was Abraham when Isaac was born?", "100 years old", ["10 years old", "25 years old"], "Nothing is too hard for God!", "💯"),
      sq("What does the name Isaac mean?", "Laughter", ["Stars", "Sand"], "Sarah laughed with joy when God kept His promise.", "😂"),
    ],
    tf: [["Abraham trusted God.", true], ["God broke His promise.", false], ["Isaac means laughter.", true]],
    lesson: "Trust God's promises, even when they seem impossible.",
  },
  {
    id: "commandments", title: "The Ten Commandments", emoji: "📜", ref: "Exodus 19–20", band: "middle",
    scenes: [
      { sky: "desert", top: "☁️⚡", art: "⛰️", text: "God's people camped at the bottom of Mount Sinai. Thunder rumbled, and the mountain was covered with smoke." },
      { sky: "glory", art: "🧔⛰️", text: "Moses climbed the mountain to meet with God." },
      { sky: "glory", art: "🪨", text: "God gave Moses ten commands written on two stone tablets, to show His people how to love God and love others.", act: { type: "tap", prompt: "Tap to see the stone tablets!", target: "🪨", n: 3, after: "📜" } },
      { sky: "day", art: "❤️🙏", text: "The first commands are about loving God: have no other gods, don't worship idols, honor His name, and keep a day to rest and worship." },
      { sky: "day", art: "🤝🏡", text: "The rest are about loving others: honor your parents, don't murder, keep marriage promises, don't steal, don't lie, and don't want what belongs to others." },
    ],
    order: [["The people camped at Mount Sinai", "⛰️"], ["Moses climbed the mountain", "🧔"], ["God gave the Ten Commandments", "📜"], ["Moses brought them to the people", "🧑‍🤝‍🧑"]],
    quiz: [
      sq("Where did God give the Ten Commandments?", "Mount Sinai", ["The Red Sea", "Bethlehem"], "God gave them to Moses on Mount Sinai.", "⛰️"),
      sq("What were the commandments written on?", "Two stone tablets", ["A paper napkin", "A tree"], "God wrote them on two stone tablets.", "📜"),
      sq("Which one is a commandment?", "Do not lie", ["Eat dessert first", "Always win"], "“Thou shalt not bear false witness” means don't lie.", "🚫"),
      sq("Which commandment is about family?", "Honor your father and mother", ["Clean your room daily", "Never share"], "“Honour thy father and thy mother.”", "🏡"),
      sq("What are the commandments mostly about?", "Loving God and loving others", ["Being rich", "Winning games"], "Jesus said all of them hang on loving God and loving others.", "❤️"),
    ],
    tf: [["God gave the Ten Commandments.", true], ["One commandment says it's okay to steal.", false], ["The commandments help us love God and others.", true]],
    lesson: "God's commands show us how to love Him and love others.",
  },
  {
    id: "fishers", title: "Nets Full of Fish", emoji: "🎣", ref: "Luke 5:1–11", band: "middle", hero: "peter",
    scenes: [
      { sky: "dawn", art: "🛶😔", ground: "🌊", text: "Peter and his friends fished all night long and caught nothing. Not one fish!" },
      { sky: "day", art: "🛶🧔", text: "Jesus got in Peter's boat and said, “Go out to the deep water and let down your nets.” Peter said, “We caught nothing… but because You say so, I will.”" },
      { sky: "day", art: "🥅", ground: "🐟🐟🐟🐟", text: "They let down the nets — and they filled with so many fish that the nets began to break!", act: { type: "collect", prompt: "Tap the fish to pull in the net!", items: ["🐟", "🐠", "🐟", "🐡", "🐟", "🐠"], into: "🛶" } },
      { sky: "day", art: "🧔🙇", text: "Peter fell at Jesus' feet, amazed. Jesus said, “Don't be afraid. From now on you will fish for people.”" },
      { sky: "day", art: "🚶🚶🚶", text: "They pulled their boats to shore, left everything, and followed Jesus." },
    ],
    order: [["Peter caught nothing all night", "😔"], ["Jesus said, “Let down your nets”", "🧔"], ["The nets filled with fish", "🐟"], ["Jesus said, “You'll fish for people”", "🗣️"], ["They left everything and followed Jesus", "🚶"]],
    quiz: [
      sq("How many fish did Peter catch all night?", "None", ["A hundred", "Just one big one"], "Nothing at all — until Jesus spoke.", "🛶"),
      sq("Why did Peter let down the nets again?", "Because Jesus said so", ["He saw a fish jump", "He was bored"], "Peter obeyed even when it didn't make sense.", "🧔"),
      sq("What happened to the nets?", "They filled so full they began to break", ["They floated away", "They caught a boot"], "Jesus filled the nets with fish!", "🥅"),
      sq("What did Jesus mean by “fish for people”?", "Help people come to know Jesus", ["Catch people in nets", "Open a fish shop"], "Jesus wanted them to bring others to Him.", "🎣"),
    ],
    tf: [["Peter obeyed Jesus.", true], ["The nets stayed empty.", false], ["They followed Jesus.", true]],
    lesson: "Obey Jesus even when it doesn't make sense — and follow Him.",
  },
  {
    id: "walking-water", title: "Walking on Water", emoji: "🌊", ref: "Matthew 14:22–33", band: "middle",
    scenes: [
      { sky: "night", art: "⛵", ground: "🌊🌊", text: "Late at night, the disciples were in a boat, fighting strong winds and waves." },
      { sky: "night", art: "🚶", ground: "🌊", text: "Then they saw someone WALKING on the water toward them! “It's a ghost!” they cried. But Jesus said, “Take courage! It is I. Don't be afraid.”" },
      { sky: "night", art: "🧔🌊", text: "Peter said, “Lord, if it's You, tell me to come to You on the water.” Jesus said, “Come.” And Peter walked on the water!", act: { type: "tap", prompt: "Tap to help Peter step out!", target: "👣", n: 3, after: "🚶" } },
      { sky: "storm", art: "😨🌊", text: "But when Peter looked at the wind and the waves, he got scared and began to sink. “Lord, save me!”" },
      { sky: "night", art: "🤝", text: "Right away Jesus reached out His hand and caught him. “Why did you doubt?” In the boat, everyone worshiped Jesus: “You really are the Son of God!”" },
    ],
    order: [["The disciples were in a windy boat", "⛵"], ["Jesus walked on the water", "🚶"], ["Peter stepped out of the boat", "👣"], ["Peter looked at the waves and sank", "😨"], ["Jesus caught him", "🤝"]],
    quiz: [
      sq("What did the disciples think Jesus was?", "A ghost", ["A big fish", "A lighthouse"], "They were scared — until Jesus said, “It is I.”", "👻"),
      sq("Why did Peter start to sink?", "He looked at the wind and waves", ["His shoes were heavy", "He was hungry"], "When Peter stopped looking at Jesus, he got scared.", "🌊"),
      sq("What did Peter do when he sank?", "He cried, “Lord, save me!”", ["He swam away", "He stayed quiet"], "Peter called out to Jesus — the right thing to do!", "🙏"),
      sq("What did Jesus do?", "He reached out and caught Peter", ["He let him sink", "He walked away"], "Jesus saves us when we call on Him.", "🤝"),
    ],
    tf: [["Jesus walked on water.", true], ["Jesus let Peter sink.", false], ["Peter called out to Jesus.", true]],
    lesson: "Keep your eyes on Jesus — and when you're sinking, call out to Him.",
  },
  {
    id: "bartimaeus", title: "Blind Bartimaeus", emoji: "👀", ref: "Mark 10:46–52", band: "middle", hero: "bartimaeus",
    scenes: [
      { sky: "day", art: "🧔🕶️", ground: "🛤️", text: "Bartimaeus was blind. Every day he sat by the road and begged for help." },
      { sky: "day", art: "🧑‍🤝‍🧑📣", text: "He heard Jesus was passing by! He shouted, “Jesus, have mercy on me!” People told him to be quiet — but he shouted even louder!", act: { type: "tap", prompt: "Tap to shout with Bartimaeus!", target: "📣", n: 3, after: "🗣️" } },
      { sky: "day", art: "🧔✋", text: "Jesus stopped. “Call him.” Bartimaeus jumped up and came. Jesus asked, “What do you want me to do for you?” “Teacher, I want to see!”" },
      { sky: "day", art: "😃👀", text: "Jesus said, “Go — your faith has healed you.” Right away he could see! And he followed Jesus down the road." },
    ],
    order: [["Bartimaeus sat by the road, blind", "🕶️"], ["He shouted for Jesus", "📣"], ["People told him to be quiet", "🤫"], ["Jesus called him over", "✋"], ["Jesus healed his eyes", "👀"]],
    quiz: [
      sq("What did Bartimaeus shout?", "“Jesus, have mercy on me!”", ["“Go away!”", "“I'm hungry!”"], "He called out to Jesus for help.", "📣"),
      sq("What did he do when people said, “Be quiet”?", "He shouted even louder", ["He went home", "He fell asleep"], "He believed Jesus could help him!", "🗣️"),
      sq("What did Bartimaeus ask for?", "To see", ["Gold", "A new house"], "He asked Jesus to heal his eyes.", "👀"),
      sq("What did he do after he was healed?", "He followed Jesus", ["He went to sleep", "He forgot about Jesus"], "He followed Jesus down the road!", "🚶"),
    ],
    tf: [["Jesus healed Bartimaeus.", true], ["Bartimaeus stopped calling out.", false]],
    lesson: "Don't give up calling out to Jesus — He hears you.",
  },
  {
    id: "lazarus", title: "Lazarus, Come Out!", emoji: "🪨", ref: "John 11", band: "middle",
    scenes: [
      { sky: "day", art: "👩👩🧔", text: "Jesus loved His friends Mary, Martha and their brother Lazarus. One day Lazarus got very sick." },
      { sky: "dusk", art: "🪨😢", text: "By the time Jesus came, Lazarus had died and had been in the tomb for four days. Jesus saw everyone crying — and Jesus wept too." },
      { sky: "day", art: "🧔", text: "Jesus told Martha, “I am the resurrection and the life.” Then He said, “Roll the stone away.”", act: { type: "tap", prompt: "Tap to roll the stone away!", target: "🪨", n: 3, after: "🕳️" } },
      { sky: "glory", art: "🧔📣", text: "Jesus prayed, then shouted, “Lazarus, come out!”" },
      { sky: "glory", art: "🧍🎉", text: "And Lazarus walked out of the tomb — alive! Many people believed in Jesus that day." },
    ],
    order: [["Lazarus got very sick", "🤒"], ["Lazarus died", "🪨"], ["Jesus wept", "😢"], ["Jesus said, “Roll the stone away”", "🧔"], ["Lazarus came out alive", "🎉"]],
    quiz: [
      sq("How did Jesus feel when He saw His friends crying?", "He wept too", ["He laughed", "He didn't care"], "Jesus cares when we are sad.", "😢"),
      sq("What did Jesus say He is?", "“The resurrection and the life”", ["“A doctor”", "“Too late”"], "Jesus has power over death itself.", "🌅"),
      sq("What did Jesus shout?", "“Lazarus, come out!”", ["“Goodbye, Lazarus”", "“Wake up, Martha”"], "And Lazarus came out alive!", "📣"),
    ],
    tf: [["Jesus cried with His friends.", true], ["Lazarus stayed in the tomb.", false], ["Jesus has power over death.", true]],
    lesson: "Jesus cares when we're sad, and He has power over death.",
  },
  {
    id: "good-samaritan", title: "The Good Samaritan", emoji: "🩹", ref: "Luke 10:25–37", band: "middle", hero: "samaritan",
    scenes: [
      { sky: "desert", art: "🧔🤕", ground: "🛤️", text: "Jesus told a story: a man was traveling when robbers beat him up, took everything, and left him hurt by the road." },
      { sky: "desert", art: "🚶", text: "A priest came by… saw the man… and walked past on the other side." },
      { sky: "desert", art: "🚶‍♂️", text: "Then a temple helper came by… looked… and walked past too." },
      { sky: "desert", art: "🧔🐴", text: "Then a Samaritan came — someone from a group the hurt man's people didn't get along with. But he stopped. He felt sorry for him.", act: { type: "collect", prompt: "Tap to help: bandages, water and the donkey!", items: ["🩹", "💧", "🐴"], into: "🤕" } },
      { sky: "indoor", art: "🏠🪙", text: "He took the man to an inn, cared for him, and paid for everything. Jesus asked, “Who was a real neighbor?” The one who showed mercy. “Go and do the same.”" },
    ],
    order: [["Robbers hurt a man", "🤕"], ["A priest walked past", "🚶"], ["A temple helper walked past", "🚶‍♂️"], ["A Samaritan stopped to help", "🩹"], ["He paid for the man at an inn", "🏠"]],
    quiz: [
      sq("Who stopped to help the hurt man?", "The Samaritan", ["The priest", "The robbers"], "The Samaritan showed mercy — even to a stranger.", "🩹"),
      sq("What did the priest do?", "Walked past on the other side", ["Bandaged him", "Called a doctor"], "He didn't stop — he walked by.", "🚶"),
      sq("Who is our neighbor?", "Anyone who needs our help", ["Only people next door", "Only our friends"], "Jesus said to show mercy to anyone in need.", "🤝"),
      sq("What did Jesus say to do?", "“Go and do the same”", ["“Stay home”", "“Help only friends”"], "Jesus wants us to show mercy like the Samaritan.", "💖"),
    ],
    tf: [["The Samaritan helped the hurt man.", true], ["The priest bandaged him.", false], ["Jesus wants us to help others.", true]],
    lesson: "Show mercy to anyone who needs help — that's being a real neighbor.",
  },
  {
    id: "prodigal-son", title: "The Son Who Came Home", emoji: "🏠", ref: "Luke 15:11–32", band: "middle",
    scenes: [
      { sky: "day", art: "🧔👦", text: "A man had two sons. The younger son said, “Give me my share of your money now!” Then he left for a faraway land." },
      { sky: "night", art: "🎉💸", text: "He wasted all the money on wild living until it was all gone." },
      { sky: "day", art: "👦🐖", text: "Then a famine came. He got a job feeding pigs and was so hungry he wished he could eat the pigs' food." },
      { sky: "day", art: "👦💭🏠", text: "He thought, “I'll go home and say, ‘Father, I have sinned. Let me be one of your workers.’”" },
      { sky: "day", art: "🏃‍♂️", text: "While he was still far away, his father saw him, RAN to him, hugged him and kissed him!", act: { type: "tap", prompt: "Tap to run to the son!", target: "🏃‍♂️", n: 3, after: "🤗" } },
      { sky: "day", art: "👘💍🎉", text: "The father said, “Bring the best robe and a ring! My son was lost and now is found!” God is like that father — He runs to forgive us." },
    ],
    order: [["The son asked for his money", "💰"], ["He wasted it all", "💸"], ["He fed pigs and was hungry", "🐖"], ["He decided to go home and say sorry", "💭"], ["His father ran and hugged him", "🤗"], ["They had a party", "🎉"]],
    quiz: [
      sq("What did the younger son do with the money?", "Wasted it all", ["Saved it", "Gave it to the poor"], "He spent it all on wild living.", "💸"),
      sq("What job did he end up with?", "Feeding pigs", ["Being a king", "Baking cakes"], "He was so hungry he wanted the pigs' food.", "🐖"),
      sq("What did the father do when he saw his son?", "Ran to hug him", ["Locked the door", "Yelled at him"], "The father ran with joy and forgave him.", "🤗"),
      sq("Who is like the father in the story?", "God", ["The pigs", "The older brother"], "God runs to forgive us when we come back to Him.", "💖"),
    ],
    tf: [["The father forgave his son.", true], ["The father stayed angry.", false], ["God forgives us when we turn back.", true]],
    lesson: "When we turn back to God and say sorry, He runs to forgive us.",
  },
  {
    id: "wise-builder", title: "The Wise Builder", emoji: "🏠", ref: "Matthew 7:24–27", band: "middle",
    scenes: [
      { sky: "day", art: "👷🪨", text: "Jesus said: a wise man built his house on solid rock.", act: { type: "tap", prompt: "Tap to build on the rock!", target: "🪨", n: 3, after: "🏠" } },
      { sky: "day", art: "🤪🏖️", text: "A foolish man built his house on the sand. It was quick and easy!", act: { type: "tap", prompt: "Tap to build on the sand…", target: "🏖️", n: 2, after: "🏚️" } },
      { sky: "storm", top: "⛈️🌧️", art: "🏠", ground: "🪨", text: "Then the rain came down, the floods came up, and the winds blew — but the house on the rock stood strong!" },
      { sky: "storm", top: "⛈️🌧️", art: "🏚️💥", ground: "🌊", text: "The house on the sand fell with a great crash!" },
      { sky: "day", art: "📖🪨", text: "Jesus said the wise builder is like someone who hears His words AND does them." },
    ],
    order: [["The wise man built on the rock", "🪨"], ["The foolish man built on the sand", "🏖️"], ["A big storm came", "⛈️"], ["The house on the rock stood", "🏠"], ["The house on the sand fell", "💥"]],
    quiz: [
      sq("Where did the wise man build?", "On the rock", ["On the sand", "On a cloud"], "Rock is strong — the house stood through the storm.", "🪨"),
      sq("What happened to the house on the sand?", "It fell with a crash", ["It floated away happily", "It grew bigger"], "Sand can't hold up in a storm.", "💥"),
      sq("Who is like the wise builder?", "Someone who hears Jesus' words and does them", ["Someone who only listens", "Someone who builds fast"], "Hearing AND doing makes our lives strong.", "📖"),
    ],
    tf: [["The house on the rock stood strong.", true], ["Building on sand is wise.", false]],
    lesson: "Hear Jesus' words AND do them — that's building on the rock.",
  },

  // ── Lighthouse Keepers ────────────────────────────────────────────────────────────────────
  {
    id: "jacob-esau", title: "Jacob's Big Trick", emoji: "🐐", ref: "Genesis 25; 27; 29", band: "big",
    scenes: [
      { sky: "day", art: "👦👦", text: "Isaac had twin sons: Esau, a hairy hunter, and Jacob, who stayed near the tents. The older son was supposed to receive the family blessing." },
      { sky: "indoor", art: "👴🛏️", text: "When Isaac was old and nearly blind, he asked Esau to hunt and cook a meal — and then he would bless him." },
      { sky: "indoor", art: "👩🐐🧥", text: "Their mother Rebekah came up with a trick. She cooked goat stew, dressed Jacob in Esau's clothes, and covered his arms with hairy goatskin." },
      { sky: "indoor", art: "👦👴", text: "Jacob went to his father and said, “I am Esau.” Isaac felt his hairy arms… and gave Jacob the blessing. The lie worked — for now.", act: { type: "tap", prompt: "Tap to see what the lie cost…", target: "🎭", n: 1, after: "💔" } },
      { sky: "indoor", art: "👦😡", text: "When Esau came back, he was furious. Jacob had to run away from home, and he didn't see his family for twenty years." },
      { sky: "day", art: "🧔💒", text: "Later, Jacob's uncle Laban tricked HIM — switching brides on his wedding day. The deceiver got deceived. Lies plant seeds that grow." },
    ],
    order: [["Isaac planned to bless Esau", "👴"], ["Rebekah planned a trick", "🐐"], ["Jacob lied, “I am Esau”", "🤥"], ["Esau was furious", "😡"], ["Jacob ran away for twenty years", "🏃"], ["Laban tricked Jacob", "💒"]],
    quiz: [
      sq("What lie did Jacob tell?", "“I am Esau”", ["“I'm not hungry”", "“The goat ran away”"], "Jacob pretended to be his brother to steal the blessing.", "🤥"),
      sq("What did the lie cost Jacob?", "He had to run from home for twenty years", ["Nothing at all", "A few coins"], "The lie broke his family apart for years.", "🏃"),
      sq("What happened to Jacob later?", "His uncle Laban tricked him", ["He became king of Egypt", "Everyone forgot"], "The deceiver got deceived — lies often come back around.", "🔁"),
      sq("What kind of deception did Jacob use?", "Disguising himself as someone else", ["Exaggerating a story", "Leaving out one detail"], "He planned a disguise — a deliberate deception.", "🧥"),
      sq("What's the big lesson?", "Deception breaks trust and brings trouble", ["Tricks are clever and smart", "Only lies that get caught are bad"], "“Be sure your sin will find you out.”", "🧭"),
    ],
    tf: [["Jacob tricked his father.", true], ["Lying brought Jacob's family closer.", false], ["Jacob was later tricked himself.", true]],
    lesson: "Deception may seem to work, but it breaks trust and brings trouble.",
  },
  {
    id: "achan", title: "Achan's Hidden Treasure", emoji: "⛺", ref: "Joshua 7", band: "big",
    scenes: [
      { sky: "day", art: "🧱💥", text: "After Jericho's walls fell, God told His people not to take anything from the city for themselves." },
      { sky: "day", art: "🧔👀💰", text: "But a man named Achan saw a beautiful robe, silver and gold. He wanted them — so he took them." },
      { sky: "indoor", art: "⛺", text: "Achan hid the stolen things in a hole under his tent. Nobody saw. He thought he got away with it.", act: { type: "tap", prompt: "Tap to see what's hidden…", target: "⛺", n: 2, after: "💰" } },
      { sky: "day", art: "⚔️😞", text: "Then Israel lost a battle they should have won easily. Joshua asked God why. God said someone had disobeyed and hidden what He had forbidden." },
      { sky: "day", art: "🧔🙇", text: "When Joshua asked, Achan finally confessed: “I saw them, I wanted them, I took them, and I hid them.” Hidden sin didn't stay hidden — and it hurt everyone." },
    ],
    order: [["God said, “Take nothing”", "🚫"], ["Achan saw and wanted the treasure", "👀"], ["Achan took it", "💰"], ["He hid it under his tent", "⛺"], ["Israel lost a battle", "⚔️"], ["Achan confessed", "🙇"]],
    quiz: [
      sq("Where did Achan hide the stolen things?", "Under his tent", ["In a cave", "In the river"], "He buried them, thinking no one would know.", "⛺"),
      sq("Achan said, “I saw, I wanted, I took, I hid.” When should he have stopped?", "At “I wanted” — say no and walk away", ["After taking just a little", "After hiding it better"], "Temptation starts with wanting — that's the moment to stop.", "🛑"),
      sq("Who did Achan's hidden sin affect?", "The whole community", ["Only Achan", "Nobody"], "Hidden sin hurts more people than we think.", "🧑‍🤝‍🧑"),
      sq("Which verse fits this story?", "“Be sure your sin will find you out.”", ["“God is love.”", "“Pray without ceasing.”"], "Achan's hidden sin came to light.", "🔦"),
    ],
    tf: [["Achan hid what he stole.", true], ["Nobody was affected.", false], ["Hidden sin came to light.", true]],
    lesson: "Hidden sin doesn't stay hidden — and it hurts more than just us.",
  },
  {
    id: "gehazi", title: "Gehazi's Greedy Lie", emoji: "💰", ref: "2 Kings 5", band: "big",
    scenes: [
      { sky: "day", art: "🎖️🤒", text: "Naaman was a great army commander, but he had a terrible skin disease. A young servant girl said, “The prophet Elisha could heal him!”" },
      { sky: "day", art: "🎖️🌊", text: "Elisha told Naaman to wash seven times in the Jordan River. Naaman grumbled, but he did it — and his skin became healthy like a child's!", act: { type: "tap", prompt: "Tap seven times to wash in the Jordan!", target: "🌊", n: 7, after: "✨" } },
      { sky: "day", art: "🎖️💰🧔", text: "Naaman offered Elisha rich gifts, but Elisha refused. God's healing was free." },
      { sky: "day", art: "🧑💰", text: "But Elisha's servant Gehazi ran after Naaman and LIED: “My master sent me — he needs silver and clothes.” Then he hid the gifts at home." },
      { sky: "indoor", art: "🧔❓🧑", text: "Elisha asked, “Where have you been, Gehazi?” “Nowhere,” he lied again. But God had shown Elisha everything. Gehazi got Naaman's disease. One lie led to another — and to sorrow." },
    ],
    order: [["Naaman was sick", "🤒"], ["He washed seven times and was healed", "🌊"], ["Elisha refused payment", "🙅"], ["Gehazi lied to get silver", "🤥"], ["Gehazi lied again to Elisha", "❓"], ["Gehazi's lies were found out", "🔦"]],
    quiz: [
      sq("Why did Gehazi lie to Naaman?", "He was greedy for silver and clothes", ["He was lost", "He wanted to help"], "Greed pushed Gehazi into deception.", "💰"),
      sq("What did Gehazi say when Elisha asked where he'd been?", "“Nowhere”", ["“I lied — I'm sorry”", "“I was helping Naaman”"], "One lie led to another lie.", "🤥"),
      sq("What does Gehazi's story show about lies?", "One lie usually needs another to cover it", ["Lies are easy to keep", "Lies stay small"], "Lies grow — and the truth comes out.", "🔗"),
      sq("What could Gehazi have done when Elisha asked?", "Confessed and told the truth", ["Made up a better story", "Run away"], "Confessing is the way back — “whoso confesseth… shall have mercy.”", "🙇"),
    ],
    tf: [["Gehazi told the truth.", false], ["Naaman was healed.", true], ["One lie led to another.", true]],
    lesson: "Greed leads to lies, and one lie needs another — confess instead.",
  },
  {
    id: "david-nathan", title: "“You Are the Man”", emoji: "👉", ref: "2 Samuel 11–12; Psalm 51", band: "big", hero: "nathan",
    scenes: [
      { sky: "indoor", art: "👑😔", text: "King David did something very wrong, and then tried to cover it up. For a long time, he acted like nothing had happened." },
      { sky: "indoor", art: "🧔👑", text: "God sent the prophet Nathan to David. Nathan told him a story about a rich man who stole a poor man's only little lamb." },
      { sky: "indoor", art: "👑😡", text: "David got angry: “That rich man deserves to be punished!” Nathan looked at him and said, “Thou art the man.”", act: { type: "tap", prompt: "Tap to hear Nathan's words…", target: "🧔", n: 1, after: "👉" } },
      { sky: "indoor", art: "👑🙇", text: "David didn't make excuses. He said, “I have sinned against the LORD.” He stopped hiding." },
      { sky: "dawn", art: "🙏🤍", text: "David prayed, “Create in me a clean heart, O God.” God forgave him. Confessing is hard — but it's the only way to a clean heart." },
    ],
    order: [["David sinned and covered it up", "👑"], ["Nathan told a story about a lamb", "🐑"], ["David got angry at the rich man", "😡"], ["Nathan said, “You are the man”", "👉"], ["David confessed", "🙇"], ["David prayed for a clean heart", "🤍"]],
    quiz: [
      sq("Why did Nathan tell David a story first?", "So David could see his sin clearly", ["To entertain him", "To make him sleepy"], "The story helped David see how wrong he'd been.", "🐑"),
      sq("What did Nathan say to David?", "“Thou art the man.”", ["“Never mind.”", "“You're the best king.”"], "It took courage for Nathan to tell the king the truth.", "👉"),
      sq("What did David do when he was confronted?", "Confessed — no excuses", ["Blamed someone else", "Denied it"], "David said, “I have sinned against the LORD.”", "🙇"),
      sq("What did David pray?", "“Create in me a clean heart, O God”", ["“Help me hide it better”", "“Make Nathan go away”"], "Psalm 51 is David's prayer of confession.", "🤍"),
      sq("What made Nathan a hero?", "He told the truth even to a king", ["He was very strong", "He won a battle"], "Speaking the truth with love takes real courage.", "🦁"),
    ],
    tf: [["Nathan told David the truth.", true], ["David blamed Nathan.", false], ["God forgave David when he confessed.", true]],
    lesson: "Covering sin keeps us stuck; confessing brings God's forgiveness and a clean heart.",
  },
  {
    id: "peter-restored", title: "Peter's Fresh Start", emoji: "🐓", ref: "Luke 22:54–62; John 21:15–19", band: "big",
    scenes: [
      { sky: "night", art: "🔥🧔", text: "The night Jesus was arrested, Peter followed at a distance and sat by a fire in a courtyard." },
      { sky: "night", art: "👧❓🧔", text: "A servant girl said, “You were with Jesus!” Peter said, “I don't know Him.” Two more times people asked — and two more times Peter denied knowing Jesus." },
      { sky: "dawn", art: "🐓", text: "Right then, a rooster crowed — just as Jesus had said it would. Peter remembered, went outside, and cried bitterly.", act: { type: "tap", prompt: "Tap the rooster…", target: "🐓", n: 1, after: "😢" } },
      { sky: "dawn", art: "🔥🐟🧔", ground: "🌊", text: "After Jesus rose from the dead, He made breakfast on the beach for His friends. Then He asked Peter three times, “Do you love me?”" },
      { sky: "day", art: "🧔❤️", text: "Three times Peter said, “Yes, Lord, You know I love You.” Jesus forgave him and gave him a job: “Feed my sheep.” Peter became a bold leader of the church." },
    ],
    order: [["Peter sat by the fire", "🔥"], ["Peter denied Jesus three times", "🙅"], ["The rooster crowed", "🐓"], ["Peter cried", "😢"], ["Jesus asked, “Do you love me?” three times", "❤️"], ["Jesus gave Peter a new job", "🐑"]],
    quiz: [
      sq("Why do you think Peter lied about knowing Jesus?", "He was afraid of what might happen", ["He forgot Jesus' name", "He was hungry"], "Fear can push us to lie — even people who love Jesus.", "😨"),
      sq("How many times did Peter deny Jesus?", "Three", ["One", "Seven"], "Three times — just as Jesus said.", "3️⃣"),
      sq("How did Jesus treat Peter after He rose?", "He forgave him and gave him a job", ["He never spoke to him again", "He stayed angry"], "Jesus restores us when we turn back to Him.", "❤️"),
      sq("How many times did Jesus ask, “Do you love me?”", "Three", ["Once", "Ten"], "Once for each denial — a fresh start for each failure.", "🔁"),
    ],
    tf: [["Peter denied knowing Jesus.", true], ["Jesus refused to forgive Peter.", false], ["Peter became a bold leader.", true]],
    lesson: "Fear can make us lie, but Jesus forgives and gives fresh starts.",
  },
  {
    id: "ananias", title: "The Pretend Gift", emoji: "🎭", ref: "Acts 4:32–5:11", band: "big",
    scenes: [
      { sky: "day", art: "🧑‍🤝‍🧑🍞", text: "The first Christians loved each other so much that they shared everything. Some even sold land and gave the money to help people in need." },
      { sky: "day", art: "👫💰", text: "Ananias and his wife Sapphira sold some land too. They kept part of the money — which was fine. But they agreed to PRETEND they gave it all, so they'd look generous." },
      { sky: "indoor", art: "🧔💰🧔", text: "Ananias brought part of the money and acted like it was everything. Peter said, “Why have you lied? You didn't lie to people — you lied to God.”" },
      { sky: "indoor", art: "⚖️", text: "God judged their lie, and both of them died. Everyone was filled with deep respect for God." },
      { sky: "day", art: "🧭🤍", text: "The money wasn't the problem — they could have kept it. The problem was faking to look good. God wants honest hearts, not a good-looking show." },
    ],
    order: [["Christians shared to help others", "🍞"], ["Ananias and Sapphira sold land", "💰"], ["They planned to pretend they gave it all", "🎭"], ["Peter asked, “Why have you lied?”", "❓"], ["God judged their lie", "⚖️"]],
    quiz: [
      sq("Were Ananias and Sapphira allowed to keep some of the money?", "Yes — the money was theirs", ["No, never", "Only half"], "Peter said the money was theirs to keep.", "💰"),
      sq("What was their real sin?", "Pretending to give everything to look good", ["Selling land", "Keeping money"], "They faked generosity — a lie to look good.", "🎭"),
      sq("Peter said they didn't lie to people but to…", "God", ["Their neighbors", "The bank"], "Every lie is told in front of God.", "✨"),
      sq("What kind of heart does God want?", "An honest one — no faking", ["One that looks good to others", "One that never gives"], "God sees the heart, not the show.", "🤍"),
    ],
    tf: [["They lied about the money.", true], ["Keeping the money was their sin.", false], ["God wants honest hearts.", true]],
    lesson: "God wants honest hearts — faking to look good is still lying.",
  },
  {
    id: "foot-washing", title: "Jesus Washes Feet", emoji: "🦶", ref: "John 13:1–17", band: "big",
    scenes: [
      { sky: "indoor", art: "🍞", ground: "🧔🧔🧔", text: "On the night before He died, Jesus ate a special supper with His disciples." },
      { sky: "indoor", art: "🧔💧", text: "Jesus got up, wrapped a towel around His waist, poured water into a bowl, and began to wash His disciples' dusty feet — a job for the lowest servant.", act: { type: "collect", prompt: "Tap to wash each disciple's feet!", items: ["🦶", "🦶", "🦶", "🦶"], into: "💧" } },
      { sky: "indoor", art: "🧔✋", text: "Peter protested, “You'll never wash my feet!” Jesus said, “Unless I wash you, you have no part with Me.”" },
      { sky: "indoor", art: "🧔❤️", text: "Jesus said, “I, your Lord and Teacher, washed your feet. You should serve each other the same way.”" },
    ],
    order: [["Jesus ate supper with His disciples", "🍞"], ["Jesus took a towel and water", "💧"], ["Jesus washed their feet", "🦶"], ["Peter protested", "✋"], ["Jesus said, “Serve each other”", "❤️"]],
    quiz: [
      sq("Why was washing feet surprising?", "It was a servant's job — and Jesus is Lord", ["Their feet were already clean", "It was a game"], "The King of all served like the lowest servant.", "🦶"),
      sq("What did Jesus want His followers to learn?", "Serve one another humbly", ["Always be first", "Keep your feet clean"], "Jesus showed that greatness means serving.", "🤲"),
      sq("Which verse matches this story?", "Mark 10:45 — “not to be ministered unto, but to minister”", ["Psalm 23:1", "Genesis 1:1"], "Jesus came to serve.", "📖"),
    ],
    tf: [["Jesus washed His disciples' feet.", true], ["Jesus said serving is beneath us.", false]],
    lesson: "Jesus, the King, served — so we serve others too.",
  },
  {
    id: "pentecost", title: "Wind and Fire", emoji: "🔥", ref: "Acts 2", band: "big",
    scenes: [
      { sky: "indoor", art: "🧑‍🤝‍🧑🙏", text: "After Jesus went back to heaven, His followers waited and prayed together in Jerusalem, just like He told them." },
      { sky: "glory", art: "🌬️", text: "Suddenly a sound like a rushing wind filled the house, and what looked like little flames of fire rested on each of them. They were filled with the Holy Spirit!", act: { type: "tap", prompt: "Tap to hear the rushing wind!", target: "🌬️", n: 3, after: "🔥" } },
      { sky: "day", art: "🗣️🌍", text: "They began speaking in other languages! Visitors from many nations heard about God in their own languages." },
      { sky: "day", art: "🧔📣", text: "Peter — the same Peter who had once been afraid — stood up boldly and told the crowd about Jesus." },
      { sky: "day", art: "🧑‍🤝‍🧑💧", text: "About three thousand people believed and were baptized that day. The church was born!" },
    ],
    order: [["The followers waited and prayed", "🙏"], ["A rushing wind and fire came", "🔥"], ["They spoke in other languages", "🗣️"], ["Peter preached boldly", "📣"], ["Three thousand believed", "🧑‍🤝‍🧑"]],
    quiz: [
      sq("What did the believers receive at Pentecost?", "The Holy Spirit", ["A new temple", "A pile of gold"], "Jesus promised the Holy Spirit would come.", "🔥"),
      sq("What amazing thing happened with languages?", "They spoke languages they'd never learned", ["Everyone stopped talking", "They wrote letters"], "People from many nations heard the good news in their own language.", "🌍"),
      sq("How many believed that day?", "About three thousand", ["Twelve", "One hundred"], "About three thousand people believed and were baptized.", "🧑‍🤝‍🧑"),
      sq("What changed about Peter?", "He went from afraid to bold", ["Nothing changed", "He became quiet"], "The Holy Spirit gave Peter courage.", "🦁"),
    ],
    tf: [["The Holy Spirit came at Pentecost.", true], ["Peter stayed scared and quiet.", false]],
    lesson: "The Holy Spirit gives believers power and courage to tell others about Jesus.",
  },
  {
    id: "saul", title: "A Light on the Road", emoji: "💡", ref: "Acts 9", band: "big", hero: "paul",
    scenes: [
      { sky: "desert", art: "🧔😠📜", text: "Saul hated Christians. He traveled to the city of Damascus with papers to arrest anyone who followed Jesus." },
      { sky: "glory", art: "🧔", text: "On the road, a bright light from heaven flashed around him! Saul fell to the ground and heard a voice: “Saul, Saul, why are you persecuting Me?” “Who are You, Lord?” “I am Jesus.”", act: { type: "tap", prompt: "Tap to see the bright light!", target: "✨", n: 2, after: "💡" } },
      { sky: "indoor", art: "🧔🕶️", text: "When Saul stood up, he was blind. For three days he didn't eat or drink — he prayed." },
      { sky: "indoor", art: "🧔🙌🧔", text: "God sent a believer named Ananias to pray for him. Something like scales fell from Saul's eyes, and he could see! He was baptized." },
      { sky: "day", art: "🧔📣", text: "Right away Saul began telling everyone that Jesus is the Son of God. He became the apostle Paul and told the world about Jesus." },
    ],
    order: [["Saul hunted Christians", "📜"], ["A bright light flashed", "💡"], ["Jesus spoke to Saul", "🗣️"], ["Saul was blind for three days", "🕶️"], ["Ananias prayed and Saul could see", "👀"], ["Saul preached about Jesus", "📣"]],
    quiz: [
      sq("What was Saul doing before he met Jesus?", "Arresting Christians", ["Building boats", "Healing people"], "Saul was an enemy of the church.", "📜"),
      sq("Who spoke to Saul from the light?", "Jesus", ["The king", "A stranger"], "“I am Jesus, whom thou persecutest.”", "💡"),
      sq("What does this story show?", "Nobody is too far gone for Jesus to change", ["Bad people can never change", "Light is dangerous"], "Jesus turned His enemy into His messenger.", "🦋"),
      sq("What name is Saul better known by?", "Paul", ["Peter", "Silas"], "He became the apostle Paul.", "✍️"),
    ],
    tf: [["Jesus changed Saul's life.", true], ["Saul kept hunting Christians.", false], ["Paul told the world about Jesus.", true]],
    lesson: "No one is too far gone — Jesus can change anyone's heart.",
  },
  {
    id: "shipwreck", title: "Shipwrecked!", emoji: "🚢", ref: "Acts 27–28", band: "big",
    scenes: [
      { sky: "sea", art: "🚢", ground: "🌊", text: "Paul was a prisoner being sent by ship to Rome. He warned the crew, “If we sail now, there will be disaster.” They didn't listen." },
      { sky: "storm", top: "⛈️⚡", art: "🚢", ground: "🌊🌊🌊", text: "A hurricane-strength wind slammed the ship for fourteen days. No sun, no stars. Everyone gave up hope." },
      { sky: "storm", art: "🧔🙏", text: "Paul stood up: “Take courage! An angel of God told me not one of you will die. I believe God.” Then he gave thanks for bread, and everyone ate." },
      { sky: "storm", art: "🚢💥", text: "The ship hit a sandbar and broke apart! Some swam, others floated on boards.", act: { type: "collect", prompt: "Tap to help everyone reach shore!", items: ["🏊", "🏊", "🏊", "🏊", "🏊"], into: "🏝️" } },
      { sky: "day", art: "🏝️🔥🧑‍🤝‍🧑", text: "All 276 people made it safely to the island of Malta — just like God promised! Paul even healed people there and told them about Jesus." },
    ],
    order: [["Paul warned the crew", "⚠️"], ["A huge storm hit for fourteen days", "⛈️"], ["Paul said, “Take courage — God promised”", "🙏"], ["The ship broke apart", "💥"], ["Everyone reached the island safely", "🏝️"]],
    quiz: [
      sq("Why did Paul tell everyone to take courage?", "God promised no one would die", ["The storm was ending", "He could swim well"], "Paul trusted God's promise in the middle of the storm.", "🙏"),
      sq("How long did the storm last?", "Fourteen days", ["One hour", "Two days"], "Fourteen long days with no sun or stars.", "⛈️"),
      sq("How many people survived?", "All 276", ["Only Paul", "Half of them"], "Every single person made it — just as God said.", "🏝️"),
      sq("What can we learn from Paul in the storm?", "Trust God's promises even when things look hopeless", ["Never travel by boat", "Panicking helps"], "God is faithful, even in the storm.", "⚓"),
    ],
    tf: [["Everyone survived the shipwreck.", true], ["Paul panicked and gave up.", false]],
    lesson: "God keeps His promises, even in the middle of the storm.",
  },
  {
    id: "jail-songs", title: "Songs at Midnight", emoji: "🎶", ref: "Acts 16:16–34", band: "big", hero: "silas",
    scenes: [
      { sky: "indoor", art: "⛓️🧔🧔", text: "Paul and Silas were beaten and thrown into jail for telling people about Jesus. Their feet were locked in wooden stocks." },
      { sky: "night", art: "🧔🧔", text: "At midnight, instead of complaining, Paul and Silas prayed and sang hymns to God. The other prisoners listened.", act: { type: "tap", prompt: "Tap to sing praises with them!", target: "🎶", n: 3, after: "🙌" } },
      { sky: "night", art: "💥🔓", text: "Suddenly — an earthquake! The jail shook, every door flew open, and everyone's chains fell off!" },
      { sky: "night", art: "💂😨", text: "The jailer woke up and thought the prisoners had escaped. He was terrified. Paul shouted, “Don't harm yourself — we're all here!”" },
      { sky: "night", art: "💂🙏", text: "The jailer fell trembling and asked, “What must I do to be saved?” They said, “Believe on the Lord Jesus Christ, and thou shalt be saved.” That night he and his whole family believed!" },
    ],
    order: [["Paul and Silas were put in jail", "⛓️"], ["They sang at midnight", "🎶"], ["An earthquake opened the doors", "💥"], ["The jailer was afraid", "😨"], ["The jailer asked how to be saved", "🙏"], ["His family believed", "🏠"]],
    quiz: [
      sq("What did Paul and Silas do at midnight in jail?", "Prayed and sang to God", ["Complained loudly", "Tried to dig out"], "They praised God even in a hard place.", "🎶"),
      sq("Why didn't they run away when the doors opened?", "They cared about the jailer", ["They were sleepy", "The doors were stuck"], "Their honesty and love led the jailer to Jesus.", "💗"),
      sq("What did the jailer ask?", "“What must I do to be saved?”", ["“Who broke the doors?”", "“Can you sing again?”"], "He saw something real in Paul and Silas.", "❓"),
      sq("What did they answer?", "“Believe on the Lord Jesus Christ”", ["“Be a better jailer”", "“Give us money”"], "Acts 16:31 — salvation comes by believing in Jesus.", "✝️"),
    ],
    tf: [["Paul and Silas sang in jail.", true], ["They ran away as fast as they could.", false], ["The jailer's family believed.", true]],
    lesson: "Praise God in hard times — your faith can point others to Jesus.",
  },
  {
    id: "temptation", title: "“It Is Written”", emoji: "⚔️", ref: "Matthew 4:1–11", band: "big",
    scenes: [
      { sky: "desert", art: "🧔", ground: "🏜️", text: "After Jesus was baptized, He went into the desert for forty days without food. He was very hungry." },
      { sky: "desert", art: "🐍🪨", text: "The devil came to tempt Him: “If You're the Son of God, turn these stones into bread.”" },
      { sky: "desert", art: "🧔📖", text: "Jesus answered with Scripture: “It is written, Man shall not live by bread alone, but by every word that proceedeth out of the mouth of God.”", act: { type: "tap", prompt: "Tap to answer with God's Word!", target: "📖", n: 1, after: "⚔️" } },
      { sky: "day", art: "🏛️🐍", text: "The devil tempted Him two more times — to show off, and to worship the devil for all the world's kingdoms. Each time Jesus said, “It is written…”" },
      { sky: "glory", art: "🧔👼", text: "Finally the devil left, and angels came and cared for Jesus. Jesus used God's Word as His sword — and we can too." },
    ],
    order: [["Jesus fasted forty days", "🏜️"], ["The devil said, “Turn stones into bread”", "🪨"], ["Jesus answered, “It is written…”", "📖"], ["The devil tempted Him two more times", "🐍"], ["The devil left and angels came", "👼"]],
    quiz: [
      sq("How did Jesus fight temptation?", "He quoted Scripture", ["He argued loudly", "He ran away"], "Each time, Jesus said, “It is written…”", "📖"),
      sq("What is the sword of the Spirit?", "The Word of God", ["A real sword", "A loud voice"], "Ephesians 6:17 — the sword of the Spirit is God's Word.", "⚔️"),
      sq("Why does memorizing verses help us?", "God's Word helps us say no to temptation", ["It makes us look smart", "It's only for tests"], "“Thy word have I hid in mine heart, that I might not sin.”", "💗"),
    ],
    tf: [["Jesus used Scripture against temptation.", true], ["Jesus gave in to temptation.", false]],
    lesson: "God's Word is our sword — hide it in your heart to beat temptation.",
  },
  {
    id: "temple-boy", title: "Jesus at Twelve", emoji: "🏛️", ref: "Luke 2:41–52", band: "big",
    scenes: [
      { sky: "desert", art: "👨‍👩‍👦🐴", text: "When Jesus was twelve, His family traveled to Jerusalem for the Passover feast." },
      { sky: "desert", art: "👩🧔❓", text: "On the way home, Mary and Joseph realized Jesus wasn't with their group! They hurried back to search." },
      { sky: "indoor", art: "🏛️", text: "After three days, they found Him in the temple, sitting with the teachers, listening and asking questions. Everyone was amazed at His understanding.", act: { type: "find", prompt: "Find twelve-year-old Jesus in the temple!", target: "👦", decoys: ["🧔", "👴", "🧔", "👳", "👴"] } },
      { sky: "indoor", art: "👦🏠", text: "Jesus said, “Didn't you know I had to be in My Father's house?” Then He went home with them and obeyed His parents." },
      { sky: "day", art: "🌱🧑", text: "And Jesus grew in wisdom and in stature, and in favor with God and with people." },
    ],
    order: [["Jesus' family went to Jerusalem", "🐴"], ["Jesus stayed behind", "❓"], ["His parents searched for three days", "🔍"], ["They found Him in the temple", "🏛️"], ["Jesus went home and obeyed", "🏠"]],
    quiz: [
      sq("Where did Mary and Joseph find Jesus?", "In the temple, with the teachers", ["At the market", "Fishing"], "He was listening and asking questions in His Father's house.", "🏛️"),
      sq("What did Jesus do after they found Him?", "Went home and obeyed His parents", ["Stayed in the temple", "Ran off again"], "Even Jesus, God's Son, obeyed His parents.", "🏠"),
      sq("In what four ways did Jesus grow?", "Wisdom, body, with God, and with people", ["Only taller", "Only smarter"], "Luke 2:52 — mind, body, spirit and friendships.", "🌱"),
    ],
    tf: [["Jesus obeyed His parents.", true], ["Jesus was lost forever.", false]],
    lesson: "Jesus grew in every way — and He honored His parents.",
  },
  {
    id: "baptism", title: "Jesus Is Baptized", emoji: "🕊️", ref: "Matthew 3:13–17", band: "big", hero: "john-baptist",
    scenes: [
      { sky: "day", art: "🧔🌊", text: "John the Baptist preached by the Jordan River: “Turn away from sin! Someone greater than me is coming!”" },
      { sky: "day", art: "🧔🧔", ground: "🌊", text: "One day Jesus came to be baptized. John said, “I need You to baptize me!” But Jesus said, “Let's do it — it is right.”" },
      { sky: "glory", art: "☁️", ground: "🌊", text: "As Jesus came up out of the water, heaven opened, and the Spirit of God came down like a dove.", act: { type: "tap", prompt: "Tap to see the dove!", target: "☁️", n: 1, after: "🕊️" } },
      { sky: "glory", art: "☁️🗣️", text: "A voice from heaven said, “This is my beloved Son, in whom I am well pleased.” The Father, the Son, and the Holy Spirit — all three were there!" },
    ],
    order: [["John preached by the river", "🌊"], ["Jesus came to be baptized", "🧔"], ["The Spirit came down like a dove", "🕊️"], ["God the Father spoke from heaven", "☁️"]],
    quiz: [
      sq("What came down on Jesus like a dove?", "The Spirit of God", ["A real pigeon", "A cloud"], "The Holy Spirit came down like a dove.", "🕊️"),
      sq("What did the voice from heaven say?", "“This is my beloved Son”", ["“Go home”", "“Who are you?”"], "God the Father was pleased with His Son.", "☁️"),
      sq("Who was present at Jesus' baptism?", "The Father, the Son and the Holy Spirit", ["Only John", "Only the crowd"], "All three persons of God — the Trinity — were there.", "✨"),
    ],
    tf: [["John baptized Jesus.", true], ["Only Jesus was there — no Father or Spirit.", false]],
    lesson: "Jesus is God's beloved Son — the Father, Son and Spirit were all there.",
  },
];

export const STORY_BY_ID = new Map(STORIES.map((s) => [s.id, s]));
export const storySkill = (id: string, ns: "f" | "h" = "f") => `${ns}:story:${id}`;
const skillOf = (s: Story) => storySkill(s.id, s.ns);

// ── Items about a story ────────────────────────────────────────────────────────────────────
const say = (voiced: boolean, ...t: string[]) => (voiced ? t : undefined);

export function storyAct(s: Story): Activity {
  return { kind: "story", title: s.title, emoji: s.emoji, ref: s.ref, scenes: s.scenes, skill: skillOf(s) };
}

export function storyQuiz(r: Rng, s: Story, voiced: boolean, x = pick(r, s.quiz)): Activity {
  const opts = shuffle(r, [x.a, ...x.w]);
  return {
    kind: "choice",
    prompt: x.q,
    say: say(voiced, x.q),
    visual: x.e ? { type: "emoji", emoji: x.e, size: "lg" } : undefined,
    options: opts.map((t) => ({ id: t, text: t, say: say(voiced, t) })),
    answer: x.a,
    layout: "list",
    readOptions: voiced,
    why: x.why,
    skill: skillOf(s),
  };
}

/** Put the story in order (little sailors get a window of four events — still in order). */
export function storyOrder(r: Rng, s: Story, band: Band, voiced: boolean): Activity {
  const n = band === "little" ? 4 : band === "middle" ? 5 : 6;
  const at = s.order.length <= n ? 0 : Math.floor(r() * (s.order.length - n + 1));
  const events = s.order.slice(at, at + n);
  const prompt = "Put the story in order";
  return { kind: "order", prompt, say: say(voiced, prompt), items: events.map(([text, emoji]) => ({ id: text, text, emoji, say: say(voiced, text) })), direction: "column", skill: skillOf(s) };
}

export const TRUE = "✅ True";
export const NOT_TRUE = "❌ Not true";
export function storyTF(r: Rng, s: Story, voiced: boolean): Activity {
  const [text, isTrue] = pick(r, s.tf);
  const prompt = "True or not true?";
  return {
    kind: "choice",
    prompt: `${prompt} “${text}”`,
    say: say(voiced, prompt, "~", text),
    visual: { type: "emoji", emoji: s.emoji, size: "lg" },
    options: [TRUE, NOT_TRUE].map((t) => ({ id: t, text: t, say: say(voiced, t) })),
    answer: isTrue ? TRUE : NOT_TRUE,
    layout: "row",
    why: isTrue ? `Yes! ${text}` : `That's not what happened. ${s.lesson}`,
    skill: skillOf(s),
  };
}

/** Questions-only topic for a story (review, practice, bosses). */
export function storyTopic(s: Story, band: Band, voiced: boolean): Topic {
  return {
    key: `story-${s.id}`,
    gen: (r, d) => (d > 0.75 && s.order.length >= 4 ? storyOrder(r, s, band, voiced) : r() < 0.25 && s.tf.length ? storyTF(r, s, voiced) : storyQuiz(r, s, voiced)),
    forSkill: (skill, r) => (skill === skillOf(s) ? (r() < 0.3 ? storyOrder(r, s, band, voiced) : storyQuiz(r, s, voiced)) : null),
  };
}

/** A story level: the story itself, then retrieval right away (quiz, order, true-or-not, quiz). */
export function storyLesson(r: Rng, s: Story, band: Band, voiced: boolean): Activity[] {
  const qs = pickN(r, s.quiz, band === "little" ? 3 : 4);
  const out: Activity[] = [storyAct(s)];
  qs.forEach((q, i) => {
    out.push(storyQuiz(r, s, voiced, q));
    if (i === 1) out.push(storyOrder(r, s, band, voiced));
  });
  if (s.tf.length) out.push(storyTF(r, s, voiced));
  return out;
}
