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

  // ── More 3rd grade ──────────────────────────────────────────────────────────────────────────
  { id: "seeds", grade: "3", title: "Seeds on the Move", emoji: "🌱", text: "Plants can't walk, but their seeds still travel. Dandelion seeds have fluffy parachutes that ride the wind for miles. Coconuts can float across the ocean and sprout on a faraway beach. Burdock seeds are covered in tiny hooks that grab onto a dog's fur or your socks, hitching a ride to a new place. Some pods even burst open with a pop, flinging their seeds through the air. Why travel at all? A seed that lands far from its parent plant has more room, sunlight and water to grow.", questions: [
    q("detail", "How do dandelion seeds travel?", "They ride the wind on fluffy parachutes.", ["They float across the ocean.", "They hook onto fur."], "Dandelion seeds have fluffy parachutes that ride the wind."),
    q("cause", "Why is it good for a seed to land far from its parent plant?", "It has more room, sunlight and water to grow.", ["It stays warmer.", "It can talk to other seeds."], "The last sentence explains why traveling helps."),
    q("vocab", "What does \u201chitching a ride\u201d mean here?", "catching a free trip by holding on to something", ["walking very fast", "planting itself in a sock"], "The hooked seeds grab fur or socks and get carried along."),
    q("main", "What is the passage mostly about?", "the clever ways seeds travel to new places", ["why dogs have fur", "how to grow coconuts"], "Each example shows a different way seeds travel."),
  ] },
  { id: "borrowed-book", grade: "3", title: "The Borrowed Book", emoji: "📕", text: "Kai borrowed a book about sharks from the school library. On Saturday, he left it on the couch, and his puppy chewed one corner of the cover. Kai's stomach dropped. He could hide the chewed corner with a sticker and say nothing. Instead, on Monday he carried the book to Ms. Ortiz, the librarian. \u201cMy puppy chewed it,\u201d he said. \u201cI'm really sorry. I can help fix it.\u201d Ms. Ortiz smiled and showed him how to tape the cover. \u201cThank you for telling me the truth,\u201d she said. \u201cThat matters more than the corner.\u201d", questions: [
    q("feeling", "How did Kai feel when he saw the chewed book?", "worried", ["excited", "sleepy"], "His stomach dropped — he was worried."),
    q("infer", "What other choice did Kai think about?", "hiding the damage and saying nothing", ["buying a new puppy", "keeping the book forever"], "He thought about hiding the corner with a sticker."),
    q("main", "What lesson does the story teach?", "Telling the truth matters, even when it's hard.", ["Puppies like books.", "Sharks are interesting."], "Ms. Ortiz says the truth matters more than the corner."),
    q("detail", "How did Ms. Ortiz help Kai?", "She showed him how to tape the cover.", ["She gave him a new book.", "She called his parents."], "She showed him how to tape the cover."),
  ] },
  { id: "volcano-fair", grade: "3", title: "The Science Fair Surprise", emoji: "🌋", text: "Jada built a model volcano for the science fair. She shaped it from clay and painted it brown and green. The night before the fair, she tested it. She poured baking soda into the top, then added vinegar. Nothing happened except a tiny fizz. Jada wanted to give up, but her grandpa asked, “What could you change?” Jada tried more baking soda, then warm vinegar with a squirt of dish soap. This time, foam bubbled up and rolled down the sides like real lava! At the fair, Jada explained that baking soda and vinegar make a gas, and the soap traps the gas in bubbles.", questions: [
    q("sequence", "What did Jada do after her first test only fizzed a little?", "She changed the amounts and added soap.", ["She threw the volcano away.", "She painted it again."], "She tried more baking soda and warm vinegar with dish soap."),
    q("cause", "Why did the foam bubble up the second time?", "The soap trapped the gas in bubbles.", ["The clay melted.", "The paint was wet."], "Jada explained that the soap traps the gas in bubbles."),
    q("feeling", "What does Jada's grandpa's question show about him?", "He encouraged her to keep trying.", ["He wanted her to quit.", "He didn't care about the fair."], "Asking what she could change helped her keep going."),
    q("main", "What is the big idea of the story?", "When something doesn't work, change it and try again.", ["Volcanoes are dangerous.", "Science fairs are boring."], "Jada's first try failed, so she adjusted and succeeded."),
  ] },

  // ── More 4th grade ──────────────────────────────────────────────────────────────────────────
  { id: "monarchs", grade: "4", title: "The Monarch's Long Journey", emoji: "🦋", text: "Every fall, millions of monarch butterflies in eastern North America begin an amazing journey. They fly south as far as 3,000 miles to the mountain forests of central Mexico, where they cluster on fir trees by the thousands to stay warm through winter. The butterflies that make this trip are special: while most monarchs live only a few weeks, this migrating generation can live up to eight months. In spring they head north, but no single butterfly finishes the round trip. Their children and grandchildren continue the journey, and it takes several generations to reach the north again.", questions: [
    q("detail", "Where do eastern monarchs spend the winter?", "in the mountain forests of central Mexico", ["in Canada", "at the beach in Florida"], "They fly to the mountain forests of central Mexico."),
    q("vocab", "What does \u201cmigrating\u201d mean?", "moving from one region to another with the seasons", ["staying in one place", "eating plants"], "The monarchs travel south in fall and north in spring."),
    q("infer", "Why do the butterflies cluster together on trees?", "to stay warm through the winter", ["to hide from rain only", "to lay eggs on the bark"], "The passage says they cluster to stay warm."),
    q("main", "What makes the monarch migration so remarkable?", "It is a huge journey that takes several generations to complete.", ["Monarchs are orange.", "Mexico has mountains."], "No single butterfly finishes the trip; it takes generations."),
  ] },
  { id: "leaves", grade: "4", title: "Why Leaves Change Color", emoji: "🍁", text: "All summer, leaves look green because they are full of chlorophyll, the substance plants use to turn sunlight into food. But leaves also contain yellow and orange colors that the green hides. In autumn, the days grow shorter and cooler, and trees stop making chlorophyll. As the green fades, the yellow and orange finally show through. Some trees, like many maples, also make new red and purple colors in the fall. Eventually the leaves dry out and drop, and the tree rests through the winter, saving its energy for spring.", questions: [
    q("cause", "Why do yellow and orange colors appear in autumn?", "The green chlorophyll fades and stops hiding them.", ["The leaves get painted by frost.", "The tree drinks more water."], "As the green fades, the yellow and orange show through."),
    q("vocab", "What is chlorophyll?", "the green substance plants use to make food from sunlight", ["a kind of bug that eats leaves", "the water inside a tree"], "The passage defines it right after the word."),
    q("detail", "What triggers trees to stop making chlorophyll?", "shorter, cooler days", ["heavy rain", "loud storms"], "In autumn, the days grow shorter and cooler, and trees stop making chlorophyll."),
    q("sequence", "What happens after the leaves dry out?", "They drop, and the tree rests for winter.", ["They turn green again.", "They grow bigger."], "Eventually the leaves dry out and drop, and the tree rests."),
  ] },
  { id: "togo", grade: "4", title: "The Race to Nome", emoji: "🐕", text: "In the winter of 1925, a dangerous sickness called diphtheria broke out in Nome, Alaska. The town needed medicine fast, but deep snow and fierce winds made it impossible to fly it in. So teams of sled dogs and their drivers carried the medicine in a relay, passing it from team to team across about 674 miles of frozen land. One lead dog, Togo, guided his team across the longest and most dangerous part of the trail, including cracking sea ice. Another dog, Balto, led the final stretch into Nome. The medicine arrived in under six days, and the people of Nome were saved.", questions: [
    q("cause", "Why did sled dogs carry the medicine instead of a plane?", "Deep snow and fierce winds made flying impossible.", ["Planes hadn't been invented.", "The dogs were faster than planes."], "The passage says snow and winds made it impossible to fly it in."),
    q("vocab", "What does “relay” mean in this passage?", "a race where each team carries something part of the way, then passes it on", ["a type of sled", "a dog's bark"], "The medicine was passed from team to team."),
    q("detail", "What made Togo's part of the run special?", "He led the longest and most dangerous part.", ["He ran the shortest part.", "He carried the most dogs."], "Togo guided his team across the longest and most dangerous part."),
    q("main", "What is this passage mostly about?", "Teams of sled dogs worked together to save a town.", ["Alaska is cold.", "Balto was the only hero."], "It tells how the relay of dog teams delivered life-saving medicine."),
  ] },
  { id: "robot-team", grade: "4", title: "The Robot Team", emoji: "🤖", text: "Nora, Eli and Sam had two weeks to build a robot for the school competition. Nora was the best at building, so she started doing everything herself. She wired the motors, wrote the code and wouldn't let anyone else touch the robot. The night before the contest, the robot spun in circles and wouldn't drive straight. Exhausted, Nora finally asked for help. Eli spotted a loose wire in seconds, and Sam found a mistake in the code. Their robot drove perfectly the next day. \u201cWe should have worked together from the start,\u201d Nora admitted.", questions: [
    q("cause", "Why did the robot spin in circles?", "There was a loose wire and a mistake in the code.", ["The batteries were too new.", "The floor was too slippery."], "Eli found a loose wire and Sam found a code mistake."),
    q("feeling", "Why did Nora finally ask for help?", "She was exhausted and the robot still didn't work.", ["Her teacher made her.", "She wanted to quit the team."], "Exhausted, Nora finally asked for help."),
    q("main", "What is the theme of the story?", "Teams do better when everyone shares the work.", ["Robots are hard to build.", "Competitions are unfair."], "Nora admits they should have worked together from the start."),
    q("infer", "What does Nora's last line show?", "She learned from her mistake.", ["She is still angry.", "She thinks she won alone."], "Admitting they should have teamed up shows she learned."),
  ] },
  { id: "wangari", grade: "4", title: "Wangari's Trees", emoji: "🌳", text: "Wangari Maathai grew up in Kenya, where she loved the fig trees and clear streams near her home. Years later, after studying science, she returned and saw that many forests had been cut down. Streams were drying up, and families had to walk farther for firewood. Wangari had a simple but powerful idea: plant trees. She started the Green Belt Movement and taught women across Kenya to grow seedlings and plant them. Together they planted millions of trees. In 2004, Wangari became the first African woman to win the Nobel Peace Prize for her work.", questions: [
    q("cause", "Why did Wangari start planting trees?", "Forests were cut down, and streams were drying up.", ["She wanted to sell wood.", "Her school asked her to."], "She saw forests cut down, streams drying up and families walking farther for firewood."),
    q("detail", "Who did Wangari teach to plant seedlings?", "women across Kenya", ["only scientists", "her classmates in college"], "She taught women across Kenya to grow seedlings."),
    q("main", "What is the main idea?", "One person's idea grew into a movement that helped people and the land.", ["Fig trees are tasty.", "Kenya is in Africa."], "Her simple idea led to millions of trees and a Nobel Prize."),
    q("vocab", "What does “seedlings” mean?", "very young plants grown from seeds", ["large old trees", "kinds of birds"], "They grew seedlings and then planted them."),
  ] },
  { id: "audition", grade: "4", title: "The Big Audition", emoji: "🎭", text: "Maya had practiced her lines for the school play all week, but when her name was called, her hands started shaking. She walked to the middle of the stage and took a slow, deep breath, the way her coach had taught her. Halfway through, she forgot a line. For a second, the room went silent. Instead of running off, Maya smiled, remembered where the scene was going and said the line in her own words. The director laughed and clapped. Two days later, Maya found her name on the cast list.", questions: [
    q("detail", "What did Maya do to calm down?", "took a slow, deep breath", ["sang a song", "ran around the stage"], "She took a slow, deep breath, as her coach taught her."),
    q("infer", "Why did the director clap?", "Maya kept going and handled her mistake well.", ["She said every line perfectly.", "The audition was over early."], "She stayed calm and kept the scene going after forgetting a line."),
    q("vocab", "What does \u201ccast list\u201d mean?", "the list of people chosen for parts in the play", ["a list of chores", "a list of lost items"], "Finding her name on it means she got a part."),
    q("main", "What lesson does the story show?", "A mistake doesn't have to stop you if you keep going.", ["Plays are too hard.", "Practice is a waste of time."], "Maya forgot a line, kept going, and still got a part."),
  ] },

  // ── More 5th grade ──────────────────────────────────────────────────────────────────────────
  { id: "coral", grade: "5", title: "The Secret Life of Coral", emoji: "🪨", text: "A coral reef may look like colorful rock, but it is built by animals. Each coral is a colony of tiny creatures called polyps, which build hard skeletons of limestone around themselves. Living inside the polyps are microscopic algae that use sunlight to make food, sharing it with the coral and giving reefs their brilliant colors. This partnership is delicate. When ocean water becomes too warm, the coral push out the algae and turn white, a change called bleaching. If the water cools in time, the algae can return; if not, the coral may starve. Protecting reefs means protecting the partnership that keeps them alive.", questions: [
    q("main", "What is the passage mostly about?", "Coral reefs depend on a delicate partnership between polyps and algae.", ["Reefs are made of plain rock.", "Fish like warm water."], "The passage explains the polyp-algae partnership and how it can break."),
    q("vocab", "What is “bleaching” in this passage?", "coral turning white after pushing out its algae", ["cleaning the ocean floor", "a kind of fishing"], "When water is too warm, coral push out the algae and turn white."),
    q("cause", "What can cause coral to starve?", "Water that stays too warm, so the algae don't return.", ["Too many colors.", "Cold, clean water."], "If the water doesn't cool in time, the coral may starve."),
    q("infer", "Why does the author call the partnership “delicate”?", "Small changes, like warmer water, can break it.", ["It is made of glass.", "It never changes."], "Warm water alone can make the coral push out the algae."),
  ] },
  { id: "mary-anning", grade: "5", title: "The Girl Who Found a Sea Dragon", emoji: "🦕", text: "Two hundred years ago in Lyme Regis, England, a girl named Mary Anning searched the crumbling seaside cliffs for fossils to sell to tourists. Around the age of twelve, she and her brother uncovered the skeleton of a strange creature with a long snout and huge eyes. Scientists later named it an ichthyosaur, a sea reptile that lived during the time of the dinosaurs. Mary went on to discover many more fossils, including a long-necked plesiosaur. Even though women were not allowed to join the scientific societies of her day, experts traveled to learn from her, and today she is honored as a pioneer of paleontology.", questions: [
    q("detail", "What creature did Mary and her brother uncover?", "an ichthyosaur, a sea reptile", ["a woolly mammoth", "a giant bird"], "Scientists named it an ichthyosaur."),
    q("vocab", "What does \u201cpaleontology\u201d mean?", "the study of ancient life through fossils", ["the study of the ocean", "selling souvenirs"], "Mary is called a pioneer of the science of fossils."),
    q("infer", "What does it say about Mary that experts traveled to learn from her?", "Her knowledge was respected even though she was shut out of societies.", ["She was a famous tourist.", "She charged a lot of money."], "Experts came to her despite the rules that kept women out."),
    q("main", "What is the main idea?", "Mary Anning made important discoveries despite unfair limits.", ["Cliffs crumble by the sea.", "Fossils are easy to find."], "The passage highlights her discoveries and the obstacles she faced."),
  ] },
  { id: "code-talkers", grade: "5", title: "The Unbreakable Code", emoji: "📻", text: "During World War II, the United States needed a way to send secret messages that enemies could not understand. The answer came from the Navajo Nation. A group of Navajo Marines created a code based on the Navajo language, which was complex, rarely written down and spoken by very few people outside the Navajo community. They gave military words new Navajo names: a submarine became an “iron fish,” and a tank became a “tortoise.” The Navajo Code Talkers could send and decode a message in minutes, a job that took machines much longer, and their code was never broken. For many years their work was kept secret, but today they are honored as heroes.", questions: [
    q("cause", "Why was the Navajo language a good base for a secret code?", "It was complex, rarely written and known by few outsiders.", ["Everyone already knew it.", "It had no words for animals."], "The passage lists why it was hard for enemies to understand."),
    q("detail", "What did the code call a submarine?", "an iron fish", ["a tortoise", "a sea bird"], "A submarine became an “iron fish.”"),
    q("infer", "Why might a tank be called a “tortoise”?", "Both have hard shells and move along the ground.", ["Tanks are slow swimmers.", "Tortoises are made of metal."], "A tortoise's hard shell is a clever match for an armored tank."),
    q("main", "What is the passage mostly about?", "Navajo Marines created a code that helped win the war and was never broken.", ["Submarines are like fish.", "Codes are easy to make."], "It explains who made the code, how it worked and why it mattered."),
  ] },
  { id: "bike-mystery", grade: "5", title: "The Case of the Missing Bike", emoji: "🔍", text: "When Dev's blue bike vanished from the garage, his sister Priya grabbed a notebook. “Every mystery has clues,” she said. The garage door had been left open. Muddy tire tracks led out to the sidewalk and then turned toward the park. Next to the tracks were small shoe prints, much smaller than an adult's. Priya also noticed that Dev's helmet was still on its hook. At the park, they found the bike leaning against a bench, and their little cousin Max sitting on the swings with muddy sneakers. “I just wanted to try it,” Max admitted. “I was going to bring it back!”", questions: [
    q("infer", "Which clue suggested a child took the bike?", "the small shoe prints", ["the open garage door", "the bench at the park"], "Small shoe prints, much smaller than an adult's, pointed to a kid."),
    q("infer", "What did the helmet still on its hook suggest?", "Whoever took the bike wasn't the bike's owner and didn't plan well.", ["Dev rode the bike himself.", "The bike was stolen by a thief with a helmet."], "Dev would have taken his own helmet — someone else borrowed the bike in a hurry."),
    q("sequence", "Where did the tire tracks lead after the sidewalk?", "toward the park", ["back into the garage", "to the school"], "The tracks turned toward the park."),
    q("main", "What is the lesson about solving problems?", "Look carefully at the clues before deciding what happened.", ["Always lock up your bike.", "Parks are muddy."], "Priya solved the case by noticing and connecting clues."),
  ] },
  { id: "volcanoes", grade: "5", title: "Earth's Pressure Valves", emoji: "🌋", text: "Deep beneath our feet, rock gets so hot that some of it melts into a thick liquid called magma. Earth's outer layer is broken into giant pieces called tectonic plates, which slowly move. Where plates pull apart or one slides beneath another, magma can push its way up through cracks. When pressure builds high enough, a volcano erupts, sending lava, ash and gases into the air. Many volcanoes form a ring around the Pacific Ocean, nicknamed the Ring of Fire. Though eruptions can be dangerous, volcanoes also create new land and leave behind rich soil where crops grow well.", questions: [
    q("vocab", "What is magma?", "melted rock beneath Earth's surface", ["a kind of cloud", "frozen lava"], "The passage defines magma as melted rock deep underground."),
    q("cause", "What causes a volcano to erupt?", "Pressure from rising magma builds up high enough.", ["The ocean gets too cold.", "Too many plants grow on it."], "When pressure builds high enough, a volcano erupts."),
    q("detail", "What is the Ring of Fire?", "a ring of volcanoes around the Pacific Ocean", ["a circus act", "a ring around the sun"], "Many volcanoes form a ring around the Pacific Ocean."),
    q("main", "Which statement best sums up the passage?", "Volcanoes form where moving plates let magma rise, and they can both harm and help.", ["Volcanoes only cause harm.", "Magma is cold and hard."], "It explains how volcanoes form and mentions both dangers and benefits."),
  ] },
  { id: "camp-letter", grade: "5", title: "A Letter from Camp", emoji: "✉️", text: "Dear Mom and Dad, The first two days at camp were hard. I was terrible at canoeing, and on Tuesday I tipped the canoe and got soaked in front of everyone. I wanted to come home. But my counselor, Jo, said everyone tips over at first, and that the only way to get better is to keep paddling. So I practiced every afternoon. Yesterday I paddled all the way across the lake without wobbling, and the other kids cheered! I learned that being bad at something is just the first step to being good at it. See you Saturday! Love, Sam", questions: [
    q("feeling", "How did Sam's feelings change during the week?", "from discouraged to proud", ["from happy to bored", "from proud to angry"], "Sam wanted to come home at first, then proudly crossed the lake."),
    q("cause", "What helped Sam keep trying?", "Jo's advice and practicing every afternoon", ["a new canoe", "quitting canoeing"], "Jo said keep paddling, and Sam practiced every day."),
    q("vocab", "What does “tipped the canoe” mean?", "flipped it over into the water", ["paid the canoe money", "pointed the canoe"], "Sam got soaked — the canoe flipped over."),
    q("main", "What is the main message of Sam's letter?", "Being bad at something is the first step to being good at it.", ["Camp food is great.", "Canoes are dangerous."], "Sam says it directly near the end of the letter."),
  ] },
  { id: "kid-inventors", grade: "5", title: "Inventors Under Fifteen", emoji: "💡", text: "Some famous inventions came from kids. In 1905, an eleven-year-old named Frank Epperson left a cup of fruit drink with a stirring stick on his porch on a cold night. By morning, it had frozen solid, stick and all. Years later he sold the idea, and we still enjoy it today as the Popsicle. In 1873, fifteen-year-old Chester Greenwood was tired of freezing ears while ice skating in Maine. He bent wire into loops and asked his grandmother to sew fur onto them, creating early earmuffs. Both inventors noticed an everyday problem, or a happy accident, and turned it into something useful.", questions: [
    q("detail", "How did Frank Epperson's invention happen?", "His drink froze overnight with the stick in it.", ["He studied ice in a lab.", "His teacher gave him the idea."], "He left the drink out on a cold night, and it froze, stick and all."),
    q("cause", "Why did Chester Greenwood invent earmuffs?", "His ears got cold while ice skating.", ["He wanted to sell fur.", "His grandmother asked him to."], "He was tired of freezing ears while skating."),
    q("vocab", "What does “a happy accident” mean?", "a mistake that turns out to be good", ["a terrible mistake", "a planned surprise"], "Frank's forgotten drink became the Popsicle — a lucky mistake."),
    q("main", "What do the two inventors have in common?", "They turned an everyday problem or accident into something useful.", ["They were both from Maine.", "They both liked fruit drinks."], "The last sentence connects them."),
  ] },
];

export const passagesFor = (grade: GradeId) => PASSAGES.filter((x) => x.grade === grade);
