import type { WorldDef } from "../gen";
import { politeT, sortT, sortManyT, orderT, matchT, type Pol, type SortBank, type SortMany, type MatchBank } from "../behavior";

// Discovery — science for middle sailors (1st–2nd grade). Eleven worlds that follow the big ideas
// of early-grades science: life cycles, animal groups, habitats, matter, and sound & light (1st);
// rocks & soil, plant parts, the water cycle, food chains, magnets, and the Sun, Earth & Moon (2nd).
//
// Everything is read aloud, so the words stay simple while real vocabulary ("evaporation",
// "producer", "opaque") arrives with its meaning attached. Every choice carries a "why" that
// teaches the fact (often a "whoa" fact), and the questions ask kids to predict, compare and
// explain — not just recall. Misconceptions only ever appear as wrong answers (the Moon makes
// light, seasons come from distance, all metals stick to magnets, whales are fish…).
// Skill keys: "s:<topic>".

const s = "s" as const;

// ═══ 1st grade ═════════════════════════════════════════════════════════════════════════════

// ── Life Cycle Lagoon ─────────────────────────────────────────────────────────────────────
const BUTTERFLY_CYCLE: [string, string][] = [["A tiny egg on a leaf", "🥚"], ["A hungry caterpillar (larva)", "🐛"], ["A chrysalis (pupa)", "⏳"], ["A butterfly with wings", "🦋"]];
const FROG_CYCLE: [string, string][] = [["Eggs in a jelly clump", "🥚"], ["A tadpole with gills", "🌊"], ["A froglet with legs", "🦵"], ["A frog that hops on land", "🐸"]];
const CHICKEN_CYCLE: [string, string][] = [["A hen lays an egg", "🥚"], ["A chick hatches out", "🐣"], ["The chick grows feathers", "🐥"], ["A grown-up chicken", "🐔"]];
const BEAN_CYCLE: [string, string][] = [["A seed in the soil", "🌰"], ["A sprout pokes up", "🌱"], ["A seedling grows leaves", "🌿"], ["An adult plant grows tall", "🪴"], ["Flowers make new seeds", "🌼"]];
const BABY_ANIMALS: MatchBank = [["Frog", "Tadpole"], ["Butterfly", "Caterpillar"], ["Chicken", "Chick"], ["Kangaroo", "Joey"], ["Horse", "Foal"], ["Sheep", "Lamb"], ["Bear", "Cub"], ["Duck", "Duckling"]];
const METAMORPHOSIS: Pol[] = [
  { q: "What hatches out of a butterfly egg?", e: "🥚🦋", a: "A caterpillar", w: ["A tiny butterfly", "A tadpole"], why: "A butterfly egg hatches into a caterpillar, called a larva — it looks nothing like its parents!" },
  { q: "Why does a caterpillar eat and eat all day long?", e: "🐛🍃", a: "It needs energy to grow", w: ["It is bored", "To make its wings shiny"], why: "Whoa — a monarch caterpillar gets about 2,000 times heavier in just two weeks!" },
  { q: "What happens inside a chrysalis?", e: "⏳🦋", a: "It changes into a butterfly", w: ["It lays eggs", "It eats leaves"], why: "Inside, the caterpillar's body is rebuilt into wings, legs and antennae. That's metamorphosis!" },
  { q: "What is a caterpillar's very first meal?", e: "🐛🥚", a: "Its own eggshell", w: ["A flower", "A worm"], why: "Many caterpillars munch their own eggshell first — it's packed with good food!" },
  { q: "What do monarch caterpillars eat?", e: "🐛🌿", a: "Milkweed leaves", w: ["Flower nectar", "Tiny fish"], why: "Monarch caterpillars munch only milkweed. Grown-up butterflies sip sweet nectar instead." },
  { q: "A butterfly lands on a leaf. What can its feet do?", e: "🦋🍃", a: "Taste the leaf", w: ["Spin silk", "Make honey"], why: "Butterflies taste with their feet! A mother checks a leaf before she lays her eggs on it." },
  { q: "What is a baby frog called?", e: "🐸👶", a: "A tadpole", w: ["A cub", "A caterpillar"], why: "A baby frog is a tadpole. It hatches from an egg in the water and swims with a tail." },
  { q: "Where do most frogs lay their eggs?", e: "🐸💧", a: "In water", w: ["In dry sand", "In a bird's nest"], why: "Tadpoles need water to live and breathe, so most frogs lay their eggs in ponds or streams." },
  { q: "A tadpole lives underwater. What does it breathe with?", e: "🌊🐸", a: "Gills, like a fish", w: ["Lungs, like you", "Its tail"], why: "Tadpoles breathe with gills. As they grow into frogs, they grow lungs and can breathe air." },
  { q: "How is a froglet different from a tadpole?", e: "🦵🐸", a: "It has legs", w: ["It has wings", "It has fur"], why: "A froglet has four legs and a short tail — it's almost ready to hop onto land!" },
  { q: "What happens to a tadpole's tail as it turns into a frog?", e: "🐸✨", a: "Its body soaks it up", w: ["It falls off", "It grows longer"], why: "The tail doesn't drop off — the growing frog's body absorbs it and uses it for energy." },
  { q: "A grown-up frog can breathe in two ways. How?", e: "🐸💨", a: "With lungs and its skin", w: ["With gills and fins", "With its tail"], why: "Frogs breathe with lungs AND soak up air through their thin, moist skin." },
];
const GROWING_UP: Pol[] = [
  { q: "How does a chick get out of its egg?", e: "🐣🥚", a: "It pecks with a tiny egg tooth", w: ["Its mom cracks it open", "It waits for rain"], why: "A chick has a little bump on its beak called an egg tooth for cracking the shell. It falls off later!" },
  { q: "About how long does a chicken egg take to hatch?", e: "🥚📅", a: "About 3 weeks", w: ["About 3 days", "About 3 years"], why: "A hen keeps her eggs warm for about 21 days — that's 3 weeks — until the chicks hatch." },
  { q: "A chick hatches with soft, fluffy feathers. What are they called?", e: "🐤☁️", a: "Down", w: ["Scales", "Fur"], why: "Fluffy down keeps a chick warm. Its grown-up feathers come in a few weeks later." },
  { q: "A bean seed sprouts. What grows out of it first?", e: "🌰🌱", a: "A tiny root", w: ["A flower", "A bean pod"], why: "The root comes first, so the new plant can hold on and drink water from the soil." },
  { q: "A bean is planted in dark soil. Can it still sprout?", e: "🌰🌑", a: "Yes, it has food packed inside", w: ["No, it needs light to sprout", "No, it needs a pot"], why: "A seed carries its own packed lunch — enough food to sprout before its leaves can catch sunlight." },
  { q: "Why do plants grow flowers?", e: "🌸🐝", a: "To make seeds", w: ["To scare bugs away", "To drink water"], why: "Flowers make seeds, and seeds grow into new plants — so the life cycle starts all over again!" },
  { q: "A giant sunflower head can hold over 1,000 of these. What are they?", e: "🌻✨", a: "Seeds", w: ["Eggs", "Bees"], why: "Each sunflower seed could grow into a brand-new sunflower — and start the life cycle again!" },
  { q: "How do baby mammals get their first food?", e: "🐄🥛", a: "They drink milk from mom", w: ["They eat seeds", "They hunt bugs"], why: "Mammal moms make milk for their babies — puppies, kittens, calves, and even baby whales!" },
  { q: "Which baby looks like a small copy of its parents?", e: "👶🐾", a: "A kitten", w: ["A caterpillar", "A tadpole"], why: "Kittens look like little cats. Caterpillars and tadpoles change shape a lot as they grow!" },
  { q: "Which animal is a mammal that lays eggs?", e: "🥚😮", a: "A platypus", w: ["A dog", "A horse"], why: "Whoa — the duck-billed platypus is a mammal that lays eggs, then feeds its babies milk!" },
  { q: "An oak tree can live for hundreds of years. Does it have a life cycle?", e: "🌳🌰", a: "Yes — all living things do", w: ["No, trees don't change", "Only animals have one"], why: "A giant oak starts as a tiny acorn. Every living thing has a life cycle — even trees!" },
  { q: "What do ALL living things do in their life cycle?", e: "🔄🌍", a: "Grow and make young", w: ["Turn into butterflies", "Stay the same size"], why: "Every life cycle is a loop: living things start life, grow up, and make young that start it again." },
];

// ── Animal Group Gulf ─────────────────────────────────────────────────────────────────────
const CLASS_SORT: SortMany = {
  prompt: "Mammal, bird, fish or reptile? Sort them!",
  bins: [{ id: "mammal", label: "Mammals", emoji: "🐻" }, { id: "bird", label: "Birds", emoji: "🐦" }, { id: "fish", label: "Fish", emoji: "🐟" }, { id: "reptile", label: "Reptiles", emoji: "🦎" }],
  items: [
    ["Dog", "mammal", "🐶"], ["Elephant", "mammal", "🐘"], ["Mouse", "mammal", "🐭"], ["Giraffe", "mammal", "🦒"], ["Cow", "mammal", "🐄"], ["You!", "mammal", "🧒"],
    ["Owl", "bird", "🦉"], ["Eagle", "bird", "🦅"], ["Parrot", "bird", "🦜"], ["Duck", "bird", "🦆"], ["Flamingo", "bird", "🦩"], ["Chicken", "bird", "🐔"],
    ["Shark", "fish", "🦈"], ["Clownfish", "fish", "🐠"], ["Pufferfish", "fish", "🐡"], ["Salmon", "fish", "🐟"], ["Goldfish", "fish", "🐟"], ["Seahorse", "fish", "🌊"],
    ["Snake", "reptile", "🐍"], ["Turtle", "reptile", "🐢"], ["Crocodile", "reptile", "🐊"], ["Lizard", "reptile", "🦎"], ["Tortoise", "reptile", "🐢"], ["Gecko", "reptile", "🦎"],
  ],
};
const CRAWLY_SORT: SortMany = {
  prompt: "Amphibian, insect or arachnid? Sort them!",
  bins: [{ id: "amphibian", label: "Amphibians", emoji: "🐸" }, { id: "insect", label: "Insects (6 legs)", emoji: "🐞" }, { id: "arachnid", label: "Arachnids (8 legs)", emoji: "🕷️" }],
  items: [
    ["Frog", "amphibian", "🐸"], ["Toad", "amphibian", "🐸"], ["Salamander", "amphibian", "🦎"], ["Newt", "amphibian", "💧"], ["Axolotl", "amphibian", "💧"],
    ["Ant", "insect", "🐜"], ["Bee", "insect", "🐝"], ["Ladybug", "insect", "🐞"], ["Butterfly", "insect", "🦋"], ["Beetle", "insect", "🪲"], ["Grasshopper", "insect", "🦗"], ["Fly", "insect", "🪰"],
    ["Spider", "arachnid", "🕷️"], ["Tarantula", "arachnid", "🕷️"], ["Scorpion", "arachnid", "🦂"], ["Tick", "arachnid", "🔍"], ["Mite", "arachnid", "🔬"],
  ],
};
const COVERINGS: MatchBank = [["Mammals", "Fur or hair"], ["Birds", "Feathers"], ["Fish", "Wet scales and fins"], ["Reptiles", "Dry, scaly skin"], ["Amphibians", "Smooth, moist skin"], ["Insects", "A hard outer shell"]];
const GROUP_CLUES: Pol[] = [
  { q: "How many legs does every grown-up insect have?", e: "🐜🦵", a: "Six", w: ["Eight", "Four"], why: "All adult insects have 6 legs and 3 body parts: a head, a thorax and an abdomen." },
  { q: "How many main body parts does an insect have?", e: "🐝🔍", a: "Three", w: ["Two", "Five"], why: "Head, thorax, abdomen — 3 parts. Spiders have just 2 body parts and 8 legs!" },
  { q: "Only one animal group has feathers. Which one?", e: "🪶🐦", a: "Birds", w: ["Reptiles", "Insects"], why: "If it has feathers, it's a bird! Feathers help birds fly, stay warm and show off." },
  { q: "How do fish breathe underwater?", e: "🐟💧", a: "With gills", w: ["With lungs", "Through their tails"], why: "Gills pull oxygen out of the water as it flows in through the mouth and out over the gills." },
  { q: "What do mammal moms feed their babies?", e: "🐄🥛", a: "Milk", w: ["Seeds", "Bugs"], why: "Mammals make milk for their young — that's a big clue an animal is a mammal!" },
  { q: "A tiny animal has 8 legs and 2 body parts. What is it?", e: "🕷️🔍", a: "An arachnid, like a spider", w: ["An insect", "A reptile"], why: "Spiders are arachnids, not insects — insects have 6 legs, and spiders have 8." },
  { q: "Which animal group starts life in water, then often lives on land?", e: "🐸🌊", a: "Amphibians", w: ["Mammals", "Birds"], why: "Amphibian means “double life” — most start in water with gills, then grow lungs." },
  { q: "What does a reptile's skin feel like?", e: "🐍✋", a: "Dry and scaly", w: ["Soft and furry", "Wet and slimy"], why: "Reptiles like snakes and turtles have dry scales that help keep water inside their bodies." },
  { q: "Every single kind of bird does this. What is it?", e: "🐦🥚", a: "Lays eggs", w: ["Flies", "Swims"], why: "Not all birds can fly — penguins and ostriches can't — but every bird lays eggs!" },
  { q: "What do all mammals breathe with?", e: "🐋💨", a: "Lungs", w: ["Gills", "Feathers"], why: "All mammals breathe air with lungs — even whales and dolphins that live in the sea!" },
  { q: "What covers most mammals' bodies?", e: "🐻🧥", a: "Fur or hair", w: ["Feathers", "Scales"], why: "Fur and hair keep mammals warm. Even baby dolphins are born with a few whiskers!" },
];
const TRICKY_ANIMALS: Pol[] = [
  { q: "A whale lives in the ocean and swims. What group is it in?", e: "🐋🌊", a: "Mammals", w: ["Fish", "Reptiles"], why: "Whales breathe air with lungs and feed their babies milk — so they're mammals, not fish!" },
  { q: "A bat has wings and flies. What group is it in?", e: "🦇🌙", a: "Mammals", w: ["Birds", "Insects"], why: "Bats have fur and feed their babies milk. They're the only mammals that can really fly!" },
  { q: "A penguin can't fly. Is it still a bird?", e: "🐧❄️", a: "Yes — it has feathers", w: ["No, it's a fish", "No, it's a mammal"], why: "Penguins have feathers and lay eggs, so they're birds. Their wings work like flippers!" },
  { q: "A spider is small and creepy-crawly. Is it an insect?", e: "🕷️🕸️", a: "No — it has 8 legs", w: ["Yes, all bugs are insects", "Yes, it has 6 legs"], why: "Spiders have 8 legs and 2 body parts. They're arachnids, like scorpions and ticks." },
  { q: "A dolphin swims like a fish. How does it breathe?", e: "🐬💨", a: "With lungs, through a blowhole", w: ["With gills", "Through its fins"], why: "Dolphins are mammals. They swim up to the surface to breathe air through a blowhole." },
  { q: "A shark lives in the sea. What group is it in?", e: "🦈🌊", a: "Fish", w: ["Mammals", "Reptiles"], why: "Sharks are fish that breathe with gills — and sharks have lived in the oceans for over 400 million years!" },
  { q: "A salamander looks like a lizard. What is it really?", e: "🦎💧", a: "An amphibian", w: ["A reptile", "An insect"], why: "Salamanders have smooth, moist skin and start life in water or damp places — so they're amphibians." },
  { q: "A turtle has a hard shell. What group is it in?", e: "🐢🛡️", a: "Reptiles", w: ["Amphibians", "Insects"], why: "Turtles are reptiles with scaly skin. Whoa — their shell is part of their skeleton!" },
  { q: "An ostrich is much too heavy to fly. What is it?", e: "🐦💨", a: "A bird", w: ["A mammal", "An insect"], why: "The ostrich is the biggest bird in the world. It can't fly, but it can run super fast!" },
  { q: "A seahorse swims standing up. What group is it in?", e: "🌊🐴", a: "Fish", w: ["Mammals", "Insects"], why: "A seahorse is a fish with gills. Whoa — the dad carries the eggs in a pouch until they hatch!" },
  { q: "An earthworm has no legs at all. Is it an insect?", e: "🪱🌱", a: "No — insects have 6 legs", w: ["Yes, it's a tiny bug", "Yes, it lives in soil"], why: "Earthworms aren't insects. They have no legs, and they breathe right through their skin!" },
  { q: "A butterfly and a bee both have 6 legs. So they are…", e: "🦋🐝", a: "Insects", w: ["Arachnids", "Birds"], why: "Six legs and three body parts means insect — like butterflies, bees, ants and beetles!" },
];

// ── Habitat Harbor ────────────────────────────────────────────────────────────────────────
const ANIMAL_HOMES: MatchBank = [["Camel", "Desert"], ["Octopus", "Ocean"], ["Sloth", "Rainforest"], ["Polar bear", "Arctic"], ["Deer", "Forest"], ["Zebra", "Grassland"], ["Duck", "Pond"], ["Mountain goat", "Mountains"]];
const HABITAT_SORT: SortMany = {
  prompt: "Desert, ocean, Arctic or rainforest? Where does it live?",
  bins: [{ id: "desert", label: "Desert", emoji: "🏜️" }, { id: "ocean", label: "Ocean", emoji: "🌊" }, { id: "arctic", label: "Arctic", emoji: "❄️" }, { id: "rainforest", label: "Rainforest", emoji: "🌴" }],
  items: [
    ["Camel", "desert", "🐪"], ["Cactus", "desert", "🌵"], ["Fennec fox", "desert", "🦊"], ["Rattlesnake", "desert", "🐍"], ["Roadrunner", "desert", "🐦"], ["Gila monster", "desert", "🦎"],
    ["Octopus", "ocean", "🐙"], ["Blue whale", "ocean", "🐋"], ["Sea star", "ocean", "⭐"], ["Clownfish", "ocean", "🐠"], ["Sea turtle", "ocean", "🐢"], ["Shark", "ocean", "🦈"],
    ["Polar bear", "arctic", "🐻‍❄️"], ["Caribou", "arctic", "🦌"], ["Arctic fox", "arctic", "🦊"], ["Snowy owl", "arctic", "🦉"], ["Arctic hare", "arctic", "🐇"], ["Musk ox", "arctic", "🐂"],
    ["Toucan", "rainforest", "🦜"], ["Sloth", "rainforest", "🦥"], ["Jaguar", "rainforest", "🐆"], ["Poison dart frog", "rainforest", "🐸"], ["Orangutan", "rainforest", "🦧"], ["Gorilla", "rainforest", "🦍"],
  ],
};
const ADAPTATIONS: Pol[] = [
  { q: "What is an adaptation?", e: "🦆🐪", a: "A feature that helps it survive", w: ["A place animals visit", "A kind of food"], why: "Adaptations, like a duck's webbed feet or a camel's hump, help living things survive where they live." },
  { q: "How does a camel's hump help it in the desert?", e: "🐪🏜️", a: "It stores fat for energy", w: ["It is full of water", "It helps it swim"], why: "A camel's hump is fat, not water! Its body can use that fat when food is hard to find." },
  { q: "How does a polar bear stay warm in the icy Arctic?", e: "🐻‍❄️❄️", a: "Thick fur and a layer of fat", w: ["It wears a snow coat", "It sleeps by a fire"], why: "Polar bears have thick fur plus a layer of fat called blubber that can be 4 inches thick!" },
  { q: "A polar bear's fur looks white. What color is its skin?", e: "🐻‍❄️🔍", a: "Black", w: ["White", "Pink"], why: "Whoa — under that white-looking fur, a polar bear's skin is black!" },
  { q: "A cactus lives where it hardly ever rains. How does it survive?", e: "🌵☀️", a: "It stores water in its stem", w: ["It drinks from rivers", "It has big, thin leaves"], why: "A cactus stem is a water tank! Its spines are leaves that lose almost no water." },
  { q: "Why do ducks have webbed feet?", e: "🦆💧", a: "To paddle through water", w: ["To climb trees", "To dig in sand"], why: "Webbed feet push lots of water, like flippers, so ducks can swim fast." },
  { q: "Why do many desert animals come out at night?", e: "🦊🌙", a: "It's cooler at night", w: ["They can't see in the day", "To look at the stars"], why: "Deserts can be scorching by day, so many animals rest in cool burrows until dark." },
  { q: "Why is an arctic fox's fur white in winter?", e: "🦊❄️", a: "To hide in the snow", w: ["To stay cool", "To scare polar bears"], why: "White fur is camouflage — it helps the fox blend in with snow. In summer it turns brown!" },
  { q: "How does a giraffe's long neck help it on the grassland?", e: "🦒🌳", a: "It reaches high leaves", w: ["It sees underwater", "It digs for roots"], why: "A giraffe's long neck lets it munch treetop leaves that other animals can't reach." },
  { q: "Why does a beaver have big, strong front teeth?", e: "🦫🌲", a: "To chew down trees", w: ["To catch fish", "To dig for ants"], why: "Beavers chew trees to build dams and lodges. Their front teeth never stop growing!" },
  { q: "An owl hunts at night. What helps it most?", e: "🦉🌙", a: "Big eyes and sharp hearing", w: ["Bright colors", "A long tail"], why: "Owls have huge eyes for dim light and super hearing to find a mouse in the dark." },
  { q: "A frog has a long, sticky tongue. What does it help with?", e: "🐸🪰", a: "Catching flying bugs", w: ["Smelling flowers", "Staying warm"], why: "A frog flicks out its sticky tongue faster than you can blink to grab a bug!" },
];
const HABITAT_FACTS: Pol[] = [
  { q: "What is a habitat?", e: "🏡🐾", a: "The place an animal lives", w: ["A kind of animal food", "A type of weather"], why: "A habitat gives living things what they need: food, water, shelter and space." },
  { q: "Which habitat gets the most rain?", e: "🌴🌧️", a: "Rainforest", w: ["Desert", "Arctic"], why: "Some rainforests get more than 80 inches of rain a year — that's taller than a grown-up!" },
  { q: "Which habitat is freezing cold and covered in ice and snow?", e: "❄️🧊", a: "Arctic", w: ["Desert", "Rainforest"], why: "The Arctic is at the top of the world. In winter, the Sun may not rise for weeks!" },
  { q: "A desert is a place that gets very little… what?", e: "🏜️☀️", a: "Rain", w: ["Sunlight", "Sand"], why: "A desert gets very little rain. Whoa — icy Antarctica counts as a desert too!" },
  { q: "Which habitat is mostly salty water?", e: "🌊🐋", a: "Ocean", w: ["Pond", "Forest"], why: "Oceans cover about 70 percent of Earth and are home to the biggest animal ever: the blue whale!" },
  { q: "What kind of water is in a pond?", e: "🦆💧", a: "Fresh, not salty", w: ["Salty, like the sea", "Frozen all year"], why: "Ponds hold fresh water — home to frogs, ducks, turtles and tiny tadpoles." },
  { q: "Where would you find lots of tall grass and only a few trees?", e: "🦓🌾", a: "Grassland", w: ["Rainforest", "Ocean"], why: "Grasslands like the African savanna are home to zebras, lions and giraffes." },
  { q: "What would happen to a fish moved to the desert?", e: "🐟🏜️", a: "It couldn't survive there", w: ["It would grow legs", "It would be fine"], why: "Living things are suited to their own habitat. A fish needs water to breathe." },
  { q: "Which habitat has trees that drop their leaves in fall?", e: "🌳🍂", a: "Forest", w: ["Desert", "Ocean"], why: "In many forests, trees drop their leaves in fall and grow new ones in spring." },
  { q: "Why do animals live where they do?", e: "🗺️🐾", a: "It has what they need", w: ["They got lost there", "Their friends told them to"], why: "Each habitat has the right food, water, shelter and weather for the animals that live there." },
  { q: "Which animal would do best in the Arctic?", e: "❄️🐾", a: "A polar bear", w: ["A camel", "A toucan"], why: "Polar bears have thick fur and fat. A camel or a toucan would get way too cold!" },
];

// ── Matter Marina ─────────────────────────────────────────────────────────────────────────
const MATTER_SORT: SortMany = {
  prompt: "Solid, liquid or gas? Sort them!",
  bins: [{ id: "solid", label: "Solid", emoji: "🧱" }, { id: "liquid", label: "Liquid", emoji: "💧" }, { id: "gas", label: "Gas", emoji: "💨" }],
  items: [
    ["Rock", "solid", "🪨"], ["Ice cube", "solid", "🧊"], ["Wooden block", "solid", "🪵"], ["Pencil", "solid", "✏️"], ["Apple", "solid", "🍎"], ["Spoon", "solid", "🥄"], ["Book", "solid", "📘"],
    ["Milk", "liquid", "🥛"], ["Orange juice", "liquid", "🧃"], ["Tap water", "liquid", "🚰"], ["Honey", "liquid", "🍯"], ["Raindrops", "liquid", "🌧️"], ["Lemonade", "liquid", "🍋"],
    ["Air in a balloon", "gas", "🎈"], ["Wind", "gas", "🌬️"], ["Water vapor", "gas", "♨️"], ["Bubbles in soda", "gas", "🥤"], ["Air in a bike tire", "gas", "🚲"], ["The air you breathe out", "gas", "😮"],
  ],
};
const MATTER_PROPS: Pol[] = [
  { q: "What is matter?", e: "🪨💧", a: "Anything that takes up space", w: ["Only things you can see", "Only hard things"], why: "Matter is anything that has mass and takes up space — even the air you can't see!" },
  { q: "You pour juice from a tall glass into a bowl. What happens to its shape?", e: "🧃🥣", a: "It takes the bowl's shape", w: ["It stays tall", "It turns solid"], why: "Liquids flow and take the shape of whatever container they're in." },
  { q: "You put a wooden block in a bowl. What happens to its shape?", e: "🪵🥣", a: "It keeps its own shape", w: ["It spreads out flat", "It turns into a gas"], why: "Solids keep their own shape unless you cut, bend or break them." },
  { q: "Which kind of matter spreads out to fill any space?", e: "💨📦", a: "Gas", w: ["Solid", "Liquid"], why: "A gas spreads to fill its whole container. That's why you can smell cookies across the house!" },
  { q: "How can you tell that air is matter?", e: "🎈💨", a: "It fills up a balloon", w: ["It's always cold", "You can see it"], why: "Air takes up space — blow into a balloon and watch the air push it bigger!" },
  { q: "Ice, water and water vapor are all made of the same thing. What?", e: "🧊💧", a: "Water", w: ["Salt", "Air"], why: "Water can be a solid (ice), a liquid, or a gas (water vapor) — the same stuff in 3 states!" },
  { q: "Sand pours like water. Is sand a liquid?", e: "🏖️🤔", a: "No — each grain is a solid", w: ["Yes, because it pours", "No, it's a gas"], why: "Each grain of sand keeps its own shape, so sand is a solid — just in teeny pieces!" },
  { q: "Honey pours very, very slowly. What is it?", e: "🍯🐢", a: "A liquid", w: ["A solid", "A gas"], why: "Honey is a thick liquid. It still flows and takes the shape of its jar — just slowly!" },
  { q: "Can you squeeze a gas into a smaller space?", e: "🚲💨", a: "Yes, like air in a tire", w: ["No, never", "Only if it's frozen"], why: "A gas has lots of empty space between its tiny bits, so it can be squeezed into a tire!" },
  { q: "Which of these takes up space but is invisible?", e: "🌬️👀", a: "Air", w: ["A rock", "Milk"], why: "You can't see air, but it's matter — wind is moving air pushing on things!" },
  { q: "What's the same about a rock, milk and air?", e: "🪨🥛", a: "They are all matter", w: ["They are all solids", "They are all liquids"], why: "Solid, liquid or gas — everything that takes up space is matter!" },
];
const HEAT_SORT: SortBank = {
  prompt: "Is heating or cooling making this change?",
  bins: ["Heating", "Cooling", "🔥", "❄️"],
  items: [
    ["Ice cream drips in the sun", 1, "🍦"], ["Butter melts in a hot pan", 1, "🧈"], ["A puddle dries up", 1, "☀️"], ["A chocolate bar goes soft", 1, "🍫"],
    ["A snowman melts", 1, "⛄"], ["Water boils in a pot", 1, "♨️"], ["A crayon melts in a hot car", 1, "🖍️"], ["An ice cube turns to water", 1, "💧"],
    ["Water freezes into ice cubes", 0, "🧊"], ["A pond freezes in winter", 0, "⛸️"], ["Melted wax gets hard", 0, "🕯️"], ["Juice turns into an ice pop", 0, "🍧"],
    ["Drops form on a cold glass", 0, "🥛"], ["Hot lava hardens into rock", 0, "🌋"], ["Melted chocolate hardens", 0, "🍫"], ["Fog forms on a cold mirror", 0, "🪞"],
  ],
};
const ICE_TO_VAPOR: [string, string][] = [["A solid ice cube", "🧊"], ["It melts into liquid water", "💧"], ["The water heats up and boils", "♨️"], ["It turns into water vapor", "💨"]];
const HEAT_COOL: Pol[] = [
  { q: "What happens to an ice cube in a warm hand?", e: "🧊✋", a: "It melts into water", w: ["It turns to stone", "It gets bigger"], why: "Heat makes ice melt — a solid turning into a liquid." },
  { q: "What do we call it when a liquid turns into a solid?", e: "💧🧊", a: "Freezing", w: ["Melting", "Boiling"], why: "Freezing happens when a liquid gets cold enough — water freezes at 32 degrees Fahrenheit, or 0 Celsius." },
  { q: "A puddle on the sidewalk dries up in the sun. Where did the water go?", e: "☀️💧", a: "Into the air as water vapor", w: ["A bird drank it all", "It turned into sand"], why: "That's evaporation — the Sun's heat turns liquid water into a gas called water vapor." },
  { q: "What do we call it when a liquid turns into a gas?", e: "💧💨", a: "Evaporation", w: ["Freezing", "Melting"], why: "When water evaporates, it becomes water vapor — an invisible gas mixed into the air." },
  { q: "Can melted chocolate turn back into a solid?", e: "🍫❄️", a: "Yes, if it cools down", w: ["No, never", "Only if you stir it"], why: "Melting and freezing can go back and forth — cool the chocolate and it hardens again!" },
  { q: "Can a cooked egg turn back into a raw egg?", e: "🍳🥚", a: "No, cooking can't be undone", w: ["Yes, if you cool it", "Yes, if you freeze it"], why: "Some changes can be undone, like melting ice. Others, like cooking an egg, can't!" },
  { q: "Why do drops of water form on a cold glass of lemonade?", e: "🍋🥛", a: "Water vapor in the air cools", w: ["The glass is leaking", "The lemonade sweats"], why: "Invisible water vapor touches the cold glass, cools down and turns back into liquid drops." },
  { q: "Where could you put water to turn it into ice?", e: "🚰❄️", a: "In the freezer", w: ["In the oven", "In a sunny window"], why: "A freezer takes heat away. Water freezes at 32 degrees Fahrenheit, or 0 Celsius." },
  { q: "What makes a solid melt?", e: "🧈🔥", a: "Adding heat", w: ["Making it colder", "Shaking it"], why: "Heat makes the tiny bits of a solid wiggle faster until they slide past each other as a liquid." },
  { q: "Why does a snowman melt in the spring?", e: "⛄🌷", a: "The air gets warmer", w: ["It gets tired", "The snow gets heavier"], why: "Warm spring air heats the snow, and it melts into water." },
  { q: "Water boils on the stove. What rises out of the pot?", e: "♨️🍲", a: "Water vapor, a gas", w: ["Smoke", "Sand"], why: "Boiling water turns into water vapor. The white cloud above it is vapor cooling into tiny drops!" },
];

// ── Sound & Light Lighthouse ──────────────────────────────────────────────────────────────
const SOUND_POL: Pol[] = [
  { q: "What makes every sound?", e: "🥁🔊", a: "Something vibrating", w: ["Bright light", "Cold air"], why: "Sound starts when something vibrates — moves back and forth very fast." },
  { q: "Put your hand on your throat and hum. What do you feel?", e: "✋🎶", a: "Buzzy vibrations", w: ["Nothing at all", "Cold air"], why: "Your vocal cords vibrate when you hum or talk — that's how your voice makes sound!" },
  { q: "A drum is tapped softly, then hit hard. When is it louder?", e: "🥁💥", a: "When it's hit hard", w: ["When it's tapped softly", "It sounds the same"], why: "A harder hit makes bigger vibrations, and bigger vibrations make a louder sound." },
  { q: "You stretch a rubber band tight and pluck it. What happens?", e: "🎸👂", a: "It vibrates and makes a sound", w: ["It glows", "It melts"], why: "Plucking makes the band vibrate. Stop the vibrating, and the sound stops too!" },
  { q: "What is pitch?", e: "🎵📈", a: "How high or low a sound is", w: ["How loud a sound is", "How long a sound lasts"], why: "A bird's tweet has a high pitch; a big drum's boom has a low pitch." },
  { q: "Which one makes a higher sound?", e: "🔔🤔", a: "A tiny bell", w: ["A giant bell", "A big drum"], why: "Smaller things usually vibrate faster, and faster vibrations make higher sounds." },
  { q: "Can sound travel through water?", e: "🐋🎶", a: "Yes, whales sing to each other", w: ["No, water stops all sound", "Only in a bathtub"], why: "Sound moves about 4 times faster in water than in air. Whale songs can travel for miles!" },
  { q: "There's no air in outer space. Could you hear a friend shout?", e: "🚀🔇", a: "No, there's no air to carry it", w: ["Yes, extra loud", "Yes, but only echoes"], why: "Sound travels by making air, water or solids vibrate. Space has no air, so it's silent." },
  { q: "Why should you cover your ears near a very loud noise?", e: "🙉📢", a: "Loud sounds can hurt ears", w: ["Sound makes ears cold", "To hear it better"], why: "Very loud sounds can damage your hearing, so protect your ears with your hands or ear covers." },
  { q: "You tap a table with your ear pressed to it. What happens?", e: "👂🪵", a: "You hear the tap clearly", w: ["You hear nothing", "The table lights up"], why: "Sound travels through solids too — often even better than through air!" },
  { q: "What is an echo?", e: "⛰️📣", a: "Sound bouncing back to you", w: ["A very quiet song", "Light in a cave"], why: "Sound can bounce off walls, cliffs and canyons. When it comes back to you, that's an echo!" },
];
const PITCH_SORT: SortBank = {
  prompt: "High pitch or low pitch?",
  bins: ["High pitch", "Low pitch", "🔼", "🔽"],
  items: [
    ["A mouse squeaking", 1, "🐭"], ["A baby bird chirping", 1, "🐤"], ["A tiny bell ringing", 1, "🔔"], ["A kitten's mew", 1, "🐱"], ["A whistling tea kettle", 1, "🫖"], ["A buzzing mosquito", 1, "🦟"], ["A smoke alarm beeping", 1, "🚨"],
    ["A big bass drum", 0, "🥁"], ["Rumbling thunder", 0, "⛈️"], ["A lion's roar", 0, "🦁"], ["A ship's foghorn", 0, "🚢"], ["A cow's moo", 0, "🐄"], ["A big truck's horn", 0, "🚛"], ["An elephant's rumble", 0, "🐘"],
  ],
};
const LIGHT_SORT: SortBank = {
  prompt: "Does it make its own light?",
  bins: ["Makes its own light", "No light of its own", "🌟", "🌑"],
  items: [
    ["The Sun", 1, "☀️"], ["A flashlight", 1, "🔦"], ["A candle flame", 1, "🕯️"], ["A campfire", 1, "🔥"], ["A firefly", 1, "✨"], ["Lightning", 1, "⚡"], ["A lamp", 1, "💡"], ["A star at night", 1, "⭐"],
    ["The Moon", 0, "🌕"], ["A mirror", 0, "🪞"], ["A bike reflector", 0, "🚲"], ["A shiny spoon", 0, "🥄"], ["A book", 0, "📘"], ["A white cloud", 0, "☁️"], ["A cat's shiny eyes", 0, "🐱"], ["A planet", 0, "🪐"],
  ],
};
const LIGHT_THROUGH: SortMany = {
  prompt: "Clear, blurry or blocked? Sort by how much light gets through!",
  bins: [{ id: "transparent", label: "Transparent", emoji: "✨" }, { id: "translucent", label: "Translucent", emoji: "🌫️" }, { id: "opaque", label: "Opaque", emoji: "⬛" }],
  items: [
    ["Window glass", "transparent", "🪟"], ["Clean water", "transparent", "💧"], ["Eyeglass lenses", "transparent", "👓"], ["Air", "transparent", "🌬️"], ["A fish tank", "transparent", "🐠"],
    ["Wax paper", "translucent", "📜"], ["Frosted glass", "translucent", "🚿"], ["Tissue paper", "translucent", "🎀"], ["A paper lantern", "translucent", "🏮"], ["A plastic milk jug", "translucent", "🥛"],
    ["A brick wall", "opaque", "🧱"], ["A wooden door", "opaque", "🚪"], ["A book", "opaque", "📘"], ["A rock", "opaque", "🪨"], ["A cardboard box", "opaque", "📦"],
  ],
};
const LIGHT_POL: Pol[] = [
  { q: "Does the Moon make its own light?", e: "🌕🤔", a: "No, it reflects sunlight", w: ["Yes, it glows by itself", "Yes, but only at night"], why: "Moonlight is really sunlight bouncing off the Moon's gray, rocky ground!" },
  { q: "How does a shadow form?", e: "👤🔦", a: "Something blocks the light", w: ["Light gets brighter", "Darkness leaks out"], why: "Light travels in straight lines. When an object blocks it, a dark shadow forms behind it." },
  { q: "Your shadow is long and stretched out. What time of day is it?", e: "👤🌅", a: "Morning or evening", w: ["Noon", "Midnight"], why: "When the Sun is low in the sky, shadows stretch long. Around midday, they're short!" },
  { q: "Which material lets light through so you can see clearly?", e: "🪟✨", a: "Transparent, like glass", w: ["Opaque, like wood", "Translucent, like wax paper"], why: "Transparent things let light pass straight through, so you can see right through them." },
  { q: "Wax paper lets some light through, but things look blurry. It's…", e: "📜🌫️", a: "Translucent", w: ["Transparent", "Opaque"], why: "Translucent things let some light through but scatter it, so what's behind looks fuzzy." },
  { q: "A wooden door blocks all the light. What word describes it?", e: "🚪⬛", a: "Opaque", w: ["Transparent", "Translucent"], why: "Opaque objects block light completely — and they make the darkest shadows!" },
  { q: "Can you see anything in a room with no light at all?", e: "🌑👀", a: "No — we need light to see", w: ["Yes, if I squint", "Yes, my eyes glow"], why: "We see when light bounces off things and into our eyes. No light means no seeing!" },
  { q: "You move a flashlight closer to your toy. What happens to its shadow?", e: "🔦🧸", a: "It gets bigger", w: ["It gets smaller", "It disappears"], why: "The closer the light is to an object, the more light it blocks — so the shadow grows!" },
  { q: "Which of these is a light source?", e: "💡🔍", a: "The Sun", w: ["The Moon", "A mirror"], why: "A light source makes its own light. The Sun is the biggest light source for Earth!" },
  { q: "How does a mirror let you see yourself?", e: "🪞😊", a: "It reflects light back", w: ["It makes its own light", "It's a window"], why: "A smooth, shiny mirror bounces light straight back to your eyes, making a picture of you." },
  { q: "About how long does sunlight take to reach Earth?", e: "☀️🌍", a: "About 8 minutes", w: ["About 8 seconds", "About 8 days"], why: "Sunlight zooms about 93 million miles to Earth in just over 8 minutes!" },
];

// ═══ 2nd grade ═════════════════════════════════════════════════════════════════════════════

// ── Rock & Soil Reef ──────────────────────────────────────────────────────────────────────
const ROCKS_SOIL: Pol[] = [
  { q: "What is soil made of?", e: "🌱🟫", a: "Bits of rock and dead plants", w: ["Only tiny seeds", "Melted snow"], why: "Soil is tiny bits of rock mixed with rotted plants and animals, plus air and water." },
  { q: "Where does sand come from?", e: "🏖️🪨", a: "Rocks broken into tiny bits", w: ["Melted ice", "Dried-up clouds"], why: "Wind and water wear rocks down for thousands of years until they're tiny grains of sand." },
  { q: "Which kind of soil holds water best?", e: "🟫💧", a: "Clay", w: ["Sand", "Gravel"], why: "Clay is made of super-tiny, sticky bits packed close together, so water drains through slowly." },
  { q: "You pour water on a pile of sand. What happens?", e: "🏖️💧", a: "It drains through fast", w: ["It sits on top for days", "It turns into rock"], why: "Sand grains are big, with gaps between them, so water runs right through." },
  { q: "Which is best for growing a garden?", e: "🥕🌱", a: "Rich soil with old leaves", w: ["Pure sand", "Bare rock"], why: "Plants grow best in soil full of humus — rotted leaves and plants that feed the soil." },
  { q: "Do rocks stay the same forever?", e: "🪨⏳", a: "No, they slowly wear down", w: ["Yes, rocks never change", "They grow bigger each year"], why: "Wind, water and ice break rocks into smaller pieces over a very long time. That's weathering!" },
  { q: "How do earthworms help the soil?", e: "🪱🌱", a: "They mix it and add air", w: ["They eat all the rocks", "They make it hard"], why: "As earthworms tunnel, they let in air and water, and their droppings make soil richer." },
  { q: "Which rock is so full of air holes it can float?", e: "🪨🌊", a: "Pumice", w: ["Granite", "Marble"], why: "Pumice forms from bubbly lava. It's full of tiny air pockets, so it can float on water!" },
  { q: "What is the hardest natural material on Earth?", e: "💎💪", a: "Diamond", w: ["Chalk", "Clay"], why: "Diamond is the hardest natural material — it's even used to cut other rocks!" },
  { q: "What happens to clay when it's baked in a super-hot oven called a kiln?", e: "🏺🔥", a: "It gets hard", w: ["It melts into water", "It turns to sand"], why: "Baked clay gets hard and strong — that's how bricks, mugs and flowerpots are made!" },
  { q: "What is glass made from?", e: "🪟🏖️", a: "Sand, melted super hot", w: ["Frozen water", "Clouds"], why: "Glassmakers melt sand in super-hot furnaces, then shape it while it glows. Whoa!" },
];
const FOSSILS: Pol[] = [
  { q: "What is a fossil?", e: "🦴🪨", a: "A trace of very old life", w: ["A shiny new rock", "A kind of crystal"], why: "Fossils are the remains or traces of plants and animals that lived long, long ago." },
  { q: "Which of these could be a fossil?", e: "🦖👣", a: "A dinosaur footprint in rock", w: ["A plastic toy dinosaur", "A brand-new seashell"], why: "Fossils can be bones, shells, or even footprints left in mud that slowly turned to stone." },
  { q: "Where are most fossils found?", e: "⛏️🪨", a: "In layers of rock", w: ["Up in the clouds", "Inside living trees"], why: "Most fossils formed when living things got buried in mud or sand that slowly hardened into rock." },
  { q: "A seashell fossil is found high on a mountain. What does that tell us?", e: "🐚⛰️", a: "That land was once under water", w: ["Seashells can climb", "Someone dropped a shell"], why: "Ocean fossils on mountains show that land was underwater long ago, before it was pushed up." },
  { q: "What is a scientist who studies fossils called?", e: "🔍🦕", a: "A paleontologist", w: ["An astronaut", "A chef"], why: "Paleontologists dig up fossils to learn about life long ago — like the dinosaurs!" },
  { q: "How do we know dinosaurs were real?", e: "🦕🦴", a: "We find their fossils", w: ["From cartoons", "Someone saw one last year"], why: "Dinosaur bones, teeth, eggs and footprints have been found all over the world." },
  { q: "Can fossils be plants, too — not just animals?", e: "🌿🪨", a: "Yes — leaves and ferns, too", w: ["No, only bones", "No, only footprints"], why: "Fossil leaves, ferns and even whole tree trunks have turned to stone!" },
  { q: "When every last one of a kind of animal is gone forever, it is…", e: "🦣❌", a: "Extinct", w: ["Asleep", "Hiding"], why: "Extinct means none are left alive anywhere — like the woolly mammoth and T. rex." },
  { q: "Amber is old, hardened tree sap. What's sometimes found inside it?", e: "🟠🦟", a: "Tiny insects from long ago", w: ["Fresh water", "Gold coins"], why: "Insects got stuck in sticky tree sap that hardened into amber — some are millions of years old!" },
  { q: "When did T. rex live?", e: "🦖⏳", a: "Millions of years ago", w: ["Last year", "When Grandma was little"], why: "T. rex lived about 66 to 68 million years ago — long before there were any people!" },
];
const FOSSIL_STEPS: [string, string][] = [["An animal dies by a river", "🦕"], ["Mud and sand bury it", "🟫"], ["More layers pile on top", "📚"], ["Minerals turn bones to stone", "🦴"], ["Wind and rain uncover it", "🌬️"], ["A scientist digs it up", "⛏️"]];
const EARTH_USES: MatchBank = [["Clay", "Bricks and flowerpots"], ["Sand", "Making glass"], ["Soil", "Growing food"], ["Gravel", "Paths and driveways"], ["Water", "Drinking and washing"], ["Marble", "Statues"], ["Salt", "Flavoring food"], ["Granite", "Kitchen countertops"]];
const EARTH_OR_MADE: SortBank = {
  prompt: "Straight from the Earth, or made by people?",
  bins: ["From the Earth", "Made by people", "🌎", "🏭"],
  items: [
    ["A rock", 1, "🪨"], ["Beach sand", 1, "🏖️"], ["Garden soil", 1, "🌱"], ["Wet clay from a riverbank", 1, "🟫"], ["Pond water", 1, "💧"], ["A gold nugget", 1, "✨"], ["A chunk of crystal", 1, "💎"], ["Smooth river pebbles", 1, "🏞️"],
    ["A brick", 0, "🧱"], ["A glass window", 0, "🪟"], ["A clay flowerpot", 0, "🏺"], ["A plastic bottle", 0, "🧴"], ["A concrete sidewalk", 0, "🚶"], ["A coin", 0, "🪙"], ["A gold ring", 0, "💍"], ["A glass marble", 0, "🔮"],
  ],
};

// ── Plant Parts Point ─────────────────────────────────────────────────────────────────────
const PART_JOBS: MatchBank = [["Roots", "Soak up water, hold on tight"], ["Stem", "Carries water, holds plant up"], ["Leaves", "Make food from sunlight"], ["Flower", "Makes seeds with pollen"], ["Seed", "Grows into a new plant"], ["Fruit", "Protects and spreads seeds"], ["Petals", "Invite bees with bright colors"]];
const PLANT_FOOD: Pol[] = [
  { q: "How do plants get their food?", e: "🌱☀️", a: "They make it from sunlight", w: ["They eat soil", "They drink milk"], why: "Leaves use sunlight, water and air to make sugar for food. That's called photosynthesis!" },
  { q: "Which part of a plant drinks water from the soil?", e: "🌱💧", a: "The roots", w: ["The flowers", "The leaves"], why: "Roots soak up water and minerals, and the stem carries them up to the leaves." },
  { q: "What does a plant need to make its own food?", e: "☀️💧", a: "Sunlight, water and air", w: ["Soil, candy and rocks", "Darkness and ice"], why: "Plants take in a gas from the air, water through their roots, and energy from sunlight." },
  { q: "When leaves make food, what gas do they give off that we breathe?", e: "🍃💨", a: "Oxygen", w: ["Smoke", "Helium"], why: "Plants release oxygen as they make food — the very air we need to breathe!" },
  { q: "Why are most leaves green?", e: "🍃🟢", a: "They're full of chlorophyll", w: ["They're painted", "They're not ripe yet"], why: "Chlorophyll is a green helper inside leaves that catches sunlight to make food." },
  { q: "A plant is kept in a dark closet for two weeks. What happens?", e: "🪴🌑", a: "It turns pale and weak", w: ["It grows extra green", "It grows flowers faster"], why: "Without sunlight, a plant can't make food, so it turns pale yellow and droopy." },
  { q: "What does a stem do?", e: "🌻📏", a: "Carries water to the leaves", w: ["Makes the seeds", "Catches bugs"], why: "A stem is like a straw and a backbone: it holds the plant up and moves water and food." },
  { q: "Why does a plant on a windowsill lean toward the window?", e: "🪴🪟", a: "To catch more light", w: ["To look outside", "To get away from water"], why: "Plants grow toward light so their leaves can catch more sunshine for making food." },
  { q: "A tree grows huge. Where does most of its wood come from?", e: "🌳🤔", a: "Air and water, made into food", w: ["Soil that it eats", "Rocks it crushes"], why: "Whoa — trees build their wood mostly from a gas in the air, plus water, using the Sun's energy!" },
  { q: "Can leaves make food in the dark of night?", e: "🍃🌙", a: "No, they need sunlight", w: ["Yes, extra fast", "Only in winter"], why: "Leaves make food only when there's light. At night, plants use the food they saved up." },
];
const PLANTS_WE_EAT: Pol[] = [
  { q: "When you crunch a carrot, which plant part are you eating?", e: "🥕😋", a: "A root", w: ["A flower", "A leaf"], why: "A carrot is a root that stored up food for the plant — and now it's a snack for you!" },
  { q: "Broccoli is a bunch of tiny… what?", e: "🥦🔍", a: "Flower buds", w: ["Roots", "Seeds"], why: "Each little green bump is a flower bud. If nobody picks it, broccoli blooms yellow!" },
  { q: "A tomato has seeds inside. So which plant part is it?", e: "🍅🌱", a: "A fruit", w: ["A root", "A leaf"], why: "Scientists call any part that holds seeds a fruit — so tomatoes, cucumbers and pumpkins are fruits!" },
  { q: "Is a potato a root?", e: "🥔🤔", a: "No, it's an underground stem", w: ["Yes, a big root", "No, it's a seed"], why: "Whoa — a potato is a swollen underground stem that stores food. Its “eyes” can sprout new plants!" },
  { q: "Lettuce and spinach are which plant part?", e: "🥬🥗", a: "Leaves", w: ["Roots", "Fruits"], why: "Leafy greens are leaves — the plant's own food factories!" },
  { q: "Peanuts grow in pods underground. Which plant part are they?", e: "🥜🌱", a: "Seeds", w: ["Roots", "Leaves"], why: "Peanuts are seeds in a pod — they aren't really nuts at all!" },
  { q: "Asparagus spears are which plant part?", e: "🌱🍽️", a: "Young stems", w: ["Roots", "Flowers"], why: "Asparagus spears are new stems poking up from the ground. They're picked before they leaf out!" },
  { q: "Beets and radishes grow underground. Which part are they?", e: "🟣🔴", a: "Roots", w: ["Flowers", "Fruits"], why: "Beets and radishes are roots, full of food the plant stored underground." },
  { q: "A pumpkin is packed with seeds. Which plant part is it?", e: "🎃🌱", a: "A fruit", w: ["A stem", "A root"], why: "A pumpkin grows from a flower and holds the seeds — so it's a giant fruit!" },
  { q: "Cinnamon comes from which part of a tree?", e: "🌳🍂", a: "The bark", w: ["The flowers", "The roots"], why: "Cinnamon is the dried inner bark of a cinnamon tree — it curls up into sticks as it dries!" },
];
const POLLINATORS: Pol[] = [
  { q: "Why do bees visit flowers?", e: "🐝🌸", a: "To drink sweet nectar", w: ["To take a nap", "To eat the petals"], why: "Bees sip nectar and get dusted with pollen, which they carry to the next flower." },
  { q: "What do pollinators carry from flower to flower?", e: "🐝✨", a: "Pollen", w: ["Water", "Leaves"], why: "Moving pollen between flowers helps them make seeds. Bees, butterflies and birds all help!" },
  { q: "Which of these animals is a pollinator?", e: "🌺👀", a: "A hummingbird", w: ["A shark", "A goldfish"], why: "Hummingbirds poke their long beaks into flowers for nectar and carry pollen as they go." },
  { q: "Why do many flowers have bright colors and sweet smells?", e: "🌷👃", a: "To invite pollinators", w: ["To scare away rain", "To keep warm"], why: "Colors and scents are like a sign that says “Free snacks here!” to bees and butterflies." },
  { q: "Can a bat be a pollinator?", e: "🦇🌙", a: "Yes, some visit flowers at night", w: ["No, never", "Only in winter"], why: "Some bats sip nectar at night and pollinate plants like bananas and agave!" },
  { q: "What would happen if there were no pollinators?", e: "🌼❓", a: "Many plants couldn't make seeds", w: ["Plants would grow faster", "Nothing would change"], why: "Most flowering plants need animal helpers to move their pollen and make seeds." },
  { q: "After a flower is pollinated, what does it turn into?", e: "🌸🍎", a: "A fruit with seeds", w: ["A leaf", "A root"], why: "The petals fall off, and the base of the flower swells into a fruit that holds seeds." },
  { q: "Which insect turns flower nectar into honey?", e: "🍯🐝", a: "Honeybees", w: ["Ladybugs", "Ants"], why: "Whoa — one honeybee makes only about one-twelfth of a teaspoon of honey in its whole life!" },
  { q: "A butterfly sips nectar through a long tube. What's it called?", e: "🦋🌸", a: "A proboscis", w: ["A tail", "A beak"], why: "A butterfly's proboscis uncurls like a party blower to sip nectar deep inside a flower." },
  { q: "How can you help pollinators?", e: "🌻🏡", a: "Plant flowers they like", w: ["Spray bugs away", "Pick every flower"], why: "Planting flowers and skipping bug sprays gives bees and butterflies food and a safe home." },
];
const SEED_JOURNEYS: Pol[] = [
  { q: "Why do seeds need to travel away from the parent plant?", e: "🌳🌱", a: "To find space and light", w: ["Because they're bored", "To find their friends"], why: "Seeds that land far away don't have to share water and sunlight with their parent plant." },
  { q: "A dandelion seed has a fluffy parachute. How does it travel?", e: "🌼💨", a: "It floats on the wind", w: ["It rolls downhill", "It swims"], why: "One puff, and dandelion seeds sail away on the wind — some travel for miles!" },
  { q: "A coconut can float. How might it travel?", e: "🥥🌊", a: "Across the ocean", w: ["On the wind", "In a bird's nest"], why: "Coconuts can float across the sea for months and sprout on a faraway beach!" },
  { q: "A burr sticks to a dog's fur. How does that help the plant?", e: "🐕🌰", a: "The dog carries its seeds", w: ["The dog eats it", "It keeps the dog warm"], why: "Burrs have tiny hooks that grab fur. They even gave people the idea for hook-and-loop straps!" },
  { q: "A bird eats a berry. How does that help the plant?", e: "🐦🍒", a: "It spreads the seeds", w: ["It hides the berry", "It waters the plant"], why: "The seeds pass through the bird and drop far away, ready to grow." },
  { q: "A maple seed spins as it falls. What does the spinning do?", e: "🍁🌀", a: "Helps it drift farther", w: ["Makes it grow faster", "Scares squirrels"], why: "Maple seeds twirl like helicopter blades, slowing their fall so the wind can carry them away." },
  { q: "How do squirrels help oak trees grow?", e: "🐿️🌰", a: "They bury acorns and forget some", w: ["They water the trees", "They eat all the acorns"], why: "Squirrels bury acorns for winter. The ones they forget can sprout into new oak trees!" },
  { q: "A seed is covered in tiny hooks. How does it most likely travel?", e: "🪝🐾", a: "Stuck to an animal's fur", w: ["Floating on water", "Blowing on the wind"], why: "Hooks and burrs grab onto passing animals for a free ride to a new home!" },
  { q: "Why do seeds have hard coats?", e: "🌰🛡️", a: "To protect the baby plant", w: ["To look shiny", "To make noise"], why: "A tough seed coat keeps the tiny plant inside safe until it's time to sprout." },
  { q: "What's inside a seed?", e: "🌰🔍", a: "A tiny plant and its food", w: ["A tiny bug", "Just air"], why: "Every seed holds a baby plant plus a packed lunch to help it start growing." },
];
const SEED_MOVERS: SortMany = {
  prompt: "How does each seed travel? Wind, water or animals?",
  bins: [{ id: "wind", label: "Wind", emoji: "🌬️" }, { id: "water", label: "Water", emoji: "🌊" }, { id: "animal", label: "Animals", emoji: "🐾" }],
  items: [
    ["Dandelion fluff", "wind", "🌼"], ["Maple helicopters", "wind", "🍁"], ["Milkweed silk", "wind", "☁️"], ["Cottonwood fluff", "wind", "🌳"], ["Thistle down", "wind", "💨"],
    ["Coconut", "water", "🥥"], ["Water lily seeds", "water", "🌸"], ["Mangrove pods", "water", "🌴"], ["Sea beans", "water", "🐚"], ["Lotus seed pods", "water", "🍃"],
    ["Burrs on a dog's fur", "animal", "🐕"], ["Berries eaten by birds", "animal", "🐦"], ["Acorns buried by squirrels", "animal", "🐿️"], ["Seeds stuck to your socks", "animal", "🧦"], ["Cherry pits a bird drops", "animal", "🍒"],
  ],
};

// ── Water Cycle Current ───────────────────────────────────────────────────────────────────
const WATER_TRIP: [string, string][] = [["The Sun warms the ocean", "☀️"], ["Water evaporates into vapor", "💨"], ["Vapor cools into cloud drops", "☁️"], ["Rain or snow falls down", "🌧️"], ["Water collects in lakes and seas", "🌊"]];
const CYCLE_STEPS: [string, string][] = [["Evaporation", "💨"], ["Condensation", "☁️"], ["Precipitation", "🌧️"], ["Collection", "🌊"]];
const CYCLE_WORDS: MatchBank = [["Evaporation", "Liquid water turns into gas"], ["Condensation", "Water vapor turns into drops"], ["Precipitation", "Rain, snow, sleet or hail"], ["Collection", "Water gathers in lakes and seas"], ["Water vapor", "Water as an invisible gas"], ["Cloud", "Tiny water drops or ice bits"], ["Groundwater", "Water soaked into the ground"]];
const WATER_STEPS: SortMany = {
  prompt: "Which part of the water cycle is happening?",
  bins: [{ id: "evap", label: "Evaporation", emoji: "💨" }, { id: "cond", label: "Condensation", emoji: "☁️" }, { id: "precip", label: "Precipitation", emoji: "🌧️" }, { id: "collect", label: "Collection", emoji: "🌊" }],
  items: [
    ["A puddle dries up", "evap", "☀️"], ["Wet hair dries", "evap", "💇"], ["Wet clothes dry on a line", "evap", "👕"], ["A wet sidewalk dries", "evap", "🚶"],
    ["Drops on a cold glass", "cond", "🥛"], ["A foggy bathroom mirror", "cond", "🪞"], ["Dew on morning grass", "cond", "🌿"], ["Foggy breath on a cold day", "cond", "🥶"],
    ["Rain falling", "precip", "☔"], ["Snowflakes falling", "precip", "❄️"], ["Hail bouncing", "precip", "🧊"], ["Sleet hitting a window", "precip", "🌨️"],
    ["Rain filling a lake", "collect", "🏞️"], ["A river flowing to the sea", "collect", "🏔️"], ["Water soaking into soil", "collect", "🌱"], ["Rain filling a bucket", "collect", "🪣"],
  ],
};
const WATER_FACTS: Pol[] = [
  { q: "What is a cloud made of?", e: "☁️🔍", a: "Tiny drops of water or ice", w: ["Cotton and smoke", "Invisible water vapor"], why: "Clouds are billions of tiny water droplets or ice crystals floating in the air." },
  { q: "What makes water evaporate from the ocean?", e: "☀️🌊", a: "Heat from the Sun", w: ["Light from the Moon", "Fish blowing bubbles"], why: "The Sun's energy warms water and turns some of it into water vapor that rises into the sky." },
  { q: "Is the water you drink today brand-new water?", e: "🚰🦕", a: "No, it's been used for ages", w: ["Yes, it was made today", "Yes, clouds make new water"], why: "Earth keeps using the same water over and over — your glass might hold water a dinosaur drank!" },
  { q: "Why does rain fall from clouds?", e: "🌧️⬇️", a: "The drops get too heavy", w: ["Clouds get tired", "The Sun pushes it down"], why: "Tiny cloud drops bump together and grow. When they get too heavy to float, they fall as rain." },
  { q: "When water vapor cools and turns back into drops, it's called…", e: "💨💧", a: "Condensation", w: ["Evaporation", "Collection"], why: "Condensation makes clouds in the sky — and the drops on a cold glass of juice!" },
  { q: "Rain, snow, sleet and hail are all kinds of…", e: "🌨️☔", a: "Precipitation", w: ["Evaporation", "Condensation"], why: "Precipitation is any water that falls from clouds to the ground." },
  { q: "Where is most of Earth's water?", e: "🌊🌍", a: "In the oceans", w: ["In the clouds", "In rivers"], why: "About 97 out of every 100 drops of water on Earth are in the salty oceans!" },
  { q: "Why is it called the water CYCLE?", e: "🔄💧", a: "It goes around and around", w: ["Water rides bicycles", "It only happens once"], why: "Water keeps moving in a loop — up into the sky, down as rain, and around again, forever!" },
  { q: "Does water evaporate from puddles and lakes, not just oceans?", e: "💧☀️", a: "Yes, from anywhere with water", w: ["No, only from oceans", "Only at night"], why: "Water evaporates from oceans, lakes, puddles — and even from plant leaves!" },
  { q: "What happens to mountain snow in the spring?", e: "🏔️🌷", a: "It melts and flows to rivers", w: ["It flies to the Moon", "It turns into rock"], why: "Melting snow trickles into streams and rivers that carry the water back toward the sea." },
  { q: "What is fog?", e: "🌫️🚶", a: "A cloud near the ground", w: ["Smoke from a fire", "Dust from the road"], why: "Fog is a cloud that forms down low — you can walk right through it!" },
  { q: "Do plants play a part in the water cycle?", e: "🌳💨", a: "Yes, leaves give off water vapor", w: ["No, plants only drink", "Only cactus plants do"], why: "Plants pull water up from the soil and let some out through tiny holes in their leaves." },
];

// ── Food Chain Channel ────────────────────────────────────────────────────────────────────
const EATERS: SortMany = {
  prompt: "Plant eater, meat eater, or both?",
  bins: [{ id: "herb", label: "Herbivore (plants)", emoji: "🌿" }, { id: "carn", label: "Carnivore (meat)", emoji: "🍖" }, { id: "omni", label: "Omnivore (both)", emoji: "🍽️" }],
  items: [
    ["Rabbit", "herb", "🐇"], ["Cow", "herb", "🐄"], ["Deer", "herb", "🦌"], ["Giraffe", "herb", "🦒"], ["Elephant", "herb", "🐘"], ["Koala", "herb", "🐨"], ["Zebra", "herb", "🦓"],
    ["Lion", "carn", "🦁"], ["Shark", "carn", "🦈"], ["Eagle", "carn", "🦅"], ["Wolf", "carn", "🐺"], ["Snake", "carn", "🐍"], ["Owl", "carn", "🦉"], ["Tiger", "carn", "🐅"],
    ["Black bear", "omni", "🐻"], ["Raccoon", "omni", "🦝"], ["Pig", "omni", "🐖"], ["Chicken", "omni", "🐔"], ["Skunk", "omni", "🦨"], ["People", "omni", "🧑"],
  ],
};
const FOOD_ROLES: SortMany = {
  prompt: "Producer, consumer or decomposer?",
  bins: [{ id: "producer", label: "Producer", emoji: "☀️" }, { id: "consumer", label: "Consumer", emoji: "😋" }, { id: "decomposer", label: "Decomposer", emoji: "♻️" }],
  items: [
    ["Grass", "producer", "🌾"], ["Oak tree", "producer", "🌳"], ["Sunflower", "producer", "🌻"], ["Algae", "producer", "🌿"], ["Cactus", "producer", "🌵"], ["Pine tree", "producer", "🌲"],
    ["Rabbit", "consumer", "🐇"], ["Fox", "consumer", "🦊"], ["Hawk", "consumer", "🦅"], ["Deer", "consumer", "🦌"], ["Frog", "consumer", "🐸"], ["Grasshopper", "consumer", "🦗"],
    ["Earthworm", "decomposer", "🪱"], ["Mushroom", "decomposer", "🍄"], ["Bacteria", "decomposer", "🦠"], ["Bread mold", "decomposer", "🍞"], ["Fungus on a log", "decomposer", "🪵"],
  ],
};
const CHAIN_MEADOW: [string, string][] = [["The Sun shines", "☀️"], ["Grass makes food", "🌾"], ["A rabbit eats the grass", "🐇"], ["A fox eats the rabbit", "🦊"]];
const CHAIN_OCEAN: [string, string][] = [["The Sun shines", "☀️"], ["Algae make food", "🌿"], ["A small fish eats the algae", "🐟"], ["A big fish eats the small fish", "🐠"]];
const CHAIN_FOREST: [string, string][] = [["The Sun shines", "☀️"], ["A leaf makes food", "🍃"], ["A caterpillar munches the leaf", "🐛"], ["A bird eats the caterpillar", "🐦"]];
const CHAIN_FACTS: Pol[] = [
  { q: "Where does almost all the energy in a food chain start?", e: "☀️🔗", a: "The Sun", w: ["The soil", "The fox"], why: "Plants catch the Sun's energy to make food, and that energy passes to the animals that eat." },
  { q: "What is a producer?", e: "🌿☀️", a: "A living thing that makes food", w: ["An animal that hunts", "A rock in the soil"], why: "Plants and algae are producers — they make their own food from sunlight." },
  { q: "What is a consumer?", e: "🐇😋", a: "A living thing that eats food", w: ["A plant that makes food", "A cloud that rains"], why: "Animals are consumers — they get energy by eating plants or other animals." },
  { q: "In a chain of grass, rabbit and fox, which one is the producer?", e: "🌾🐇", a: "The grass", w: ["The rabbit", "The fox"], why: "Grass is the producer — it makes food from sunlight. The rabbit and the fox are consumers." },
  { q: "An animal that eats only plants is called a…", e: "🐄🌿", a: "Herbivore", w: ["Carnivore", "Omnivore"], why: "Herbivores, like cows and rabbits, eat only plants. “Herb” is an old word for plant!" },
  { q: "An animal that eats both plants and animals is called an…", e: "🐻🍓", a: "Omnivore", w: ["Herbivore", "Carnivore"], why: "Omnivores, like bears, raccoons and people, eat plants and animals. “Omni” means all!" },
  { q: "An animal that eats only other animals is called a…", e: "🦁🍖", a: "Carnivore", w: ["Herbivore", "Omnivore"], why: "Carnivores, like lions and sharks, hunt other animals for food. “Carn” means meat!" },
  { q: "What would happen to foxes if all the rabbits disappeared?", e: "🦊❓", a: "They'd have less food", w: ["Nothing would change", "They'd grow bigger"], why: "Every link in a food chain matters. If one link disappears, the animals that eat it go hungry." },
  { q: "If all the grass dried up, who would go hungry first?", e: "🌾🥀", a: "The rabbits", w: ["The Sun", "The rocks"], why: "Rabbits eat grass, so they'd go hungry first — and then the foxes that eat rabbits." },
  { q: "A hawk eats a snake that ate a mouse. What is the hawk?", e: "🦅🐍", a: "A consumer", w: ["A producer", "A decomposer"], why: "The hawk gets energy by eating other animals, so it's a consumer — near the top of this chain." },
  { q: "Which animal is a predator?", e: "🦉🐭", a: "An owl hunting a mouse", w: ["A cow eating grass", "A tree growing tall"], why: "A predator hunts other animals for food. The animal it hunts, like the mouse, is called prey." },
];
const DECOMPOSERS: Pol[] = [
  { q: "What do decomposers do?", e: "🍄🍂", a: "Break down dead things", w: ["Make food from sunlight", "Hunt for big animals"], why: "Decomposers like worms, mushrooms and bacteria turn dead plants and animals back into soil." },
  { q: "Which of these is a decomposer?", e: "🍄🔍", a: "A mushroom", w: ["A hawk", "A rabbit"], why: "Mushrooms are fungi. They feed on dead logs and leaves and turn them into rich soil." },
  { q: "Why are decomposers so important?", e: "♻️🌱", a: "They recycle food into soil", w: ["They make it rain", "They scare away hawks"], why: "Without decomposers, dead leaves would pile up forever, and soil would run out of plant food." },
  { q: "What does an earthworm eat?", e: "🪱🍂", a: "Dead leaves and soil", w: ["Live birds", "Rocks"], why: "Earthworms munch dead leaves in the soil, and their droppings, called castings, feed plants." },
  { q: "Fuzzy mold grows on old bread. What is the mold?", e: "🍞🔍", a: "A decomposer", w: ["A producer", "A predator"], why: "Mold is a fungus that breaks down old food — that's why bread gets fuzzy if you wait too long!" },
  { q: "What happens to a fallen log in the forest after many years?", e: "🪵🍄", a: "It rots into soil", w: ["It turns into a rock", "It stands back up"], why: "Fungi, bacteria and bugs slowly break the log down until it becomes rich, dark soil." },
  { q: "Bacteria are decomposers, too. How could you see them?", e: "🦠🔬", a: "With a microscope", w: ["With sunglasses", "With a flashlight"], why: "Bacteria are so tiny that thousands could fit on the dot over an i!" },
  { q: "Food scraps go in a compost pile. What do decomposers make?", e: "🍌🌱", a: "Rich soil for gardens", w: ["Plastic", "New bananas"], why: "In compost, decomposers turn banana peels and leaves into dark, healthy soil!" },
  { q: "Are decomposers part of the food chain?", e: "🔗🍄", a: "Yes, they clean up the leftovers", w: ["No, they just make messes", "Only in the ocean"], why: "Decomposers finish every food chain, returning nutrients to the soil for plants to use again." },
];

// ── Magnet Marsh ──────────────────────────────────────────────────────────────────────────
const MAGNET_SORT: SortBank = {
  prompt: "Will a magnet pull on it? Sort them!",
  bins: ["Magnetic", "Not magnetic", "🧲", "🚫"],
  items: [
    ["A paper clip", 1, "📎"], ["An iron nail", 1, "🔨"], ["A safety pin", 1, "🧷"], ["A steel soup can", 1, "🥫"], ["Iron filings", 1, "⚙️"], ["A steel bolt", 1, "🔩"], ["A cast-iron pan", 1, "🍳"], ["Steel wool", 1, "🧽"],
    ["A wooden block", 0, "🪵"], ["A plastic cup", 0, "🥤"], ["A glass marble", 0, "🔮"], ["A rubber duck", 0, "🦆"], ["Aluminum foil", 0, "✨"], ["A sheet of paper", 0, "📄"], ["A penny", 0, "🪙"], ["A gold ring", 0, "💍"],
  ],
};
const POLES: Pol[] = [
  { q: "Every magnet has two ends with special names. What are they?", e: "🧲🔍", a: "North and south poles", w: ["Top and bottom wheels", "Left and right hands"], why: "Every magnet has a north pole and a south pole — even a tiny one!" },
  { q: "You push a north pole toward a south pole. What happens?", e: "🧲➡️", a: "They pull together", w: ["They push apart", "Nothing happens"], why: "Opposite poles attract! North and south snap together." },
  { q: "Two north poles face each other. What happens?", e: "🧲↔️", a: "They push apart", w: ["They snap together", "They melt"], why: "Same poles repel — two norths (or two souths) push each other away." },
  { q: "You try to push two south poles together. What do you feel?", e: "🧲✋", a: "A push away", w: ["A strong pull", "Nothing at all"], why: "Same poles repel. It feels like an invisible cushion pushing back!" },
  { q: "What do we call it when magnets push each other away?", e: "🧲💨", a: "Repel", w: ["Attract", "Melt"], why: "Repel means push away. Attract means pull together." },
  { q: "You cut a bar magnet in half. What do you get?", e: "🧲✂️", a: "Two smaller magnets", w: ["Two pieces with no poles", "One north, one south piece"], why: "Each half becomes a whole new magnet with its own north and south pole!" },
  { q: "A compass needle is a tiny magnet. Which way does it point?", e: "🧭⬆️", a: "North", w: ["Toward the Sun", "Toward the ground"], why: "Earth acts like a giant magnet, so a compass needle swings to point north." },
  { q: "Where is a magnet's pull the strongest?", e: "🧲📎", a: "At its poles", w: ["In the middle", "The same everywhere"], why: "A magnet's force is strongest at its ends — that's where paper clips pile up!" },
  { q: "Two magnets snap together. Which ends are touching?", e: "🧲🤝", a: "A north and a south", w: ["Two norths", "Two souths"], why: "When magnets snap together, opposite poles are meeting: north to south." },
  { q: "Is our whole Earth a magnet?", e: "🌍🧲", a: "Yes, a giant one", w: ["No, never", "Only the Moon is"], why: "Deep inside Earth, moving melted iron makes our planet act like an enormous magnet!" },
  { q: "Can a magnet pull something without touching it?", e: "🧲✨", a: "Yes, from a short distance", w: ["No, it must touch", "Only underwater"], why: "Magnetic force works across empty space — a magnet can tug a paper clip from a short distance." },
];
const MAGNET_POWER: Pol[] = [
  { q: "Which metal do magnets attract?", e: "🧲🔩", a: "Iron", w: ["Aluminum", "Gold"], why: "Magnets pull on iron and steel, which is mostly iron. Aluminum and gold aren't magnetic." },
  { q: "Will a magnet pick up an aluminum soda can?", e: "🥤🧲", a: "No, aluminum isn't magnetic", w: ["Yes, all metal is magnetic", "Yes, if it's empty"], why: "Not all metals are magnetic! Steel soup cans stick to magnets, but aluminum cans don't." },
  { q: "Can a magnet pull a paper clip through a sheet of paper?", e: "📄📎", a: "Yes, magnetism goes through", w: ["No, paper blocks it", "Only if the paper is wet"], why: "Magnetic force passes right through paper — that's how fridge magnets hold up drawings!" },
  { q: "A paper clip is in a cup of water. Can a magnet pull it up the side?", e: "🥤💧", a: "Yes, through the water and cup", w: ["No, water stops magnets", "No, magnets hate water"], why: "Magnetism works through water, plastic and glass — you can drag a paper clip out without getting wet!" },
  { q: "Are all metals magnetic?", e: "🪙🔩", a: "No, mostly iron and steel", w: ["Yes, every metal", "Only shiny metals"], why: "Copper, gold, silver and aluminum don't stick. Iron, steel, nickel and cobalt do!" },
  { q: "Will a magnet pick up a penny?", e: "🪙🧲", a: "No, pennies aren't iron", w: ["Yes, all coins stick", "Only new pennies"], why: "Pennies are made of zinc and copper, so a magnet won't pick them up." },
  { q: "How can a fridge magnet hold up a drawing?", e: "🖍️🧲", a: "It pulls on the steel door", w: ["It's sticky like tape", "The paper is magnetic"], why: "Many fridge doors have steel inside. The magnet pulls on it right through the paper." },
  { q: "Which of these would a magnet pick up?", e: "🧲🤔", a: "A steel safety pin", w: ["A rubber band", "A wooden spoon"], why: "Safety pins are made of steel, which is mostly iron — so magnets pull on them!" },
  { q: "What happens as a magnet moves farther from a paper clip?", e: "🧲📏", a: "Its pull gets weaker", w: ["Its pull gets stronger", "It changes color"], why: "Magnetic force gets weaker with distance. Get close, and the paper clip jumps!" },
  { q: "Pins spilled all over the floor! How could a magnet help?", e: "📌🧲", a: "It could pick them up fast", w: ["It could melt them", "It could hide them"], why: "A magnet grabs steel pins in a snap — much safer than picking them up with your fingers!" },
  { q: "Junkyards use giant magnets to lift old cars. Why does that work?", e: "🚗🧲", a: "Cars have lots of steel", w: ["Cars are made of plastic", "Magnets love wheels"], why: "Giant electromagnets lift steel cars — then drop them when the power turns off!" },
];
const MAGNET_WORDS: MatchBank = [["Attract", "Pull together"], ["Repel", "Push apart"], ["Poles", "A magnet's two ends"], ["Compass", "A tool that points north"], ["Magnetic", "Pulled by a magnet"], ["Force", "A push or a pull"]];

// ── Sun, Earth & Moon Sound ───────────────────────────────────────────────────────────────
const SUN_EARTH: Pol[] = [
  { q: "Why do we have day and night?", e: "🌍🌗", a: "Earth spins around", w: ["The Sun goes to sleep", "Clouds cover the Sun"], why: "Earth spins once a day. When your side faces the Sun it's day; when it faces away, it's night." },
  { q: "How long does Earth take to spin around once?", e: "🌍🔄", a: "One day (24 hours)", w: ["One week", "One year"], why: "One full spin of Earth takes about 24 hours — that's one day and one night." },
  { q: "How long does Earth take to travel all the way around the Sun?", e: "🌍☀️", a: "One year", w: ["One day", "One month"], why: "Earth circles the Sun once a year — about 365 days. Every birthday, you've ridden one lap!" },
  { q: "The Sun seems to move across the sky each day. What's really moving?", e: "🌅🌍", a: "Earth, spinning", w: ["The Sun, racing around", "The clouds"], why: "The Sun only looks like it moves. Really, Earth is spinning us toward it and away from it!" },
  { q: "Where does the Sun rise in the morning?", e: "🌄🧭", a: "In the east", w: ["In the west", "In the north"], why: "Earth spins toward the east, so the Sun rises in the east and sets in the west." },
  { q: "When it's daytime here, what is it on the other side of Earth?", e: "🌏🌙", a: "Nighttime", w: ["Daytime, too", "Lunchtime everywhere"], why: "Only half of Earth faces the Sun at a time — so somewhere, it's always night!" },
  { q: "Why does your shadow move during the day?", e: "👤☀️", a: "The Sun seems to move", w: ["Your shadow gets bored", "Clouds push it"], why: "As Earth spins, the Sun's place in our sky changes, so shadows shift and stretch." },
  { q: "Is the Sun a star?", e: "☀️⭐", a: "Yes, the closest star to us", w: ["No, it's a planet", "No, it's a giant lamp"], why: "The Sun is a star — a giant ball of hot, glowing gas. It looks big because it's close." },
  { q: "Why do the other stars look so tiny?", e: "⭐🔭", a: "They are very far away", w: ["They're tiny pebbles", "They're little lightbulbs"], why: "Many stars are as big as the Sun or even bigger — they're just super far away!" },
  { q: "Why can't we see stars in the daytime?", e: "☀️👀", a: "The Sun is too bright", w: ["The stars go away", "Stars sleep in the day"], why: "The stars are still there in the day — the Sun's bright light just hides them!" },
  { q: "About how many Earths could fit inside the Sun?", e: "☀️🤯", a: "About 1 million", w: ["About 10", "Just 2"], why: "The Sun is so huge that about 1.3 million Earths could fit inside it!" },
];
const MOON_FACTS: Pol[] = [
  { q: "Where does moonlight come from?", e: "🌕✨", a: "Sunlight bouncing off the Moon", w: ["A fire on the Moon", "Lights on the Moon"], why: "The Moon makes no light of its own. It shines because sunlight bounces off it." },
  { q: "What does the Moon travel around?", e: "🌙🌍", a: "Earth", w: ["Mars", "The stars"], why: "The Moon circles Earth — and the word “month” comes from the word “moon”!" },
  { q: "About how long does the Moon take to go around Earth?", e: "🌙📅", a: "About a month", w: ["About a day", "About a year"], why: "The Moon takes about 27 days to circle Earth, and about 29 and a half days to show all its phases." },
  { q: "Why does the Moon seem to change shape?", e: "🌒🌕", a: "We see different sunlit parts", w: ["Earth's shadow covers it", "It shrinks and grows"], why: "Half the Moon is always lit by the Sun. As it circles us, we see more or less of that half." },
  { q: "When the Moon looks like a full, bright circle, what is it called?", e: "🌕😮", a: "A full moon", w: ["A new moon", "A crescent moon"], why: "At full moon, the whole sunlit side of the Moon is facing us." },
  { q: "During a new moon, what do we see?", e: "🌑👀", a: "Almost nothing — it's dark", w: ["A big, bright circle", "Exactly half a moon"], why: "At new moon, the Moon's sunlit side faces away from us, so it's nearly impossible to see." },
  { q: "A thin, curved sliver of Moon is called a…", e: "🌒🍌", a: "Crescent moon", w: ["Full moon", "New moon"], why: "A crescent is a thin, banana-shaped slice of the Moon's sunlit side." },
  { q: "Does the Moon really change its shape?", e: "🌕🤔", a: "No, it's always round", w: ["Yes, every night", "Yes, it breaks apart"], why: "The Moon is always a round ball — only the part we can see lit up changes." },
  { q: "Astronauts' footprints are still on the Moon. Why haven't they blown away?", e: "👣🌕", a: "There's no wind or rain", w: ["Someone guards them", "They're painted on"], why: "Astronauts first walked on the Moon in 1969. With no wind or rain, their footprints stay put!" },
  { q: "Can you ever see the Moon in the daytime?", e: "🌙☀️", a: "Yes, on many days!", w: ["No, never", "Only on birthdays"], why: "The Moon is up during the day for much of each month — look for it on a clear day!" },
  { q: "How big is the Moon compared to Earth?", e: "🌕🌍", a: "Smaller than Earth", w: ["Bigger than Earth", "The same size"], why: "Whoa — about 50 Moons could fit inside Earth!" },
];
const MOON_PHASES: [string, string][] = [["New moon (dark)", "🌑"], ["Thin crescent", "🌒"], ["Half moon", "🌓"], ["More than half", "🌔"], ["Full moon", "🌕"]];
const SEASON_CIRCLE: [string, string][] = [["Spring", "🌷"], ["Summer", "☀️"], ["Fall", "🍂"], ["Winter", "⛄"]];
const SEASONS: Pol[] = [
  { q: "Why does Earth have seasons?", e: "🌍🍂", a: "Earth is tilted", w: ["Earth gets closer to the Sun", "The Sun gets bigger"], why: "Earth leans to one side. When our half tips toward the Sun it's summer; tipped away, it's winter." },
  { q: "What are summer days like?", e: "☀️⏰", a: "Long, with lots of sunlight", w: ["Short and dark", "Exactly like winter days"], why: "In summer, the Sun rises early and sets late — lots of daylight for playing!" },
  { q: "When it's summer in the United States, what season is it in Australia?", e: "🌏❄️", a: "Winter", w: ["Summer, too", "Spring"], why: "Earth's tilt gives the top and bottom halves of Earth opposite seasons at the same time!" },
  { q: "Where is the Sun in the sky on a winter day?", e: "⛄☀️", a: "Lower in the sky", w: ["Right overhead", "Out all night"], why: "In winter, the Sun takes a low path across the sky, so its light is weaker and days are short." },
  { q: "Which season comes after winter?", e: "⛄🌷", a: "Spring", w: ["Summer", "Fall"], why: "The seasons repeat in a pattern: spring, summer, fall, winter — then spring again!" },
  { q: "Earth is closest to the Sun in January. What season is that in North America?", e: "🌍🧣", a: "Winter", w: ["Summer", "Spring"], why: "Seasons come from Earth's tilt, not its distance — North America has winter when Earth is closest!" },
  { q: "What do many trees do in the fall?", e: "🍂🌳", a: "Drop their leaves", w: ["Grow new flowers", "Turn into cactuses"], why: "Many trees drop their leaves in fall to rest and save water through the cold winter." },
  { q: "Why do some animals sleep through the winter?", e: "🦇💤", a: "Food is hard to find", w: ["Summer is boring", "To grow wings"], why: "Food is scarce in winter, so animals like bats and groundhogs hibernate — they rest deeply until spring." },
  { q: "Which season has the shortest days?", e: "🌙⛄", a: "Winter", w: ["Summer", "Spring"], why: "Winter has the fewest hours of daylight — sometimes it's dark before dinner!" },
  { q: "Do the seasons come in the same order every year?", e: "🔄📅", a: "Yes, it's a pattern", w: ["No, they're random", "Only every 10 years"], why: "Earth circles the Sun the same way every year, so the seasons repeat in the same order." },
];
const SPACE_WORDS: MatchBank = [["Rotate", "Spin like a top"], ["Orbit", "Travel around something"], ["Star", "A giant ball of glowing gas"], ["Moon", "Our rocky neighbor in space"], ["Phases", "The Moon's changing shapes"], ["Axis", "The line Earth spins around"], ["Planet", "A big world, like Earth or Mars"]];

// ═══ The voyage ════════════════════════════════════════════════════════════════════════════
export const MIDDLE_WORLDS: WorldDef[] = [
  // 1st grade
  { id: "life-cycles", title: "Life Cycle Lagoon", emoji: "🦋", grade: "1", items: 6, blurb: "Eggs, tadpoles, caterpillars and seeds — watch living things grow and change!",
    talk: ["Which life cycle surprised you most — the butterfly's, the frog's, the chicken's or the bean's?", "How have you changed since you were a baby? What will change next?"],
    challenge: "With a grown-up, soak a dry bean overnight and tuck it in a damp paper towel inside a clear bag. Check it every day — which part grows out first?",
    stages: [
      { title: "Caterpillar to Butterfly", emoji: "🐛", topics: [orderT("butterfly-stages", "Put the butterfly's life cycle in order", BUTTERFLY_CYCLE, true, s), politeT("caterpillar-tadpole-changes", METAMORPHOSIS, true, s)], levels: 2 },
      { title: "Tadpole to Frog", emoji: "🐸", topics: [orderT("frog-stages", "Put the frog's life cycle in order", FROG_CYCLE, true, s), politeT("caterpillar-tadpole-changes", METAMORPHOSIS, true, s), matchT("baby-animal-match", "Match each animal to its baby", BABY_ANIMALS, true, s)], levels: 2 },
      { title: "Eggs and Seeds", emoji: "🥚", topics: [orderT("chicken-stages", "Put the chicken's life cycle in order", CHICKEN_CYCLE, true, s), orderT("bean-plant-stages", "Put the bean plant's life cycle in order", BEAN_CYCLE, true, s), politeT("eggs-seeds-growing", GROWING_UP, true, s)], levels: 2 },
      { title: "Baby Animal Match", emoji: "🐣", topics: [matchT("baby-animal-match", "Match each animal to its baby", BABY_ANIMALS, true, s), politeT("eggs-seeds-growing", GROWING_UP, true, s)], levels: 1 },
    ] },
  { id: "animal-groups", title: "Animal Group Gulf", emoji: "🐾", grade: "1", items: 6, blurb: "Fur, feathers, scales or six legs? Sort animals the way scientists do.",
    talk: ["Why is a whale a mammal and not a fish? What clues tell us?", "If you invented a brand-new animal, which group would it belong to?"],
    challenge: "Go on a bug hunt outside with a grown-up. Count the legs: 6 means insect, 8 means spider! (Look, don't touch.)",
    stages: [
      { title: "Fur, Feathers, Fins", emoji: "🪶", topics: [sortManyT("mammal-bird-fish-reptile", CLASS_SORT, true, 2, s), politeT("animal-group-clues", GROUP_CLUES, true, s)], levels: 2 },
      { title: "Six Legs or Eight?", emoji: "🐞", topics: [sortManyT("amphibian-insect-arachnid", CRAWLY_SORT, true, 2, s), politeT("animal-group-clues", GROUP_CLUES, true, s)], levels: 2 },
      { title: "Body Coverings", emoji: "🧥", topics: [matchT("animal-body-coverings", "Match each animal group to what covers its body", COVERINGS, true, s), politeT("animal-group-clues", GROUP_CLUES, true, s), sortManyT("mammal-bird-fish-reptile", CLASS_SORT, true, 2, s)], levels: 1 },
      { title: "Tricky Animals", emoji: "🦇", topics: [politeT("tricky-animal-groups", TRICKY_ANIMALS, true, s), matchT("animal-body-coverings", "Match each animal group to what covers its body", COVERINGS, true, s)], levels: 2 },
    ] },
  { id: "habitats", title: "Habitat Harbor", emoji: "🏝️", grade: "1", items: 6, blurb: "Deserts, oceans, rainforests and ice — every animal has a home that fits.",
    talk: ["If you were an animal, which habitat would you pick? What would you need to live there?", "What makes our home a good habitat for our family?"],
    challenge: "Explore your yard or a park with a grown-up. Find 3 living things and name one thing each one gets from its habitat.",
    stages: [
      { title: "Where Do I Live?", emoji: "🗺️", topics: [matchT("animal-habitat-match", "Match each animal to its habitat", ANIMAL_HOMES, true, s), politeT("habitat-basics", HABITAT_FACTS, true, s)], levels: 2 },
      { title: "Hot, Cold, Wet, Dry", emoji: "🌡️", topics: [sortManyT("desert-ocean-arctic-rainforest", HABITAT_SORT, true, 2, s), politeT("habitat-basics", HABITAT_FACTS, true, s)], levels: 2 },
      { title: "Built to Survive", emoji: "🐪", topics: [politeT("habitat-adaptations", ADAPTATIONS, true, s), matchT("animal-habitat-match", "Match each animal to its habitat", ANIMAL_HOMES, true, s)], levels: 2 },
      { title: "Habitat Hop", emoji: "🌴", topics: [sortManyT("desert-ocean-arctic-rainforest", HABITAT_SORT, true, 2, s), politeT("habitat-adaptations", ADAPTATIONS, true, s)], levels: 1 },
    ] },
  { id: "matter", title: "Matter Marina", emoji: "🧊", grade: "1", items: 6, blurb: "Solids, liquids and gases — and how heating and cooling change them.",
    talk: ["Can you find a solid, a liquid and a gas in our kitchen?", "What changes when we cook food? Can any of those changes be undone?"],
    challenge: "Put an ice cube on a plate and check it every 10 minutes. What is it turning into? Leave the water out for a day — where does it go?",
    stages: [
      { title: "Solid, Liquid, Gas", emoji: "🧊", topics: [sortManyT("solid-liquid-gas-sort", MATTER_SORT, true, 2, s), politeT("matter-shape-and-space", MATTER_PROPS, true, s)], levels: 2 },
      { title: "Heat It Up, Cool It Down", emoji: "🌡️", topics: [sortT("heating-or-cooling", HEAT_SORT, true, 6, s), politeT("melt-freeze-evaporate", HEAT_COOL, true, s)], levels: 2 },
      { title: "Melt, Freeze, Float Away", emoji: "♨️", topics: [orderT("ice-to-vapor-steps", "An ice cube keeps getting hotter. Put the changes in order", ICE_TO_VAPOR, true, s), politeT("melt-freeze-evaporate", HEAT_COOL, true, s), politeT("matter-shape-and-space", MATTER_PROPS, true, s)], levels: 2 },
      { title: "Matter Mix-Up", emoji: "🧪", topics: [sortManyT("solid-liquid-gas-sort", MATTER_SORT, true, 2, s), sortT("heating-or-cooling", HEAT_SORT, true, 6, s), politeT("melt-freeze-evaporate", HEAT_COOL, true, s)], levels: 1 },
    ] },
  { id: "sound-light", title: "Sound & Light Lighthouse", emoji: "💡", grade: "1", items: 6, blurb: "Buzzing vibrations, high and low sounds, light, and the shadows that follow you.",
    talk: ["What sounds can you hear right now? Which are high and which are low?", "The Moon doesn't make its own light — so why does it look so bright?"],
    challenge: "Make a shadow-puppet show with a flashlight and your hands. Move the light closer and farther away. What happens to the shadows?",
    stages: [
      { title: "Good Vibrations", emoji: "🥁", topics: [politeT("sound-from-vibrations", SOUND_POL, true, s), sortT("high-or-low-pitch", PITCH_SORT, true, 6, s)], levels: 2 },
      { title: "Light the Way", emoji: "🔦", topics: [sortT("light-source-or-not", LIGHT_SORT, true, 6, s), politeT("shadows-and-reflections", LIGHT_POL, true, s)], levels: 2 },
      { title: "Shadow Play", emoji: "👤", topics: [sortManyT("transparent-translucent-opaque", LIGHT_THROUGH, true, 2, s), politeT("shadows-and-reflections", LIGHT_POL, true, s)], levels: 2 },
      { title: "Lighthouse Lookout", emoji: "🔆", topics: [sortT("high-or-low-pitch", PITCH_SORT, true, 6, s), sortManyT("transparent-translucent-opaque", LIGHT_THROUGH, true, 2, s), politeT("sound-from-vibrations", SOUND_POL, true, s)], levels: 1 },
    ] },
  // 2nd grade
  { id: "earth-materials", title: "Rock & Soil Reef", emoji: "🪨", grade: "2", items: 6, blurb: "Rocks, sand, clay and soil — plus fossils that tell stories from long ago.",
    talk: ["What things in our house were made from rocks, sand or clay?", "If you found a fossil, what would you want it to be? What could it teach us?"],
    challenge: "With a grown-up, put some soil and water in a jar, close the lid tight and shake it. Let it sit overnight. What layers do you see?",
    stages: [
      { title: "Rocks Rock!", emoji: "🪨", topics: [politeT("rocks-sand-clay-soil", ROCKS_SOIL, true, s), matchT("earth-material-uses", "Match each Earth material to how people use it", EARTH_USES, true, s)], levels: 2 },
      { title: "Dig Into Soil", emoji: "🪱", topics: [politeT("rocks-sand-clay-soil", ROCKS_SOIL, true, s), sortT("nature-or-human-made", EARTH_OR_MADE, true, 6, s)], levels: 2 },
      { title: "Fossil Hunters", emoji: "🦴", topics: [orderT("how-fossils-form", "How does a fossil form? Put the steps in order", FOSSIL_STEPS, true, s), politeT("fossil-basics", FOSSILS, true, s)], levels: 2 },
      { title: "Earth Detectives", emoji: "🔍", topics: [matchT("earth-material-uses", "Match each Earth material to how people use it", EARTH_USES, true, s), politeT("fossil-basics", FOSSILS, true, s), sortT("nature-or-human-made", EARTH_OR_MADE, true, 6, s)], levels: 1 },
    ] },
  { id: "plant-parts", title: "Plant Parts Point", emoji: "🌻", grade: "2", items: 6, blurb: "Roots, stems, leaves and flowers — and the clever ways seeds set sail.",
    talk: ["Which plant parts did we eat today? (Hint: salad is leaves!)", "If you were a seed, would you travel by wind, water or animal? Why?"],
    challenge: "With a grown-up, put a white carnation in a cup of water with food coloring. Check it tomorrow — how did the color get to the petals?",
    stages: [
      { title: "Parts and Jobs", emoji: "🌿", topics: [matchT("plant-part-jobs", "Match each plant part to its job", PART_JOBS, true, s), politeT("plants-make-food", PLANT_FOOD, true, s)], levels: 2 },
      { title: "Plants We Eat", emoji: "🥕", topics: [politeT("plant-parts-we-eat", PLANTS_WE_EAT, true, s), matchT("plant-part-jobs", "Match each plant part to its job", PART_JOBS, true, s)], levels: 2 },
      { title: "Pollen Pals", emoji: "🐝", topics: [politeT("pollinator-helpers", POLLINATORS, true, s), politeT("plants-make-food", PLANT_FOOD, true, s)], levels: 2 },
      { title: "Seed Voyages", emoji: "🍁", topics: [sortManyT("seed-travel-sort", SEED_MOVERS, true, 2, s), politeT("seed-journeys", SEED_JOURNEYS, true, s)], levels: 2 },
    ] },
  { id: "water-cycle", title: "Water Cycle Current", emoji: "💧", grade: "2", items: 6, blurb: "Follow a drop of water up to the clouds and back down again.",
    talk: ["Where do you think the rain that falls on our house goes next?", "Could the water in your cup have been part of a cloud once? Tell its story!"],
    challenge: "Fill a glass with ice water and watch the outside of the glass. Where do the drops come from? (Hint: the air!)",
    stages: [
      { title: "Up, Up and Away", emoji: "💨", topics: [orderT("water-drop-trip", "Follow a drop of water! Put its trip in order", WATER_TRIP, true, s), politeT("water-cycle-basics", WATER_FACTS, true, s)], levels: 2 },
      { title: "Cloud Makers", emoji: "☁️", topics: [matchT("water-cycle-vocab", "Match each water cycle word to its meaning", CYCLE_WORDS, true, s), politeT("water-cycle-basics", WATER_FACTS, true, s)], levels: 2 },
      { title: "Rain Riders", emoji: "🌧️", topics: [sortManyT("water-cycle-examples", WATER_STEPS, true, 2, s), orderT("water-cycle-step-order", "Put the four steps of the water cycle in order", CYCLE_STEPS, true, s), politeT("water-cycle-basics", WATER_FACTS, true, s)], levels: 2 },
      { title: "Round and Round", emoji: "🔄", topics: [orderT("water-drop-trip", "Follow a drop of water! Put its trip in order", WATER_TRIP, true, s), matchT("water-cycle-vocab", "Match each water cycle word to its meaning", CYCLE_WORDS, true, s), sortManyT("water-cycle-examples", WATER_STEPS, true, 2, s)], levels: 1 },
    ] },
  { id: "food-chains", title: "Food Chain Channel", emoji: "🦊", grade: "2", items: 6, blurb: "Who eats what? Follow the Sun's energy from plants to animals — and back to the soil.",
    talk: ["What did you eat today that came from a plant? From an animal?", "What would a forest be like without any decomposers?"],
    challenge: "With a grown-up, peek under a log or rock outside. Can you spot worms, pill bugs or mushrooms — the clean-up crew? (Look, don't touch the mushrooms!)",
    stages: [
      { title: "Sunlight Lunch", emoji: "☀️", topics: [sortManyT("producer-consumer-decomposer", FOOD_ROLES, true, 2, s), politeT("food-chain-basics", CHAIN_FACTS, true, s)], levels: 2 },
      { title: "Plants, Meat or Both?", emoji: "🍽️", topics: [sortManyT("herbivore-carnivore-omnivore", EATERS, true, 2, s), politeT("food-chain-basics", CHAIN_FACTS, true, s)], levels: 2 },
      { title: "Link the Chain", emoji: "🔗", topics: [orderT("meadow-food-chain", "Put the meadow food chain in order", CHAIN_MEADOW, true, s), orderT("ocean-food-chain", "Put the ocean food chain in order", CHAIN_OCEAN, true, s), politeT("food-chain-basics", CHAIN_FACTS, true, s)], levels: 2 },
      { title: "Clean-Up Crew", emoji: "🍄", topics: [politeT("decomposer-crew", DECOMPOSERS, true, s), orderT("forest-food-chain", "Put the forest food chain in order", CHAIN_FOREST, true, s), sortManyT("producer-consumer-decomposer", FOOD_ROLES, true, 2, s)], levels: 2 },
    ] },
  { id: "magnets", title: "Magnet Marsh", emoji: "🧲", grade: "2", items: 6, blurb: "Invisible pushes and pulls — find out what magnets can (and can't) do.",
    talk: ["What things in our house do you think a magnet would stick to? Why?", "How could a magnet help someone at work or at home?"],
    challenge: "With a grown-up, test 10 things around the house with a fridge magnet. Guess first, then test! (Keep small magnets away from little ones.)",
    stages: [
      { title: "Stick or Not?", emoji: "🧲", topics: [sortT("magnetic-or-not", MAGNET_SORT, true, 6, s), politeT("what-magnets-pull", MAGNET_POWER, true, s)], levels: 2 },
      { title: "North Meets South", emoji: "🧭", topics: [politeT("poles-attract-repel", POLES, true, s), matchT("magnet-vocab", "Match each magnet word to its meaning", MAGNET_WORDS, true, s)], levels: 2 },
      { title: "Through the Paper", emoji: "📄", topics: [politeT("what-magnets-pull", MAGNET_POWER, true, s), politeT("poles-attract-repel", POLES, true, s), sortT("magnetic-or-not", MAGNET_SORT, true, 6, s)], levels: 2 },
    ] },
  { id: "earth-sky", title: "Sun, Earth & Moon Sound", emoji: "🌙", grade: "2", items: 6, blurb: "Day and night, Moon phases and seasons — Earth's big dance in space.",
    talk: ["Why does the Moon look different on different nights?", "What's your favorite season? How does Earth's tilt help make it?"],
    challenge: "Look at the Moon each night this week with a grown-up and draw its shape. Is the lit part getting bigger or smaller?",
    stages: [
      { title: "Spin, Earth, Spin!", emoji: "🌍", topics: [politeT("earth-spin-and-orbit", SUN_EARTH, true, s), matchT("space-vocab", "Match each space word to its meaning", SPACE_WORDS, true, s)], levels: 2 },
      { title: "Moon Watch", emoji: "🌙", topics: [orderT("moon-phase-order", "The Moon grows from new to full. Put its phases in order", MOON_PHASES, true, s), politeT("moon-basics", MOON_FACTS, true, s)], levels: 2 },
      { title: "Season Circle", emoji: "🍂", topics: [orderT("season-order", "Put the seasons in order, starting with spring", SEASON_CIRCLE, true, s), politeT("season-patterns", SEASONS, true, s)], levels: 2 },
      { title: "Space Explorer", emoji: "🔭", topics: [matchT("space-vocab", "Match each space word to its meaning", SPACE_WORDS, true, s), politeT("moon-basics", MOON_FACTS, true, s), politeT("earth-spin-and-orbit", SUN_EARTH, true, s)], levels: 1 },
    ] },
];
