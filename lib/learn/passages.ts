import type { GradeId, Pic } from "./types";

// Stories and passages for the Reading voyage — original, kid-friendly, fiction and nonfiction,
// each with questions that check real understanding (details, main idea, inference, vocabulary
// in context, cause and effect, sequence), not just word-calling.

export type QKind = "detail" | "main" | "infer" | "vocab" | "cause" | "sequence" | "feeling";
export type Question = { q: string; a: string; wrong: string[]; kind: QKind; why: string };
export type Passage = { id: string; grade: GradeId; title: string; emoji: string; text: string; questions: Question[] };

/** Kindergarten: decodable sentences with a picture question. */
export type Sentence = { text: string; emoji: string; question: { prompt: string; options: Pic[]; answer: string } };
const p = (word: string, emoji: string): Pic => ({ word, emoji });
const sq = (prompt: string, answer: Pic, ...others: Pic[]) => ({ prompt, options: [answer, ...others], answer: answer.word });
export const K_SENTENCES: Sentence[] = [
  { text: "I see a cat.", emoji: "🐱", question: sq("What do I see?", p("cat", "🐱"), p("dog", "🐶"), p("sun", "☀️")) },
  { text: "A dog can run.", emoji: "🐶", question: sq("Who can run?", p("dog", "🐶"), p("pig", "🐷"), p("hen", "🐔")) },
  { text: "My pig is big.", emoji: "🐷", question: sq("What is big?", p("pig", "🐷"), p("bug", "🐛"), p("cat", "🐱")) },
  { text: "The hen is in the box.", emoji: "🐔", question: sq("Where is the hen?", p("box", "📦"), p("bed", "🛏️"), p("bus", "🚌")) },
  { text: "I like the red hat.", emoji: "🎩", question: sq("What color is the hat?", p("red", "🟥"), p("blue", "🟦"), p("green", "🟩")) },
  { text: "We can see the sun.", emoji: "☀️", question: sq("What can we see?", p("sun", "☀️"), p("moon", "🌙"), p("star", "⭐")) },
  { text: "Is it a fox?", emoji: "🦊", question: sq("What is it?", p("fox", "🦊"), p("cat", "🐱"), p("pig", "🐷")) },
  { text: "The bug is on the mug.", emoji: "🐛", question: sq("Where is the bug?", p("mug", "☕"), p("bed", "🛏️"), p("box", "📦")) },
  { text: "Go, bus, go!", emoji: "🚌", question: sq("What can go?", p("bus", "🚌"), p("bed", "🛏️"), p("hat", "🎩")) },
  { text: "I can hug my mom.", emoji: "🤗", question: sq("Who do I hug?", p("mom", "👩"), p("dog", "🐶"), p("pig", "🐷")) },
  { text: "The fish is in the dish.", emoji: "🐟", question: sq("Where is the fish?", p("dish", "🍽️"), p("ship", "🚢"), p("box", "📦")) },
  { text: "A frog sat on a log.", emoji: "🐸", question: sq("Where did the frog sit?", p("log", "🪵"), p("rock", "🪨"), p("bed", "🛏️")) },
  { text: "The duck has a red sock.", emoji: "🦆", question: sq("What does the duck have?", p("sock", "🧦"), p("hat", "🎩"), p("cake", "🎂")) },
  { text: "The goat is in the boat.", emoji: "🐐", question: sq("Where is the goat?", p("boat", "⛵"), p("car", "🚗"), p("tent", "⛺")) },
  { text: "A bee is on the tree.", emoji: "🐝", question: sq("What is on the tree?", p("bee", "🐝"), p("cat", "🐱"), p("star", "⭐")) },
  { text: "The king can sing.", emoji: "🤴", question: sq("Who can sing?", p("king", "🤴"), p("crab", "🦀"), p("snail", "🐌")) },
];

const q = (kind: QKind, question: string, a: string, wrong: string[], why: string): Question => ({ q: question, a, wrong, kind, why });

export const PASSAGES: Passage[] = [
  // ── 1st grade: short stories ────────────────────────────────────────────────────────────────
  { id: "lost-hat", grade: "1", title: "The Lost Hat", emoji: "🎩", text: "Sam had a red hat. The wind came and the hat flew up. It landed in a tree. Sam's dad got a long stick. He got the hat down. Sam was glad.", questions: [
    q("detail", "Where did the hat land?", "in a tree", ["in the pond", "on the bus"], "The story says, \"It landed in a tree.\""),
    q("cause", "Why did the hat fly up?", "The wind came.", ["Sam threw it.", "A bird took it."], "The wind came, and the hat flew up."),
    q("feeling", "How did Sam feel at the end?", "glad", ["mad", "sleepy"], "The last line says Sam was glad."),
  ] },
  { id: "pet-fish", grade: "1", title: "Nell's Fish", emoji: "🐟", text: "Nell has a pet fish. His name is Bubbles. Nell feeds him one pinch of food each day. Bubbles swims fast when he sees her. Nell thinks he is the best fish.", questions: [
    q("detail", "What is the fish's name?", "Bubbles", ["Nell", "Splash"], "\"His name is Bubbles.\""),
    q("detail", "How much food does Nell give him?", "one pinch", ["a big cup", "three bags"], "She feeds him one pinch of food each day."),
    q("infer", "Why does Bubbles swim fast when he sees Nell?", "He knows she brings food.", ["He is scared of the tank.", "He wants to sleep."], "Nell feeds him every day, so he gets excited when she comes."),
  ] },
  { id: "snow-day", grade: "1", title: "Snow Day", emoji: "⛄", text: "It snowed all night. In the morning, Jack and Kim ran outside. They made a big snowman. Kim gave it a hat. Jack gave it a carrot nose. Then they went in for hot cocoa.", questions: [
    q("sequence", "What did they do first?", "ran outside", ["drank cocoa", "gave it a nose"], "First they ran outside, then they built the snowman."),
    q("detail", "What did Jack give the snowman?", "a carrot nose", ["a hat", "a scarf"], "\"Jack gave it a carrot nose.\""),
    q("main", "What is the story mostly about?", "Two kids playing in the snow", ["Making cocoa", "A rainy day"], "Most of the story is about Jack and Kim playing in the snow."),
  ] },
  { id: "big-race", grade: "1", title: "The Big Race", emoji: "🏃", text: "Max was in a race. He ran and ran. Then he fell down! His knee hurt. Max got up and kept going. He came in last, but he finished. His team cheered for him.", questions: [
    q("detail", "What happened in the middle of the race?", "Max fell down.", ["Max won.", "Max took a nap."], "\"Then he fell down!\""),
    q("infer", "Why did the team cheer?", "Max kept going and finished.", ["Max came in first.", "Max quit the race."], "He got up after falling and finished — that's worth cheering."),
    q("main", "What lesson does the story teach?", "Keep trying even when it's hard.", ["Always win.", "Never run."], "Max didn't give up after he fell."),
  ] },
  { id: "garden", grade: "1", title: "Mia's Garden", emoji: "🌻", text: "Mia planted seeds in a pot. She gave them water and set them in the sun. After a week, a green sprout popped up. Mia smiled. Soon it grew into a tall sunflower.", questions: [
    q("detail", "What did Mia plant?", "seeds", ["a tree", "a cake"], "\"Mia planted seeds in a pot.\""),
    q("sequence", "What happened after a week?", "A sprout popped up.", ["Mia planted seeds.", "It snowed."], "After a week, a green sprout popped up."),
    q("detail", "What did the sprout grow into?", "a sunflower", ["a rose", "a carrot"], "It grew into a tall sunflower."),
  ] },
  // ── 2nd grade ──────────────────────────────────────────────────────────────────────────────
  { id: "sea-turtles", grade: "2", title: "Sea Turtle Babies", emoji: "🐢", text: "A mother sea turtle crawls onto a sandy beach at night. She digs a hole and lays her eggs. Then she covers them with sand and goes back to the sea. About two months later, the baby turtles hatch. They dig their way out and crawl toward the bright water. It is a long trip for such tiny turtles, but they know where to go.", questions: [
    q("detail", "Where does the mother turtle lay her eggs?", "on a sandy beach", ["in the ocean", "in a tree"], "She crawls onto a sandy beach and digs a hole."),
    q("sequence", "What happens after the babies hatch?", "They crawl toward the water.", ["The mother lays eggs.", "They dig a hole."], "After they hatch, they dig out and crawl toward the water."),
    q("vocab", "What does \"hatch\" mean here?", "come out of the egg", ["fall asleep", "swim fast"], "The babies hatch — they come out of their eggs."),
  ] },
  { id: "lemonade", grade: "2", title: "The Lemonade Stand", emoji: "🍋", text: "Zoe wanted to buy a new book, so she set up a lemonade stand. On the first day, it rained and no one came. Zoe didn't give up. The next day was sunny and hot. Lots of people stopped for a cold drink. By the end of the week, Zoe had enough money for her book.", questions: [
    q("cause", "Why did no one come on the first day?", "It rained.", ["The lemonade was bad.", "Zoe was sick."], "On the first day, it rained."),
    q("infer", "Why did lots of people stop the next day?", "It was hot, and they wanted a cold drink.", ["It was raining.", "The book was free."], "On a sunny, hot day, a cold drink sounds great."),
    q("main", "What is the main idea?", "Zoe worked hard to earn money for a book.", ["Rain is bad.", "Lemons are yellow."], "The story is about Zoe earning money for her book."),
  ] },
  { id: "bees", grade: "2", title: "Busy Bees", emoji: "🐝", text: "Honeybees live together in a hive. Each hive has one queen bee. Worker bees fly from flower to flower to collect a sweet juice called nectar. Back at the hive, they turn the nectar into honey. When a bee finds lots of flowers, she does a wiggly dance to show the other bees where to go.", questions: [
    q("detail", "How many queen bees live in a hive?", "one", ["ten", "none"], "\"Each hive has one queen bee.\""),
    q("vocab", "What is nectar?", "a sweet juice in flowers", ["a kind of bug", "a bee's house"], "The passage calls nectar a sweet juice the bees collect."),
    q("detail", "Why does a bee do a dance?", "to show other bees where flowers are", ["to stay warm", "to scare birds"], "The dance shows the other bees where to go."),
  ] },
  { id: "new-kid", grade: "2", title: "The New Kid", emoji: "🧒", text: "Leo was the new kid at school. At lunch, he sat alone and stared at his tray. Ava saw him and walked over. \"Want to sit with us?\" she asked. Leo smiled and followed her. By the end of the day, Leo had three new friends.", questions: [
    q("feeling", "How did Leo probably feel at the start of lunch?", "lonely", ["excited", "angry"], "He sat alone and stared at his tray — he felt lonely."),
    q("detail", "What did Ava ask Leo?", "if he wanted to sit with them", ["for his lunch", "to go home"], "\"Want to sit with us?\""),
    q("main", "What does the story show?", "A small kind act can make a big difference.", ["Lunch is boring.", "School is too big."], "Ava's invitation helped Leo make friends."),
  ] },
  // ── 3rd grade ──────────────────────────────────────────────────────────────────────────────
  { id: "octopus", grade: "3", title: "Masters of Disguise", emoji: "🐙", text: "The octopus is one of the ocean's best hiders. It can change the color of its skin in less than a second to match rocks, sand, or coral. Some octopuses can even change the bumps on their skin to look like seaweed. An octopus has no bones, so it can squeeze through a crack as small as a coin. It also has three hearts and blue blood! These amazing tricks help the octopus stay safe from sharks and other hunters.", questions: [
    q("main", "What is the passage mostly about?", "How an octopus stays hidden and safe", ["What sharks eat", "How coral grows"], "Most sentences describe the octopus's hiding tricks."),
    q("cause", "Why can an octopus squeeze through tiny cracks?", "It has no bones.", ["It has three hearts.", "It has blue blood."], "\"An octopus has no bones, so it can squeeze through a crack.\""),
    q("vocab", "In this passage, \"disguise\" means…", "a way to hide what you look like", ["a kind of fish", "a strong shell"], "Changing color and bumps is a disguise — a way to look like something else."),
  ] },
  { id: "lighthouse", grade: "3", title: "The Lighthouse Keeper", emoji: "🗼", text: "Long ago, Grandpa Joe was a lighthouse keeper. Every night he climbed one hundred stairs to light the lamp at the top. On stormy nights, the waves crashed and the wind howled, but he never let the light go out. Ships far out at sea used the light to stay away from the rocks. Once, a fishing boat came home safely in a terrible storm because of his light. The captain later brought Grandpa Joe a basket of fish to say thank you.", questions: [
    q("detail", "How many stairs did Grandpa Joe climb?", "one hundred", ["ten", "one thousand"], "He climbed one hundred stairs every night."),
    q("cause", "Why did ships need the light?", "to stay away from the rocks", ["to find fish", "to see the stars"], "Ships used the light to stay away from the rocks."),
    q("infer", "Why did the captain bring a basket of fish?", "to thank Grandpa Joe for helping his boat get home", ["because he had too many", "to sell them"], "The boat came home safely because of the light — the fish said thank you."),
  ] },
  { id: "water-cycle", grade: "3", title: "Water on the Move", emoji: "💧", text: "The water you drink today might once have been part of a cloud, an ocean, or even a dinosaur's drink! Water moves in a never-ending circle called the water cycle. The sun warms water in oceans and lakes, and it rises into the air as a gas. This is called evaporation. High in the sky, the gas cools and turns into tiny drops that form clouds. When the drops get heavy, they fall as rain or snow. Then the water flows back to the oceans, and the cycle starts again.", questions: [
    q("vocab", "What is evaporation?", "water rising into the air as a gas", ["rain falling down", "a big cloud"], "The passage says water rises into the air as a gas — that's evaporation."),
    q("sequence", "What happens right after clouds form?", "The drops get heavy and fall as rain or snow.", ["The sun warms the ocean.", "Water turns into a gas."], "When the drops in clouds get heavy, they fall."),
    q("main", "What is the main idea?", "Water moves around and around in a cycle.", ["Dinosaurs drank water.", "Clouds are fluffy."], "The passage explains the water cycle."),
  ] },
  { id: "honest-tom", grade: "3", title: "The Broken Vase", emoji: "🏺", text: "Tom was playing ball inside, even though he knew he shouldn't. The ball bounced off the wall and knocked over Mom's favorite vase. It cracked into pieces. Tom's heart pounded. He could hide the pieces and say nothing. Instead, he found Mom and told her the truth. Mom was sad about the vase, but she hugged Tom. \"Thank you for being honest,\" she said. \"Now let's clean it up together.\"", questions: [
    q("cause", "What made the vase break?", "Tom's ball knocked it over.", ["The cat jumped on it.", "Mom dropped it."], "The ball bounced off the wall and knocked over the vase."),
    q("feeling", "\"Tom's heart pounded\" tells us he felt…", "nervous", ["sleepy", "bored"], "A pounding heart means he was nervous about what happened."),
    q("main", "What lesson does the story teach?", "Telling the truth is the right choice, even when it's hard.", ["Never play ball.", "Vases are fragile."], "Tom chose to be honest, and Mom thanked him for it."),
  ] },
  // ── 4th grade ──────────────────────────────────────────────────────────────────────────────
  { id: "wright", grade: "4", title: "Twelve Seconds That Changed the World", emoji: "✈️", text: "In 1903, two brothers from Ohio named Orville and Wilbur Wright did something many people said was impossible. On a windy beach near Kitty Hawk, North Carolina, Orville lay on the wing of their homemade airplane as it rose into the air. The flight lasted only twelve seconds and covered about 120 feet — less than the length of a basketball court and back. But it was the first time a powered airplane carried a person through the air. The brothers had spent years studying birds, building gliders, and testing wing shapes in a wind tunnel they made themselves. Their patience turned a dream into history.", questions: [
    q("detail", "Where did the first flight happen?", "near Kitty Hawk, North Carolina", ["in Ohio", "in a city"], "The passage says it was on a beach near Kitty Hawk, North Carolina."),
    q("infer", "Why does the author say the flight \"changed the world\"?", "It led to the airplanes people use today.", ["It was very long.", "It was in a basketball court."], "It was the first powered flight — the start of air travel."),
    q("vocab", "What does \"patience\" mean in the last sentence?", "staying with something for a long time without giving up", ["being in a hurry", "being lucky"], "They spent years studying and testing — that takes patience."),
    q("main", "What is the main idea?", "The Wright brothers' hard work led to the first airplane flight.", ["Birds can fly.", "North Carolina is windy."], "The passage tells how years of work led to their first flight."),
  ] },
  { id: "polar", grade: "4", title: "Built for the Cold", emoji: "🐻‍❄️", text: "Life in the Arctic can be brutal, with winter temperatures far below zero. Yet many animals thrive there. Polar bears have a thick layer of fat called blubber that keeps them warm, and their fur is not actually white — each hair is clear and hollow, reflecting sunlight. Underneath, their skin is black, which helps soak up heat. The Arctic fox has fur that changes with the seasons: brown in summer to blend in with rocks, white in winter to match the snow. Even its furry paws work like built-in boots.", questions: [
    q("vocab", "What does \"thrive\" mean?", "grow and do well", ["freeze", "move away"], "Many animals thrive — they do well — even in the cold."),
    q("detail", "What color is a polar bear's skin?", "black", ["white", "pink"], "\"Underneath, their skin is black.\""),
    q("cause", "Why does the Arctic fox's fur turn white in winter?", "to blend in with the snow", ["because it is sick", "to look like rocks"], "White fur matches the winter snow."),
    q("main", "What is the passage mostly about?", "How Arctic animals are built to survive the cold", ["Why snow is white", "How to make boots"], "Every detail shows an animal adapted to the cold."),
  ] },
  { id: "kindness-chain", grade: "4", title: "The Kindness Chain", emoji: "🔗", text: "It started small. Priya noticed that her neighbor, Mr. Alvarez, was struggling to carry his groceries, so she helped him bring them inside. The next day, Mr. Alvarez shoveled snow from the sidewalk in front of the whole block. A woman who walked by every morning was so grateful that she left a thank-you note and a box of cookies for the street. Soon, everyone on Maple Street was finding ways to help each other. Priya realized that one small choice had started a chain reaction of kindness.", questions: [
    q("sequence", "What happened right after Priya helped Mr. Alvarez?", "He shoveled the sidewalk for the block.", ["A woman left cookies.", "Priya moved away."], "\"The next day, Mr. Alvarez shoveled snow…\""),
    q("vocab", "A \"chain reaction\" is…", "one thing causing another, then another", ["a necklace", "a kind of snowstorm"], "Each kind act caused the next one, like links in a chain."),
    q("infer", "Why did the woman leave cookies?", "She was thankful for the shoveled sidewalk.", ["She was moving.", "It was her birthday."], "She was grateful and wanted to say thank you."),
    q("main", "What is the theme of the story?", "Small acts of kindness can spread.", ["Winter is cold.", "Groceries are heavy."], "Priya's one act spread through the whole street."),
  ] },
  { id: "volcano", grade: "4", title: "Islands Made of Fire", emoji: "🌋", text: "Deep beneath the ocean floor, melted rock called magma pushes upward. When it bursts through a crack in the Earth's crust, it becomes lava. Over thousands of years, layer after layer of cooled lava can pile up until it rises above the waves and forms an island. The Hawaiian Islands formed this way. In fact, some of Hawaii's volcanoes are still active, and new land is still being made today. Scientists study these volcanoes carefully to warn people before an eruption.", questions: [
    q("vocab", "What is the difference between magma and lava?", "Magma is underground; lava has reached the surface.", ["They are different colors.", "Lava is colder than ice."], "Magma becomes lava when it bursts through the crust."),
    q("detail", "Which islands formed from volcanoes?", "the Hawaiian Islands", ["Greenland", "the Arctic"], "\"The Hawaiian Islands formed this way.\""),
    q("cause", "Why do scientists study active volcanoes?", "to warn people before an eruption", ["to make new islands", "to cool the lava"], "They study them carefully to warn people."),
    q("infer", "What can you tell about Hawaii's size over time?", "It can slowly grow as new land forms.", ["It is shrinking fast.", "It never changes."], "New land is still being made, so the islands can grow."),
  ] },
  // ── 5th grade ──────────────────────────────────────────────────────────────────────────────
  { id: "iss", grade: "5", title: "Sixteen Sunrises a Day", emoji: "🛰️", text: "About 250 miles above Earth, the International Space Station races around the planet at roughly 17,500 miles per hour. At that speed, it circles Earth about every 90 minutes, which means astronauts on board can see around sixteen sunrises and sunsets each day. Life there takes creative solutions: food comes in sealed pouches, water is recycled again and again, and astronauts sleep in sleeping bags strapped to the wall so they don't float away. Despite the challenges, crews from many countries work together on experiments that help us understand everything from plant growth to the human body.", questions: [
    q("cause", "Why do astronauts see about sixteen sunrises a day?", "The station circles Earth about every 90 minutes.", ["The sun moves faster in space.", "They stay awake all day."], "Circling Earth every 90 minutes means many sunrises a day."),
    q("vocab", "What does \"creative solutions\" mean here?", "clever new ways to solve problems", ["art projects", "easy answers"], "Pouches, recycled water and strapped sleeping bags are clever fixes."),
    q("infer", "Why are sleeping bags strapped to the wall?", "Without gravity, astronauts would float around.", ["The beds are too small.", "It's warmer near the wall."], "So they don't float away while sleeping."),
    q("main", "What is the main idea?", "Life on the space station is challenging but full of teamwork and discovery.", ["Space is very dark.", "Food tastes bad in space."], "The passage covers the challenges and the teamwork."),
  ] },
  { id: "rainforest", grade: "5", title: "The Rainforest Pharmacy", emoji: "🌿", text: "Tropical rainforests cover only a small part of Earth's land, yet they are home to about half of all plant and animal species. Many of the medicines people use began with rainforest plants. For example, a plant called the rosy periwinkle led to medicines that help treat some kinds of cancer. Sadly, rainforests are being cut down for farming and lumber. When a rainforest disappears, we may lose plants that could have become tomorrow's cures. That is one reason scientists and communities work to protect these forests.", questions: [
    q("detail", "About how many of the world's species live in rainforests?", "about half", ["almost none", "all of them"], "The passage says about half of all plant and animal species."),
    q("cause", "Why might losing rainforests affect medicine?", "Plants that could become cures might disappear.", ["Medicines would get cheaper.", "Doctors would move away."], "If the forest disappears, we might lose plants that could become cures."),
    q("vocab", "Why is the title \"The Rainforest Pharmacy\"?", "Many medicines come from rainforest plants.", ["Rainforests sell food.", "Doctors live there."], "A pharmacy has medicines — and so does the rainforest, in a way."),
    q("main", "What is the author's main point?", "Rainforests are valuable and worth protecting.", ["Farming is bad.", "Plants are green."], "The author explains why rainforests matter and should be protected."),
  ] },
  { id: "dinos-birds", grade: "5", title: "Dinosaurs Among Us", emoji: "🦖", text: "When you see a pigeon pecking at crumbs, you might be looking at a living dinosaur. Scientists have found many fossils of dinosaurs with feathers, and they have discovered that birds share many features with certain dinosaurs, like hollow bones and wishbones. Most scientists now agree that birds are the descendants of small, meat-eating dinosaurs. So while the giant T. rex disappeared about 66 million years ago, its distant relatives are still flapping around our backyards.", questions: [
    q("main", "What is the passage mostly about?", "Birds are related to dinosaurs.", ["Pigeons eat crumbs.", "T. rex was huge."], "The passage explains the link between birds and dinosaurs."),
    q("detail", "What features do birds share with some dinosaurs?", "hollow bones and wishbones", ["scales and horns", "long tails and teeth"], "The passage names hollow bones and wishbones."),
    q("vocab", "What does \"descendants\" mean?", "family members who come later", ["enemies", "fossils"], "Birds came later, from dinosaurs — they're descendants."),
    q("infer", "Why does the author mention a pigeon at the start?", "To surprise the reader with a familiar example of a dinosaur relative.", ["Because pigeons are rare.", "To teach about bread."], "It hooks the reader by connecting dinosaurs to something they see every day."),
  ] },
];

export const passagesFor = (grade: GradeId) => PASSAGES.filter((x) => x.grade === grade);
