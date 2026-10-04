import type { WorldDef } from "../gen";
import { politeT, sortT, sortManyT, orderT, matchT, type Pol, type SortBank, type SortMany, type MatchBank } from "../behavior";

// Discovery — little sailors (Pre-K and Kindergarten, ages 3–6). Nine islands of first science:
// the five senses, living things, animal homes and babies (Pre-K), then weather, day and night,
// how seeds grow, pushes and pulls, and taking care of your body (K).
//
// Little sailors can't read yet, so every question, choice and explanation is recorded and read
// aloud, every item shows a big scene, and every sort or match card carries a picture. Choices are
// a few concrete words; every "why" is one warm sentence that teaches the fact after a miss. Small
// is never wrong: the Moon has no light of its own, plants make their own food from sunlight, a
// big rock and a small rock fall together, a snail's shell is part of its body, and no food is
// "bad" — some are everyday foods and some are sometimes foods. Each island ends with dinner-table
// questions for grown-ups and a tiny, safe mission to try today.
//
// Skill keys: "s:<island>-<topic>" (island-prefixed, so they never collide with the older worlds).

type Stage = WorldDef["stages"][number];
const stage = (title: string, emoji: string, topics: Stage["topics"], levels = 1): Stage => ({ title, emoji, topics, levels });

// ═══ Pre-K ═════════════════════════════════════════════════════════════════════════════════

// ── Five Senses Shore ────────────────────────────────────────────────────────────────────
const SENSE_BODY: Pol[] = [
  { q: "What do you use to see a rainbow?", e: "🌈", a: "👀 Eyes", w: ["👃 Nose", "👂 Ears"], why: "You see with your eyes — they show you colors, shapes and faces you love!" },
  { q: "What do you use to hear a song?", e: "🎶", a: "👂 Ears", w: ["👀 Eyes", "✋ Hands"], why: "Your ears catch sounds — like music, birds singing and your name!" },
  { q: "What do you use to smell a flower?", e: "🌷", a: "👃 Nose", w: ["👅 Tongue", "👂 Ears"], why: "Sniff, sniff — your nose smells flowers, cookies and lots more!" },
  { q: "What do you use to taste a strawberry?", e: "🍓", a: "👅 Tongue", w: ["👀 Eyes", "🦶 Feet"], why: "Your tongue has tiny taste buds that tell you sweet, sour and salty!" },
  { q: "What do you use to feel a soft kitten?", e: "🐱", a: "✋ Hands", w: ["👂 Ears", "👃 Nose"], why: "You feel with your skin — and your fingertips are extra good at feeling!" },
  { q: "Your ears help you…", e: "👂", a: "Hear", w: ["See", "Taste"], why: "Ears are for hearing — like a doorbell, a drum or a friend saying hi!" },
  { q: "Your nose helps you…", e: "👃", a: "Smell", w: ["Hear", "See"], why: "Your nose smells things — like yummy pancakes in the morning!" },
  { q: "Your eyes help you…", e: "👀", a: "See", w: ["Smell", "Hear"], why: "Your eyes help you see — like stars, books and smiling faces!" },
  { q: "Your tongue helps you…", e: "👅", a: "Taste", w: ["See", "Hear"], why: "Your tongue tastes your food — mmm, a sweet banana!" },
  { q: "Your skin helps you…", e: "🖐️", a: "Feel and touch", w: ["Taste", "See"], why: "Your skin feels hot, cold, soft and bumpy things, all over your body!" },
];
const SENSE_JOBS: MatchBank = [
  ["👀 Eyes", "See"],
  ["👂 Ears", "Hear"],
  ["👃 Nose", "Smell"],
  ["👅 Tongue", "Taste"],
  ["✋ Hands", "Touch"],
  ["🦶 Feet", "Walk"],
  ["🦷 Teeth", "Chew"],
];
const WHICH_SENSE: Pol[] = [
  { q: "A bird is singing. Which sense tells you?", e: "🐦🎶", a: "👂 Hearing", w: ["👅 Tasting", "👃 Smelling"], why: "You hear a bird sing with your ears — tweet, tweet!" },
  { q: "Cookies are baking! How do you know before you see them?", e: "🍪", a: "👃 Smelling", w: ["👂 Hearing", "✋ Touching"], why: "Your nose can smell cookies baking from far away — yum!" },
  { q: "Is the lemon sour? Which sense tells you?", e: "🍋", a: "👅 Tasting", w: ["👀 Seeing", "👂 Hearing"], why: "Your tongue tastes that a lemon is sour — so sour you might pucker!" },
  { q: "Is the bunny soft? Which sense tells you?", e: "🐰", a: "✋ Touching", w: ["👂 Hearing", "👅 Tasting"], why: "Gently petting tells you a bunny is soft — that's your sense of touch!" },
  { q: "What color is the balloon? Which sense tells you?", e: "🎈", a: "👀 Seeing", w: ["👃 Smelling", "✋ Touching"], why: "Your eyes see colors — and that balloon is red!" },
  { q: "The doorbell rings! Which sense tells you?", e: "🔔🚪", a: "👂 Hearing", w: ["👀 Seeing", "👅 Tasting"], why: "Ding-dong — your ears hear the doorbell ring!" },
  { q: "Is the ice cold? Which sense tells you?", e: "🧊", a: "✋ Touching", w: ["👂 Hearing", "👃 Smelling"], why: "Your skin feels hot and cold — brrr, ice is cold!" },
  { q: "Something stinky is in the trash! Which sense tells you?", e: "🗑️", a: "👃 Smelling", w: ["👂 Hearing", "👀 Seeing"], why: "Pee-yew — your nose can smell stinky things too!" },
  { q: "Stars twinkle at night. Which sense shows you?", e: "✨🌙", a: "👀 Seeing", w: ["👂 Hearing", "👅 Tasting"], why: "Your eyes let you see stars twinkling far, far away!" },
  { q: "Is the popcorn salty? Which sense tells you?", e: "🍿", a: "👅 Tasting", w: ["✋ Touching", "👂 Hearing"], why: "Your tongue can taste salty, sweet, sour and bitter foods!" },
];
const SENSE_SORT: SortMany = {
  prompt: "Do you hear it, smell it, or taste it?",
  bins: [{ id: "hear", label: "Hear", emoji: "👂" }, { id: "smell", label: "Smell", emoji: "👃" }, { id: "taste", label: "Taste", emoji: "👅" }],
  items: [
    ["Drum", "hear", "🥁"], ["Bell", "hear", "🔔"], ["Trumpet", "hear", "🎺"], ["Guitar", "hear", "🎸"], ["Song", "hear", "🎶"],
    ["Flower", "smell", "🌸"], ["Stinky socks", "smell", "🧦"], ["Skunk", "smell", "🦨"], ["Garbage", "smell", "🗑️"], ["Rose", "smell", "🌹"],
    ["Ice cream", "taste", "🍦"], ["Pretzel", "taste", "🥨"], ["Lollipop", "taste", "🍭"], ["Cupcake", "taste", "🧁"], ["Pickle", "taste", "🥒"],
  ],
};
const SOFT_HARD: SortBank = {
  prompt: "Soft or hard? Your fingers can tell!",
  bins: ["Soft", "Hard", "🧸", "🪨"],
  items: [
    ["Teddy bear", 1, "🧸"], ["Feather", 1, "🪶"], ["Kitten", 1, "🐱"], ["Sponge", 1, "🧽"], ["Yarn", 1, "🧶"], ["Bunny", 1, "🐰"], ["Socks", 1, "🧦"], ["Scarf", 1, "🧣"],
    ["Rock", 0, "🪨"], ["Brick", 0, "🧱"], ["Spoon", 0, "🥄"], ["Seashell", 0, "🐚"], ["Ice cube", 0, "🧊"], ["Key", 0, "🔑"], ["Coin", 0, "🪙"], ["Log", 0, "🪵"],
  ],
};
const SENSE_WORDS: MatchBank = [
  ["Soft", "🧸 Teddy bear"],
  ["Loud", "🥁 Drum"],
  ["Sour", "🍋 Lemon"],
  ["Stinky", "🦨 Skunk"],
  ["Cold", "🧊 Ice"],
  ["Bright", "☀️ Sun"],
  ["Sweet", "🍯 Honey"],
  ["Prickly", "🌵 Cactus"],
];
const SUPER_SENSES: Pol[] = [
  { q: "A snake smells the air with its…", e: "🐍", a: "👅 Tongue", w: ["🦶 Feet", "👂 Ears"], why: "A snake flicks its tongue to catch smells floating in the air!" },
  { q: "A butterfly tastes flowers with its…", e: "🦋🌸", a: "🦶 Feet", w: ["👂 Ears", "👃 Nose"], why: "Butterflies taste with their feet — they stand on a flower to taste it!" },
  { q: "Who has a super-sniffer nose?", e: "👃✨", a: "🐶 A dog", w: ["🧸 A teddy bear", "🌷 A tulip"], why: "A dog's nose can sniff out smells way better than yours — sniff, sniff!" },
  { q: "An elephant smells with its long…", e: "🐘", a: "Trunk", w: ["Tail", "Ears"], why: "An elephant's trunk is its nose — it can smell water from far away!" },
  { q: "A cat's whiskers help it…", e: "🐱", a: "Feel what's around it", w: ["Hear music", "Taste food"], why: "Whiskers are super feelers — they help a cat sense things, even in the dark!" },
  { q: "Who has long ears that turn to catch sounds?", e: "👂", a: "🐰 A rabbit", w: ["🐟 A fish", "🐌 A snail"], why: "A rabbit can turn its long ears to listen in different directions!" },
  { q: "A catfish can taste with its…", e: "🐟", a: "Whole body", w: ["Fins only", "Nothing at all"], why: "Catfish have taste buds all over their bodies — they taste with their skin!" },
  { q: "An owl hears tiny sounds. What helps it?", e: "🦉", a: "Super hearing", w: ["A big beak", "Its toes"], why: "Owls hear so well they can find a mouse moving under the snow!" },
  { q: "How do bees find flowers?", e: "🐝", a: "By smell and color", w: ["By loud music", "By reading signs"], why: "Bees smell flowers and see their bright colors to find the sweet nectar inside!" },
  { q: "Which pet can hear sounds too quiet for you?", e: "👂", a: "🐈 A cat", w: ["🧸 A teddy bear", "🪨 A pet rock"], why: "Cats can hear high, tiny sounds that people can't hear at all!" },
];
const LOUD_QUIET: SortBank = {
  prompt: "Loud or quiet? Listen with your ears!",
  bins: ["Loud", "Quiet", "📢", "🐭"],
  items: [
    ["Drum", 1, "🥁"], ["Fire truck", 1, "🚒"], ["Lion's roar", 1, "🦁"], ["Thunder", 1, "⛈️"], ["Trumpet", 1, "🎺"], ["Fireworks", 1, "🎆"], ["Rooster", 1, "🐓"], ["Airplane", 1, "✈️"],
    ["Whisper", 0, "🤫"], ["Butterfly", 0, "🦋"], ["Falling snow", 0, "🌨️"], ["Feather", 0, "🪶"], ["Tiptoes", 0, "🦶"], ["Snail", 0, "🐌"], ["Bunny", 0, "🐰"], ["Turtle", 0, "🐢"],
  ],
};

// ── Living Lagoon ────────────────────────────────────────────────────────────────────────
const ALIVE_SORT: SortBank = {
  prompt: "Is it living or not living?",
  bins: ["Living", "Not living", "🌱", "🪨"],
  items: [
    ["Dog", 1, "🐕"], ["Tree", 1, "🌳"], ["Fish", 1, "🐟"], ["Flower", 1, "🌷"], ["Butterfly", 1, "🦋"], ["Bird", 1, "🐦"], ["Baby", 1, "👶"], ["Mushroom", 1, "🍄"], ["Worm", 1, "🪱"],
    ["Rock", 0, "🪨"], ["Teddy bear", 0, "🧸"], ["Ball", 0, "⚽"], ["Car", 0, "🚗"], ["Robot", 0, "🤖"], ["Chair", 0, "🪑"], ["Balloon", 0, "🎈"], ["Book", 0, "📖"], ["Shoe", 0, "👟"],
  ],
};
const ALIVE_Q: Pol[] = [
  { q: "Which one is alive?", e: "🔍", a: "🐞 A ladybug", w: ["🪨 A rock", "🧸 A teddy bear"], why: "A ladybug is alive — it eats, grows and has babies!" },
  { q: "Which one is NOT alive?", e: "🔍", a: "⚽ A ball", w: ["🐕 A dog", "🌳 A tree"], why: "A ball can bounce, but it can't eat, breathe or grow — it's not alive." },
  { q: "A robot can move. Is it alive?", e: "🤖", a: "No, it's a machine", w: ["Yes, it moves", "Yes, it beeps"], why: "Robots can move, but they don't eat, breathe, grow or have babies." },
  { q: "Is a tree alive?", e: "🌳", a: "Yes, it grows!", w: ["No, it can't walk", "No, it's just wood"], why: "Trees are alive — they drink water, need air and sunlight, and grow!" },
  { q: "Which one is alive?", e: "🌼", a: "🌻 A sunflower", w: ["🖍️ A crayon", "🎈 A balloon"], why: "A sunflower is a living plant — it grows from a tiny seed!" },
  { q: "How do we know a puppy is alive?", e: "🐶", a: "It eats, drinks and grows", w: ["It is fluffy", "It has a name"], why: "Living things eat, drink, breathe and grow — just like a puppy!" },
  { q: "Is a teddy bear alive?", e: "🧸", a: "No, it's a toy", w: ["Yes, it's soft", "Yes, it has eyes"], why: "A teddy bear is cuddly, but it can't eat, breathe or grow." },
  { q: "Which one is alive?", e: "🌊", a: "🐠 A fish", w: ["🐚 An empty shell", "🪨 A pebble"], why: "A fish is alive — it swims, eats and breathes underwater with gills!" },
  { q: "Are YOU alive?", e: "🧒", a: "Yes! I eat and grow", w: ["No, I'm a toy", "Only on my birthday"], why: "You are a living thing — you eat, drink, breathe and grow every day!" },
  { q: "Which one is NOT alive?", e: "🔍", a: "🚗 A toy car", w: ["🐦 A bird", "🐛 A caterpillar"], why: "A toy car only zooms when you push it — it's not alive." },
];
const NEEDS_Q: Pol[] = [
  { q: "What do ALL living things need?", e: "🌱🐶", a: "💧 Water", w: ["📺 TV", "🧸 Toys"], why: "Every living thing needs water — people, puppies, plants and fish!" },
  { q: "What do you breathe in all day long?", e: "🌬️", a: "Air", w: ["Juice", "Sand"], why: "You breathe air in and out all day — even when you're asleep!" },
  { q: "What does a hungry puppy need?", e: "🐶", a: "🥣 Food", w: ["👟 Shoes", "📱 A phone"], why: "Animals need food to give them energy to run, play and grow." },
  { q: "How does a plant get its food?", e: "🌻☀️", a: "It makes it from sunlight", w: ["It eats cookies", "It buys it at a store"], why: "Plants are amazing — they use sunlight, air and water to make their own food!" },
  { q: "Who makes its own food?", e: "🍽️", a: "🌳 A tree", w: ["🐻 A bear", "🐱 A cat"], why: "Trees and other plants make their own food from sunlight, air and water!" },
  { q: "A plant has dry, droopy leaves. What does it need?", e: "🥀", a: "💧 Water", w: ["🎵 A song", "🧦 Socks"], why: "Plants drink water through their roots — a drink helps them perk up!" },
  { q: "Where do animals get energy to run and play?", e: "🐎", a: "From food", w: ["From batteries", "From the TV"], why: "Food is like fuel for animals — it gives them energy to move and grow." },
  { q: "Living things need air. Who breathes air?", e: "🌬️", a: "🐶 A dog", w: ["🪨 A rock", "🧸 A teddy bear"], why: "Dogs, cats, birds and people all breathe air to stay alive." },
  { q: "What do people and animals need every night?", e: "🌙", a: "😴 Sleep", w: ["🍭 Candy", "📺 Cartoons"], why: "Sleep gives bodies time to rest and grow — animals sleep too!" },
  { q: "Which one needs food, water and air?", e: "🤔", a: "🐰 A bunny", w: ["🚲 A bike", "🪁 A kite"], why: "A bunny is alive, so it needs food, water and air — a bike doesn't!" },
];
const ANIMAL_FOOD: MatchBank = [
  ["🐄 Cow", "🌿 Grass"],
  ["🐝 Bee", "🌸 Flowers"],
  ["🐼 Panda", "🎋 Bamboo"],
  ["🐿️ Squirrel", "🌰 Nuts"],
  ["🐛 Caterpillar", "🍃 Leaves"],
  ["🐸 Frog", "🪰 Flies"],
  ["🐋 Blue whale", "🦐 Krill"],
];
const GROW_Q: Pol[] = [
  { q: "Which one will grow bigger?", e: "📏", a: "🐶 A puppy", w: ["🧸 A teddy bear", "🚗 A toy car"], why: "A puppy is alive, so it grows into a big dog — toys never grow!" },
  { q: "Which one will grow taller?", e: "📏", a: "🌱 A little sprout", w: ["🪨 A rock", "🎈 A balloon"], why: "A sprout is a living plant — with water and sunlight, it grows tall!" },
  { q: "A caterpillar grows up to be a…", e: "🐛", a: "🦋 Butterfly", w: ["🐝 Bee", "🐌 Snail"], why: "A caterpillar eats and eats, then changes into a beautiful butterfly!" },
  { q: "Do rocks grow?", e: "🪨", a: "No, rocks aren't alive", w: ["Yes, every day", "Yes, when it rains"], why: "Rocks are not alive — they don't eat, breathe or grow like living things do." },
  { q: "You were a tiny baby once. Now you are…", e: "👶➡️🧒", a: "Bigger!", w: ["Smaller", "The same size"], why: "You're alive, so you grow — food, sleep and play help you get bigger!" },
  { q: "What helps YOU grow big and strong?", e: "🧒💪", a: "Food, water and sleep", w: ["Watching TV", "Candy all day"], why: "Healthy food, water and lots of sleep help your body grow." },
  { q: "Your hair and nails keep growing. Why?", e: "💇", a: "Because you're alive!", w: ["You're a plant", "They're made of glue"], why: "Living things grow — your hair, your nails and your whole body!" },
  { q: "Which one is NOT alive, so it can't grow?", e: "🤔", a: "🧸 A teddy bear", w: ["🐣 A chick", "🌱 A sprout"], why: "A teddy bear is a toy — it can't eat, breathe or grow." },
  { q: "Does a tree grow?", e: "🌳", a: "Yes, trees are alive!", w: ["No, never", "Only its shadow"], why: "Trees are living things — they grow taller and wider every year!" },
  { q: "Which one grows bigger every year?", e: "🎂", a: "🧒 You!", w: ["🪑 A chair", "📖 A book"], why: "Every birthday you're a little bigger — living things keep growing!" },
];
const GROW_UP: [string, string][] = [["Baby", "👶"], ["Kid", "🧒"], ["Grown-up", "🧑"]];

// ── Animal Homes Harbor ──────────────────────────────────────────────────────────────────
const HOMES_MATCH: MatchBank = [
  ["🐦 Bird", "Nest"],
  ["🐝 Bee", "Hive"],
  ["🕷️ Spider", "🕸️ Web"],
  ["🐻 Bear", "Den"],
  ["🐰 Rabbit", "Burrow"],
  ["🐸 Frog", "Pond"],
  ["🦀 Hermit crab", "🐚 Shell"],
  ["🦫 Beaver", "Lodge"],
  ["🐜 Ant", "Anthill"],
];
const HOMES_Q: Pol[] = [
  { q: "Who lives in a hive?", e: "🍯", a: "🐝 Bees", w: ["🐟 Fish", "🐻 Bears"], why: "Bees live in a hive and make sweet honey there — buzz, buzz!" },
  { q: "Who builds a nest in a tree?", e: "🌳", a: "🐦 A bird", w: ["🐟 A fish", "🐄 A cow"], why: "Birds build cozy nests from twigs and grass to keep their eggs safe." },
  { q: "Who spins a sticky web?", e: "🕸️", a: "🕷️ A spider", w: ["🐌 A snail", "🐞 A ladybug"], why: "Spiders spin webs from silk they make — and catch bugs to eat!" },
  { q: "Who digs a burrow under the ground?", e: "🕳️", a: "🐰 A rabbit", w: ["🐦 A bird", "🐠 A fish"], why: "Many rabbits dig burrows — tunnels underground where they sleep and hide." },
  { q: "Where does a bear sleep all winter?", e: "❄️🐻", a: "In a den", w: ["In a nest", "In a hive"], why: "Many bears sleep through winter in a cozy den, like a cave or a hollow log." },
  { q: "Who moves into an empty shell?", e: "🐚", a: "🦀 A hermit crab", w: ["🐱 A cat", "🦉 An owl"], why: "A hermit crab moves into an empty shell — and finds a bigger one as it grows!" },
  { q: "Who builds a lodge of sticks and mud?", e: "🪵", a: "🦫 A beaver", w: ["🦒 A giraffe", "🐧 A penguin"], why: "Beavers build a lodge from sticks and mud, with a secret door underwater!" },
  { q: "Where does a frog like to live?", e: "🐸", a: "Near a pond", w: ["In a beehive", "In a bird's nest"], why: "Lots of frogs live by ponds — they swim in the water and hop on lily pads!" },
  { q: "Where do ants live?", e: "🐜", a: "In an anthill", w: ["In a fishbowl", "In a cloud"], why: "Ants dig tunnels under an anthill and live together in a big family." },
  { q: "Where does a fish live?", e: "🐟", a: "In the water", w: ["In a tree", "In a burrow"], why: "Fish live in water — oceans, lakes, rivers and ponds!" },
];
const WHERE_SORT: SortMany = {
  prompt: "Does it swim in the sea, walk on land, or fly in the sky?",
  bins: [{ id: "sea", label: "Sea", emoji: "🌊" }, { id: "land", label: "Land", emoji: "🌳" }, { id: "sky", label: "Sky", emoji: "☁️" }],
  items: [
    ["Whale", "sea", "🐳"], ["Dolphin", "sea", "🐬"], ["Octopus", "sea", "🐙"], ["Fish", "sea", "🐟"], ["Squid", "sea", "🦑"], ["Shrimp", "sea", "🦐"],
    ["Elephant", "land", "🐘"], ["Lion", "land", "🦁"], ["Giraffe", "land", "🦒"], ["Zebra", "land", "🦓"], ["Horse", "land", "🐎"], ["Cow", "land", "🐄"],
    ["Eagle", "sky", "🦅"], ["Butterfly", "sky", "🦋"], ["Bee", "sky", "🐝"], ["Parrot", "sky", "🦜"], ["Bat", "sky", "🦇"], ["Owl", "sky", "🦉"],
  ],
};
const HABITAT_Q: Pol[] = [
  { q: "Where does a whale live?", e: "🐳", a: "🌊 In the ocean", w: ["🌳 In a forest", "🏜️ In the desert"], why: "Whales live in the ocean — the blue whale is the biggest animal ever!" },
  { q: "Can a penguin fly in the sky?", e: "🐧", a: "No, it swims!", w: ["Yes, very high", "Yes, to the Moon"], why: "Penguins are birds that can't fly — but they're super swimmers!" },
  { q: "A camel lives where it's hot and sandy. Where?", e: "🐪", a: "🏜️ The desert", w: ["🌊 The ocean", "❄️ The North Pole"], why: "Camels live in the desert and can go a long time without a drink!" },
  { q: "Which animal lives where it's icy and cold?", e: "❄️", a: "🐧 A penguin", w: ["🐪 A camel", "🦒 A giraffe"], why: "Many penguins live where it's icy — thick feathers and fat keep them warm." },
  { q: "Who can live in water AND on land?", e: "💧🌿", a: "🐸 A frog", w: ["🐟 A fish", "🦒 A giraffe"], why: "Frogs are amazing — they can swim in water and hop on land!" },
  { q: "Where does a monkey swing from tree to tree?", e: "🐒", a: "🌳 The jungle", w: ["🌊 The ocean", "🧊 An iceberg"], why: "Many monkeys live high in jungle trees, climbing and swinging with long arms!" },
  { q: "Which one swims in the sea?", e: "🌊", a: "🐙 An octopus", w: ["🐄 A cow", "🦉 An owl"], why: "An octopus lives in the sea and has eight wiggly arms!" },
  { q: "Which one flies in the sky?", e: "☁️", a: "🦅 An eagle", w: ["🐢 A turtle", "🐘 An elephant"], why: "Eagles have big, strong wings to soar high in the sky." },
  { q: "Which one walks on land?", e: "🌳", a: "🐘 An elephant", w: ["🐬 A dolphin", "🐳 A whale"], why: "Elephants walk on land on four big, strong legs!" },
  { q: "A polar bear lives where it's…", e: "🧊❄️", a: "❄️ Icy and snowy", w: ["🏜️ Hot and sandy", "🌴 Warm and rainy"], why: "Polar bears live in the icy Arctic — their thick fur keeps them toasty!" },
];
const BUILD_Q: Pol[] = [
  { q: "What does a bird use to build a nest?", e: "🐦", a: "Twigs and grass", w: ["Bricks and glue", "Cookies"], why: "Birds carry twigs, grass and even fluff to weave a cozy nest!" },
  { q: "What do bees make inside their hive?", e: "🐝", a: "🍯 Honey", w: ["🍕 Pizza", "🧃 Juice"], why: "Bees make honey from flower nectar and store it in their wax hive." },
  { q: "What does a spider use to make a web?", e: "🕷️", a: "Silk from its body", w: ["String from a store", "Leaves"], why: "Spiders make silk inside their bodies and spin it into a web!" },
  { q: "How does a rabbit make its burrow?", e: "🐰", a: "It digs with its paws", w: ["It builds with bricks", "It asks a bird"], why: "Rabbits dig with their strong front paws to make tunnels underground." },
  { q: "What does a beaver chew to build its lodge?", e: "🦫", a: "🪵 Sticks and logs", w: ["🍬 Candy", "🧱 Bricks"], why: "Beavers chew trees with strong front teeth, then pile up sticks and mud!" },
  { q: "Why do birds build nests?", e: "🥚", a: "To keep eggs safe", w: ["To play games", "To hide toys"], why: "A nest keeps eggs and baby birds safe and warm." },
  { q: "Who carries its home on its back?", e: "🏠", a: "🐌 A snail", w: ["🐶 A dog", "🐦 A bird"], why: "A snail's shell is part of its body — it goes everywhere the snail goes!" },
  { q: "Where do baby birds stay when they first hatch?", e: "🐣", a: "In the nest", w: ["In a hive", "In a pond"], why: "Baby birds stay in the nest while their parents bring them food." },
  { q: "Why do some rabbits live underground?", e: "🕳️", a: "To hide and stay safe", w: ["To catch fish", "To fly better"], why: "Burrows help rabbits hide, stay safe and keep cozy." },
  { q: "What do ants build together?", e: "🐜", a: "Tunnels and an anthill", w: ["A big boat", "A sand castle"], why: "Ants work as a team to dig tunnels and pile dirt into an anthill!" },
];
const NEST_STEPS: [string, string][] = [["Build a nest", "🪵"], ["Lay eggs", "🥚"], ["Eggs hatch", "🐣"], ["Babies learn to fly", "🐦"]];

// ── Baby Animal Bay ──────────────────────────────────────────────────────────────────────
const BABY_MATCH: MatchBank = [
  ["Puppy", "🐕 Dog"],
  ["Kitten", "🐈 Cat"],
  ["Calf", "🐄 Cow"],
  ["Chick", "🐔 Hen"],
  ["Tadpole", "🐸 Frog"],
  ["Joey", "🦘 Kangaroo"],
  ["Cub", "🐻 Bear"],
  ["Foal", "🐎 Horse"],
  ["Lamb", "🐑 Sheep"],
  ["Duckling", "🦆 Duck"],
  ["Piglet", "🐖 Pig"],
];
const BABY_Q: Pol[] = [
  { q: "A baby dog is called a…", e: "🐕", a: "Puppy", w: ["Kitten", "Calf"], why: "A baby dog is a puppy — puppies love to play and nap!" },
  { q: "A baby cat is called a…", e: "🐈", a: "Kitten", w: ["Puppy", "Cub"], why: "A baby cat is a kitten — kittens are born with their eyes closed!" },
  { q: "A baby cow is called a…", e: "🐄", a: "Calf", w: ["Foal", "Lamb"], why: "A baby cow is a calf — it can stand up soon after it's born!" },
  { q: "A baby kangaroo is called a…", e: "🦘", a: "Joey", w: ["Chick", "Piglet"], why: "A kangaroo baby is a joey — it's as small as a jellybean when it's born!" },
  { q: "A baby horse is called a…", e: "🐎", a: "Foal", w: ["Calf", "Kitten"], why: "A baby horse is a foal — it can walk just a few hours after it's born!" },
  { q: "A baby sheep is called a…", e: "🐑", a: "Lamb", w: ["Cub", "Duckling"], why: "A baby sheep is a lamb — it calls “baa” to find its mom!" },
  { q: "A baby bear is called a…", e: "🐻", a: "Cub", w: ["Joey", "Puppy"], why: "A baby bear is a cub — many cubs are born in a cozy den in winter!" },
  { q: "A baby frog is called a…", e: "🐸", a: "Tadpole", w: ["Chick", "Kitten"], why: "A baby frog is a tadpole — it swims with a tail before it grows legs!" },
  { q: "A baby pig is called a…", e: "🐖", a: "Piglet", w: ["Lamb", "Foal"], why: "A baby pig is a piglet — piglets love to snuggle together!" },
  { q: "A baby duck is called a…", e: "🦆", a: "Duckling", w: ["Kitten", "Calf"], why: "A baby duck is a duckling — it follows its mom in a line!" },
  { q: "A baby chicken is called a…", e: "🐔", a: "Chick", w: ["Cub", "Joey"], why: "A baby chicken is a chick — it peeps and has soft, fluffy feathers!" },
];
const HATCH_SORT: SortBank = {
  prompt: "Does it hatch from an egg, or grow inside its mom?",
  bins: ["Hatches from an egg", "Grows inside Mom", "🥚", "🤰"],
  items: [
    ["Chick", 1, "🐣"], ["Duckling", 1, "🦆"], ["Turtle", 1, "🐢"], ["Crocodile", 1, "🐊"], ["Penguin", 1, "🐧"], ["Frog", 1, "🐸"], ["Butterfly", 1, "🦋"], ["Dinosaur", 1, "🦕"],
    ["Puppy", 0, "🐶"], ["Kitten", 0, "🐱"], ["Calf", 0, "🐮"], ["Piglet", 0, "🐷"], ["Lamb", 0, "🐑"], ["Joey", 0, "🦘"], ["Whale", 0, "🐳"], ["Human baby", 0, "👶"],
  ],
};
const EGG_Q: Pol[] = [
  { q: "What comes out of a chicken's egg?", e: "🥚", a: "🐣 A chick", w: ["🐶 A puppy", "🐟 A fish"], why: "A chick grows inside the egg, then pecks its way out — hello, world!" },
  { q: "Which baby hatches from an egg?", e: "🥚", a: "🐢 A baby turtle", w: ["🐱 A kitten", "🐶 A puppy"], why: "Mother turtles dig a nest and lay their eggs, and the babies hatch out!" },
  { q: "Which baby grows inside its mom's body?", e: "💗", a: "🐮 A calf", w: ["🐣 A chick", "🐊 A baby croc"], why: "A calf grows inside its mother, then it's born and drinks her milk." },
  { q: "Do baby whales hatch from eggs?", e: "🐳", a: "No, they grow inside Mom", w: ["Yes, big blue eggs", "Yes, in a nest"], why: "Baby whales are born in the ocean and drink milk from their moms, like puppies do!" },
  { q: "Who keeps her eggs warm by sitting on them?", e: "🥚", a: "🐔 A mother hen", w: ["🐄 A cow", "🐠 A goldfish"], why: "A mother hen sits on her eggs to keep them warm until they hatch." },
  { q: "What hatches out of a frog's egg?", e: "🐸", a: "A tadpole", w: ["A kitten", "A bird"], why: "Frog eggs hatch into wiggly tadpoles that swim in the pond!" },
  { q: "Did dinosaurs hatch from eggs?", e: "🦕", a: "Yes, they did!", w: ["No, never", "Only on Mondays"], why: "Baby dinosaurs hatched from eggs, just like baby birds do today!" },
  { q: "Which baby hatches from an egg?", e: "🥚", a: "🐧 A baby penguin", w: ["🐷 A piglet", "🐑 A lamb"], why: "Penguin chicks hatch from eggs — and penguin dads help keep them warm!" },
  { q: "Which baby grows inside its mom's body?", e: "💗", a: "🐶 A puppy", w: ["🐢 A baby turtle", "🐣 A chick"], why: "Puppies grow inside their mom, then they're born and drink her milk." },
  { q: "What hatches from a butterfly's egg?", e: "🦋", a: "🐛 A caterpillar", w: ["🐝 A bee", "🐞 A ladybug"], why: "A butterfly egg hatches into a hungry caterpillar — munch, munch!" },
];
const CARE_Q: Pol[] = [
  { q: "Where does a baby kangaroo ride?", e: "🦘", a: "In Mom's pouch", w: ["On Dad's head", "In a nest"], why: "A joey rides in its mom's pouch — a cozy pocket on her tummy!" },
  { q: "What does a baby kitten drink?", e: "🐱", a: "🥛 Milk from its mom", w: ["🧃 Juice", "🥤 Soda pop"], why: "Kittens, puppies and calves all drink milk from their moms." },
  { q: "Who keeps an emperor penguin egg warm?", e: "🐧🥚", a: "The dad, on his feet", w: ["A polar bear", "Nobody at all"], why: "Emperor penguin dads balance the egg on their feet under a warm, feathery flap!" },
  { q: "How do bird parents feed their babies?", e: "🐦", a: "They bring them food", w: ["They order pizza", "They sing to them"], why: "Bird parents fly back and forth all day, bringing food to hungry chicks!" },
  { q: "How does a mother cat carry her kitten?", e: "🐈", a: "Gently in her mouth", w: ["In a backpack", "On her tail"], why: "A mother cat gently picks up her kitten by the loose skin on its neck." },
  { q: "How does a baby elephant hold on to Mom?", e: "🐘", a: "With its trunk", w: ["With its ears", "With a rope"], why: "A baby elephant can hold Mom's tail with its little trunk so it won't get lost!" },
  { q: "How do ducklings follow their mom?", e: "🦆", a: "In a line", w: ["In a car", "On a bike"], why: "Ducklings waddle in a line behind their mom — follow the leader!" },
  { q: "Who takes care of you when you're little?", e: "🏡", a: "My grown-ups", w: ["A goldfish", "Nobody"], why: "Just like animal parents, your grown-ups feed you, hug you and keep you safe!" },
  { q: "Why do baby animals stay close to their parents?", e: "🐻", a: "To stay safe and fed", w: ["To get toys", "To watch TV"], why: "Parents keep their babies safe, warm and fed until they can do it alone." },
  { q: "Chicks are chilly! What does the mother hen do?", e: "🐔🐥", a: "Covers them with wings", w: ["Gives them hats", "Turns on a fan"], why: "A mother hen fluffs her feathers over her chicks to keep them toasty warm." },
];
const CHICK_STEPS: [string, string][] = [["Egg", "🥚"], ["Chick pecks out", "🐣"], ["Fluffy chick", "🐥"], ["Grown-up hen", "🐔"]];

// ═══ Kindergarten ═════════════════════════════════════════════════════════════════════════

// ── Weather Watch Wharf ──────────────────────────────────────────────────────────────────
const WEATHER_Q: Pol[] = [
  { q: "The sun is shining bright. What's the weather?", e: "☀️😎", a: "☀️ Sunny", w: ["🌧️ Rainy", "❄️ Snowy"], why: "When the sun shines bright in the sky, it's a sunny day!" },
  { q: "Drops are falling from the clouds. What's the weather?", e: "🌧️☂️", a: "🌧️ Rainy", w: ["☀️ Sunny", "💨 Windy"], why: "Rain is water falling from the clouds — time for boots and puddles!" },
  { q: "White flakes are falling, and it's cold. What's the weather?", e: "❄️⛄", a: "❄️ Snowy", w: ["☀️ Sunny", "🌧️ Rainy"], why: "Snow is frozen water that falls as soft, cold flakes!" },
  { q: "Leaves are blowing and hats fly off! What's the weather?", e: "🍃💨", a: "💨 Windy", w: ["❄️ Snowy", "🌫️ Foggy"], why: "Wind is moving air — you can't see it, but you can feel it push!" },
  { q: "Thunder booms and lightning flashes. What's the weather?", e: "⛈️", a: "⛈️ Stormy", w: ["☀️ Sunny", "❄️ Snowy"], why: "A thunderstorm brings lightning, thunder and rain — time to head inside!" },
  { q: "Gray clouds cover the whole sky. What's the weather?", e: "☁️☁️", a: "☁️ Cloudy", w: ["☀️ Sunny", "⛈️ Stormy"], why: "Clouds are made of tiny drops of water — lots of them make a cloudy day." },
  { q: "You can't see far because of a thick, low cloud. What's that?", e: "🌫️", a: "🌫️ Fog", w: ["❄️ Snow", "🌈 A rainbow"], why: "Fog is a cloud down near the ground — it makes things hard to see!" },
  { q: "When can you see a rainbow?", e: "🌈", a: "When sun shines on rain", w: ["Only at night", "When it's snowing"], why: "A rainbow appears when sunlight shines through raindrops in the air!" },
  { q: "Where does rain come from?", e: "🌧️", a: "☁️ Clouds", w: ["🌳 Trees", "⛰️ Mountains"], why: "Clouds hold tiny drops of water — when the drops get big, down comes rain!" },
  { q: "Puddles turned to slippery ice. Is it warm or cold?", e: "🧊", a: "❄️ Very cold", w: ["🔥 Very hot", "☀️ Warm and sunny"], why: "Water freezes into ice when it gets very, very cold!" },
];
const WEATHER_GEAR: MatchBank = [
  ["☀️ Sunny", "🕶️ Sunglasses"],
  ["🌧️ Rainy", "☔ Umbrella"],
  ["❄️ Snowy", "⛄ Snowman"],
  ["💨 Windy", "🪁 Kite"],
  ["⛈️ Thunderstorm", "🏠 Go inside"],
  ["🌫️ Foggy", "👀 Hard to see"],
];
const WEAR_SORT: SortBank = {
  prompt: "Is it for a hot, sunny day or a cold, snowy day?",
  bins: ["Hot day", "Cold day", "☀️", "❄️"],
  items: [
    ["Shorts", 1, "🩳"], ["Sandals", 1, "🩴"], ["Sun hat", 1, "👒"], ["Swimsuit", 1, "🩱"], ["Tank top", 1, "🎽"], ["Shaved ice", 1, "🍧"], ["Swimming outside", 1, "🏊"], ["Beach day", 1, "🏖️"],
    ["Mittens", 0, "🧤"], ["Scarf", 0, "🧣"], ["Winter coat", 0, "🧥"], ["Snow boots", 0, "🥾"], ["Warm socks", 0, "🧦"], ["Sled", 0, "🛷"], ["Hot cocoa", 0, "☕"], ["Snowman", 0, "⛄"],
  ],
};
const DRESS_Q: Pol[] = [
  { q: "It's snowy outside. What should you wear?", e: "❄️⛄", a: "🧥 A warm coat", w: ["🩳 Shorts", "🩱 A swimsuit"], why: "A warm coat, hat and mittens keep your body cozy in the cold!" },
  { q: "It's raining. What will keep you dry?", e: "🌧️", a: "☂️ An umbrella", w: ["🕶️ Sunglasses", "🩴 Flip-flops"], why: "An umbrella and a raincoat keep the raindrops off you!" },
  { q: "It's a hot, sunny day. What should you wear?", e: "☀️😅", a: "👕 A T-shirt and shorts", w: ["🧤 Mittens", "🧣 A wool scarf"], why: "Light clothes help you stay cool when the sun is hot!" },
  { q: "Your hands are freezing in the snow. What helps?", e: "🥶", a: "🧤 Mittens", w: ["🩴 Sandals", "🕶️ Sunglasses"], why: "Mittens trap warm air around your fingers to keep them toasty!" },
  { q: "What goes on your feet for puddle jumping?", e: "🌧️💦", a: "👢 Rain boots", w: ["🧦 Just socks", "🩴 Flip-flops"], why: "Rain boots keep your feet dry while you splash — SPLASH!" },
  { q: "It's windy and chilly. What should you wear?", e: "💨🍂", a: "🧥 A jacket", w: ["🩱 A swimsuit", "🩳 Shorts"], why: "A jacket blocks the chilly wind and keeps you warm." },
  { q: "Which one would you wear on a snowy day?", e: "❄️", a: "🧣 A scarf", w: ["👒 A sun hat", "🩱 A swimsuit"], why: "A scarf keeps your neck warm when the snow is falling!" },
  { q: "Which one would you wear to the beach on a hot day?", e: "🏖️", a: "🩱 A swimsuit", w: ["🧥 A winter coat", "🥾 Snow boots"], why: "A swimsuit is perfect for splashing and swimming on a hot day!" },
  { q: "Why do we wear warm clothes in winter?", e: "⛄", a: "To keep our bodies warm", w: ["To look like snowmen", "To make it snow"], why: "Warm clothes hold in your body's heat, like a cozy hug!" },
  { q: "What keeps the hot sun off your head and face?", e: "☀️", a: "👒 A sun hat", w: ["🧤 Mittens", "🧦 Socks"], why: "A hat with a brim shades your face and head from the sun." },
];
const SAFE_Q: Pol[] = [
  { q: "You hear thunder while playing outside. What do you do?", e: "🌩️", a: "Go inside right away", w: ["Keep playing", "Stand under a tree"], why: "When thunder roars, go indoors — inside is the safe place in a storm!" },
  { q: "Is it safe to swim when there's lightning?", e: "🏊⚡", a: "No, get out of the water", w: ["Yes, if you're fast", "Yes, with goggles"], why: "Lightning and water don't mix — get out of the pool and go inside!" },
  { q: "It's a very hot day. What helps your body?", e: "☀️🥵", a: "💧 Drinking lots of water", w: ["🧥 Wearing a big coat", "🍬 Eating lots of candy"], why: "On hot days, drink water and rest in the shade to stay cool." },
  { q: "The sidewalk is icy. How should you walk?", e: "🧊", a: "🐧 Slow, tiny steps", w: ["🏃 Run fast", "🤸 Do cartwheels"], why: "Walk like a penguin on ice — slow, tiny steps help you not slip!" },
  { q: "Where is the safest place in a thunderstorm?", e: "⛈️", a: "🏠 Inside a building", w: ["🌳 Under a tall tree", "⛳ Out in a big field"], why: "Inside a building is safest — trees and open fields aren't safe in lightning." },
  { q: "It's freezing and snowy. How can you keep your ears warm?", e: "🥶❄️", a: "Wear a warm hat", w: ["Wear sunglasses", "Eat ice cream"], why: "A warm hat keeps your ears and head toasty in the cold!" },
  { q: "You see lightning flash. What comes next?", e: "⚡", a: "🔊 A boom of thunder", w: ["🌈 A rainbow every time", "🌙 Nighttime"], why: "Lightning makes the thunder — first you see the flash, then you hear the BOOM!" },
  { q: "The wind is blowing really hard. What should you do?", e: "🌬️", a: "Stay with a grown-up", w: ["Fly like a kite", "Climb a tall tree"], why: "In strong wind, stay close to a grown-up — they'll help keep you safe!" },
  { q: "You see a fallen wire after a storm. What should you do?", e: "⚠️", a: "Stay back, get a grown-up", w: ["Touch it to check", "Jump over it"], why: "Fallen wires can be very dangerous — never touch one, and tell a grown-up!" },
  { q: "Fog makes it hard to see. What should you do outside?", e: "🌫️", a: "Hold a grown-up's hand", w: ["Run ahead alone", "Close your eyes"], why: "In fog, stay close to your grown-up so you don't get lost!" },
];
const THUNDER_STEPS: [string, string][] = [["Hear thunder", "🌩️"], ["Stop playing", "✋"], ["Hurry inside", "🏃"], ["Wait till the storm ends", "🏠"]];
const TOOLS_Q: Pol[] = [
  { q: "What tool tells how hot or cold it is?", e: "☀️❄️", a: "🌡️ A thermometer", w: ["🔨 A hammer", "🥄 A spoon"], why: "A thermometer measures temperature — how hot or cold it is!" },
  { q: "What catches rain so you can see how much fell?", e: "🌧️", a: "A rain gauge", w: ["A paper bag", "A fishing net"], why: "A rain gauge is a tube that catches rain so you can measure it!" },
  { q: "How can you tell the wind is blowing?", e: "💨", a: "Leaves and flags move", w: ["The grass turns blue", "It gets very quiet"], why: "You can't see wind, but you can see it move leaves, flags and kites!" },
  { q: "Which toy needs wind to fly?", e: "💨", a: "🪁 A kite", w: ["🧸 A teddy bear", "🧩 A puzzle"], why: "Wind pushes a kite up high — no wind, no flying!" },
  { q: "Where can grown-ups find tomorrow's weather?", e: "📅", a: "A weather report", w: ["A cereal box", "A shoe"], why: "Weather scientists use tools and maps to predict tomorrow's weather!" },
  { q: "A windsock is a tool that shows…", e: "🎏", a: "Which way wind blows", w: ["What time it is", "How tall you are"], why: "A windsock fills with air and points the way the wind is blowing." },
  { q: "The thermometer's number goes way up. It's getting…", e: "🌡️", a: "☀️ Hotter", w: ["❄️ Colder", "🌙 Darker"], why: "When a thermometer's number goes up, it's getting hotter outside!" },
  { q: "Dark gray clouds are rolling in. What might come?", e: "☁️", a: "🌧️ Rain", w: ["☀️ Clear blue skies", "🍭 Candy"], why: "Dark, heavy clouds are full of water drops — rain may be on the way!" },
  { q: "What do weather watchers write down each day?", e: "📝", a: "What the weather is like", w: ["Their favorite color", "A grocery list"], why: "Writing down the weather every day helps you find patterns, like rainy weeks!" },
];

// ── Day & Night Dock ─────────────────────────────────────────────────────────────────────
const DAY_NIGHT_SORT: SortBank = {
  prompt: "Day or night? When does it happen?",
  bins: ["Daytime", "Nighttime", "☀️", "🌙"],
  items: [
    ["Eat breakfast", 1, "🥞"], ["Go to school", 1, "🏫"], ["Eat lunch", 1, "🥪"], ["Fly a kite", 1, "🪁"], ["Rooster crows", 1, "🐓"], ["Butterflies flutter", 1, "🦋"], ["Play in the sunshine", 1, "☀️"], ["See a rainbow", 1, "🌈"],
    ["Sleep in bed", 0, "🛏️"], ["Bedtime story", 0, "📖"], ["See the stars", 0, "✨"], ["Fireworks show", 0, "🎆"], ["Crickets chirp", 0, "🦗"], ["Sweet dreams", 0, "💤"], ["Night-light on", 0, "💡"], ["Bats fly out", 0, "🦇"],
  ],
};
const SKY_Q: Pol[] = [
  { q: "What lights up the sky in the daytime?", e: "🌤️", a: "☀️ The Sun", w: ["🌙 The Moon", "💡 A giant lamp"], why: "The Sun is a giant star — it lights up our whole sky in the day!" },
  { q: "What twinkles in the night sky?", e: "🌃", a: "✨ Stars", w: ["🌈 Rainbows", "🦋 Butterflies"], why: "Stars are giant, faraway suns — they look tiny because they're so far away!" },
  { q: "The Sun is really a…", e: "☀️", a: "⭐ Star", w: ["🌙 Moon", "☁️ Cloud"], why: "The Sun is a star — the closest star to Earth!" },
  { q: "Where does the Sun go at night?", e: "🌇", a: "It shines on other places", w: ["It goes to sleep", "It turns off"], why: "Earth spins, so when it's night here, it's daytime far away!" },
  { q: "Why do we have day and night?", e: "🌍", a: "The Earth spins around", w: ["The Sun turns off", "The Moon eats the Sun"], why: "Earth spins like a top — our side faces the Sun for day, then turns away for night." },
  { q: "When does the Sun come up?", e: "🌅", a: "In the morning", w: ["At midnight", "At bedtime"], why: "The Sun rises in the morning — that's called sunrise!" },
  { q: "When does the Sun go down?", e: "🌇", a: "In the evening", w: ["At breakfast", "At lunchtime"], why: "The Sun sets in the evening — that's sunset, and soon it's night." },
  { q: "Are the stars still there in the daytime?", e: "☀️✨", a: "Yes, the Sun hides them", w: ["No, they go away", "No, they fall down"], why: "Stars are always there — the Sun is just so bright we can't see them!" },
  { q: "What does the sky look like at night?", e: "🌃", a: "🌑 Dark", w: ["☀️ Bright and sunny", "🌈 Rainbow-colored"], why: "At night our side of Earth faces away from the Sun, so the sky gets dark." },
  { q: "Which is bigger, the Sun or the Earth?", e: "☀️🌍", a: "The Sun, by a lot!", w: ["The Earth", "They're the same"], why: "The Sun is so big that about a million Earths could fit inside it!" },
];
const MOON_Q: Pol[] = [
  { q: "Does the Moon make its own light?", e: "🌕", a: "No, it reflects sunlight", w: ["Yes, like a lamp", "Yes, it has a bulb"], why: "The Moon has no light of its own — it shines because sunlight bounces off it!" },
  { q: "Where does moonlight really come from?", e: "🌙", a: "☀️ The Sun", w: ["🔥 Fires on the Moon", "💡 Moon lamps"], why: "Moonlight is sunlight bouncing off the Moon and back to us!" },
  { q: "How is the Moon like a mirror?", e: "🪞🌕", a: "It bounces light back", w: ["It shows your face", "It's made of glass"], why: "The Moon bounces the Sun's light back to us — it doesn't make any light itself." },
  { q: "Can you ever see the Moon in the daytime?", e: "☀️🌙", a: "Yes, lots of days!", w: ["No, never", "Only on birthdays"], why: "The Moon is in the day sky lots of the time — look for it on a clear day!" },
  { q: "Does the Moon really change shape?", e: "🌓", a: "No, it stays round", w: ["Yes, someone bites it", "Yes, it melts"], why: "The Moon is always round — we just see different amounts of its sunny side!" },
  { q: "What shape is a full moon?", e: "🌕", a: "⚪ A big circle", w: ["🔺 A triangle", "⬛ A square"], why: "A full moon looks like a big, bright circle in the night sky!" },
  { q: "A thin, curvy moon like a banana is called a…", e: "🌙", a: "Crescent moon", w: ["Full moon", "Square moon"], why: "A crescent moon is a thin, curved slice of the Moon's sunny side!" },
  { q: "Who has walked on the Moon?", e: "🌕👣", a: "🚀 Astronauts", w: ["🐄 Cows", "🦖 Dinosaurs"], why: "Astronauts rode a rocket and walked on the Moon — their footprints are still there!" },
  { q: "Is there air to breathe on the Moon?", e: "🌕", a: "No, astronauts bring it", w: ["Yes, lots of air", "Yes, and it's windy"], why: "The Moon has no air, so astronauts wear space suits with air inside!" },
  { q: "What travels around and around the Earth?", e: "🌍", a: "🌙 The Moon", w: ["☀️ The Sun", "🌈 A rainbow"], why: "The Moon travels around the Earth — one trip takes about a month!" },
];
const LIGHT_SORT: SortBank = {
  prompt: "Does it make its own light?",
  bins: ["Makes light", "No light of its own", "💡", "🌙"],
  items: [
    ["Sun", 1, "☀️"], ["Stars", 1, "⭐"], ["Lamp", 1, "💡"], ["Flashlight", 1, "🔦"], ["Candle", 1, "🕯️"], ["Campfire", 1, "🔥"], ["Lightning", 1, "⚡"], ["TV screen", 1, "📺"],
    ["Moon", 0, "🌕"], ["Mirror", 0, "🪞"], ["Rock", 0, "🪨"], ["Book", 0, "📖"], ["Teddy bear", 0, "🧸"], ["Planet Saturn", 0, "🪐"], ["Apple", 0, "🍎"], ["Spoon", 0, "🥄"],
  ],
};
const NOCTURNAL_SORT: SortBank = {
  prompt: "Is it awake at night or awake in the day?",
  bins: ["Awake at night", "Awake in the day", "🌙", "☀️"],
  items: [
    ["Owl", 1, "🦉"], ["Bat", 1, "🦇"], ["Raccoon", 1, "🦝"], ["Hedgehog", 1, "🦔"], ["Skunk", 1, "🦨"], ["Cricket", 1, "🦗"], ["Mouse", 1, "🐭"], ["Badger", 1, "🦡"],
    ["Butterfly", 0, "🦋"], ["Bee", 0, "🐝"], ["Rooster", 0, "🐓"], ["Squirrel", 0, "🐿️"], ["Eagle", 0, "🦅"], ["Ladybug", 0, "🐞"], ["Parrot", 0, "🦜"], ["Monkey", 0, "🐒"],
  ],
};
const NOCTURNAL_Q: Pol[] = [
  { q: "Animals that are awake at night are called…", e: "🦉🌙", a: "Nocturnal", w: ["Breakfast", "Rainbows"], why: "Nocturnal animals sleep in the day and wake up at night — like owls!" },
  { q: "Which animal hoots at night?", e: "🌙", a: "🦉 Owl", w: ["🐓 Rooster", "🐝 Bee"], why: "Owls hoot at night — their big eyes help them see in the dark!" },
  { q: "How does a bat find its way in the dark?", e: "🦇🌙", a: "It listens to echoes", w: ["It uses a flashlight", "It follows the Sun"], why: "Many bats squeak and listen for the echoes that bounce back to find their way!" },
  { q: "Which animal is awake at night?", e: "🌙", a: "🦝 Raccoon", w: ["🦋 Butterfly", "🐓 Rooster"], why: "Raccoons are nocturnal — they look for food at night with their clever paws!" },
  { q: "Which animal is awake in the daytime?", e: "☀️", a: "🦋 Butterfly", w: ["🦉 Owl", "🦇 Bat"], why: "Butterflies need sunshine to warm up their wings before they can fly!" },
  { q: "What does an owl do in the daytime?", e: "🦉☀️", a: "Sleeps in a tree", w: ["Goes to school", "Eats breakfast"], why: "Most owls snooze in the daytime and hunt for food at night." },
  { q: "Why do some animals come out at night?", e: "🌙", a: "It's cooler and safer", w: ["They got lost", "The Sun tells them to"], why: "Night is cool and quiet, so it's easier for some animals to hide and find food." },
  { q: "Which bug chirps a night song?", e: "🌙🎶", a: "🦗 Cricket", w: ["🐝 Bee", "🦋 Butterfly"], why: "Crickets chirp at night by rubbing their wings together — chirp, chirp!" },
  { q: "What helps many night animals see in the dark?", e: "👀🌙", a: "Big eyes", w: ["Tiny glasses", "Glowing hats"], why: "Big eyes let in lots of light, so owls and other night animals can see in the dark." },
  { q: "When do hedgehogs look for bugs to eat?", e: "🦔", a: "🌙 At night", w: ["☀️ At noon", "🌅 Only at sunrise"], why: "Hedgehogs are nocturnal — they snuffle around at night looking for bugs!" },
];
const DAY_STEPS: [string, string][] = [["Morning sunrise", "🌅"], ["Sun high at noon", "☀️"], ["Evening sunset", "🌇"], ["Dark night", "🌃"]];
const SUN_Q: Pol[] = [
  { q: "Which rock feels warmer to touch?", e: "🪨☀️", a: "A rock in the sun", w: ["A rock in the shade", "A rock in the fridge"], why: "Sunlight warms things up — a sunny rock feels warmer than a shady one!" },
  { q: "What makes your shadow?", e: "🧍☀️", a: "You block the sunlight", w: ["The ground draws it", "Your shoes make it"], why: "When your body blocks sunlight, it makes a dark shape — your shadow!" },
  { q: "Why is it cooler in the shade?", e: "🌳", a: "Something blocks the Sun", w: ["The shade is wet", "Shade has a fan"], why: "In the shade, a tree or roof blocks the Sun's warm light, so it feels cooler." },
  { q: "Can you see your shadow on a cloudy, gray day?", e: "☁️", a: "It's hard to see", w: ["It's extra dark", "It turns purple"], why: "Shadows need bright light — on cloudy days they're faint or gone." },
  { q: "What does the Sun give us?", e: "☀️", a: "Light and warmth", w: ["Snow and ice", "Pizza and juice"], why: "The Sun gives Earth light and warmth — plants, animals and people need it!" },
  { q: "What happens to a snowman on a sunny day?", e: "⛄☀️", a: "It melts", w: ["It grows bigger", "It falls asleep"], why: "The Sun's warmth melts the snow into water — drip, drip!" },
  { q: "Your shadow follows you everywhere. Why?", e: "🚶", a: "You keep blocking light", w: ["It wants to play", "It's your pet"], why: "Wherever you go, your body blocks the light, so your shadow comes too!" },
  { q: "When is it warmest outside on most days?", e: "🌡️", a: "☀️ In the afternoon", w: ["🌙 At midnight", "🌅 Before sunrise"], why: "The Sun warms the ground all day, so afternoons are usually warmest." },
  { q: "How can you make a shadow puppet?", e: "🔦✋", a: "Hands in front of a light", w: ["Close your eyes", "Turn off all lights"], why: "Hold your hands between a light and the wall to make shadow animals!" },
  { q: "Which gets hottest on a sunny day?", e: "☀️", a: "A dark slide in the sun", w: ["A spot in the shade", "Grass under a tree"], why: "Sunlight warms things — and dark things in the sun can get extra hot!" },
];

// ── Seed Sprout Cove ─────────────────────────────────────────────────────────────────────
const PLANT_NEEDS_SORT: SortBank = {
  prompt: "Does a plant need it to grow?",
  bins: ["Plants need it", "Plants don't need it", "🌱", "🚫"],
  items: [
    ["Water", 1, "💧"], ["Rain", 1, "🌧️"], ["Sunshine", 1, "☀️"], ["Air", 1, "🌬️"], ["Soil", 1, "🟫"], ["Space to grow", 1, "🪴"],
    ["Candy", 0, "🍬"], ["TV", 0, "📺"], ["Shoes", 0, "👟"], ["Teddy bear", 0, "🧸"], ["Juice box", 0, "🧃"], ["Pizza", 0, "🍕"], ["Phone", 0, "📱"], ["Sunglasses", 0, "🕶️"],
  ],
};
const PLANT_NEEDS_Q: Pol[] = [
  { q: "What does a seed need to start growing?", e: "🌰", a: "💧 Water", w: ["🍬 Candy", "📺 TV"], why: "A seed soaks up water, swells up, and then a tiny sprout pops out!" },
  { q: "A plant in a dark closet gets pale and droopy. What does it need?", e: "🪴🚪", a: "☀️ Sunlight", w: ["🧸 A toy", "🎵 A song"], why: "Plants need sunlight to make food — without light, they can't stay healthy." },
  { q: "How do plants drink water?", e: "💧", a: "Through their roots", w: ["With a straw", "Through their petals"], why: "Roots soak up water from the soil, like a sponge!" },
  { q: "What does soil give a plant?", e: "🟫🌱", a: "A home for its roots", w: ["Sunglasses", "A bedtime story"], why: "Soil holds a plant's roots and gives it nutrients to grow strong." },
  { q: "Do plants need air?", e: "🌬️🌿", a: "Yes, they do!", w: ["No, never", "Only on windy days"], why: "Plants take in air through tiny holes in their leaves to help make food." },
  { q: "Plants use sunlight to make…", e: "☀️🍃", a: "Their own food", w: ["Ice cream", "Rainbows"], why: "Plants are food makers — their leaves turn sunlight, air and water into food!" },
  { q: "What happens if a plant gets no water for a long time?", e: "🥀", a: "It wilts and droops", w: ["It grows faster", "It turns into a tree"], why: "Without water, a plant droops and dries out — give it a drink!" },
  { q: "Plants lean toward the…", e: "🪟🪴", a: "☀️ Light", w: ["🌑 Dark", "🧊 Cold"], why: "Plants lean and grow toward light so their leaves can catch more of it!" },
  { q: "Can a big tree grow in a tiny teacup?", e: "🌳☕", a: "No, it needs room", w: ["Yes, easily", "Yes, if it's sunny"], why: "Plants need space for their roots and leaves to spread out and grow." },
  { q: "Too much water can hurt a plant. How much should you give?", e: "💦", a: "Just enough", w: ["A whole bathtub", "None, ever"], why: "Plants need water, but not too much — soggy soil can make roots sick." },
];
const SEED_STEPS: [string, string][] = [["Seed", "🌰"], ["Sprout", "🌱"], ["Plant", "🌿"], ["Flower", "🌷"]];
const PLANTING_STEPS: [string, string][] = [["Dig a little hole", "🕳️"], ["Drop in a seed", "🌰"], ["Cover it with soil", "🟫"], ["Give it water", "💧"], ["Set it in the sun", "☀️"]];
const GROW_PLANT_Q: Pol[] = [
  { q: "What pops out of a seed first?", e: "🌰", a: "🌱 A tiny root and sprout", w: ["🌸 A flower", "🍎 An apple"], why: "First a tiny root pokes out to drink water, then a green sprout reaches up!" },
  { q: "What does a sprout grow into?", e: "🌱", a: "🌿 A bigger plant", w: ["🪨 A rock", "🐛 A caterpillar"], why: "With water, light and air, a sprout grows into a big, leafy plant!" },
  { q: "The plant is big now. What can bloom on it?", e: "🌿", a: "🌷 A flower", w: ["🎈 A balloon", "🍪 A cookie"], why: "Many plants grow flowers — and flowers make seeds for new plants!" },
  { q: "What fills the middle of a sunflower?", e: "🌻", a: "Seeds", w: ["Honey", "Sand"], why: "A sunflower's middle holds hundreds of seeds — birds love to eat them!" },
  { q: "What's tucked inside every seed?", e: "🌰", a: "A baby plant", w: ["A pebble", "A toy car"], why: "Inside every seed is a tiny baby plant, plus food to help it start growing!" },
  { q: "What grows from a pumpkin seed?", e: "🎃", a: "A pumpkin plant", w: ["An apple tree", "A rose bush"], why: "Pumpkin seeds grow into long vines — and new pumpkins grow on them!" },
  { q: "What grows from an acorn?", e: "🌰", a: "🌳 An oak tree", w: ["🌷 A tulip", "🌵 A cactus"], why: "A little acorn is the seed of a mighty oak tree!" },
  { q: "How long does a seed take to grow big?", e: "⏳", a: "Lots of days", w: ["One second", "One blink"], why: "Growing takes time — check on your seed each day and watch it change!" },
  { q: "Where do new seeds come from?", e: "🌸", a: "Flowers and fruit", w: ["Only the store", "Rain clouds"], why: "Flowers make seeds, and fruits like apples keep the seeds safe inside!" },
  { q: "A sprout pokes out of the soil. What does it reach for?", e: "🌱", a: "☀️ Sunlight", w: ["🌙 The Moon", "🧦 A sock"], why: "Sprouts reach up toward the light so their leaves can start making food." },
];
const PARTS_MATCH: MatchBank = [
  ["Roots", "Soak up water"],
  ["Stem", "Holds up the leaves"],
  ["🍃 Leaves", "Make food from sunlight"],
  ["🌸 Flower", "Makes seeds"],
  ["🌰 Seed", "Grows a new plant"],
  ["🌳 Bark", "Protects the tree"],
];
const PARTS_Q: Pol[] = [
  { q: "Which part of a plant grows under the ground?", e: "🌱", a: "The roots", w: ["The flowers", "The leaves"], why: "Roots grow down into the soil to soak up water and hold the plant tight." },
  { q: "Which part makes food from sunlight?", e: "☀️", a: "🍃 The leaves", w: ["🌰 The seeds", "The roots"], why: "Leaves catch sunlight and use it to make food for the whole plant!" },
  { q: "Which part holds the plant up tall?", e: "🌻", a: "The stem", w: ["The petals", "The seeds"], why: "The stem holds the plant up and carries water from the roots to the leaves." },
  { q: "Bees visit which part of a plant?", e: "🐝", a: "🌸 The flowers", w: ["The roots", "The bark"], why: "Bees visit flowers for sweet nectar — and carry pollen that helps make seeds!" },
  { q: "When you eat a carrot, which part are you eating?", e: "🥕", a: "The root", w: ["The flower", "The seed"], why: "A carrot is a root — it grows down in the dirt and stores food for the plant!" },
  { q: "When you eat lettuce, which part are you eating?", e: "🥬", a: "The leaves", w: ["The roots", "The seeds"], why: "Lettuce is a bunch of leaves — crunchy and green!" },
  { q: "What's inside an apple that can grow a new tree?", e: "🍎", a: "Seeds", w: ["Juice", "Air"], why: "Apple seeds can grow into new apple trees — it just takes a few years!" },
  { q: "Broccoli is really a bunch of tiny…", e: "🥦", a: "Flower buds", w: ["Roots", "Pebbles"], why: "Broccoli is tiny flower buds — if you wait, they bloom into yellow flowers!" },
  { q: "Which part carries water up to the leaves?", e: "💧", a: "The stem", w: ["The flower", "The seed"], why: "The stem works like a straw, carrying water up to the leaves and flowers." },
  { q: "What does a flower make for new plants?", e: "🌼", a: "Seeds", w: ["Rocks", "Shoes"], why: "Flowers make seeds, and seeds grow into brand-new plants!" },
];

// ── Push & Pull Pier ─────────────────────────────────────────────────────────────────────
const PUSH_SORT: SortBank = {
  prompt: "Is it a push or a pull?",
  bins: ["Push", "Pull", "👐", "🪢"],
  items: [
    ["Kick a ball", 1, "⚽"], ["Push a cart", 1, "🛒"], ["Press a button", 1, "🔘"], ["Push a toy car", 1, "🚗"], ["Ring a doorbell", 1, "🔔"], ["Roll a bowling ball", 1, "🎳"], ["Push a scooter", 1, "🛴"], ["Press piano keys", 1, "🎹"],
    ["Tug of war", 0, "🪢"], ["Open a drawer", 0, "🗄️"], ["Pull weeds", 0, "🌿"], ["Pick an apple", 0, "🍎"], ["Pull a sled", 0, "🛷"], ["Reel in a fish", 0, "🎣"], ["Pull up a carrot", 0, "🥕"], ["Pull on socks", 0, "🧦"],
  ],
};
const PUSH_Q: Pol[] = [
  { q: "You kick a ball. Is that a push or a pull?", e: "⚽", a: "A push", w: ["A pull", "Neither one"], why: "Kicking is a push — your foot pushes the ball away from you!" },
  { q: "You open a drawer toward you. Push or pull?", e: "🗄️", a: "A pull", w: ["A push", "A jump"], why: "Pulling moves something toward you — like opening a drawer!" },
  { q: "Which one is a pull?", e: "🤔", a: "🪢 Tug of war", w: ["⚽ Kicking a ball", "🔘 Pressing a button"], why: "In tug of war, each team pulls the rope toward itself!" },
  { q: "Which one is a push?", e: "🤔", a: "🛒 Pushing a cart", w: ["🎣 Reeling in a fish", "🥕 Pulling a carrot"], why: "A push moves something away from you — like a cart rolling ahead!" },
  { q: "What makes a toy car start to move?", e: "🚗", a: "A push or a pull", w: ["Just looking at it", "Waiting a long time"], why: "Things start moving when something pushes or pulls them!" },
  { q: "A push moves things…", e: "👐", a: "Away from you", w: ["Toward you", "Up to the Moon"], why: "Push means away — like pushing a swing away from you!" },
  { q: "A pull moves things…", e: "🪢", a: "Toward you", w: ["Away from you", "Into the sky"], why: "Pull means toward — like pulling a wagon along behind you!" },
  { q: "How can you stop a rolling ball?", e: "⚽", a: "Block it with your hands", w: ["Clap your hands", "Sing to it"], why: "Blocking is a push — it can stop something that's moving!" },
  { q: "A magnet moves a paper clip toward it. Push or pull?", e: "🧲📎", a: "A pull", w: ["A push", "A kick"], why: "Magnets can pull some metal things toward them — without even touching!" },
  { q: "What can make a rolling ball change direction?", e: "⚽↩️", a: "A push from the side", w: ["A wish", "A nap"], why: "A push from a different side can make a moving ball turn a new way!" },
];
const STRENGTH_Q: Pol[] = [
  { q: "Which push makes a ball roll farther?", e: "⚽", a: "A big, strong push", w: ["A tiny, soft push", "No push at all"], why: "A bigger push gives the ball more speed, so it rolls farther!" },
  { q: "You give a toy car a tiny push. What happens?", e: "🚗", a: "It rolls a short way", w: ["It flies to the Moon", "It goes super far"], why: "A small push moves things a little — a bigger push moves them more." },
  { q: "How can you make a toy boat go faster?", e: "⛵", a: "Push it harder", w: ["Push it softer", "Tell it a joke"], why: "Pushing harder makes things speed up — zoom!" },
  { q: "Bowling! How can you knock down more pins?", e: "🎳", a: "Roll the ball harder", w: ["Roll it super softly", "Don't roll it at all"], why: "A harder push gives the ball more speed and power to knock pins down!" },
  { q: "You kick a ball gently, then hard. Which goes farther?", e: "⚽💨", a: "The hard kick", w: ["The gentle kick", "They go the same"], why: "A harder kick is a bigger push, so the ball zooms farther!" },
  { q: "A ball is rolling. What will make it stop?", e: "⚽", a: "Something pushes back", w: ["It never stops", "It gets bored"], why: "Grass, a wall or your hand pushes back on a ball and slows it down." },
  { q: "Two friends push a heavy box together. What happens?", e: "📦👫", a: "It's easier to move", w: ["It gets heavier", "It disappears"], why: "Two pushes together make a bigger push — teamwork moves heavy things!" },
  { q: "What happens when a rolling ball bumps a wall?", e: "⚽🧱", a: "It bounces or stops", w: ["It goes through it", "It turns into a car"], why: "When a ball hits a wall, the wall pushes back, so the ball bounces or stops." },
  { q: "A swing goes higher when you…", e: "⬆️", a: "Get a bigger push", w: ["Sit very still", "Close your eyes"], why: "A bigger push sends a swing higher — wheee!" },
  { q: "Blow on a toy sailboat. Which moves it more?", e: "⛵🌬️", a: "A big, strong puff", w: ["A tiny, soft puff", "Holding your breath"], why: "Moving air pushes the sail — a stronger puff is a bigger push!" },
];
const BOWL_STEPS: [string, string][] = [["Hold the ball", "🎳"], ["Push it forward", "👐"], ["It rolls down the lane", "➡️"], ["It knocks the pins down", "💥"]];
const ROLL_SLIDE: SortBank = {
  prompt: "Will it roll or slide?",
  bins: ["Rolls", "Slides", "⚽", "📦"],
  items: [
    ["Soccer ball", 1, "⚽"], ["Basketball", 1, "🏀"], ["Tennis ball", 1, "🎾"], ["Orange", 1, "🍊"], ["Baseball", 1, "⚾"], ["Skateboard", 1, "🛹"], ["Toy truck", 1, "🚚"], ["Bowling ball", 1, "🎳"],
    ["Box", 0, "📦"], ["Book", 0, "📕"], ["Ice cube", 0, "🧊"], ["Sled", 0, "🛷"], ["Hockey puck", 0, "🏒"], ["Brick", 0, "🧱"], ["Penguin on its tummy", 0, "🐧"], ["Block of cheese", 0, "🧀"],
  ],
};
const ROLL_Q: Pol[] = [
  { q: "Which one will roll down a ramp?", e: "↘️", a: "⚽ A ball", w: ["📦 A box", "📕 A book"], why: "Round things roll — a ball zooms down a ramp!" },
  { q: "Why does a ball roll?", e: "⚽", a: "It's round", w: ["It's sleepy", "It's square"], why: "Round shapes can turn over and over, so they roll!" },
  { q: "Why does a box slide instead of rolling?", e: "📦", a: "It has flat sides", w: ["It's too happy", "It's round"], why: "Flat sides sit flat on the ground, so a box slides when you push it." },
  { q: "What do wheels help a truck do?", e: "🚚", a: "Roll along easily", w: ["Fly in the sky", "Stay stuck"], why: "Wheels are round, so they roll — that makes heavy things easier to move!" },
  { q: "Where would a box slide the easiest?", e: "📦", a: "🧊 On smooth ice", w: ["🌿 On thick grass", "🏖️ In soft sand"], why: "Smooth, slippery ground lets things slide easily — bumpy ground slows them down." },
  { q: "Where does a ball roll farther?", e: "⚽", a: "On a smooth floor", w: ["In thick grass", "In deep sand"], why: "Smooth floors don't slow a ball down as much as grass or sand do!" },
  { q: "Which one can roll AND slide?", e: "🤔", a: "🥫 A can", w: ["📦 A box", "🧱 A brick"], why: "A can rolls on its round side and slides on its flat end — it can do both!" },
  { q: "What shape are wheels?", e: "🚗", a: "⚪ Circles", w: ["🔺 Triangles", "⬛ Squares"], why: "Wheels are round circles so they can roll smoothly!" },
  { q: "You want to move a heavy box easily. What helps?", e: "📦", a: "Put it on wheels", w: ["Paint it blue", "Sing to it"], why: "Wheels let heavy things roll instead of slide — that's much easier!" },
  { q: "Which one will NOT roll?", e: "🤔", a: "📕 A book", w: ["🏀 A basketball", "🍊 An orange"], why: "A book has flat sides, so it slides instead of rolling." },
];
const HEAVY_LIGHT: SortBank = {
  prompt: "Heavy or light?",
  bins: ["Heavy", "Light", "🐘", "🪶"],
  items: [
    ["Elephant", 1, "🐘"], ["Car", 1, "🚗"], ["Big rock", 1, "🪨"], ["Truck", 1, "🚚"], ["Couch", 1, "🛋️"], ["Bowling ball", 1, "🎳"], ["Whale", 1, "🐳"], ["Hippo", 1, "🦛"],
    ["Feather", 0, "🪶"], ["Balloon", 0, "🎈"], ["Leaf", 0, "🍃"], ["Butterfly", 0, "🦋"], ["Paper", 0, "📄"], ["Snowflake", 0, "❄️"], ["Sock", 0, "🧦"], ["Pencil", 0, "✏️"],
  ],
};
const HEAVY_Q: Pol[] = [
  { q: "Which is heavier?", e: "⚖️", a: "🐘 An elephant", w: ["🐭 A mouse", "🪶 A feather"], why: "Elephants are the heaviest animals that live on land!" },
  { q: "Which is lighter?", e: "⚖️", a: "🎈 A balloon", w: ["🚗 A car", "🪨 A big rock"], why: "A balloon is so light you can bop it up with one finger!" },
  { q: "Which is harder to push?", e: "👐", a: "📦 A big, full box", w: ["🪶 A feather", "🎈 A balloon"], why: "Heavy things need a bigger push to get them moving!" },
  { q: "A bag of rocks and a bag of feathers sit on a seesaw. Which goes down?", e: "⚖️", a: "The rocks", w: ["The feathers", "Neither one"], why: "The heavier side pushes down harder, so the rocks sink and the feathers go up!" },
  { q: "Drop a big rock and a small rock together. Which lands first?", e: "🪨", a: "They land together", w: ["The big rock, way first", "The small rock"], why: "Heavy and light things fall at the same speed — unless air slows down something fluffy!" },
  { q: "Why does a feather float down so slowly?", e: "🪶", a: "Air pushes up on it", w: ["It's sleepy", "It's very heavy"], why: "Air pushes on light, fluffy things like feathers, so they drift down slowly." },
  { q: "Which one could you carry in one hand?", e: "✋", a: "🍎 An apple", w: ["🚗 A car", "🛋️ A couch"], why: "An apple is light enough to carry in one hand!" },
  { q: "How can you tell which toy is heavier?", e: "🧸🚂", a: "Hold one in each hand", w: ["Look at its color", "Smell them"], why: "Hold one in each hand — or use a balance scale — and feel which is heavier!" },
  { q: "Is a big thing always heavy?", e: "🏐🪨", a: "No, not always!", w: ["Yes, always", "Only on Tuesdays"], why: "A big beach ball is light, and a small rock can be heavy — size can trick you!" },
  { q: "Which sled needs a bigger pull?", e: "🛷", a: "A sled with 3 kids on it", w: ["An empty sled", "A sled with a leaf on it"], why: "The more weight on a sled, the harder you have to pull it!" },
];

// ── Healthy Me Harbor ────────────────────────────────────────────────────────────────────
const HABITS_Q: Pol[] = [
  { q: "How many times a day should you brush your teeth?", e: "🪥", a: "Two times", w: ["Never", "Once a year"], why: "Brush in the morning and before bed to keep your teeth strong and sparkly!" },
  { q: "Why do we need sleep?", e: "😴", a: "To rest and grow", w: ["To get hungry", "To make it dark"], why: "While you sleep, your body rests, grows and gets ready for a new day!" },
  { q: "Which one makes your heart and muscles strong?", e: "❤️💪", a: "🏃 Running and playing", w: ["📺 Watching TV all day", "🛋️ Sitting all day"], why: "Moving your body — running, jumping, dancing — makes your heart and muscles strong!" },
  { q: "What do you wear to keep your head safe on a bike?", e: "🚲", a: "⛑️ A helmet", w: ["🧢 A cap", "🎀 A bow"], why: "A helmet protects your head — always wear one on a bike or scooter!" },
  { q: "When should you go to bed?", e: "🌙", a: "At bedtime, every night", w: ["Very, very late", "Never!"], why: "Going to bed at the same time each night helps your body get enough sleep." },
  { q: "How long should you brush your teeth?", e: "🪥⏱️", a: "About 2 minutes", w: ["1 second", "All day long"], why: "Brush for about two minutes — try humming a song while you scrub!" },
  { q: "What helps keep your body clean and fresh?", e: "🛁", a: "Taking a bath", w: ["Rolling in mud", "Skipping baths"], why: "Baths wash away dirt, sweat and germs — and bubbles make it fun!" },
  { q: "Which one is a healthy habit?", e: "⭐", a: "Washing my hands", w: ["Sneezing on friends", "Staying up all night"], why: "Washing your hands with soap is one of the best ways to stay healthy!" },
  { q: "Playing outside is good for you because…", e: "🌳⚽", a: "It moves your body", w: ["It turns you green", "It shrinks your feet"], why: "Running, climbing and playing outside keep your body strong and happy!" },
  { q: "You played hard and you're sweaty. What does your body need?", e: "💦", a: "💧 A drink of water", w: ["🍬 Some candy", "📺 A TV show"], why: "Sweating uses up your body's water — drink up to fill it back!" },
];
const HABIT_SORT: SortBank = {
  prompt: "Healthy habit or not so healthy?",
  bins: ["Healthy habit", "Not so healthy", "⭐", "😕"],
  items: [
    ["Wash hands with soap", 1, "🧼"], ["Brush your teeth", 1, "🪥"], ["Sleep all night", 1, "🛏️"], ["Drink water", 1, "💧"], ["Play outside", 1, "⚽"], ["Eat fruits and veggies", 1, "🥕"], ["Sneeze into your elbow", 1, "💪"], ["Wear sunscreen", 1, "🧴"],
    ["Stay up very late", 0, "🌙"], ["Skip brushing teeth", 0, "🦷"], ["Sneeze on a friend", 0, "🤧"], ["Watch TV all day", 0, "📺"], ["Eat candy all day", 0, "🍬"], ["Sit still all day", 0, "🛋️"], ["Skip washing hands", 0, "🦠"], ["Drink soda all day", 0, "🥤"],
  ],
};
const FOOD_SORT: SortBank = {
  prompt: "Is it an everyday food or a sometimes food?",
  bins: ["Everyday food", "Sometimes food", "🥦", "🧁"],
  items: [
    ["Apple", 1, "🍎"], ["Carrots", 1, "🥕"], ["Broccoli", 1, "🥦"], ["Banana", 1, "🍌"], ["Milk", 1, "🥛"], ["Eggs", 1, "🥚"], ["Oatmeal", 1, "🥣"], ["Strawberries", 1, "🍓"],
    ["Cake", 0, "🍰"], ["Candy", 0, "🍬"], ["Cookies", 0, "🍪"], ["Ice cream", 0, "🍦"], ["Doughnut", 0, "🍩"], ["Lollipop", 0, "🍭"], ["Soda pop", 0, "🥤"], ["French fries", 0, "🍟"],
  ],
};
const FOOD_Q: Pol[] = [
  { q: "Which is an everyday food?", e: "🍽️", a: "🍎 An apple", w: ["🍭 A lollipop", "🍩 A doughnut"], why: "Apples are everyday foods — crunchy, sweet and full of good stuff for you!" },
  { q: "Cake is a yummy treat. When do we eat it?", e: "🎂", a: "Sometimes, like parties", w: ["For every meal", "Instead of water"], why: "Treats like cake are sometimes foods — fun for special days!" },
  { q: "Which breakfast is an everyday food?", e: "🌅", a: "🥣 Oatmeal and fruit", w: ["🍰 Cake", "🍭 Lollipops"], why: "Oatmeal and fruit give you energy that lasts all morning long!" },
  { q: "“Eat a rainbow” means eating lots of colors of…", e: "🌈", a: "Fruits and veggies", w: ["Candy", "Crayons"], why: "Red tomatoes, orange carrots, green peas — every color helps your body!" },
  { q: "Which food helps build strong bones?", e: "🦴", a: "🥛 Milk", w: ["🍭 Lollipops", "🥤 Soda pop"], why: "Milk has calcium, which helps build strong bones and teeth!" },
  { q: "Which snack gives you energy to play?", e: "⚽", a: "🍌 A banana", w: ["🍬 A pile of candy", "🥤 A soda pop"], why: "A banana gives your body energy that lasts, so you can run and play!" },
  { q: "Is it okay to eat a treat sometimes?", e: "🍦", a: "Yes, sometimes!", w: ["No, never ever", "Yes, all day long"], why: "Treats are fine sometimes — everyday foods help your body grow strong." },
  { q: "Which food is a vegetable?", e: "🥗", a: "🥦 Broccoli", w: ["🍪 A cookie", "🧀 Cheese"], why: "Broccoli is a vegetable — some people call it “little trees”!" },
  { q: "Which one is a fruit?", e: "🧺", a: "🍓 A strawberry", w: ["🥕 A carrot", "🍞 Bread"], why: "Strawberries are fruits — look closely and you'll see tiny seeds on the outside!" },
  { q: "Which is an everyday snack?", e: "😋", a: "🥕 Carrot sticks", w: ["🍬 Candy", "🍩 A doughnut"], why: "Crunchy carrot sticks are an everyday snack that helps your body grow!" },
];
const WASH_STEPS: [string, string][] = [["Wet your hands", "💧"], ["Add soap", "🧼"], ["Scrub for 20 seconds", "🎶"], ["Rinse off the soap", "🚰"], ["Dry your hands", "🧻"]];
const GERMS_Q: Pol[] = [
  { q: "Where do germs like to hide?", e: "🦠", a: "On hands and doorknobs", w: ["Only on the Moon", "Inside rainbows"], why: "Germs can be on things we touch a lot, like hands, toys and doorknobs." },
  { q: "When should you wash your hands?", e: "🧼", a: "Before you eat", w: ["Only on birthdays", "Never"], why: "Wash before eating and after the bathroom so germs stay out of your mouth." },
  { q: "What washes germs away best?", e: "🚰", a: "🧼 Soap and water", w: ["💧 A little splash", "👕 Wiping on your shirt"], why: "Soap grabs germs and water rinses them away — scrub, scrub, scrub!" },
  { q: "How long should you scrub with soap?", e: "⏱️", a: "20 seconds", w: ["1 second", "1 hour"], why: "Scrub for 20 seconds — about as long as singing “Happy Birthday” twice!" },
  { q: "You need to sneeze! What should you do?", e: "🤧", a: "💪 Sneeze into my elbow", w: ["😮 Sneeze on a friend", "🍽️ Sneeze on the food"], why: "Sneezing into your elbow keeps germs from flying onto people and things." },
  { q: "After you use the bathroom, you should…", e: "🚽", a: "Wash your hands", w: ["Skip washing", "Clap your hands"], why: "Always wash with soap after the bathroom — it sends germs down the drain!" },
  { q: "Your friend has a cold. How can you help stop germs?", e: "🤒", a: "Use your own cup", w: ["Share a straw", "Sneeze on them"], why: "Using your own cup and fork keeps cold germs from spreading." },
  { q: "Why do we rinse fruit before eating it?", e: "🍎💧", a: "To wash off dirt", w: ["To make it bigger", "To make it sweeter"], why: "Rinsing fruit washes off dirt and germs it picked up on its way to you." },
  { q: "What helps your body fight off germs?", e: "💪", a: "Sleep and healthy food", w: ["Staying up all night", "Eating only candy"], why: "Good sleep and everyday foods help your body stay strong against germs!" },
  { q: "Can you see germs on your hands?", e: "👀✋", a: "No, they're too tiny", w: ["Yes, they're purple", "Yes, they wave hi"], why: "Germs are too small to see, so wash your hands even when they look clean!" },
];
const SUN_SAFE_Q: Pol[] = [
  { q: "It's sunny at the beach. What protects your skin?", e: "🏖️☀️", a: "🧴 Sunscreen", w: ["🧈 Butter", "🍯 Honey"], why: "Sunscreen helps protect your skin from sunburn — put it on before you play!" },
  { q: "What can you wear to shade your face from the sun?", e: "☀️", a: "👒 A hat with a brim", w: ["🧦 Socks", "🧤 Mittens"], why: "A hat with a wide brim shades your face, ears and neck." },
  { q: "The sun is strong. Where can you cool off?", e: "🌳", a: "In the shade", w: ["On a hot slide", "Out in the bright sun"], why: "Shade from a tree or umbrella keeps you cooler and safer from the sun." },
  { q: "Can you get a sunburn on a cloudy day?", e: "☁️☀️", a: "Yes, so wear sunscreen", w: ["No, never", "Only at night"], why: "The sun's rays can sneak through clouds — sunscreen helps even on gray days!" },
  { q: "What do sunglasses protect?", e: "🕶️", a: "👀 Your eyes", w: ["👃 Your nose", "🦶 Your toes"], why: "Sunglasses protect your eyes from bright, strong sunlight." },
  { q: "When should you put on sunscreen?", e: "🧴", a: "Before playing in the sun", w: ["After a sunburn", "Only at bedtime"], why: "Put on sunscreen before you play outside, and again after swimming!" },
  { q: "Your skin is turning pink in the sun. What should you do?", e: "☀️😣", a: "Go into the shade", w: ["Stay out longer", "Take off your hat"], why: "Pink skin means too much sun — head for the shade and tell a grown-up." },
  { q: "Which one is a sun-safe choice?", e: "😎", a: "A hat and sunscreen", w: ["Staring at the sun", "Skipping sunscreen"], why: "Hats, sunglasses, shade and sunscreen are your sun-safety team!" },
  { q: "Is it okay to stare at the Sun?", e: "☀️👀", a: "No, it can hurt your eyes", w: ["Yes, all day", "Yes, if you blink"], why: "The Sun is super bright — never look right at it, even with sunglasses on." },
  { q: "When is the sun the strongest?", e: "☀️", a: "In the middle of the day", w: ["Early in the morning", "At night"], why: "The sun is strongest around lunchtime — a great time to find some shade!" },
];
const HABIT_MATCH: MatchBank = [
  ["🪥 Brush teeth", "Clean teeth"],
  ["🧼 Wash hands", "Fewer germs"],
  ["🛏️ Sleep", "Rest your body"],
  ["🏃 Run and play", "Strong muscles"],
  ["🧴 Sunscreen", "No sunburn"],
  ["🥦 Everyday foods", "Energy to grow"],
];

// ═══ The voyage ════════════════════════════════════════════════════════════════════════════
export const LITTLE_WORLDS: WorldDef[] = [
  // Pre-K
  { id: "senses", title: "Five Senses Shore", emoji: "👀", grade: "prek", items: 5, blurb: "See, hear, smell, taste and touch — explore the world with all five senses!",
    talk: ["What's the best smell you can think of?", "What sounds did you hear on the way home today?"],
    challenge: "Go on a listening walk with your grown-up: stop, close your eyes, and name three sounds you hear.",
    stages: [
      stage("My five senses", "👀", [politeT("senses-body", SENSE_BODY, true, "s"), matchT("senses-jobs", "Match each body part to its job", SENSE_JOBS, true, "s")], 2),
      stage("Which sense?", "🤔", [politeT("senses-which", WHICH_SENSE, true, "s"), sortManyT("senses-sort", SENSE_SORT, true, 2, "s")]),
      stage("Sense words", "🧸", [sortT("senses-soft-hard", SOFT_HARD, true, 6, "s"), matchT("senses-words", "Match each word to its picture", SENSE_WORDS, true, "s")]),
      stage("Super senses", "🦉", [politeT("senses-animals", SUPER_SENSES, true, "s"), sortT("senses-loud-quiet", LOUD_QUIET, true, 6, "s")]),
    ] },
  { id: "alive", title: "Living Lagoon", emoji: "🐞", grade: "prek", items: 5, blurb: "Living things eat, drink, breathe and grow — rocks and toys don't!",
    talk: ["Can you name something living and something not living at this table?", "What do you need every day to grow big and strong?"],
    challenge: "Find three things that are living and three things that are not living — inside or outside!",
    stages: [
      stage("Alive or not?", "🐞", [sortT("alive-sort", ALIVE_SORT, true, 6, "s"), politeT("alive-which", ALIVE_Q, true, "s")], 2),
      stage("Food, water, air", "💧", [politeT("alive-needs", NEEDS_Q, true, "s"), matchT("alive-food", "Match each animal to its food", ANIMAL_FOOD, true, "s")]),
      stage("Growing up", "📏", [politeT("alive-grow", GROW_Q, true, "s"), orderT("alive-grow-up", "Put them in order, from baby to grown-up", GROW_UP, true, "s")]),
    ] },
  { id: "animal-homes", title: "Animal Homes Harbor", emoji: "🏠", grade: "prek", items: 5, blurb: "Nests, hives, dens and burrows — every animal needs a cozy home.",
    talk: ["If you were an animal, what kind of home would you live in?", "Why do you think birds build their nests up high?"],
    challenge: "Go on a home hunt outside with your grown-up: look for a nest, a web or a hole where an animal lives — just look, don't touch!",
    stages: [
      stage("Who lives here?", "🏠", [matchT("homes-match", "Match each animal to its home", HOMES_MATCH, true, "s"), politeT("homes-who", HOMES_Q, true, "s")], 2),
      stage("Sea, land or sky?", "🌊", [sortManyT("homes-where", WHERE_SORT, true, 2, "s"), politeT("homes-habitat", HABITAT_Q, true, "s")]),
      stage("Animal builders", "🪵", [politeT("homes-build", BUILD_Q, true, "s"), orderT("homes-nest", "Help the bird family! Put it in order", NEST_STEPS, true, "s")]),
    ] },
  { id: "baby-animals", title: "Baby Animal Bay", emoji: "🐣", grade: "prek", items: 5, blurb: "Puppies, kittens, chicks and joeys — meet the babies and their grown-ups!",
    talk: ["Which baby animal would you most like to cuddle?", "Can you name three animals that hatch from eggs?"],
    challenge: "With your grown-up, name as many baby animals as you can — can you get to ten?",
    stages: [
      stage("Baby names", "🐶", [matchT("babies-match", "Match each baby to its grown-up", BABY_MATCH, true, "s"), politeT("babies-names", BABY_Q, true, "s")], 2),
      stage("Egg or not?", "🥚", [sortT("babies-hatch", HATCH_SORT, true, 6, "s"), politeT("babies-eggs", EGG_Q, true, "s")]),
      stage("Animal families", "🤗", [politeT("babies-care", CARE_Q, true, "s"), orderT("babies-chick", "Put the chick's story in order", CHICK_STEPS, true, "s")]),
    ] },

  // Kindergarten
  { id: "weather", title: "Weather Watch Wharf", emoji: "⛅", grade: "k", items: 5, blurb: "Sunny, rainy, snowy, windy — be a weather watcher and dress for the day!",
    talk: ["What was the weather like today? What did you wear?", "What's your favorite kind of weather, and why?"],
    challenge: "Be a weather watcher: look outside this morning and again at bedtime — did the weather change?",
    stages: [
      stage("What's the weather?", "⛅", [politeT("weather-kinds", WEATHER_Q, true, "s"), matchT("weather-gear", "Match the weather to what goes with it", WEATHER_GEAR, true, "s")], 2),
      stage("Dress for the day", "🧤", [sortT("weather-wear", WEAR_SORT, true, 6, "s"), politeT("weather-dress", DRESS_Q, true, "s")]),
      stage("Storm safety", "⚡", [politeT("weather-safe", SAFE_Q, true, "s"), orderT("weather-thunder", "Thunder! Put the safe steps in order", THUNDER_STEPS, true, "s")]),
      stage("Weather watchers", "🌡️", [politeT("weather-tools", TOOLS_Q, true, "s"), matchT("weather-gear", "Match the weather to what goes with it", WEATHER_GEAR, true, "s")]),
    ] },
  { id: "day-night", title: "Day & Night Dock", emoji: "🌙", grade: "k", items: 5, blurb: "The Sun lights our day, the Moon and stars shine at night — and night animals wake up!",
    talk: ["What do you love to do in the daytime? At night?", "Why do you think owls stay awake all night?"],
    challenge: "Tonight, look for the Moon with your grown-up and talk about its shape — if it's hiding, try again tomorrow!",
    stages: [
      stage("Day or night?", "🌞", [sortT("daynight-sort", DAY_NIGHT_SORT, true, 6, "s"), politeT("daynight-sky", SKY_Q, true, "s")], 2),
      stage("Moonlight", "🌕", [politeT("daynight-moon", MOON_Q, true, "s"), sortT("daynight-light", LIGHT_SORT, true, 6, "s")]),
      stage("Night animals", "🦉", [sortT("daynight-animals", NOCTURNAL_SORT, true, 6, "s"), politeT("daynight-nocturnal", NOCTURNAL_Q, true, "s")]),
      stage("Sunshine & shadows", "🌅", [politeT("daynight-sun", SUN_Q, true, "s"), orderT("daynight-order", "Put the day in order, from morning to night", DAY_STEPS, true, "s")]),
    ] },
  { id: "plants-grow", title: "Seed Sprout Cove", emoji: "🌱", grade: "k", items: 5, blurb: "Plant a seed, give it water and sun, and watch it sprout into a flower!",
    talk: ["What do you think a seed needs to grow?", "Which plant part did you eat today — a root, a leaf, a fruit or a seed?"],
    challenge: "With your grown-up, plant a seed in a cup of soil, water it, set it in a sunny spot — and check on it every day!",
    stages: [
      stage("What plants need", "💧", [politeT("plants-needs", PLANT_NEEDS_Q, true, "s"), sortT("plants-needs-sort", PLANT_NEEDS_SORT, true, 6, "s")], 2),
      stage("Seed to flower", "🌻", [orderT("plants-life", "Put the plant's life in order", SEED_STEPS, true, "s"), politeT("plants-grow", GROW_PLANT_Q, true, "s"), orderT("plants-planting", "How do you plant a seed? Put the steps in order", PLANTING_STEPS, true, "s")]),
      stage("Parts of a plant", "🌷", [matchT("plants-parts", "Match each plant part to its job", PARTS_MATCH, true, "s"), politeT("plants-parts-q", PARTS_Q, true, "s")]),
    ] },
  { id: "push-pull", title: "Push & Pull Pier", emoji: "🛒", grade: "k", items: 5, blurb: "Pushes and pulls make things move — and a bigger push sends them farther!",
    talk: ["What did you push today? What did you pull?", "How could you make a ball roll farther?"],
    challenge: "Roll a ball with a tiny push, then with a bigger push — which one went farther?",
    stages: [
      stage("Push or pull?", "👐", [sortT("push-sort", PUSH_SORT, true, 6, "s"), politeT("push-which", PUSH_Q, true, "s")], 2),
      stage("Big push, little push", "💪", [politeT("push-strength", STRENGTH_Q, true, "s"), orderT("push-bowl", "Bowling time! Put it in order", BOWL_STEPS, true, "s")]),
      stage("Roll or slide?", "⚽", [sortT("push-roll", ROLL_SLIDE, true, 6, "s"), politeT("push-roll-q", ROLL_Q, true, "s")]),
      stage("Heavy or light?", "🪶", [sortT("push-heavy", HEAVY_LIGHT, true, 6, "s"), politeT("push-heavy-q", HEAVY_Q, true, "s")]),
    ] },
  { id: "healthy-me", title: "Healthy Me Harbor", emoji: "💪", grade: "k", items: 5, blurb: "Wash, brush, rest, move and eat a rainbow — take care of your amazing body!",
    talk: ["What's one healthy thing you did today?", "Which everyday food would you like to try this week?"],
    challenge: "Wash your hands with soap while you hum “Happy Birthday” twice — that's about 20 seconds of scrubbing!",
    stages: [
      stage("Healthy habits", "🪥", [politeT("healthy-habits", HABITS_Q, true, "s"), sortT("healthy-habits-sort", HABIT_SORT, true, 6, "s")], 2),
      stage("Everyday & sometimes foods", "🍎", [sortT("healthy-foods", FOOD_SORT, true, 6, "s"), politeT("healthy-foods-q", FOOD_Q, true, "s")]),
      stage("Bye-bye, germs!", "🧼", [orderT("healthy-wash", "Put the handwashing steps in order", WASH_STEPS, true, "s"), politeT("healthy-germs", GERMS_Q, true, "s")]),
      stage("Sun smart & strong", "😎", [politeT("healthy-sun", SUN_SAFE_Q, true, "s"), matchT("healthy-match", "Match each healthy habit to how it helps", HABIT_MATCH, true, "s")]),
    ] },
];
