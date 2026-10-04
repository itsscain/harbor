import type { WorldDef } from "../gen";
import { politeT, sortT, sortManyT, orderT, matchT, type Pol, type SortBank, type SortMany, type MatchBank } from "../behavior";

// Discovery — big sailors (3rd–5th grade). Real science words with crisp explanations, and
// questions that make kids reason: predict, explain, compare, spot the variable. Wrong answers are
// the misconceptions kids actually hold (heavy things fall faster, a sliding box "runs out" of
// push, plants eat soil…), and every "why" teaches the idea — often with a surprising true fact.
//
//   3rd — forces & motion, weather & climate, adaptations, fossils, simple machines
//   4th — energy, circuits, changing Earth, rocks & minerals, body systems
//   5th — the solar system, ecosystems, matter & its changes (+ the scientific method)
//
// Skill keys: "s:<topic>" (world-prefixed so they never collide with the younger worlds).

type Stage = WorldDef["stages"][number];
const st = (title: string, emoji: string, topics: Stage["topics"], levels = 2): Stage => ({ title, emoji, topics, levels });

// ═══ 3rd grade ═════════════════════════════════════════════════════════════════════════════

// ── Force & Motion Falls ─────────────────────────────────────────────────────────────────
const FORCE_BASICS: Pol[] = [
  { q: "What is a force?", e: "💪⚽", a: "A push or a pull", w: ["Anything that is moving", "Only something you can see"], why: "A force is a push or a pull. Forces start, stop, speed up, slow down or turn things." },
  { q: "A soccer ball sits still on the grass. What will make it move?", e: "⚽🌱", a: "A force, like a kick", w: ["Nothing — it will roll by itself", "Waiting long enough"], why: "An object at rest stays at rest until a force acts on it." },
  { q: "You let go of a ball. Why does it fall to the ground?", e: "🏀⬇️", a: "Gravity pulls it toward Earth", w: ["Air pushes it down", "The ball wants to rest"], why: "Gravity is a pull between objects. Earth's huge mass pulls everything toward its center." },
  { q: "With no air in the way, a heavy ball and a light ball are dropped together. Which lands first?", e: "🎳⚽", a: "They land at the same time", w: ["The heavy ball", "The light ball"], why: "Gravity speeds up all objects the same. On the airless Moon, a hammer and a feather landed together!" },
  { q: "Which way does gravity pull on people on the other side of Earth?", e: "🌏⬇️", a: "Toward the center of Earth", w: ["Up, toward space", "Sideways, toward us"], why: "Gravity pulls toward Earth's center everywhere, so “down” always points to the middle of Earth." },
  { q: "Why is it harder to push a full wagon than an empty one?", e: "🧸🧸", a: "More mass needs more force to move", w: ["Gravity skips empty wagons", "Full wagons have bigger wheels"], why: "The more mass something has, the bigger the force needed to get it moving — or to stop it." },
  { q: "A force acting on a moving object can change its…", e: "🚲↪️", a: "Speed and direction", w: ["Color and smell", "Nothing — forces only start motion"], why: "Forces can speed things up, slow them down, or turn them a new way." },
  { q: "Which of these is a non-contact force?", e: "🌍🍎", a: "Gravity", w: ["A kick", "Friction"], why: "Gravity and magnetism act without touching. Kicks and friction need contact." },
  { q: "Why does a skydiver open a parachute?", e: "🪂☁️", a: "Air resistance pushes up and slows the fall", w: ["It turns off gravity", "It makes the skydiver lighter"], why: "The wide parachute catches lots of air. Air pushes up against gravity and slows the fall." },
  { q: "A rocket blasts hot gas down. What happens to the rocket?", e: "🚀🔥", a: "It is pushed up", w: ["It is pulled down faster", "Nothing — gas has no force"], why: "Forces come in pairs: the rocket pushes gas down, and the gas pushes the rocket up." },
  { q: "On the Moon you would weigh less. Why?", e: "🌕🧑", a: "The Moon's gravity is weaker", w: ["There's no air on the Moon", "Your mass would disappear"], why: "The Moon has less mass, so it pulls about one-sixth as hard. Your mass stays exactly the same!" },
  { q: "You throw a ball straight up. Why does it come back down?", e: "⚾⬆️", a: "Gravity slows it, then pulls it back", w: ["It runs out of air", "Your hand pulls it back"], why: "Gravity pulls on the ball the whole time — slowing it on the way up and speeding it on the way down." },
];
const PUSH_PULL: SortBank = { prompt: "Is it a push or a pull?", bins: ["Push", "Pull", "🖐️", "🪢"], items: [
  ["Kicking a soccer ball", 1, "⚽"], ["Closing a drawer", 1, "🗄️"], ["Pressing a doorbell", 1, "🔔"], ["Hitting a baseball with a bat", 1, "⚾"],
  ["Rolling a shopping cart ahead", 1, "🛒"], ["Throwing a basketball", 1, "🏀"], ["Pressing piano keys", 1, "🎹"], ["Shoving a box across the floor", 1, "📦"],
  ["Opening a drawer", 0, "🗄️"], ["Reeling in a fish", 0, "🎣"], ["Picking an apple off a tree", 0, "🍎"], ["Playing tug-of-war", 0, "🪢"],
  ["Yanking a weed out of the garden", 0, "🌱"], ["Pulling on your socks", 0, "🧦"], ["Lifting a bucket up from a well", 0, "🪣"], ["Zipping up a jacket", 0, "🧥"],
] };

const FRICTION_Q: Pol[] = [
  { q: "A ball rolls farther on tile than on carpet. Why?", e: "⚽🧶", a: "Carpet has more friction", w: ["Tile pulls the ball forward", "Gravity is weaker on tile"], why: "Rough carpet rubs against the ball more. More friction slows it down sooner." },
  { q: "What is friction?", e: "🧱🛷", a: "A force that resists sliding or rolling", w: ["A force that speeds things up", "A pull from far away"], why: "Friction happens when surfaces rub. It works against motion and turns some motion into heat." },
  { q: "Rub your hands together fast. Why do they get warm?", e: "🙌🔥", a: "Friction turns motion into heat", w: ["Your blood gets thicker", "Air rushes into your hands"], why: "Friction between your palms changes motion energy into thermal energy — heat." },
  { q: "Why do people sprinkle sand on icy sidewalks?", e: "🧊🚶", a: "Sand adds friction so feet don't slip", w: ["Sand melts the ice instantly", "Sand makes the ice smoother"], why: "Ice is smooth and slippery. Gritty sand adds friction so shoes can grip." },
  { q: "Which shoe would grip a gym floor best?", e: "👟🏀", a: "Rubber soles with bumpy treads", w: ["Smooth, hard plastic soles", "Socks with no shoes"], why: "Rubber treads make more friction, so you can stop and turn without sliding." },
  { q: "How do bike brakes slow you down?", e: "🚲🛑", a: "Pads rub the wheel, adding friction", w: ["They switch off the pedals", "They make the bike heavier"], why: "Brake pads squeeze the wheel. Friction slows it — and makes the pads warm." },
  { q: "A sled slides fastest on…", e: "🛷❄️", a: "Smooth, icy snow", w: ["A dry, grassy hill", "A gravel road"], why: "Smooth ice has very little friction, so the sled keeps more of its speed." },
  { q: "Why do people oil a squeaky door hinge?", e: "🚪🔧", a: "Oil helps the parts slide with less friction", w: ["Oil makes the door heavier", "Oil glues the hinge still"], why: "Oil is a lubricant. It fills tiny bumps so metal parts slide smoothly and quietly." },
  { q: "Is friction always a bad thing?", e: "🤔🧤", a: "No — it lets us walk, grip and stop", w: ["Yes, it only slows things", "Yes, it only wastes heat"], why: "Without friction you couldn't walk, hold a pencil, or stop a bike. Try running on ice!" },
  { q: "A box slides across the floor and stops. What stopped it?", e: "📦🛑", a: "Friction between the box and floor", w: ["The push inside it ran out", "Gravity pulled it backward"], why: "A sliding box doesn't run out of push. Friction acts against its motion until it stops." },
  { q: "Why do racing swimmers wear smooth, tight swimsuits?", e: "🏊🌊", a: "To cut the water's drag", w: ["To float higher, like a boat", "To make the water warmer"], why: "Water pushes against a moving swimmer. A smooth suit reduces that drag, so they glide faster." },
  { q: "Air resistance is a kind of…", e: "💨🪶", a: "Friction from the air", w: ["Gravity", "Magnetism"], why: "Air resistance, or drag, is friction between a moving object and the air around it." },
];
const FRICTION_SORT: SortBank = { prompt: "More friction or less friction?", bins: ["More friction", "Less friction", "🧱", "🧊"], items: [
  ["Sandpaper rubbing on wood", 1, "🪵"], ["Bike tires on a dry road", 1, "🚲"], ["Sneakers on a gym floor", 1, "👟"], ["A sled on dry grass", 1, "🌾"],
  ["Pushing a box across a rug", 1, "📦"], ["Brake pads on a wheel", 1, "🛑"], ["Gripping a rope with gloves", 1, "🧤"], ["Dragging a log on gravel", 1, "🪨"],
  ["Skating on smooth ice", 0, "⛸️"], ["A freshly oiled bike chain", 0, "⛓️"], ["Socks on a polished floor", 0, "🧦"], ["Wet, soapy tile", 0, "🧼"],
  ["A hockey puck on ice", 0, "🏒"], ["Skis on fresh snow", 0, "🎿"], ["A penguin sliding on its belly", 0, "🐧"], ["Stepping on a banana peel", 0, "🍌"],
] };

const BALANCE_Q: Pol[] = [
  { q: "Two teams pull a rope equally hard. What happens?", e: "🪢⚖️", a: "Nothing moves — the forces are balanced", w: ["The bigger team always wins", "The rope stretches forever"], why: "Equal forces in opposite directions cancel out. Balanced forces don't change motion." },
  { q: "In tug-of-war, the rope starts sliding left. What does that tell you?", e: "🪢⬅️", a: "The forces are unbalanced", w: ["The forces are balanced", "Gravity switched off"], why: "When one side pulls harder, the forces are unbalanced and the rope moves toward the stronger pull." },
  { q: "Gravity pulls a book down. Why doesn't it fall through the table?", e: "📕🪑", a: "The table pushes up just as hard", w: ["Gravity stops working on tables", "The book is too light to fall"], why: "The table pushes up with a force equal to gravity's pull. Balanced forces = no change in motion." },
  { q: "What makes a moving object speed up, slow down or turn?", e: "🏎️↪️", a: "An unbalanced force", w: ["Balanced forces", "No force at all"], why: "Only an unbalanced force changes an object's motion." },
  { q: "A car drives at a steady speed in a straight line. The forces on it are…", e: "🚗➡️", a: "Balanced", w: ["Unbalanced", "Zero — nothing touches it"], why: "Steady speed in a straight line means the engine's push and the drag on the car cancel out." },
  { q: "You push a heavy couch, but it won't budge. Which is true?", e: "🛋️💪", a: "Friction is balancing your push", w: ["You aren't pushing at all", "The couch has no mass"], why: "Your push is real, but friction pushes back just as hard. Push harder to unbalance the forces." },
  { q: "A soccer player heads the ball. What did that force change?", e: "⚽🙆", a: "The ball's direction", w: ["The ball's color", "The ball's mass"], why: "Forces can change direction. A header sends the ball a new way." },
  { q: "A gentle tap and a hard kick hit the same ball. Which sends it faster?", e: "⚽🦵", a: "The hard kick — a bigger force", w: ["The gentle tap", "They're exactly the same"], why: "A bigger force causes a bigger change in motion." },
  { q: "Speed tells you…", e: "⏱️🏃", a: "How far something goes in a certain time", w: ["Which way something moves", "How heavy something is"], why: "Speed is distance divided by time, like miles per hour or meters per second." },
  { q: "A toy car rolls 10 meters in 5 seconds. What is its speed?", e: "🚙⏱️", a: "2 meters per second", w: ["50 meters per second", "15 meters per second"], why: "Speed = distance ÷ time. 10 meters ÷ 5 seconds = 2 meters every second." },
  { q: "A rolling marble hits a wall and bounces back. What changed?", e: "🔵🧱", a: "Its direction of motion", w: ["Its mass", "Nothing changed"], why: "The wall pushed on the marble — an unbalanced force that reversed its direction." },
  { q: "A puck slides on very smooth ice. With almost no friction, what happens?", e: "🏒🧊", a: "It keeps sliding a long way", w: ["It stops right away", "It speeds up by itself"], why: "A moving object keeps moving until a force slows it. Ice has little friction, so pucks glide far." },
];
const FORCE_WORDS: MatchBank = [
  ["Gravity", "Pulls objects toward Earth"],
  ["Friction", "Slows surfaces rubbing together"],
  ["Magnetism", "Pulls iron without touching"],
  ["Air resistance", "Slows things moving through air"],
  ["Balanced forces", "Equal forces that cancel out"],
  ["Unbalanced forces", "Change speed or direction"],
  ["Speed", "Distance traveled in a time"],
];

const MAGNET_Q: Pol[] = [
  { q: "Which object will a magnet pick up?", e: "🧲📎", a: "A steel paper clip", w: ["An aluminum can", "A copper wire"], why: "Magnets attract iron and steel (steel is mostly iron). Aluminum and copper aren't magnetic." },
  { q: "Two magnets' north poles face each other. What happens?", e: "🧲🧲", a: "They push apart", w: ["They snap together", "Nothing happens"], why: "Like poles repel; opposite poles attract. North pushes north away." },
  { q: "A north pole meets a south pole. What happens?", e: "🧲↔️", a: "They pull together", w: ["They push apart", "They spin in circles"], why: "Opposite poles attract. That's why two magnets click together end to end." },
  { q: "Why is magnetism called a non-contact force?", e: "🧲✨", a: "It can push or pull without touching", w: ["It only works on things it touches", "It never moves anything"], why: "A magnet's force reaches across a gap — through air, paper, even water." },
  { q: "Can a magnet pull a paper clip through a sheet of cardboard?", e: "🧲📦", a: "Yes — the force passes through it", w: ["No, cardboard blocks magnetism", "Only if the cardboard is wet"], why: "Magnetic force passes through paper, cardboard, glass and water. Test it with a fridge magnet!" },
  { q: "Why does a compass needle point north?", e: "🧭🌍", a: "Earth acts like a giant magnet", w: ["The North Star pulls it", "The wind pushes it"], why: "Earth's iron core makes a magnetic field. A compass needle is a tiny magnet that lines up with it." },
  { q: "Where is a bar magnet's pull strongest?", e: "🧲📍", a: "At its two ends, the poles", w: ["In the exact middle", "It's the same everywhere"], why: "Magnetic force is strongest at the poles. Iron filings crowd around a magnet's ends." },
  { q: "You break a bar magnet in half. What do you get?", e: "🧲✂️", a: "Two magnets, each with N and S poles", w: ["One north piece, one south piece", "Two pieces that aren't magnets"], why: "Every piece of a magnet has a north and a south pole, no matter how small you cut it." },
  { q: "How do recycling centers pull steel cans out of the trash?", e: "♻️🥫", a: "With giant magnets", w: ["With strong fans", "By melting everything first"], why: "Big magnets lift steel and iron right out of the pile. Aluminum cans stay behind." },
  { q: "A magnet is moved farther from a paper clip. What happens to the pull?", e: "🧲↔️📎", a: "It gets weaker", w: ["It gets stronger", "It stays exactly the same"], why: "Magnetic force fades fast with distance. Up close it's strong; farther away it weakens." },
  { q: "Which of these is NOT attracted to a magnet?", e: "🧲🥄", a: "A plastic spoon", w: ["An iron nail", "A steel bolt"], why: "Plastic, wood, glass, copper and aluminum aren't magnetic. Iron and steel are." },
  { q: "Gravity and magnetism are alike because both…", e: "🌍🧲", a: "Act without touching", w: ["Only push, never pull", "Only work on metal"], why: "Both are non-contact forces. Gravity pulls on all matter; magnets mostly pull iron and steel." },
];
const MAGNET_SORT: SortBank = { prompt: "Will a magnet attract it?", bins: ["Magnetic", "Not magnetic", "🧲", "🚫"], items: [
  ["Steel paper clip", 1, "📎"], ["Iron nail", 1, "🔩"], ["Steel safety pin", 1, "🧷"], ["Steel soup can", 1, "🥫"],
  ["Cast-iron frying pan", 1, "🍳"], ["Iron horseshoe", 1, "🐴"], ["Steel refrigerator door", 1, "🚪"], ["Iron filings", 1, "✨"],
  ["Plastic spoon", 0, "🥄"], ["Aluminum soda can", 0, "🥤"], ["Wooden pencil", 0, "✏️"], ["Glass marble", 0, "🔮"],
  ["Rubber duck", 0, "🦆"], ["Copper wire", 0, "〰️"], ["Brass house key", 0, "🔑"], ["Gold ring", 0, "💍"],
] };

// ── Weather & Climate Coast ──────────────────────────────────────────────────────────────
const WX_CLIMATE_Q: Pol[] = [
  { q: "What is the difference between weather and climate?", e: "🌦️📅", a: "Weather is now; climate is the long-term pattern", w: ["They mean exactly the same thing", "Climate is now; weather is long-term"], why: "Weather is what the air is doing right now. Climate is a place's average weather over many years." },
  { q: "“It's snowing in Chicago today.” Is that weather or climate?", e: "🌨️🏙️", a: "Weather", w: ["Climate", "Neither one"], why: "It describes one day in one place — that's weather." },
  { q: "“The Sahara gets very little rain most years.” Is that weather or climate?", e: "🏜️🐪", a: "Climate", w: ["Weather", "A forecast"], why: "A pattern that holds year after year describes climate." },
  { q: "Florida has one cool, rainy day in July. Did Florida's climate change?", e: "🌴🌧️", a: "No — one day is weather, not climate", w: ["Yes, its climate is now cold", "Yes, climate changes every day"], why: "Climate is the long-term average. One unusual day doesn't change it." },
  { q: "Which sentence describes climate?", e: "☀️📅", a: "Summers here are hot and dry most years", w: ["A thunderstorm is coming this afternoon", "It's foggy this morning"], why: "Climate is the usual pattern over many years — not what's happening today." },
  { q: "Which sentence describes weather?", e: "💨🌡️", a: "It's windy and 50°F right now", w: ["Winters here are cold most years", "Springs here are rainy, year after year"], why: "Weather is the condition of the air at one time and place." },
  { q: "About how many years of weather do scientists average to describe a climate?", e: "📊📅", a: "About 30 years", w: ["One week", "One day"], why: "Scientists average about 30 years of weather records to describe a place's climate." },
  { q: "Who studies the atmosphere and forecasts the weather?", e: "📡🌀", a: "A meteorologist", w: ["A geologist", "An astronomer"], why: "Meteorologists study the air. The name comes from a Greek word for “things high in the air.”" },
  { q: "Where does almost all of Earth's weather happen?", e: "☁️🌍", a: "In the lowest layer of the atmosphere", w: ["Out in space", "Deep underground"], why: "Weather happens in the troposphere, the layer of air closest to the ground." },
  { q: "What powers Earth's weather?", e: "☀️🌬️", a: "Energy from the Sun", w: ["Heat from Earth's core", "The Moon's gravity"], why: "Sunlight heats land, water and air unevenly. That uneven heating drives wind, clouds and rain." },
  { q: "Your town had a record-hot day last week. Which is true?", e: "🥵📆", a: "That was weather; one day isn't a climate", w: ["Your town is now a desert", "Weather and climate both changed"], why: "One hot day is weather. A climate shift shows up as a trend over many years." },
  { q: "A friend says, “It's cold today, so the climate is cold.” What's the mistake?", e: "🥶🤔", a: "One day can't show a long-term pattern", w: ["Cold days don't exist", "Climate only means rain"], why: "To learn a climate, you need many years of weather — not one chilly morning." },
];
const WX_SORT: SortBank = { prompt: "Weather or climate?", bins: ["Weather", "Climate", "🌦️", "📅"], items: [
  ["A thunderstorm this afternoon", 1, "⛈️"], ["Fog on the bridge this morning", 1, "🌫️"], ["It's 75°F and sunny right now", 1, "☀️"], ["A blizzard hit last night", 1, "🌨️"],
  ["Strong winds today", 1, "💨"], ["Hail fell for ten minutes", 1, "🧊"], ["A rainbow after today's shower", 1, "🌈"], ["Tomorrow: cloudy, high of 60°F", 1, "☁️"],
  ["Deserts get little rain most years", 0, "🏜️"], ["Alaska has long, cold winters", 0, "🏔️"], ["Rainforests are wet all year", 0, "🌴"], ["Summers here are usually hot", 0, "🌞"],
  ["The poles stay icy year after year", 0, "🐧"], ["Monsoon rains come every summer", 0, "🌧️"], ["Our town averages 40 inches of rain a year", 0, "📊"], ["Hawaii is warm all year long", 0, "🏝️"],
] };

const WX_TOOLS: MatchBank = [
  ["Thermometer", "Air temperature"],
  ["Rain gauge", "How much rain fell"],
  ["Anemometer", "Wind speed"],
  ["Wind vane", "Wind direction"],
  ["Barometer", "Air pressure"],
  ["Hygrometer", "Humidity (water vapor in air)"],
  ["Weather satellite", "Clouds and storms from space"],
];
const WX_TOOL_Q: Pol[] = [
  { q: "A barometer shows the air pressure dropping fast. What weather is likely?", e: "📉⛈️", a: "Clouds and stormy weather", w: ["Clear, sunny skies", "No change at all"], why: "Falling pressure often means a storm is moving in. Rising pressure usually brings clear skies." },
  { q: "Which tool tells you which way the wind is blowing?", e: "🧭💨", a: "A wind vane", w: ["An anemometer", "A rain gauge"], why: "A wind vane points into the wind, showing where it comes from. An anemometer measures its speed." },
  { q: "An anemometer's cups spin faster and faster. What's happening?", e: "🌀💨", a: "The wind is getting stronger", w: ["It's getting colder", "Rain is starting"], why: "An anemometer measures wind speed. Faster spinning means faster wind." },
  { q: "A wind blowing FROM the north toward the south is called…", e: "🌬️⬇️", a: "A north wind", w: ["A south wind", "A west wind"], why: "Winds are named for the direction they come from. A north wind blows from the north." },
  { q: "Which tool measures how much rain fell?", e: "🌧️📏", a: "A rain gauge", w: ["A barometer", "A thermometer"], why: "A rain gauge catches rain in a marked tube, so you can measure it in inches or millimeters." },
  { q: "The thermometer reads 25°F. What will happen to the puddles?", e: "🌡️💧", a: "They'll freeze", w: ["They'll boil", "They'll stay liquid"], why: "Water freezes at 32°F (0°C). At 25°F it's below freezing, so puddles turn to ice." },
  { q: "Why should a rain gauge sit away from trees and roofs?", e: "🌳🌧️", a: "So nothing blocks or adds rain", w: ["So birds can drink from it", "So it stays warm"], why: "Trees and roofs can block rain or drip extra water in — and the measurement would be wrong." },
  { q: "Which tool measures humidity?", e: "💧☁️", a: "A hygrometer", w: ["An anemometer", "A wind vane"], why: "A hygrometer measures humidity — how much water vapor is in the air." },
  { q: "Why measure the temperature at the same time every day?", e: "⏰🌡️", a: "So the readings are fair to compare", w: ["Thermometers only work then", "To save electricity"], why: "Temperature changes during the day. Same time each day means a fair comparison." },
  { q: "How do weather satellites help forecasters?", e: "🛰️🌀", a: "They watch clouds and storms from space", w: ["They make rain fall", "They push hurricanes away"], why: "Satellites photograph clouds and track hurricanes for days before they reach land." },
  { q: "Your thermometer is sitting in bright sunlight. What's wrong?", e: "🌡️☀️", a: "It will read hotter than the air", w: ["It will read colder than the air", "Nothing — sunlight helps it"], why: "Sunlight heats the thermometer itself. Air temperature should be measured in the shade." },
  { q: "Which two tools best warn that a storm is coming?", e: "⛈️🔎", a: "A barometer and an anemometer", w: ["A ruler and a magnifying glass", "A scale and a measuring cup"], why: "Falling air pressure and rising wind speed are both clues that a storm is on its way." },
];

const ZONES_Q: Pol[] = [
  { q: "What causes Earth's seasons?", e: "🌍☀️", a: "The tilt of Earth's axis", w: ["Earth moving closer to the Sun", "The Sun burning hotter in summer"], why: "Earth is tilted. When your half leans toward the Sun, its light is more direct — that's summer." },
  { q: "It's summer in the United States. What season is it in Australia?", e: "🦘❄️", a: "Winter", w: ["Summer", "Spring"], why: "Earth's two halves lean toward the Sun at opposite times, so their seasons are flipped." },
  { q: "Which climate zone is warm all year and often very rainy?", e: "🌴🌧️", a: "Tropical", w: ["Polar", "Temperate"], why: "Tropical zones near the equator get strong sunlight all year, and many get lots of rain." },
  { q: "Most of the United States has four seasons. Which climate zone is that?", e: "🍂🌸", a: "Temperate", w: ["Tropical", "Polar"], why: "Temperate zones lie between the tropics and the poles, with warm summers and cold winters." },
  { q: "Why are places near the equator warm all year?", e: "☀️🌎", a: "Sunlight hits them most directly", w: ["They're closer to the Sun", "The ocean heats them from below"], why: "Near the equator the Sun is high in the sky all year, so its light is strong and direct." },
  { q: "Why is it colder at the poles than at the equator?", e: "🐧☀️", a: "Sunlight hits them at a low slant", w: ["The poles are farther from the Sun", "Ice makes its own cold air"], why: "Slanted sunlight spreads over more ground, so each spot gets less heat." },
  { q: "A city sits high in the mountains, right near the equator. What's its climate like?", e: "🏔️🌎", a: "Cool, because it's so high up", w: ["Very hot, like a beach", "Exactly like the coast below"], why: "Air gets colder as you go higher. Some mountains near the equator even have snow on top!" },
  { q: "Why do seaside cities often have milder winters than cities far inland?", e: "🌊🏙️", a: "The ocean warms and cools slowly", w: ["Sea air is always hot", "Waves rubbing make heat"], why: "Water holds heat a long time, so oceans keep nearby land cooler in summer and warmer in winter." },
  { q: "What makes a place a desert?", e: "🏜️🌵", a: "It gets very little rain", w: ["It is always very hot", "It is covered in sand"], why: "Deserts are dry, not always hot. Icy Antarctica is the largest desert on Earth!" },
  { q: "Why do rainforests have so many plants?", e: "🌴🦜", a: "Warmth and rain all year long", w: ["They have Earth's richest soil", "Animals plant them all"], why: "Steady warmth and rain let plants grow all year. Surprisingly, rainforest soil is usually thin and poor." },
  { q: "Which climate zone has the longest, coldest winters?", e: "🧊🌑", a: "Polar", w: ["Tropical", "Temperate"], why: "Polar zones get weak, slanted sunlight — and in winter, weeks of darkness." },
  { q: "Summer days are longer. Why does that make summer warmer?", e: "🌞⏳", a: "The Sun has more hours to heat the ground", w: ["The Sun is closer in summer", "Long days have thinner air"], why: "More hours of direct sunlight add more heat each day, and short nights let less escape." },
];
const ZONE_MATCH: MatchBank = [
  ["Tropical", "Warm all year, often rainy"],
  ["Polar", "Icy, with long, dark winters"],
  ["Temperate", "Four seasons"],
  ["Desert", "Very little rain"],
  ["Mountain", "Colder the higher you go"],
  ["Coastal", "Mild, thanks to the ocean"],
];

const STORM_Q: Pol[] = [
  { q: "A tornado warning is issued for your town. What should you do?", e: "🌪️🏠", a: "Go to a basement or windowless inner room", w: ["Go outside to watch it", "Open the windows"], why: "Get low, away from windows. Opening windows doesn't help — it just wastes precious time." },
  { q: "What's the difference between a tornado WATCH and a WARNING?", e: "🌪️📢", a: "Watch: be ready. Warning: take cover now!", w: ["They mean the same thing", "Warning: be ready. Watch: take cover!"], why: "A watch means a tornado could form. A warning means one has been spotted or is close." },
  { q: "You hear thunder while swimming outdoors. What should you do?", e: "🏊⛈️", a: "Get out and go inside right away", w: ["Keep swimming until you see lightning", "Wait under a tall tree"], why: "“When thunder roars, go indoors.” If you can hear thunder, lightning is close enough to strike." },
  { q: "Is it safe to stand under a tall tree in a thunderstorm?", e: "🌳⚡", a: "No — lightning often strikes tall things", w: ["Yes, trees block lightning", "Yes, if it's a really big tree"], why: "Lightning tends to hit tall objects. A building or a hard-topped car is much safer." },
  { q: "You see lightning, then count 10 seconds until thunder. About how far away is it?", e: "⚡⏱️", a: "About 2 miles", w: ["About 10 miles", "Right overhead"], why: "Sound travels about a mile in 5 seconds. Divide the seconds by 5 to estimate the miles." },
  { q: "Why do we see lightning before we hear its thunder?", e: "⚡👂", a: "Light travels much faster than sound", w: ["Thunder happens later", "Eyes work faster than ears"], why: "Light reaches you almost instantly. Sound is nearly a million times slower." },
  { q: "A hurricane is heading your way. How do families get ready?", e: "🌀🔦", a: "Gather water, food and flashlights", w: ["Plan a beach trip", "Open all the windows"], why: "Hurricanes can knock out power for days. A kit and a plan keep families safe." },
  { q: "Why should you never walk or drive through flood water?", e: "🌊🚗", a: "It can be deeper and faster than it looks", w: ["It's only a little wet", "It's always very cold"], why: "Just six inches of moving water can knock a person down. “Turn around, don't drown!”" },
  { q: "Where do hurricanes form?", e: "🌀🌊", a: "Over warm ocean water", w: ["Over cold, dry deserts", "Over snowy mountains"], why: "Warm ocean water gives hurricanes their energy. They weaken once they move over land." },
  { q: "Why is it dangerous to go outside in a blizzard?", e: "🌨️🥶", a: "Bitter cold, and you can't see far", w: ["Snow is too soft to walk on", "Blizzards are always quiet"], why: "Blizzards bring strong wind, blowing snow and freezing cold. Stay inside and keep warm." },
  { q: "Which is the safest place during a thunderstorm?", e: "⛈️🏠", a: "Inside a sturdy building", w: ["Out in an open field", "Under a picnic shelter"], why: "Buildings with wiring and pipes carry lightning to the ground. Open shelters don't protect you." },
  { q: "A heat advisory is issued. What is it telling you?", e: "🥵🚰", a: "It's dangerously hot — drink water, rest", w: ["It's a great day for a long run", "Snow is on the way"], why: "Extreme heat can make bodies overheat. Water, shade and rest help keep you safe." },
];
const FORECAST_Q: Pol[] = [
  { q: "The forecast says “80% chance of rain.” What does that mean?", e: "🌧️☂️", a: "Rain is very likely", w: ["It will rain 80% of the day", "80% of the sky will be cloudy"], why: "A high percentage means rain is very likely where you are. Pack an umbrella!" },
  { q: "A 10% chance of snow means…", e: "🌨️❓", a: "Snow is unlikely", w: ["It will definitely snow", "It will snow 10 inches"], why: "A low percentage means snow is possible, but not likely." },
  { q: "A cold front arrives tonight. What will likely happen?", e: "🥶⛈️", a: "Cooler air, maybe with storms", w: ["A heat wave", "No change at all"], why: "A cold front is cold air pushing under warm air. It often brings storms, then cooler, drier days." },
  { q: "Highs: Monday 40°F, Tuesday 50°F, Wednesday 60°F. What's the pattern?", e: "📈🌡️", a: "It's getting warmer each day", w: ["It's getting colder each day", "It's staying the same"], why: "The high rises 10 degrees each day — a warming trend." },
  { q: "Which forecast is best for a picnic?", e: "🧺☀️", a: "Sunny, 72°F, light breeze", w: ["Thunderstorms, 90% chance", "Windy and 30°F"], why: "Mild temperatures, a light wind and no rain make a great day outside." },
  { q: "Why can't forecasters predict next month's weather perfectly?", e: "📅🤔", a: "The atmosphere changes in complex ways", w: ["They don't have thermometers", "Weather follows the calendar"], why: "Tiny changes in the air grow bigger over time. Forecasts are most accurate for the next few days." },
  { q: "The weather map shows a big “H” over your town. What does it usually bring?", e: "🗺️☀️", a: "Clear, calm weather", w: ["Heavy storms", "A hurricane"], why: "H means high pressure. Sinking air in a high usually brings clear skies and calm weather." },
  { q: "An “L” on the weather map is moving toward your town. What should you expect?", e: "🗺️🌧️", a: "Clouds and rain or storms", w: ["Clear blue skies", "A sudden heat wave"], why: "L means low pressure. Rising air in a low cools and makes clouds and stormy weather." },
  { q: "How are weather forecasts made?", e: "📡💻", a: "From measurements, data and computer models", w: ["From last year's weather only", "From old folk sayings"], why: "Forecasters use data from weather stations, balloons, radar and satellites, then run computer models." },
  { q: "The thermometer says 25°F, but the wind chill is 10°F. What does that mean?", e: "🌬️🥶", a: "Wind makes it feel colder on skin", w: ["The thermometer is broken", "It will soon be 10°F"], why: "Wind carries body heat away faster, so your skin feels colder than the air really is." },
  { q: "The forecast: 95°F and very humid. What's smart?", e: "🥵💧", a: "Drink extra water and take shade breaks", w: ["Run a race at noon", "Wear a heavy jacket"], why: "In humid air, sweat dries slowly and cools you less — so heat feels even worse." },
  { q: "Tomorrow: high of 34°F, low of 20°F, snow. What should you wear?", e: "🧣❄️", a: "A warm coat, hat and boots", w: ["Shorts and sandals", "Just a light T-shirt"], why: "Below 32°F water freezes. Layers, a hat and boots keep body heat in." },
];

// ── Adaptation Atoll ─────────────────────────────────────────────────────────────────────
const ADAPT_Q: Pol[] = [
  { q: "What is an adaptation?", e: "🦎🌵", a: "A trait that helps a living thing survive", w: ["A trick a pet is taught", "A change an animal picks overnight"], why: "Adaptations are body parts or behaviors that help living things survive and reproduce where they live." },
  { q: "Which is a PHYSICAL adaptation?", e: "🦆🌊", a: "A duck's webbed feet", w: ["Birds flying south for winter", "A bear sleeping all winter"], why: "Physical adaptations are body parts. Webbed feet push water like paddles." },
  { q: "Which is a BEHAVIORAL adaptation?", e: "🐺🐺", a: "Wolves hunting in packs", w: ["A porcupine's sharp quills", "A polar bear's thick fur"], why: "Behavioral adaptations are things animals do. Hunting together helps wolves catch big prey." },
  { q: "Why do cactuses have spines instead of wide, flat leaves?", e: "🌵☀️", a: "Spines lose less water and block thirsty animals", w: ["Spines soak up rain like a sponge", "Spines help them grow taller"], why: "Wide leaves lose water to dry air. A cactus's spines are leaves shaped to save water and protect it." },
  { q: "What does a camel's hump store?", e: "🐪🏜️", a: "Fat, for energy when food is scarce", w: ["Water, like a canteen", "Extra air for breathing"], why: "It's a myth that humps hold water! The fat is stored energy, and camels can go days without drinking." },
  { q: "Why do owls have such huge eyes?", e: "🦉🌙", a: "To see in dim light at night", w: ["To look scary to other owls", "To see colors better by day"], why: "Big eyes gather more light. An owl's eyes can't move in their sockets, so it turns its whole head instead!" },
  { q: "A hawk has sharp, hooked talons. What does that tell you about it?", e: "🦅🦶", a: "It catches and holds prey", w: ["It eats only seeds", "It digs burrows"], why: "Body parts are clues. Talons grip prey; a seed-eater would have a thick, nut-cracking beak." },
  { q: "Thick blubber helps whales and seals…", e: "🐋🧊", a: "Stay warm in icy water", w: ["Sink to the bottom faster", "Breathe underwater"], why: "Blubber is a thick layer of fat that holds in body heat — like a built-in wetsuit." },
  { q: "Why do many desert animals come out only at night?", e: "🏜️🌙", a: "To avoid the scorching daytime heat", w: ["They can't see in daylight", "The Moon gives them energy"], why: "Being active at night is a behavioral adaptation. Desert nights are much cooler than days." },
  { q: "How does a giraffe's long neck help it survive?", e: "🦒🌳", a: "It reaches leaves high in trees", w: ["It helps it swim across rivers", "It helps it hide in tall grass"], why: "Few animals can reach the treetops, so giraffes have that food mostly to themselves." },
  { q: "Could a polar bear thrive in a hot desert?", e: "🐻🏜️", a: "No — its adaptations fit the cold Arctic", w: ["Yes — fur keeps out all heat", "Yes — it would grow a hump"], why: "Thick fur and fat are perfect for ice and snow, but in a desert a polar bear would overheat." },
  { q: "What do a fish's gills do?", e: "🐟💧", a: "Take in oxygen from the water", w: ["Help it see in the dark", "Keep it warm"], why: "Gills pull dissolved oxygen out of water as it flows over them — a physical adaptation for life underwater." },
];
const ADAPT_SORT: SortBank = { prompt: "Physical or behavioral adaptation?", bins: ["Physical (body part)", "Behavioral (action)", "🦔", "🐝"], items: [
  ["A duck's webbed feet", 1, "🦆"], ["A porcupine's quills", 1, "🦔"], ["A polar bear's thick fur", 1, "🐻"], ["An eagle's sharp eyesight", 1, "🦅"],
  ["A turtle's hard shell", 1, "🐢"], ["A giraffe's long neck", 1, "🦒"], ["A cactus's waxy skin", 1, "🌵"], ["A fish's gills", 1, "🐟"],
  ["Birds flying south for winter", 0, "🐦"], ["A groundhog hibernating", 0, "💤"], ["Wolves hunting in packs", 0, "🐺"], ["An opossum playing dead", 0, "😵"],
  ["Bees dancing to show where flowers are", 0, "🐝"], ["A squirrel burying acorns", 0, "🐿️"], ["A lizard basking in the sun", 0, "🦎"], ["Penguins huddling to stay warm", 0, "🐧"],
] };

const CAMO_Q: Pol[] = [
  { q: "What is camouflage?", e: "🦎🍃", a: "Blending in with the surroundings", w: ["Looking scary to warn others", "Moving somewhere new each winter"], why: "Camouflage hides an animal by matching its background — to escape predators or sneak up on prey." },
  { q: "A snowshoe hare's fur turns white in winter. Why?", e: "🐇❄️", a: "To blend in with the snow", w: ["Because it's cold and scared", "To show off to other hares"], why: "White in winter, brown in summer — its coat matches the ground all year long." },
  { q: "A harmless hoverfly has yellow and black stripes like a wasp. How does that help?", e: "🐝🌼", a: "Predators think it can sting", w: ["It can sting even harder", "It blends in with green leaves"], why: "That's mimicry — copying a dangerous animal's look. The hoverfly has no stinger at all!" },
  { q: "What is mimicry?", e: "🐍🎭", a: "Looking or acting like another living thing", w: ["Blending into the background", "Sleeping through the winter"], why: "Mimics copy something else — often a dangerous animal — to fool predators." },
  { q: "A walking stick insect looks just like a twig. That's an example of…", e: "🌿🐛", a: "Camouflage", w: ["Hibernation", "Migration"], why: "Looking like a twig lets it blend into branches where hungry birds won't notice it." },
  { q: "Why are poison dart frogs so brightly colored?", e: "🐸🌈", a: "To warn predators they're poisonous", w: ["To blend in with green leaves", "To attract more insects"], why: "Bright colors can say “Danger — don't eat me!” This is called warning coloration." },
  { q: "A polar bear's white fur on white snow helps it…", e: "🐻❄️", a: "Sneak up on seals", w: ["Stay cool in summer", "Swim faster"], why: "Camouflage helps predators too. A white bear on white ice is hard for a seal to spot." },
  { q: "An octopus changes color in seconds to match the rocks. Why?", e: "🐙🪨", a: "To hide from predators and prey", w: ["Because it's embarrassed", "To warm up in cold water"], why: "Octopuses have special skin cells that change color and texture — some of the best camouflage on Earth." },
  { q: "Some moths have big wing spots that look like owl eyes. How might that help?", e: "🦋👀", a: "They startle birds that hunt them", w: ["They help the moth see at night", "They make the moth fly faster"], why: "Eyespots can startle a hungry bird, giving the moth a moment to escape." },
  { q: "A tiger's stripes help it hide in…", e: "🐅🌾", a: "Tall grass and shadows", w: ["Open snowfields", "Clear blue water"], why: "Stripes break up a tiger's outline in grass and shadows, so prey spot it too late." },
  { q: "A harmless kingsnake has bands like a venomous coral snake. Why might that help it?", e: "🐍🚫", a: "Predators leave it alone", w: ["It becomes venomous too", "It can hide in snow"], why: "That's mimicry. Predators that learned to fear coral snakes avoid the look-alike too." },
  { q: "A flounder lies flat on the sandy sea floor. Its speckled skin helps it…", e: "🐟🏖️", a: "Blend in with the sand", w: ["Glow in the dark", "Float to the surface"], why: "Flounders can even shift their colors to match the sea floor beneath them." },
];
const ADAPT_MATCH: MatchBank = [
  ["Camel", "Fat-storing hump"],
  ["Duck", "Webbed feet for paddling"],
  ["Owl", "Huge eyes for night vision"],
  ["Porcupine", "Sharp quills"],
  ["Polar bear", "Thick fur and blubber"],
  ["Chameleon", "Changes color"],
  ["Giraffe", "Long neck for treetop leaves"],
  ["Hummingbird", "Long beak for nectar"],
];

const MIGRATE_Q: Pol[] = [
  { q: "What is migration?", e: "🦋🧭", a: "Traveling to a new place each season", w: ["Sleeping deeply all winter", "Changing color to hide"], why: "Many animals migrate to find food, warmth or a safe place to have babies — then return." },
  { q: "What is hibernation?", e: "🦔💤", a: "A long, deep winter rest that saves energy", w: ["Flying south for the winter", "Hunting only at night"], why: "Hibernating animals slow their heartbeat and breathing way down and live on stored fat." },
  { q: "Why do many birds fly south in the fall?", e: "🐦🍂", a: "To find food and warmer weather", w: ["To hibernate in caves", "Because summer is too cold"], why: "Winter means fewer insects and seeds. Flying somewhere warmer keeps food on the menu." },
  { q: "In winter, a groundhog's heart slows from about 80 beats a minute to about 5. Why?", e: "🐿️💤", a: "It's hibernating to save energy", w: ["It's scared of the snow", "It's migrating underground"], why: "A slow heart and a cool body use very little energy, so stored fat lasts all winter." },
  { q: "Monarch butterflies fly up to 3,000 miles to Mexico each fall. Why?", e: "🦋🌎", a: "To escape the freezing winter", w: ["To find snow", "To hibernate in Canada"], why: "Monarchs can't survive cold northern winters. Millions cluster on trees in Mexico's mountains." },
  { q: "Arctic terns migrate farther than any other animal. About how far do they fly each year?", e: "🐦🌍", a: "About 44,000 miles", w: ["About 4 miles", "About 400 miles"], why: "They fly from the Arctic to Antarctica and back — enjoying two summers every year!" },
  { q: "How do animals get ready to hibernate?", e: "🐻🍓", a: "They eat a lot and store fat", w: ["They stop eating all summer", "They grow thinner fur"], why: "In fall, hibernators feast. Their bodies burn the stored fat slowly all winter." },
  { q: "Which animal stays active all winter instead of hibernating or migrating?", e: "🐇❄️", a: "A snowshoe hare", w: ["A groundhog", "A monarch butterfly"], why: "Snowshoe hares grow a white coat and wide, furry feet that work like snowshoes." },
  { q: "Gray whales swim from the Arctic to warm lagoons near Mexico. Why?", e: "🐋🌊", a: "To give birth in warm, safe water", w: ["To hibernate on the beach", "Because the Arctic runs out of water"], why: "Calves are born in warm lagoons, then swim north to the Arctic's rich feeding waters." },
  { q: "Migration and hibernation are both…", e: "🧭💤", a: "Behavioral adaptations", w: ["Physical adaptations", "Tricks taught by parents"], why: "They're things animals do, so they're behavioral. Animals are born with the instinct to do them." },
  { q: "Squirrels bury acorns in the fall. How does that help them?", e: "🐿️🌰", a: "They have food to dig up in winter", w: ["Acorns keep their nests warm", "It helps them hibernate"], why: "Storing food is a behavioral adaptation. Forgotten acorns can even sprout into new oak trees!" },
  { q: "Salmon swim from the ocean back up the river where they hatched. Why?", e: "🐟🏞️", a: "To lay their eggs", w: ["To hibernate in the river", "To find warmer ocean water"], why: "Salmon find their home stream by smell — sometimes swimming hundreds of miles upstream." },
];
const WINTER_SORT: SortMany = { prompt: "How does each animal get through winter?", bins: [{ id: "migrate", label: "Migrates", emoji: "🧭" }, { id: "hibernate", label: "Hibernates", emoji: "💤" }, { id: "active", label: "Stays active", emoji: "❄️" }], items: [
  ["Monarch butterfly", "migrate", "🦋"], ["Arctic tern", "migrate", "🐦"], ["Gray whale", "migrate", "🐋"], ["Caribou", "migrate", "🦌"], ["Leatherback sea turtle", "migrate", "🐢"],
  ["Little brown bat", "hibernate", "🦇"], ["Groundhog", "hibernate", "🕳️"], ["European hedgehog", "hibernate", "🦔"], ["Arctic ground squirrel", "hibernate", "🐿️"], ["Dormouse", "hibernate", "🐭"],
  ["Snowshoe hare", "active", "🐇"], ["Red fox", "active", "🦊"], ["Gray wolf", "active", "🐺"], ["Beaver", "active", "🦫"], ["Great horned owl", "active", "🦉"],
] };

const TRAIT_Q: Pol[] = [
  { q: "Which trait is INHERITED — passed down from parents?", e: "🐅🧬", a: "A tiger's striped fur", w: ["A dog fetching on command", "A parrot saying “hello”"], why: "Inherited traits come from parents through genes. Learned behaviors come from experience." },
  { q: "Which behavior is LEARNED?", e: "🐕🎓", a: "A dog sitting when told “sit”", w: ["A spider spinning its first web", "A baby bird opening wide for food"], why: "Nobody teaches a spider to spin. Sitting on command is learned from training." },
  { q: "A spider spins a perfect web without ever seeing one. That's…", e: "🕷️🕸️", a: "An instinct — an inherited behavior", w: ["A learned behavior", "A lucky accident"], why: "Instincts are behaviors animals are born knowing how to do." },
  { q: "Where does your eye color come from?", e: "👁️👪", a: "Genes inherited from your parents", w: ["Copying your friends", "The foods you eat"], why: "Eye color is controlled by genes passed down from both parents." },
  { q: "Riding a bike is…", e: "🚲🧒", a: "A learned skill", w: ["An inherited trait", "An instinct"], why: "Nobody is born knowing how to ride a bike. You learned it by practicing!" },
  { q: "Baby sea turtles hatch on a beach and crawl straight to the ocean. That's…", e: "🐢🌊", a: "Instinct — it's inherited", w: ["Something their mom taught them", "A trick they practiced"], why: "Sea turtle moms leave before the eggs hatch, so babies rely on instinct to find the sea." },
  { q: "Two puppies from the same litter look a little different. Why?", e: "🐶🐶", a: "Each inherits a different mix of traits", w: ["One ate more carrots", "One practiced looking different"], why: "Offspring get a mix of traits from both parents, so brothers and sisters vary." },
  { q: "A dog learned lots of tricks. Will its puppies be born knowing them?", e: "🐕🐾", a: "No — learned behaviors aren't inherited", w: ["Yes, tricks pass to the puppies", "Only the easy tricks"], why: "Learned skills come from experience, not genes. Each puppy has to learn tricks for itself." },
  { q: "Young chimpanzees learn to fish termites out with sticks by…", e: "🐒🪵", a: "Watching and copying adults", w: ["Being born knowing how", "Growing longer fingers"], why: "Termite fishing is learned. Young chimps watch their mothers and practice for years." },
  { q: "A houseplant bends toward a sunny window. That's…", e: "🪴☀️", a: "An inherited response to light", w: ["A trick it learned from other plants", "Pure luck"], why: "Plants are born able to grow toward light — it's built into how their stems grow." },
  { q: "Which is an inherited trait of a plant?", e: "🌷🧬", a: "The color of its flowers", w: ["A stem bent from being stepped on", "A branch broken by wind"], why: "Flower color comes from genes. A bent stem or broken branch comes from the environment." },
  { q: "A songbird raised alone sings a simpler song than wild birds. What does that show?", e: "🐦🎶", a: "Birds learn parts of their song", w: ["Songs are fully inherited", "Birds can't sing alone"], why: "Many songbirds are born ready to sing but learn the details by listening to adults." },
];
const TRAIT_SORT: SortBank = { prompt: "Inherited trait or learned behavior?", bins: ["Inherited", "Learned", "🧬", "📚"], items: [
  ["Eye color", 1, "👁️"], ["A zebra's stripes", 1, "🦓"], ["A spider spinning a web", 1, "🕸️"], ["A cat's whiskers", 1, "🐱"],
  ["The shape of your earlobes", 1, "👂"], ["A newborn crying when hungry", 1, "👶"], ["A peacock's tail feathers", 1, "🦚"], ["A flower's petal color", 1, "🌸"],
  ["Riding a bike", 0, "🚲"], ["Reading a book", 0, "📖"], ["A dog fetching on command", 0, "🐕"], ["Speaking Spanish", 0, "🗣️"],
  ["Tying your shoes", 0, "👟"], ["A parrot saying “hello”", 0, "🦜"], ["Playing the piano", 0, "🎹"], ["Using a fork", 0, "🍴"],
] };

// ── Fossil Fjord ─────────────────────────────────────────────────────────────────────────
const FOSSIL_STEPS: [string, string][] = [
  ["An animal dies near water", "🦕"],
  ["Mud and sand quickly bury it", "🏖️"],
  ["Soft parts rot away; bones remain", "🦴"],
  ["New layers pile up and press the mud into rock", "🪨"],
  ["Minerals slowly replace the bones", "💎"],
  ["Erosion uncovers the fossil, ages later", "🔍"],
];
const FORM_Q: Pol[] = [
  { q: "What is a fossil?", e: "🦴🪨", a: "Remains or traces of ancient life in rock", w: ["Any very old rock", "A bone from last year"], why: "Fossils are preserved remains or traces of living things from long ago — usually over 10,000 years old." },
  { q: "Why do most fossils form in sedimentary rock, not lava rock?", e: "🏖️🌋", a: "Mud and sand bury remains gently", w: ["Lava preserves bones perfectly", "Fossils grow inside any rock"], why: "Sediment buries remains and slowly hardens into rock. Lava's heat would destroy them." },
  { q: "Which is MOST likely to become a fossil?", e: "🐚🌊", a: "A clam buried in sea-floor mud", w: ["A jellyfish washed up on a beach", "A leaf blowing across a parking lot"], why: "Hard parts buried quickly have the best chance. Soft or exposed remains usually rot away." },
  { q: "Why are fossils of soft animals like jellyfish so rare?", e: "🌊🔍", a: "Soft bodies rot before they can fossilize", w: ["Jellyfish are a brand-new animal", "Jellyfish never die"], why: "Fossils usually need hard parts — bones, teeth, shells — that last long enough to be buried." },
  { q: "How does a buried bone turn to stone?", e: "🦴💎", a: "Minerals in water slowly replace it", w: ["It freezes solid", "Heat melts it into rock"], why: "Mineral-rich water seeps into buried bone. Over time, minerals fill and replace it, making a stone copy." },
  { q: "An insect is found perfectly preserved in amber. What is amber?", e: "🦟🟠", a: "Hardened tree resin", w: ["Frozen honey", "Melted glass"], why: "Sticky tree resin trapped the insect. Over millions of years, the resin hardened into amber." },
  { q: "How long does a fossil usually take to form?", e: "⏳🪨", a: "Thousands to millions of years", w: ["About a week", "One summer"], why: "Fossils form very slowly as layers pile up and minerals seep in." },
  { q: "A mammoth was found frozen in Siberian ice, hair and all. What preserved it?", e: "🦣🧊", a: "The cold stopped it from rotting", w: ["It turned to stone overnight", "Lava sealed it in"], why: "Freezing preserves soft parts, the way a freezer keeps food from spoiling." },
  { q: "In undisturbed rock layers, where are the oldest fossils usually found?", e: "🪨📚", a: "In the bottom layers", w: ["In the top layers", "Only in the middle layer"], why: "Layers pile up over time, so lower layers are older — like a stack of old newspapers." },
  { q: "What is a mold fossil?", e: "🐚🕳️", a: "A hollow print left where a shell dissolved", w: ["A fossil covered in green fuzz", "A bone that is still alive"], why: "A buried shell can dissolve and leave a hollow mold. If minerals fill it, they make a cast." },
  { q: "A footprint pressed in mud hardened into rock. What kind of fossil is it?", e: "🐾🪨", a: "A trace fossil", w: ["A body fossil", "Not a fossil at all"], why: "Trace fossils show what an animal did — footprints, burrows, even fossilized poop!" },
  { q: "Why is it lucky when anything becomes a fossil?", e: "🍀🦴", a: "Most remains rot or get eaten first", w: ["Every animal becomes a fossil", "Fossils only form in museums"], why: "Only a tiny fraction of living things get buried fast enough, in the right place, to fossilize." },
];
const FOSSIL_KIND_SORT: SortBank = { prompt: "Body fossil or trace fossil?", bins: ["Body fossil (part of it)", "Trace fossil (a sign it was there)", "🦴", "🐾"], items: [
  ["A dinosaur thigh bone", 1, "🦴"], ["A shark tooth", 1, "🦈"], ["A trilobite shell", 1, "🐚"], ["An insect trapped in amber", 1, "🦟"],
  ["A mammoth frozen in ice", 1, "🦣"], ["Petrified wood", 1, "🪵"], ["A fish skeleton in rock", 1, "🐟"], ["A fern leaf pressed in stone", 1, "🌿"],
  ["Dinosaur footprints", 0, "🐾"], ["Fossilized poop", 0, "💩"], ["A worm's burrow in rock", 0, "🪱"], ["Tooth marks on a bone", 0, "🦷"],
  ["A tail-drag mark in old mud", 0, "〰️"], ["A nest hollow dug in the ground", 0, "🥚"], ["A snail's trail in old mud", 0, "🐌"],
] };

const CLUE_Q: Pol[] = [
  { q: "Fossil seashells are found high on a mountain. What does that tell us?", e: "🐚🏔️", a: "That rock was once under the sea", w: ["Birds dropped the shells there", "Shells can crawl up mountains"], why: "The rock formed under an ocean, then got pushed up over millions of years. Even Mount Everest has sea fossils!" },
  { q: "Fossils of ferns and trees are found in Antarctica. What does that show?", e: "🌿🧊", a: "Antarctica was once much warmer", w: ["Ferns grow on ice today", "Penguins planted them"], why: "Antarctica wasn't always icy. Long ago it was warmer, and forests grew there." },
  { q: "A fossil animal has sharp, pointy teeth. What did it probably eat?", e: "🦷🥩", a: "Meat", w: ["Only leaves", "Only seeds"], why: "Sharp teeth slice meat. Flat, wide teeth grind plants." },
  { q: "A fossil dinosaur has flat, grinding teeth. What did it probably eat?", e: "🦕🌿", a: "Plants", w: ["Meat", "Only fish"], why: "Flat teeth crush and grind tough plants, the way a cow's teeth do today." },
  { q: "Fish fossils are found in a dry desert. What does that suggest?", e: "🐟🏜️", a: "Water once covered that land", w: ["Fish used to walk in deserts", "The wind blew fish there"], why: "Fossils reveal ancient environments. A desert with fish fossils was once a lake or sea." },
  { q: "A dinosaur's fossil footprints are spaced far apart. What does that suggest?", e: "🐾📏", a: "The animal was running", w: ["The animal was sleeping", "The animal was tiny"], why: "Longer strides mean faster movement. Trackways let scientists estimate how fast dinosaurs moved." },
  { q: "How do fossils show that life on Earth has changed over time?", e: "🪨⏳", a: "Older rock layers hold different life forms", w: ["Fossils change shape each year", "All fossils look exactly alike"], why: "Deep, old layers hold creatures that no longer exist; newer layers hold more modern ones." },
  { q: "Coal, made from ancient plants, is found in some very cold places. What might that mean?", e: "🪨🌴", a: "Swampy forests once grew there", w: ["Coal grows in the snow", "Coal falls from space"], why: "Coal formed from layers of ancient swamp plants, squeezed and heated for millions of years." },
  { q: "Fossils of the same reptile are found in South America and Africa. What does that suggest?", e: "🦎🌍", a: "The continents were once joined", w: ["It swam across the whole ocean", "Two reptiles were invented"], why: "Mesosaurus fossils on both continents helped show they were once connected." },
  { q: "Scientists study fossil leaves to learn about…", e: "🍂🔬", a: "What the climate was like long ago", w: ["How deep the oceans are today", "Next week's weather"], why: "Leaf shapes and sizes give clues about ancient temperatures and rainfall." },
  { q: "A mammoth fossil has thick, long hair. What climate did it live in?", e: "🦣❄️", a: "A cold, icy climate", w: ["A hot rainforest", "A warm, sandy beach"], why: "Thick fur is an adaptation for cold. Woolly mammoths lived during the Ice Age." },
  { q: "Which fossil find tells us the most about an animal's behavior?", e: "🐾🐾", a: "Many trackways side by side", w: ["A single loose tooth", "A piece of petrified wood"], why: "Many tracks heading the same way suggest some dinosaurs traveled in herds." },
];
const FOSSIL_MATCH: MatchBank = [
  ["Seashells on a mountaintop", "Land once under the sea"],
  ["Fern fossils in Antarctica", "A once-warm climate"],
  ["Sharp, pointy teeth", "A meat eater"],
  ["Flat, grinding teeth", "A plant eater"],
  ["Fish fossils in a desert", "An old lake or sea"],
  ["Woolly mammoth fur", "An icy climate"],
  ["Many tracks side by side", "Animals moving in a herd"],
];

const DIG_STEPS: [string, string][] = [
  ["Search eroded rock for bones peeking out", "🔍"],
  ["Carefully chip and brush away rock", "🖌️"],
  ["Map and photograph where each bone lies", "📸"],
  ["Wrap the bones in plaster jackets", "🧻"],
  ["Carry them to the lab", "🚚"],
  ["Clean, study and rebuild the skeleton", "🦖"],
];
const DIG_Q: Pol[] = [
  { q: "What does a paleontologist study?", e: "🦴🔍", a: "Ancient life, using fossils", w: ["Ancient human tools and pottery", "Weather and clouds"], why: "Paleontologists study fossils of ancient life. Archaeologists study things made by people." },
  { q: "Why do paleontologists dig with small brushes and picks?", e: "🖌️🦴", a: "To avoid breaking fragile fossils", w: ["To dig faster than with shovels", "Because fossils are magnetic"], why: "Fossils can be fragile. Slow, careful work keeps them in one piece." },
  { q: "Why are fossils wrapped in plaster before they're moved?", e: "🦴🧻", a: "To protect them, like a cast", w: ["To make them heavier", "To keep them warm"], why: "A plaster jacket holds a fossil together so it doesn't crack on the trip to the lab." },
  { q: "Why map and photograph where each bone was found?", e: "📸🗺️", a: "Its position gives important clues", w: ["To decorate the museum", "So they can bury it again"], why: "Where bones lie — and what's near them — can show how an animal lived and died." },
  { q: "Only some bones of a dinosaur are found. How do scientists show the whole skeleton?", e: "🦖🧩", a: "They compare it with related animals", w: ["They make up any shape they like", "They wait for the bones to grow"], why: "Scientists model missing parts from related species — and update them when new fossils turn up." },
  { q: "Where are fossils most often discovered?", e: "🏜️🔍", a: "Where erosion has exposed old rock layers", w: ["In fresh lava fields", "Inside living trees"], why: "Wind and water wear rock away, revealing fossils in cliffs, canyons and badlands." },
  { q: "Mary Anning found amazing fossils on England's coast in the 1800s. What did they show?", e: "👧🦕", a: "Giant reptiles once swam in ancient seas", w: ["Dinosaurs lived alongside people", "Fossils are just oddly shaped rocks"], why: "She dug up ichthyosaurs and plesiosaurs, starting as a kid. Her finds changed science." },
  { q: "How can scientists tell how old a fossil is?", e: "🪨⏳", a: "By dating the rock layers around it", w: ["By counting its teeth", "By weighing it"], why: "Scientists date the layers above and below a fossil, often using radioactive elements as natural clocks." },
  { q: "A new fossil doesn't match any known animal. What might it be?", e: "❓🦴", a: "A species no one has discovered before", w: ["A mistake, so they throw it away", "A rock that grew a skull"], why: "New species turn up all the time — dozens of new dinosaurs are named every year!" },
  { q: "Why might a paleontologist study a chicken to learn about dinosaurs?", e: "🐔🦖", a: "Birds are living dinosaurs", w: ["Chickens are older than dinosaurs", "Chickens eat fossils"], why: "Birds evolved from small, feathered dinosaurs, so they share many bones and behaviors." },
  { q: "Why do paleontologists keep careful notes and labels?", e: "📓🏷️", a: "So others can check and build on the find", w: ["Notes make fossils harder", "To keep the dig secret forever"], why: "Science is shared. Good records let other scientists check findings and learn from them." },
  { q: "Which tool would a paleontologist NOT use right next to the bones?", e: "⛏️🦴", a: "A bulldozer", w: ["A small brush", "A notebook"], why: "Machines may clear rock far away, but near fossils scientists work slowly, by hand." },
];

const EXTINCT_Q: Pol[] = [
  { q: "What does “extinct” mean?", e: "🦤❌", a: "No members of that species are left alive", w: ["Hiding where no one can see", "Sleeping for the winter"], why: "Once a species is extinct, it's gone forever. Fossils show us many that once lived." },
  { q: "What helped wipe out most dinosaurs 66 million years ago?", e: "☄️🦖", a: "A giant asteroid hitting Earth", w: ["Cave people hunting them", "They all got too old"], why: "An asteroid about 6 miles wide struck what is now Mexico and changed Earth's climate." },
  { q: "Did ALL the dinosaurs go extinct?", e: "🐦🦖", a: "No — birds are living dinosaurs", w: ["Yes, every single one", "No — some hide deep in jungles"], why: "Birds descended from small, feathered dinosaurs. The robin outside your window is a dinosaur!" },
  { q: "Did people and T. rex ever live at the same time?", e: "🦖🧍", a: "No — they lived millions of years apart", w: ["Yes, people hunted them", "Yes, people kept them as pets"], why: "T. rex died out about 66 million years ago. Humans appeared only about 300,000 years ago." },
  { q: "The dodo bird went extinct about 350 years ago. What happened?", e: "🦤⛵", a: "Hunting and new predators from ships", w: ["An asteroid hit its island", "It flew away to a new home"], why: "Dodos couldn't fly and had no fear. Sailors, plus the rats and pigs they brought, wiped them out." },
  { q: "What can cause a species to go extinct?", e: "🌍⚠️", a: "Its habitat changes faster than it can adapt", w: ["It has too many babies", "It becomes too healthy"], why: "Habitat loss, climate change, new predators and disease can all drive a species to extinction." },
  { q: "Were woolly mammoths still alive when the first Egyptian pyramids were built?", e: "🦣🔺", a: "Yes — a few lived on a remote island", w: ["No — they died with the dinosaurs", "No — mammoths never existed"], why: "The last mammoths lived on an Arctic island until about 4,000 years ago — after the first pyramids!" },
  { q: "What is an endangered species?", e: "🐼⚠️", a: "One at risk of going extinct", w: ["One that is already extinct", "One that is dangerous to people"], why: "Endangered species still exist but are in trouble. Protecting their habitats can save them." },
  { q: "How do we know about animals that died out before people existed?", e: "🦴📖", a: "From fossils", w: ["From old photographs", "From cave paintings of dinosaurs"], why: "Fossils are a record in stone of life that vanished long before anyone was around to see it." },
  { q: "Bald eagles were once endangered. Why are they doing well now?", e: "🦅📈", a: "People banned a harmful pesticide", w: ["They grew bigger wings", "All their predators went extinct"], why: "After the pesticide DDT was banned and eagles were protected, their numbers soared again." },
  { q: "Most species that ever lived on Earth are…", e: "🌍📊", a: "Extinct", w: ["Still alive today", "Living only in zoos"], why: "Scientists estimate more than 99% of all species that ever lived are now extinct." },
  { q: "How do we know saber-toothed cats had huge fangs?", e: "🐅🦷", a: "From their fossil skulls", w: ["From photos taken long ago", "From modern tigers' teeth"], why: "Thousands of fossils, many from California's La Brea Tar Pits, show their dagger-like teeth." },
];
const DINO_TRUTH: SortBank = { prompt: "Dinosaur fact or myth?", bins: ["True fact", "Myth", "✅", "❌"], items: [
  ["Birds are living dinosaurs", 1, "🐦"], ["Some dinosaurs had feathers", 1, "🪶"], ["Stegosaurus died out long before T. rex lived", 1, "🦖"], ["Dinosaurs lived on every continent", 1, "🌍"],
  ["All dinosaurs hatched from eggs", 1, "🥚"], ["An asteroid helped end the dinosaur age", 1, "☄️"], ["Some dinosaurs were chicken-sized", 1, "🐔"], ["Sauropods were the biggest land animals ever", 1, "🦕"],
  ["Cave people hunted T. rex", 0, "🏹"], ["Pterosaurs were flying dinosaurs", 0, "🦇"], ["Every dinosaur was huge", 0, "🐘"], ["Plesiosaurs were swimming dinosaurs", 0, "🌊"],
  ["T. rex could only see moving things", 0, "👀"], ["Oil comes from dinosaur bodies", 0, "🛢️"], ["Dimetrodon, with its back sail, was a dinosaur", 0, "🦎"], ["Scientists can never learn a dinosaur's color", 0, "🎨"],
] };

// ── Simple Machine Shipyard ──────────────────────────────────────────────────────────────
const MACHINE_Q: Pol[] = [
  { q: "What does a simple machine do?", e: "⚙️💪", a: "Makes work easier by changing a force", w: ["Creates energy from nothing", "Does work with no force at all"], why: "Simple machines change the size or direction of a force. They never make energy from nothing." },
  { q: "In science, “work” happens when…", e: "📦➡️", a: "A force moves something a distance", w: ["You think really hard", "You push a wall that won't move"], why: "Work = force × distance. Pushing a wall that never moves does no work — even if you're tired!" },
  { q: "A lever balances and turns on a point called the…", e: "⚖️📍", a: "Fulcrum", w: ["Axle", "Thread"], why: "The fulcrum is the pivot. Moving it changes how much force you need." },
  { q: "Why is pushing a box up a ramp easier than lifting it straight up?", e: "📦📐", a: "You use less force over a longer path", w: ["The box gets lighter on a ramp", "Ramps turn off gravity"], why: "An inclined plane trades distance for force: a longer path, but a gentler push." },
  { q: "A screw is really…", e: "🔩🌀", a: "An inclined plane wrapped around a pole", w: ["A tiny wheel and axle", "Two levers stuck together"], why: "Unwrap a screw's threads and you'd have a long, skinny ramp!" },
  { q: "Why is a wedge useful?", e: "🪓🪵", a: "It pushes things apart as it's driven in", w: ["It lifts things straight up", "It spins around an axle"], why: "A wedge turns a downward push into sideways pushes that split wood or hold a door." },
  { q: "How does one fixed pulley at the top of a flagpole help?", e: "🪢⬆️", a: "It changes the direction of your pull", w: ["It makes the flag lighter", "It does all the work for you"], why: "Pulling DOWN raises the flag UP. A single fixed pulley changes direction, not the amount of force." },
  { q: "How does a doorknob make a latch easier to open?", e: "🚪🔄", a: "Turning the big knob turns the small axle", w: ["It makes the door lighter", "It pushes the door open by itself"], why: "It's a wheel and axle: a small force on the big wheel makes a strong turn of the small axle." },
  { q: "Which simple machine is a wheelchair ramp?", e: "♿📐", a: "An inclined plane", w: ["A pulley", "A wedge"], why: "A ramp is an inclined plane — a slanted surface that makes going up easier." },
  { q: "Which simple machine is the blade of an axe?", e: "🪓🌲", a: "A wedge", w: ["A lever", "A screw"], why: "An axe blade is a wedge. Its thin edge splits wood apart as it's driven in." },
  { q: "Can a simple machine give out more work than you put in?", e: "⚙️❓", a: "No — it trades force for distance", w: ["Yes, that's how they work", "Yes, if it's oiled well"], why: "Machines can't create energy. Friction even wastes a little, turning it into heat." },
  { q: "Which simple machine is a rope running over a grooved wheel?", e: "🏗️🪢", a: "A pulley", w: ["A lever", "A wedge"], why: "A pulley's rope runs over a grooved wheel to lift loads or change the direction of a pull." },
];
const MACHINE_MATCH: MatchBank = [
  ["Lever", "Seesaw"],
  ["Pulley", "Flagpole rope"],
  ["Wheel and axle", "Doorknob"],
  ["Inclined plane", "Wheelchair ramp"],
  ["Wedge", "Axe blade"],
  ["Screw", "Jar lid"],
];
const MACHINE_PARTS: MatchBank = [
  ["Lever", "A bar that pivots on a fulcrum"],
  ["Pulley", "A rope over a grooved wheel"],
  ["Wheel and axle", "A wheel turning on a rod"],
  ["Inclined plane", "A slanted surface, like a ramp"],
  ["Wedge", "Two slopes meeting at an edge"],
  ["Screw", "A ramp wrapped around a pole"],
];

const WHICH_Q: Pol[] = [
  { q: "A pair of scissors is made of two…", e: "✂️🔍", a: "Levers with wedge-shaped blades", w: ["Pulleys", "Screws"], why: "Each half of the scissors is a lever with its fulcrum at the pin; the blades are wedges." },
  { q: "A seesaw is which simple machine?", e: "⚖️🧒", a: "A lever", w: ["A pulley", "A screw"], why: "A seesaw is a lever with the fulcrum in the middle." },
  { q: "A crane lifts heavy steel beams with cables and…", e: "🏗️⬆️", a: "Pulleys", w: ["Wedges", "Screws"], why: "Cranes use several pulleys working together, so the motor can lift huge loads." },
  { q: "A jar lid twists on with spiral ridges. Which machine is that?", e: "🍯🔄", a: "A screw", w: ["A wedge", "A lever"], why: "The spiral ridges are threads — an inclined plane wrapped around the jar's mouth." },
  { q: "Your front teeth bite into an apple. They work like…", e: "🦷🍎", a: "Wedges", w: ["Pulleys", "Wheels and axles"], why: "Front teeth are wedges: their sharp edges split food apart." },
  { q: "A zigzag road up a mountain is like which machine?", e: "⛰️🚗", a: "An inclined plane", w: ["A pulley", "A lever"], why: "Zigzagging makes a longer, gentler slope, so cars climb with less force." },
  { q: "A bottle opener prying off a cap is which machine?", e: "🍾⬆️", a: "A lever", w: ["A screw", "A wheel and axle"], why: "The opener pivots on the cap's edge — the fulcrum — and multiplies your lifting force." },
  { q: "A steering wheel turns a car's wheels using which machine?", e: "🚗🔄", a: "A wheel and axle", w: ["A wedge", "An inclined plane"], why: "A turn of the big steering wheel turns its narrow axle with extra force." },
  { q: "When you sweep, your broom works as which machine?", e: "🧹🧒", a: "A lever", w: ["A pulley", "A screw"], why: "Your top hand is the fulcrum and your lower hand pushes, so the bristles sweep fast and far." },
  { q: "A zipper's slider opens and closes the teeth using tiny…", e: "🤐🧥", a: "Wedges", w: ["Pulleys", "Screws"], why: "Wedges inside the slider push the zipper's teeth together or pry them apart." },
  { q: "Window blinds rise when you pull the cord down. What's inside?", e: "🪟⬇️", a: "Pulleys", w: ["Wedges", "Screws"], why: "The cord runs over small pulleys that turn your downward pull into an upward lift." },
  { q: "A doorstop jammed under a door holds it open. Which machine is it?", e: "🚪🛑", a: "A wedge", w: ["A lever", "A pulley"], why: "A doorstop is a wedge: pushing it in jams it tight, and friction holds the door." },
];
const MACHINE_SORT_LIFT: SortMany = { prompt: "Lever, pulley, or wheel and axle?", bins: [{ id: "lever", label: "Lever", emoji: "⚖️" }, { id: "pulley", label: "Pulley", emoji: "🏗️" }, { id: "wheel", label: "Wheel and axle", emoji: "🎡" }], items: [
  ["Seesaw", "lever", "⚖️"], ["Claw hammer pulling a nail", "lever", "🔨"], ["Bottle opener", "lever", "🍾"], ["Fishing rod", "lever", "🎣"], ["Broom", "lever", "🧹"],
  ["Flagpole rope", "pulley", "🪢"], ["Window blinds cord", "pulley", "🪟"], ["Construction crane", "pulley", "🏗️"], ["Elevator cables", "pulley", "🛗"], ["Sail rope on a sailboat", "pulley", "⛵"],
  ["Doorknob", "wheel", "🚪"], ["Ferris wheel", "wheel", "🎡"], ["Skateboard wheels", "wheel", "🛹"], ["Faucet handle", "wheel", "🚰"], ["Pencil sharpener crank", "wheel", "✏️"],
] };
const MACHINE_SORT_SLOPE: SortMany = { prompt: "Inclined plane, wedge, or screw?", bins: [{ id: "ramp", label: "Inclined plane", emoji: "📐" }, { id: "wedge", label: "Wedge", emoji: "🪓" }, { id: "screw", label: "Screw", emoji: "🔩" }], items: [
  ["Wheelchair ramp", "ramp", "♿"], ["Truck loading ramp", "ramp", "🚚"], ["Skateboard ramp", "ramp", "🛹"], ["Zigzag mountain road", "ramp", "⛰️"], ["Slide at the park", "ramp", "🧒"],
  ["Axe blade", "wedge", "🪓"], ["Kitchen knife", "wedge", "🔪"], ["Doorstop", "wedge", "🚪"], ["Front teeth", "wedge", "🦷"], ["Zipper slider", "wedge", "🤐"],
  ["Jar lid", "screw", "🍯"], ["Light bulb base", "screw", "💡"], ["Wood screw", "screw", "🔩"], ["Corkscrew", "screw", "🍾"], ["Twist-off bottle cap", "screw", "🧴"],
] };

const TRADEOFF_Q: Pol[] = [
  { q: "A long ramp and a short, steep ramp reach the same porch. Which needs less force?", e: "📐🏠", a: "The long ramp", w: ["The short, steep ramp", "They need exactly the same force"], why: "A longer ramp spreads the work over more distance, so each push can be gentler." },
  { q: "A ramp lets you push with less force. What's the trade-off?", e: "📦📏", a: "You move the box a longer distance", w: ["The box gets heavier", "There is no trade-off"], why: "Simple machines trade force for distance: less force, more distance." },
  { q: "To lift a heavy rock with a lever most easily, where should the fulcrum go?", e: "🪨⚖️", a: "Close to the rock", w: ["Close to your hands", "Far from both"], why: "With the fulcrum near the load, a small push on the long end lifts the heavy rock." },
  { q: "Why do mechanics use long wrenches on tight bolts?", e: "🔧🔩", a: "A longer handle means less force is needed", w: ["Long wrenches are lighter", "Long wrenches spin by themselves"], why: "A longer handle is like a longer lever arm: the same push turns the bolt with more force." },
  { q: "Why are door handles placed far from the hinges?", e: "🚪↔️", a: "It takes less force to swing the door", w: ["The door is lighter there", "That side has less gravity"], why: "The hinge is the pivot. Pushing far from it gives more turning force — try pushing near the hinge!" },
  { q: "A pulley system lets you lift a load with half the force. What's the catch?", e: "🏗️🪢", a: "You pull twice as much rope", w: ["The load gets heavier", "Nothing — it's free help"], why: "Pulley systems trade force for distance: half the force means pulling twice as much rope." },
  { q: "A screw with tightly packed threads turns more easily. Why?", e: "🔩🔍", a: "Each turn moves it a shorter distance", w: ["It has less metal", "Screws are magnetic"], why: "Close threads make a gentler “ramp”: less force per turn, but more turns to go in." },
  { q: "Why does a thin, sharp wedge cut better than a thick, blunt one?", e: "🔪🧀", a: "A thin wedge needs less force to push in", w: ["Thick wedges always cut better", "Sharpness doesn't matter"], why: "A long, thin wedge spreads the work over more distance, so it slices with less force." },
  { q: "A bike in low gear makes climbing a hill…", e: "🚲⛰️", a: "Easier, but your feet turn more times", w: ["Harder, with fewer pedal turns", "Exactly the same"], why: "Low gear trades distance for force: more pedaling, but each push is easier." },
  { q: "Do simple machines reduce the amount of work you do?", e: "⚙️🤔", a: "No — they make the same work feel easier", w: ["Yes, they cut work in half", "Yes, they do it all for you"], why: "The work stays the same (a bit more, because of friction). Machines just spread out the force." },
  { q: "You lift a 100-pound rock with a 25-pound push on a lever. What else must be true?", e: "🪨⚖️", a: "Your end moves farther than the rock", w: ["The rock now weighs 25 pounds", "The rock moves farther than your end"], why: "To lift four times your push, your end of the lever travels about four times as far as the rock." },
  { q: "Why does a nutcracker work best if you squeeze near the ends of the handles?", e: "🥜💪", a: "Long handles multiply your squeeze", w: ["The ends are softer", "The nut is closer to your hand there"], why: "A nutcracker is a lever. Squeezing far from the hinge gives the most cracking force." },
];

const COMPOUND_Q: Pol[] = [
  { q: "What is a compound machine?", e: "⚙️⚙️", a: "Two or more simple machines working together", w: ["Any machine with a motor", "A very large lever"], why: "Bikes, scissors and can openers all combine simple machines to do bigger jobs." },
  { q: "A bicycle uses which simple machines?", e: "🚲🔧", a: "Wheels and axles, levers and screws", w: ["Only a wedge", "Only an inclined plane"], why: "Pedal cranks and brake handles are levers, the wheels turn on axles, and screws hold it together." },
  { q: "Scissors combine which simple machines?", e: "✂️📄", a: "Levers and wedges", w: ["Pulleys and screws", "Wheels and inclined planes"], why: "Each handle is a lever, and each sharp blade is a wedge." },
  { q: "A wheelbarrow combines a lever with a…", e: "🧱🛒", a: "Wheel and axle", w: ["Screw", "Pulley"], why: "The wheel is the lever's fulcrum, and it rolls on an axle." },
  { q: "A can opener has lever handles, a turning crank, and a sharp…", e: "🥫🔄", a: "Wedge that cuts the lid", w: ["Pulley that lifts the can", "Ramp that rolls the can"], why: "The cutting wheel is a wedge, the crank is a wheel and axle, and the handles are levers." },
  { q: "Which of these is NOT a compound machine?", e: "🚪❓", a: "A doorstop", w: ["A bicycle", "A pair of scissors"], why: "A doorstop is a single wedge. Bikes and scissors combine several simple machines." },
  { q: "A shovel digging into dirt uses a lever and a…", e: "🌱⛏️", a: "Wedge", w: ["Pulley", "Screw"], why: "The blade's edge is a wedge that slices into dirt; the handle works as a lever." },
  { q: "A crank pencil sharpener uses which simple machines?", e: "✏️🔄", a: "A wheel and axle, plus wedges", w: ["Only a pulley", "Only a ramp"], why: "The crank is a wheel and axle, and the sharp blades are wedges that shave the wood." },
  { q: "Why are compound machines so useful?", e: "🏗️💡", a: "Combining machines multiplies their help", w: ["They never need any force", "They create their own energy"], why: "Each simple machine adds an advantage, so together they can do jobs one alone can't." },
  { q: "A crane uses pulleys plus a long arm that pivots like a…", e: "🏗️📍", a: "Lever", w: ["Wedge", "Screw"], why: "The crane's arm pivots like a lever while pulleys lift the load." },
  { q: "Your forearm lifting a backpack works like which simple machine?", e: "💪🎒", a: "A lever, with your elbow as the fulcrum", w: ["A pulley, with your hand as the rope", "A screw, with fingers as threads"], why: "Bones act as levers and joints as fulcrums. Muscles pull to move them." },
  { q: "A spiral staircase is shaped like which simple machine?", e: "🌀🪜", a: "A screw", w: ["A wedge", "A pulley"], why: "It's an inclined plane wrapped around a pole — just like a screw's threads." },
];

// ═══ 4th grade ═════════════════════════════════════════════════════════════════════════════

// ── Energy Estuary ───────────────────────────────────────────────────────────────────────
const FORMS_Q: Pol[] = [
  { q: "What is energy?", e: "⚡🌍", a: "The ability to do work or cause change", w: ["A kind of matter you can hold", "Only electricity"], why: "Energy makes things move, heat up, light up or change. It comes in many forms." },
  { q: "A stretched rubber band has which kind of energy?", e: "🏹➰", a: "Stored (elastic potential) energy", w: ["Sound energy", "Light energy"], why: "Stretching stores energy in the band. Let go, and it changes into motion!" },
  { q: "Food has energy stored in it. What form is it?", e: "🍌🔋", a: "Chemical energy", w: ["Electrical energy", "Sound energy"], why: "Food stores chemical energy. Your body releases it to move, grow and stay warm." },
  { q: "A guitar string vibrates. What form of energy reaches your ears?", e: "🎸👂", a: "Sound energy", w: ["Light energy", "Chemical energy"], why: "Sound is energy carried by vibrations moving through the air." },
  { q: "A rolling bowling ball has which kind of energy?", e: "🎳➡️", a: "Motion (kinetic) energy", w: ["Stored chemical energy", "Only sound energy"], why: "Anything moving has kinetic energy. The faster and heavier it is, the more it has." },
  { q: "Which has the MOST kinetic energy?", e: "🚚💨", a: "A truck speeding down a highway", w: ["The same truck parked", "A rolling marble"], why: "Kinetic energy depends on mass and speed. A big, fast truck has a huge amount." },
  { q: "How does the Sun's energy reach Earth?", e: "☀️🌍", a: "As light, through empty space", w: ["As sound waves", "Through the air all the way"], why: "Sunlight crosses about 93 million miles of empty space in roughly 8 minutes." },
  { q: "Why can't sound travel through outer space?", e: "🚀🔇", a: "There's no air to carry the vibrations", w: ["Space is too cold for sound", "Sound needs sunlight"], why: "Sound needs matter — air, water or solids — to travel through. Space is nearly empty, so it's silent." },
  { q: "A battery stores energy in which form?", e: "🔋🧪", a: "Chemical energy", w: ["Sound energy", "Motion energy"], why: "Chemicals inside a battery react to push electric current through a circuit." },
  { q: "A cup of hot cocoa has more of which energy than a cold one?", e: "☕🔥", a: "Thermal (heat) energy", w: ["Sound energy", "Elastic energy"], why: "Thermal energy comes from the motion of tiny particles. In hotter things, they move faster." },
  { q: "A book sits on a high shelf. What energy does it have?", e: "📚⬆️", a: "Stored (gravitational) energy", w: ["None — it isn't moving", "Sound energy"], why: "Lifted objects store energy. If the book falls, that energy turns into motion." },
  { q: "Which is an example of electrical energy?", e: "⚡☁️", a: "Lightning", w: ["A stretched spring", "A sandwich"], why: "Lightning is a giant spark of electricity jumping between clouds or to the ground." },
];
const FORMS_MATCH: MatchBank = [
  ["Light", "A glowing lamp"],
  ["Sound", "A ringing bell"],
  ["Thermal (heat)", "A hot stove burner"],
  ["Electrical", "Current in a wire"],
  ["Kinetic (motion)", "A speeding bike"],
  ["Elastic (stored)", "A stretched slingshot"],
  ["Chemical", "A peanut butter sandwich"],
];

const TRANSFER_Q: Pol[] = [
  { q: "In a flashlight, which energy changes happen?", e: "🔦🔋", a: "Chemical → electrical → light and heat", w: ["Light → chemical → sound", "Heat → motion → chemical"], why: "The battery's chemical energy becomes electricity, and the bulb turns it into light — plus a little heat." },
  { q: "A toaster changes electrical energy mostly into…", e: "🍞🔥", a: "Thermal (heat) energy", w: ["Sound energy", "Chemical energy"], why: "Wires inside glow hot. Electrical energy becomes the heat that browns the bread." },
  { q: "You eat breakfast, then run a race. Energy changes from…", e: "🥣🏃", a: "Chemical to motion (and heat)", w: ["Motion to chemical", "Sound to light"], why: "Your body turns food's chemical energy into motion — and warmth. That's why running makes you hot!" },
  { q: "Can energy be created or destroyed?", e: "♾️⚡", a: "No — it only changes form or moves", w: ["Yes — batteries create it", "Yes — it disappears when used"], why: "Energy is never made or destroyed. It changes form, often ending up as heat." },
  { q: "A solar panel changes…", e: "☀️🔌", a: "Light into electrical energy", w: ["Electrical into light energy", "Sound into heat"], why: "Solar cells turn sunlight directly into electricity — with no moving parts!" },
  { q: "In a wind turbine, what turns into electrical energy?", e: "💨⚡", a: "The motion of the spinning blades", w: ["The sound of the wind", "The color of the sky"], why: "Wind spins the blades, which turn a generator. Motion energy becomes electrical energy." },
  { q: "Where did the chemical energy in an apple first come from?", e: "🍎☀️", a: "Sunlight captured by the apple tree", w: ["The soil only", "Rainwater"], why: "Plants capture light energy and store it as chemical energy in sugar. Every apple is stored sunlight!" },
  { q: "Two toy cars crash and stop. Where did their motion energy go?", e: "🚗💥", a: "Into sound, heat and bending the cars", w: ["It vanished completely", "Back into the batteries"], why: "In a crash, motion energy becomes sound, heat and changes in shape. It never just disappears." },
  { q: "A glowing light bulb gets warm. Where did the heat come from?", e: "💡🌡️", a: "Some electrical energy became heat", w: ["The bulb was already warm", "The light turned into cold"], why: "No device turns all its energy into the form we want. Old-style bulbs made more heat than light!" },
  { q: "A ball rolling across the floor slows and stops. Where did its energy go?", e: "⚽🛑", a: "Mostly into heat, from friction", w: ["It was destroyed", "Back into your hand"], why: "Friction turns motion energy into thermal energy. The floor and ball warm up a tiny bit." },
  { q: "You rub a balloon on your hair and it sticks to the wall. What's at work?", e: "🎈⚡", a: "Static electricity", w: ["Sound energy", "Chemical energy"], why: "Rubbing moves tiny charged particles called electrons. The charged balloon is pulled to the wall." },
  { q: "A drummer hits a drum. What energy change happens?", e: "🥁🔊", a: "Motion energy becomes sound energy", w: ["Sound becomes chemical energy", "Light becomes motion energy"], why: "The stick's motion makes the drumhead vibrate, sending sound waves through the air." },
];
const FLASHLIGHT_STEPS: [string, string][] = [
  ["Slide the switch to close the circuit", "👆"],
  ["Chemicals in the battery react", "🔋"],
  ["Electric current flows through the wires", "⚡"],
  ["The bulb changes electricity into light", "💡"],
];
const SUN_STEPS: [string, string][] = [
  ["The Sun gives off light energy", "☀️"],
  ["A corn plant captures the light", "🌽"],
  ["The plant stores it as sugar (chemical energy)", "🍬"],
  ["You eat the corn", "😋"],
  ["Your muscles use the energy to move", "🏃"],
];

const KP_Q: Pol[] = [
  { q: "A roller coaster car sits at the top of the first hill. Which energy is greatest?", e: "🎢⬆️", a: "Stored (potential) energy", w: ["Motion (kinetic) energy", "Sound energy"], why: "Being high up stores energy. Gravity is ready to turn it into speed." },
  { q: "Where on the ride is the coaster car moving fastest?", e: "🎢⬇️", a: "At the bottom of the biggest drop", w: ["At the very top of the hill", "While it slowly climbs"], why: "On the way down, stored energy becomes motion energy, so speed peaks at the bottom." },
  { q: "You stretch a slingshot. What happens when you let go?", e: "🏹💨", a: "Stored energy turns into motion energy", w: ["Motion energy turns into stored energy", "The energy disappears"], why: "The stretched band stores elastic energy. Let go, and it pushes the object into motion." },
  { q: "Which ball has more stored (potential) energy?", e: "⚽🪜", a: "One held high on a ladder", w: ["One resting on the floor", "One held at your knees"], why: "The higher an object is lifted, the more gravitational energy it stores." },
  { q: "Where does a swinging pendulum have the most motion energy?", e: "🕰️↔️", a: "At the bottom of its swing", w: ["At its highest point", "It's equal everywhere"], why: "At the top it pauses — stored energy. At the bottom it's fastest — motion energy." },
  { q: "You wind up a toy car and let go. What energy change happens?", e: "🚙🔄", a: "Stored energy becomes motion energy", w: ["Motion becomes stored energy", "Sound becomes chemical energy"], why: "Winding coils a spring, storing energy. As it unwinds, the car zooms." },
  { q: "Two identical bikes roll past. One is faster. Which has more kinetic energy?", e: "🚲🚲", a: "The faster bike", w: ["The slower bike", "They have the same"], why: "Kinetic energy grows with speed. Double the speed means four times the energy!" },
  { q: "A bowling ball and a tennis ball roll at the same speed. Which has more kinetic energy?", e: "🎳🎾", a: "The bowling ball", w: ["The tennis ball", "They have the same"], why: "More mass at the same speed means more kinetic energy — that's why it sends pins flying." },
  { q: "A dropped ball bounces a little lower each time. Why?", e: "🏀📉", a: "Some energy turns to heat and sound each bounce", w: ["Gravity gets stronger", "The ball gets heavier"], why: "Each bounce turns a little energy into sound and heat, so less is left to lift the ball." },
  { q: "Water held high behind a dam has which kind of energy?", e: "🏞️💧", a: "Stored (potential) energy", w: ["Sound energy", "Light energy"], why: "High water stores energy. Released through the dam, it rushes down and spins turbines." },
  { q: "You toss a ball straight up. At its highest point, what's true?", e: "⚾⬆️", a: "It has the most stored energy", w: ["It has the most motion energy", "It has no energy at all"], why: "At the top it stops for an instant: motion energy has become stored energy, ready to fall." },
  { q: "A diver steps off a high board. What energy grows as she falls?", e: "🏊⬇️", a: "Motion (kinetic) energy", w: ["Stored (potential) energy", "Only chemical energy"], why: "Her stored energy from being up high changes into motion energy as she falls." },
];
const KP_SORT: SortBank = { prompt: "Mostly motion energy or mostly stored energy?", bins: ["Motion (kinetic)", "Stored (potential)", "🏃", "🔋"], items: [
  ["A spinning fan", 1, "🌀"], ["A falling raindrop", 1, "💧"], ["A rolling skateboard", 1, "🛹"], ["A flying baseball", 1, "⚾"],
  ["A speeding race car", 1, "🏎️"], ["Wind blowing", 1, "💨"], ["A running dog", 1, "🐕"], ["Crashing ocean waves", 1, "🌊"],
  ["A drawn bow before the shot", 0, "🏹"], ["A battery in a drawer", 0, "🔋"], ["A book on a high shelf", 0, "📚"], ["A wound-up spring toy", 0, "🧸"],
  ["Water behind a dam", 0, "🏞️"], ["A sandwich in a lunchbox", 0, "🥪"], ["A coaster car paused at the top", 0, "🎢"], ["A pile of firewood", 0, "🪵"],
] };

const RESOURCE_Q: Pol[] = [
  { q: "What makes an energy resource renewable?", e: "♻️🌍", a: "Nature replaces it quickly", w: ["It's very expensive", "It comes from underground"], why: "Renewable resources like sunlight and wind are replaced naturally — they won't run out." },
  { q: "Why are coal, oil and natural gas called nonrenewable?", e: "⛽⏳", a: "They take millions of years to form", w: ["They are found in oceans", "They can't be burned"], why: "Fossil fuels formed from ancient living things over millions of years. Once used, they're gone." },
  { q: "What did fossil fuels form from?", e: "🪨🌿", a: "Ancient plants and tiny sea life", w: ["Mostly dinosaur bones", "Melted rocks"], why: "Coal came mostly from ancient swamp plants; oil and gas mostly from tiny ocean life — not dinosaurs!" },
  { q: "Which is a renewable energy resource?", e: "💨🌬️", a: "Wind", w: ["Coal", "Natural gas"], why: "Wind keeps blowing as the Sun heats Earth unevenly. It can't be used up." },
  { q: "What's one drawback of solar power?", e: "☀️🌙", a: "It needs storage to work at night", w: ["Sunlight will run out soon", "It makes thick smoke"], why: "Solar panels need sunlight. Batteries can store extra energy for nighttime and cloudy days." },
  { q: "What's one drawback of burning fossil fuels?", e: "🏭💨", a: "It pollutes the air", w: ["It is renewable", "It makes no heat"], why: "Burning coal, oil and gas releases smoke and gases like carbon dioxide into the air." },
  { q: "Hydroelectric dams make electricity from…", e: "🏞️⚡", a: "Moving water", w: ["Burning coal", "Sunlight on panels"], why: "Falling water spins turbines in the dam. The water cycle refills the river, so it's renewable." },
  { q: "Where does geothermal energy come from?", e: "🌋♨️", a: "Heat inside Earth", w: ["Wind on mountaintops", "The Moon's light"], why: "Hot rock underground heats water into steam that spins turbines. Iceland uses lots of it!" },
  { q: "Is wood a renewable resource?", e: "🌳🪓", a: "Yes, if new trees are planted", w: ["No, trees never grow back", "Yes, no matter how fast we cut"], why: "Trees regrow — but only if we plant them and cut them at a pace the forest can keep up with." },
  { q: "What's a simple way for a family to save energy?", e: "💡🏠", a: "Turn off lights when leaving a room", w: ["Leave the TV on all night", "Open the fridge door often"], why: "Saving energy saves money and resources. Every switch flipped off helps." },
  { q: "Why might a town build wind turbines on a windy ridge?", e: "⛰️💨", a: "The wind there is strong and steady", w: ["Ridges have more coal", "Turbines need snow"], why: "Engineers put turbines where wind is reliable, so they make the most electricity." },
  { q: "Nuclear power plants use uranium. Is uranium renewable?", e: "☢️⚡", a: "No — there's a limited supply", w: ["Yes, it regrows like trees", "Yes, the Sun makes more each day"], why: "Uranium is mined from rock, and there's only so much — so it's nonrenewable, even though it makes no smoke." },
];
const RENEW_SORT: SortBank = { prompt: "Renewable or nonrenewable?", bins: ["Renewable", "Nonrenewable", "♻️", "⛽"], items: [
  ["Sunlight", 1, "☀️"], ["Wind", 1, "💨"], ["A flowing river", 1, "🏞️"], ["Geothermal heat", 1, "🌋"],
  ["Trees that are replanted", 1, "🌳"], ["Ocean tides", 1, "🌙"], ["Corn grown for fuel", 1, "🌽"], ["Ocean waves", 1, "🌊"],
  ["Coal", 0, "🪨"], ["Oil", 0, "🛢️"], ["Natural gas", 0, "🔥"], ["Gasoline", 0, "⛽"],
  ["Uranium", 0, "☢️"], ["Diesel fuel", 0, "🚛"], ["Jet fuel", 0, "✈️"], ["Propane", 0, "🏕️"],
] };

// ── Circuit Cove ─────────────────────────────────────────────────────────────────────────
const CIRCUIT_Q: Pol[] = [
  { q: "What does a circuit need for electricity to flow?", e: "🔋💡", a: "A complete, unbroken loop", w: ["Just one wire", "A gap in the middle"], why: "Electric current flows only around a closed path — out of the battery, through the bulb and back." },
  { q: "A bulb, battery and wires form a loop, but one wire is loose. What happens?", e: "🔌💡", a: "The bulb stays dark — the circuit is open", w: ["The bulb glows extra bright", "The bulb glows dimly"], why: "A gap breaks the path, so no current can flow." },
  { q: "What does a switch do?", e: "🔘💡", a: "Opens or closes the circuit", w: ["Makes more electricity", "Stores electricity for later"], why: "A switch is a movable bridge. Closed, current flows; open, it stops." },
  { q: "When you flip a light switch OFF, the circuit is…", e: "🌑🔘", a: "Open", w: ["Closed", "Doubled"], why: "Off means the switch opened a gap, so current can't reach the light. (Opposite of a door!)" },
  { q: "Why must a bulb be connected to BOTH ends of the battery?", e: "🔋🔁", a: "Current must flow out and back in a loop", w: ["One wire carries light, one heat", "Bulbs need two wires to look nice"], why: "Current leaves one end of the battery, travels through the bulb, and returns to the other end." },
  { q: "Which of these is a closed circuit?", e: "🔁💡", a: "Battery, wire and bulb in an unbroken loop", w: ["A battery with no wires", "A bulb and wire with a gap"], why: "Closed means complete. With no gaps, current can flow." },
  { q: "A flashlight won't turn on, even with the switch on. What's a likely cause?", e: "🔦❓", a: "A dead battery or a broken bulb", w: ["The flashlight is too clean", "The switch has too much power"], why: "If the battery is used up or the bulb's filament broke, the circuit can't work." },
  { q: "Electricity flowing through a wire is called…", e: "⚡〰️", a: "Electric current", w: ["Static", "Magnetism"], why: "Current is the flow of electric charge — tiny particles called electrons moving along the wire." },
  { q: "What is the battery's job in a circuit?", e: "🔋⚡", a: "It gives the energy that pushes the current", w: ["It makes the light", "It stops the current"], why: "The battery is the energy source. Its chemical energy pushes electrons around the circuit." },
  { q: "An old-style bulb glows because its thin wire, the filament, gets…", e: "💡🔥", a: "Very hot", w: ["Very cold", "Wet"], why: "Current heats the filament until it glows white-hot — over 2,000°C!" },
  { q: "You add a second battery, lined up correctly, to a simple circuit. What happens?", e: "🔋🔋", a: "The bulb glows brighter", w: ["The bulb glows dimmer", "The bulb turns off"], why: "Two batteries in a row give a bigger push (voltage), so more current flows." },
  { q: "Thomas Edison's team tested thousands of materials for one part of the light bulb. Which?", e: "💡🧪", a: "The filament", w: ["The glass", "The switch"], why: "They needed a filament that glowed without burning out fast. Baked bamboo fibers worked well!" },
];
const LIGHT_SORT: SortBank = { prompt: "Will the bulb light up?", bins: ["Lights up", "Stays dark", "💡", "🌑"], items: [
  ["A full loop: battery, wires, bulb", 1, "🔁"], ["The switch is turned on", 1, "🟢"], ["A paper clip bridges the gap", 1, "📎"], ["A metal key bridges the gap", 1, "🔑"],
  ["A coin bridges the gap", 1, "🪙"], ["Two batteries lined up + to −", 1, "🔋"], ["A steel nail bridges the gap", 1, "🔩"], ["A foil strip bridges the gap", 1, "✨"],
  ["There's a gap in the wire", 0, "✂️"], ["The switch is turned off", 0, "🔴"], ["A rubber band bridges the gap", 0, "〰️"], ["A plastic straw bridges the gap", 0, "🥤"],
  ["The battery is dead", 0, "❌"], ["The bulb's filament is broken", 0, "💔"], ["Both wires touch the same battery end", 0, "↩️"], ["A wooden stick bridges the gap", 0, "🪵"],
] };

const COND_Q: Pol[] = [
  { q: "What is a conductor?", e: "⚡🔌", a: "A material electricity flows through easily", w: ["A material that blocks electricity", "A material that makes electricity"], why: "Metals like copper, aluminum and steel are good conductors — current flows through them easily." },
  { q: "What is an insulator?", e: "🧤🚫", a: "A material that blocks electricity", w: ["A material electricity flows through", "A kind of battery"], why: "Rubber, plastic, glass and dry wood are insulators — they keep current from flowing." },
  { q: "Why are electrical wires made of copper covered in plastic?", e: "🔌🟠", a: "Copper carries current; plastic keeps it in", w: ["The plastic makes the electricity", "Copper is soft and plastic is shiny"], why: "The copper conductor carries the current, and the plastic insulator keeps it from shocking you." },
  { q: "Which would make a bulb light if you used it to close a gap in the circuit?", e: "🥄💡", a: "A steel spoon", w: ["A plastic spoon", "A wooden spoon"], why: "Metal conducts electricity. Plastic and wood are insulators." },
  { q: "Why do electricians wear special rubber gloves?", e: "🧤⚡", a: "Rubber is an insulator", w: ["Rubber conducts electricity", "Rubber keeps hands warm"], why: "Rubber blocks electric current, helping protect electricians from shocks." },
  { q: "Why is it dangerous to use electrical devices near water?", e: "🚰⚡", a: "Tap water can conduct electricity", w: ["Water turns electricity into ice", "Water is a perfect insulator"], why: "Minerals dissolved in tap water let current flow through it — and through you. Keep devices dry!" },
  { q: "A pencil's “lead” is really graphite. Does it conduct electricity?", e: "✏️⚡", a: "Yes — graphite is a conductor", w: ["No — only metals conduct", "Only when it's wet"], why: "Surprise! Graphite, a form of carbon, conducts electricity even though it isn't a metal." },
  { q: "Which material is the best insulator?", e: "🧤🔌", a: "Rubber", w: ["Copper", "Aluminum foil"], why: "Rubber holds its electrons tightly, so current can't flow through it." },
  { q: "Why are the handles of many tools covered in plastic or rubber?", e: "🔧🧤", a: "To insulate hands from electric current", w: ["To make the tools heavier", "To conduct more electricity"], why: "Insulated handles add a layer of protection when working near electricity." },
  { q: "You put a coin in a circuit's gap and the bulb lights. What does that tell you?", e: "🪙💡", a: "The coin is a conductor", w: ["The coin is an insulator", "The coin is a battery"], why: "If the bulb lights, current flowed through the coin — so it conducts electricity." },
  { q: "Power lines are attached to poles with glass or ceramic pieces. Why?", e: "⚡🏗️", a: "Glass and ceramic are insulators", w: ["They make the wires shiny", "They store extra electricity"], why: "Insulators stop current from leaking out of the wire into the pole and the ground." },
  { q: "Which list has ONLY conductors?", e: "📋⚡", a: "Copper, aluminum, steel", w: ["Rubber, glass, plastic", "Wood, copper, cloth"], why: "Metals conduct. Rubber, glass, plastic, dry wood and cloth are insulators." },
];
const COND_SORT: SortBank = { prompt: "Conductor or insulator?", bins: ["Conductor", "Insulator", "⚡", "🚫"], items: [
  ["Copper wire", 1, "🔌"], ["Aluminum foil", 1, "✨"], ["Steel spoon", 1, "🥄"], ["Paper clip", 1, "📎"],
  ["Iron nail", 1, "🔩"], ["Coin", 1, "🪙"], ["Brass key", 1, "🔑"], ["Gold ring", 1, "💍"], ["Pencil “lead” (graphite)", 1, "✏️"],
  ["Plastic straw", 0, "🥤"], ["Wooden ruler", 0, "📏"], ["Glass marble", 0, "🔮"], ["Cotton string", 0, "🧵"],
  ["Paper", 0, "📄"], ["Rubber gloves", 0, "🧤"], ["Ceramic mug", 0, "☕"], ["Rubber band", 0, "〰️"],
] };

const PARTS_MATCH: MatchBank = [
  ["Battery", "Energy source that pushes current"],
  ["Wire", "Path for the current"],
  ["Bulb", "Turns electricity into light"],
  ["Switch", "Opens and closes the circuit"],
  ["Insulation", "Coating that keeps current in"],
  ["Buzzer", "Turns electricity into sound"],
  ["Motor", "Turns electricity into motion"],
  ["Fuse", "Melts to stop too much current"],
];
const SERIES_Q: Pol[] = [
  { q: "In a series circuit, how many paths can the current take?", e: "🔁1️⃣", a: "Just one", w: ["Two or more", "None"], why: "Series means one single loop — every part is lined up on the same path." },
  { q: "In a series circuit, one bulb burns out. What happens to the other bulbs?", e: "💡💡", a: "They all go out", w: ["They glow brighter", "Nothing changes"], why: "The burned-out bulb breaks the only path, so current stops everywhere." },
  { q: "In a parallel circuit, one bulb burns out. What happens to the others?", e: "💡🔀", a: "They stay lit", w: ["They all go out", "They start flashing"], why: "Parallel circuits have separate branches. Current still flows through the other paths." },
  { q: "The lights in a house are wired in parallel. Why is that useful?", e: "🏠💡", a: "One light can be off while others stay on", w: ["It uses no electricity", "Every light must be on together"], why: "Each light has its own branch, so you can switch lights on and off separately." },
  { q: "Old holiday light strings went totally dark when one bulb broke. How were they wired?", e: "🎄💡", a: "In series", w: ["In parallel", "Not wired at all"], why: "In series, every bulb is on the same path. One broken bulb opens the whole circuit." },
  { q: "Adding more bulbs to a series circuit makes each bulb…", e: "💡📉", a: "Dimmer", w: ["Brighter", "Exactly the same"], why: "The bulbs share the battery's push, so each one gets less and glows dimmer." },
  { q: "In a parallel circuit, you add a bulb on its own new branch. The other bulbs…", e: "💡🔀", a: "Stay about as bright as before", w: ["Get much dimmer", "Turn off"], why: "Each branch gets the battery's full push, so bulbs stay bright — but the battery drains faster." },
  { q: "A circuit that splits into separate branches is called a…", e: "🔀⚡", a: "Parallel circuit", w: ["Series circuit", "Open circuit"], why: "Parallel circuits split into branches, giving current more than one path." },
  { q: "You want one broken part NOT to stop everything. Which circuit do you choose?", e: "🛠️🔀", a: "A parallel circuit", w: ["A series circuit", "An open circuit"], why: "Parallel branches keep working on their own — that's why buildings use them." },
  { q: "One switch turns ALL the bulbs in a branching circuit on and off. Where is it?", e: "🔘🔀", a: "Where all the current passes through", w: ["On just one bulb's branch", "Outside the circuit"], why: "To control everything, the switch must sit where all the current flows — before the circuit branches." },
  { q: "A series circuit has a switch and two bulbs. You open the switch. What happens?", e: "🔘💡", a: "Both bulbs go out", w: ["Only one bulb goes out", "Both bulbs get brighter"], why: "Opening the switch breaks the single loop, so no current reaches either bulb." },
  { q: "What's one downside of a parallel circuit?", e: "🔋📉", a: "It drains the battery faster", w: ["One broken bulb turns all off", "It can't use switches"], why: "Each branch draws its own current, so the battery's energy is used up faster." },
];

const SAFETY_Q: Pol[] = [
  { q: "Your kite gets stuck in a power line. What should you do?", e: "🪁⚡", a: "Leave it and tell an adult", w: ["Climb up and grab it", "Knock it down with a metal pole"], why: "Power lines carry deadly electricity. Never touch or climb near them — get help instead." },
  { q: "Why should you never stick objects into an outlet?", e: "🔌⚠️", a: "You could get a dangerous shock", w: ["It will break the TV", "Outlets are just for decoration"], why: "Outlets connect to strong current. A metal object can carry it right into your body." },
  { q: "Your hands are wet. Should you plug in a hair dryer?", e: "💧🔌", a: "No — dry your hands first", w: ["Yes, water helps it work", "Yes, if you're quick"], why: "Water helps electricity flow into your body. Always handle plugs with dry hands." },
  { q: "A fallen power line is lying across the sidewalk. What should you do?", e: "⚡🚧", a: "Stay far away and have an adult call 911", w: ["Step over it carefully", "Poke it with a stick to check"], why: "Downed lines can still be live, and current can spread through wet ground. Keep far away." },
  { q: "Why is it dangerous to plug too many things into one outlet?", e: "🔌🔥", a: "Wires can overheat and start a fire", w: ["The devices get confused", "It makes the lights brighter"], why: "Too much current makes wires hot. That's why homes have breakers and fuses." },
  { q: "What does a circuit breaker do?", e: "🏠⚡", a: "Shuts off power if too much current flows", w: ["Makes extra electricity", "Breaks devices on purpose"], why: "A breaker is a safety switch. It snaps the circuit open before wires can overheat." },
  { q: "Why should a cord with cracked insulation be replaced?", e: "🔌🩹", a: "Bare wires can shock or start a fire", w: ["It just looks old", "Cracks make it work faster"], why: "Insulation keeps current inside the wires. Without it, one touch can cause a shock." },
  { q: "What's the right way to unplug a cord from the wall?", e: "🔌✋", a: "Pull the plug, not the cord", w: ["Yank the cord hard", "Unplug it with wet hands"], why: "Pulling the cord can damage the wires inside and leave them exposed." },
  { q: "Why are small batteries okay for classroom circuit experiments?", e: "🔋🧪", a: "Their push of energy is small and gentle", w: ["They have no energy at all", "They're the same as wall outlets"], why: "A 1.5-volt battery is tiny next to an outlet's 120 volts. Never experiment with outlets!" },
  { q: "An appliance starts to smoke and spark. What should you do?", e: "💨⚠️", a: "Get away and tell an adult right away", w: ["Pour water on it", "Keep using it"], why: "Water conducts electricity and can make an electrical fire worse. Let an adult cut the power." },
  { q: "Why keep electrical devices away from bathtubs and sinks?", e: "🛁⚡", a: "Water and electricity are a dangerous mix", w: ["Steam makes them too cold", "They might get soapy"], why: "If a device falls into water, current can flow through the water — and anyone touching it." },
  { q: "Kitchen and bathroom outlets often have “test” and “reset” buttons. Why?", e: "🔌🔘", a: "They cut power fast if current leaks", w: ["They make the outlet brighter", "They keep the clocks on time"], why: "These special outlets sense current going where it shouldn't and shut off in a split second." },
];
const SAFE_SORT: SortBank = { prompt: "Safe or unsafe around electricity?", bins: ["Safe", "Unsafe", "✅", "⚠️"], items: [
  ["Drying your hands before plugging in", 1, "🙌"], ["Pulling the plug, not the cord", 1, "🔌"], ["Outlet covers near toddlers", 1, "👶"], ["Staying far from fallen power lines", 1, "🚧"],
  ["Flying kites in open fields", 1, "🪁"], ["Telling an adult about a frayed cord", 1, "🗣️"], ["Building circuits with small batteries", 1, "🔋"], ["Keeping devices away from the tub", 1, "🛁"],
  ["Poking a fork into a toaster", 0, "🍞"], ["Climbing a tree near power lines", 0, "🌳"], ["Using a hair dryer by a full sink", 0, "💇"], ["Plugging in with wet hands", 0, "💧"],
  ["Sticking a paper clip into an outlet", 0, "📎"], ["Piling plugs into one outlet", 0, "⚡"], ["Yanking a plug out by its cord", 0, "😬"], ["Touching a frayed, cracked cord", 0, "🩹"],
] };

// ── Shifting Earth Shoals ────────────────────────────────────────────────────────────────
const WEATHER_ROCK_Q: Pol[] = [
  { q: "What's the difference between weathering and erosion?", e: "🪨🌊", a: "Weathering breaks rock; erosion moves it", w: ["They're exactly the same", "Erosion breaks rock; weathering moves it"], why: "Weathering breaks rock into smaller pieces. Erosion carries those pieces away." },
  { q: "Water seeps into a crack, freezes and expands. What happens to the rock?", e: "🧊🪨", a: "The crack widens until the rock splits", w: ["The rock melts", "The crack seals shut"], why: "Water expands about 9% when it freezes, pushing cracks wider. That's called ice wedging." },
  { q: "Tree roots grow into a crack and split a sidewalk. That's…", e: "🌳🧱", a: "Weathering", w: ["Deposition", "An earthquake"], why: "Growing roots pry cracks open, slowly breaking rock and concrete apart." },
  { q: "A river carries sand and pebbles downstream. That's…", e: "🏞️🪨", a: "Erosion", w: ["Weathering", "Deposition"], why: "Erosion is the moving of rock and soil by water, wind, ice or gravity." },
  { q: "A river slows where it meets the ocean and drops its sand. That's…", e: "🏝️🌊", a: "Deposition", w: ["Erosion", "Weathering"], why: "Slower water can't carry as much, so sediment settles out. Over time it builds a delta." },
  { q: "What carved the Grand Canyon?", e: "🏜️🏞️", a: "The Colorado River, over millions of years", w: ["One giant earthquake", "A huge flood in one week"], why: "The river cut down through rock, layer by layer, for about 5 to 6 million years." },
  { q: "In a desert, which agent of erosion does the most work?", e: "🏜️💨", a: "Wind", w: ["Glaciers", "Ocean waves"], why: "With few plants to hold soil, desert wind blasts sand, wears down rock and piles up dunes." },
  { q: "Why do farmers plant rows of trees along the edges of fields?", e: "🌳🌾", a: "To block wind that blows soil away", w: ["To make the field hotter", "To attract more wind"], why: "These windbreaks slow the wind and protect topsoil from erosion." },
  { q: "Rocks on a riverbed are usually smooth and rounded. Why?", e: "🪨🏞️", a: "They tumble and rub, wearing off edges", w: ["Fish polish them", "They were made round"], why: "Bumping along the riverbed wears away sharp corners, making rounded pebbles." },
  { q: "How do glaciers shape the land?", e: "🏔️🧊", a: "They scrape and carry rock as they move", w: ["They melt rock with heat", "They float the land away"], why: "Glaciers — slow rivers of ice — grind valleys into U shapes and carry boulders for miles." },
  { q: "How does acid rain weather a marble statue?", e: "🌧️🗿", a: "It slowly dissolves the stone", w: ["It freezes the statue solid", "It glues the stone together"], why: "Acids react with marble and limestone. That's chemical weathering — the rock itself changes." },
  { q: "Which slows erosion on a hillside?", e: "⛰️🌱", a: "Plants with deep roots", w: ["Cutting down all the trees", "Removing the grass"], why: "Roots hold soil in place, and leaves soften the blow of falling rain." },
];
const WED_SORT: SortMany = { prompt: "Weathering, erosion, or deposition?", bins: [{ id: "weather", label: "Weathering (breaks rock)", emoji: "🔨" }, { id: "erode", label: "Erosion (moves it)", emoji: "💨" }, { id: "deposit", label: "Deposition (drops it)", emoji: "🏖️" }], items: [
  ["Ice cracks a rock as it freezes", "weather", "🧊"], ["Tree roots split a boulder", "weather", "🌳"], ["Acid rain dissolves a statue", "weather", "🗿"], ["Lichen slowly crumbles a stone", "weather", "🍄"], ["Hot days and cold nights crack desert rocks", "weather", "☀️"], ["Water dissolves limestone into caves", "weather", "🕳️"],
  ["A river carries sand downstream", "erode", "🏞️"], ["Wind blows soil off a field", "erode", "💨"], ["A glacier drags rocks along", "erode", "🏔️"], ["Waves pull sand off a beach", "erode", "🌊"], ["Rain washes dirt down a hill", "erode", "🌧️"], ["A landslide carries rocks downhill", "erode", "🪨"],
  ["A river builds a delta at its mouth", "deposit", "🏝️"], ["Wind piles sand into dunes", "deposit", "🐪"], ["A melting glacier leaves rocks behind", "deposit", "⛰️"], ["Waves drop sand and build a beach", "deposit", "🏖️"], ["Mud settles at the bottom of a lake", "deposit", "🟤"], ["Floodwater leaves mud on a field", "deposit", "🌾"],
] };

const FASTSLOW_Q: Pol[] = [
  { q: "Which Earth change can happen in just minutes?", e: "🪨⚡", a: "A landslide", w: ["A canyon forming", "A mountain wearing down"], why: "Landslides, earthquakes and eruptions change land fast. Canyons take millions of years." },
  { q: "Which change takes millions of years?", e: "🏜️⏳", a: "A river carving a deep canyon", w: ["An earthquake shaking", "A volcano erupting"], why: "Erosion is usually slow and steady — a little at a time, for ages." },
  { q: "What causes most earthquakes?", e: "🌍💥", a: "Huge plates of Earth's crust slipping", w: ["Thunder shaking the ground", "Wind blowing on mountains"], why: "Earth's outer shell is broken into plates. When they slip suddenly, the ground shakes." },
  { q: "Where do most volcanoes and earthquakes happen?", e: "🌋🗺️", a: "Along the edges of Earth's plates", w: ["In the middle of every continent", "Only near the North Pole"], why: "Plate edges are where crust pulls apart, collides or grinds past — like the Ring of Fire around the Pacific." },
  { q: "Lava from a volcano flows into the sea. What happens over time?", e: "🌋🌊", a: "New land forms as the lava cools", w: ["The sea turns into lava", "Nothing — lava just disappears"], why: "Cooled lava becomes new rock. The Hawaiian Islands were built this way!" },
  { q: "How can an earthquake change the land quickly?", e: "💥⛰️", a: "It can crack the ground and set off landslides", w: ["It makes the land smoother", "It turns rock into water"], why: "Shaking can split the ground, shift it sideways, and shake rock and soil loose from slopes." },
  { q: "Which change happens SLOWLY?", e: "🌊🏖️", a: "Waves wearing away a sea cliff", w: ["A rockslide", "A volcanic eruption"], why: "Each wave removes just a little rock. Over many years, the cliff moves back." },
  { q: "Mount St. Helens erupted in 1980. What happened to the mountain?", e: "🌋💨", a: "Its top blasted away in minutes", w: ["It grew twice as tall", "It slowly sank over 100 years"], why: "The blast removed about 1,300 feet from the top of the mountain in moments." },
  { q: "Why do scientists record earthquakes with seismographs?", e: "📈💥", a: "To measure how strongly the ground shakes", w: ["To stop earthquakes", "To make the ground shake"], why: "Seismographs record ground motion, showing where a quake started and how big it was." },
  { q: "The Himalayas, Earth's tallest mountains, are still slowly…", e: "🏔️⬆️", a: "Rising, as two plates push together", w: ["Shrinking into the ocean", "Melting into lava"], why: "India's plate keeps pushing into Asia, lifting the Himalayas a few millimeters each year." },
  { q: "Sand dunes travel across a desert. Is that a fast or a slow change?", e: "🐪💨", a: "Slow, over months and years", w: ["Instant, in one second", "They never move at all"], why: "Wind pushes sand grain by grain, so whole dunes creep across the desert over time." },
  { q: "A flash flood roars through a canyon. What can it do in a few hours?", e: "🌧️🏞️", a: "Move huge rocks and carve new channels", w: ["Nothing — water is too soft", "Build a mountain"], why: "Fast floodwater carries tons of sediment and can reshape land in a single day." },
];
const FASTSLOW_SORT: SortBank = { prompt: "Fast change or slow change?", bins: ["Fast (minutes to days)", "Slow (years to ages)", "⚡", "🐢"], items: [
  ["An earthquake", 1, "💥"], ["A volcanic eruption", 1, "🌋"], ["A landslide", 1, "🪨"], ["A flash flood", 1, "🌧️"],
  ["A tsunami striking a coast", 1, "🌊"], ["A sinkhole opening up", 1, "🕳️"], ["Rocks tumbling off a cliff", 1, "🧗"], ["A meteorite crashing into Earth", 1, "☄️"],
  ["A river carving a canyon", 0, "🏜️"], ["Waves wearing back a sea cliff", 0, "🏖️"], ["A mountain wearing down", 0, "⛰️"], ["A glacier carving a valley", 0, "🏔️"],
  ["A delta building up", 0, "🏝️"], ["Sand dunes creeping along", 0, "🐪"], ["Roots slowly cracking a rock", 0, "🌳"], ["A cave forming in limestone", 0, "🦇"],
] };

const LAYERS: [string, string][] = [
  ["Crust (thin, rocky shell)", "🌍"],
  ["Mantle (hot rock that slowly flows)", "🔥"],
  ["Outer core (liquid metal)", "🌊"],
  ["Inner core (solid metal ball)", "⚪"],
];
const LAYER_Q: Pol[] = [
  { q: "Which layer of Earth do we live on?", e: "🏠🌍", a: "The crust", w: ["The mantle", "The inner core"], why: "The crust is Earth's thin outer layer. Compared with the whole Earth, it's thinner than an apple's skin." },
  { q: "Earth's inner core is incredibly hot. Why is it solid, not liquid?", e: "⚪🔥", a: "Huge pressure squeezes it solid", w: ["It's actually cold", "It's made of ice"], why: "The weight of every layer above presses so hard that the iron stays solid, even at about 5,000°C." },
  { q: "Which layer is made of liquid metal?", e: "🌊🧲", a: "The outer core", w: ["The crust", "The inner core"], why: "The outer core is swirling liquid iron and nickel. Its motion makes Earth's magnetic field!" },
  { q: "Which is the thickest layer of Earth?", e: "📏🌍", a: "The mantle", w: ["The crust", "The inner core"], why: "The mantle is about 1,800 miles thick and makes up most of Earth's volume." },
  { q: "Has anyone ever drilled all the way down to Earth's mantle?", e: "⛏️🌍", a: "No — even the deepest hole is far too shallow", w: ["Yes, many times", "Yes, all the way to the core"], why: "The deepest hole ever drilled reached about 7.6 miles — not even through the crust!" },
  { q: "How do scientists know what's inside Earth if no one has been there?", e: "📈🌍", a: "By studying earthquake waves", w: ["By digging to the center", "By pure guessing"], why: "Earthquake waves bend, slow down or stop in different layers, revealing what's inside." },
  { q: "Which layer of Earth is the coolest?", e: "🌡️🌍", a: "The crust", w: ["The outer core", "The inner core"], why: "Earth gets hotter the deeper you go. The crust is coolest; the inner core is hottest." },
  { q: "Melted rock deep underground is called…", e: "🌋🔥", a: "Magma", w: ["Granite", "Sediment"], why: "Melted rock underground is magma. Once it reaches the surface, it's called lava." },
  { q: "Earth's outer shell is broken into giant pieces called…", e: "🧩🌍", a: "Tectonic plates", w: ["Continents only", "Fault lines"], why: "Plates ride on the hot mantle and move a few centimeters a year — about as fast as fingernails grow." },
  { q: "The mantle is solid rock, but over long times it can…", e: "🔥🐌", a: "Flow slowly, like very thick putty", w: ["Evaporate", "Freeze into ice"], why: "Mantle rock is so hot it creeps like super-thick putty, slowly moving the plates above it." },
  { q: "Where is Earth's crust thinnest?", e: "🌊📏", a: "Under the oceans", w: ["Under tall mountains", "Under deserts"], why: "Ocean crust is only about 3–6 miles thick. Continental crust can be 20–40 miles thick." },
  { q: "Which list goes in order from Earth's surface to its center?", e: "⬇️🌍", a: "Crust, mantle, outer core, inner core", w: ["Mantle, crust, inner core, outer core", "Inner core, outer core, mantle, crust"], why: "From the outside in: crust, mantle, the liquid outer core, then the solid inner core." },
];
const LAYER_MATCH: MatchBank = [
  ["Crust", "Thin, rocky outer layer"],
  ["Mantle", "Thickest layer of hot, slow rock"],
  ["Outer core", "Liquid iron and nickel"],
  ["Inner core", "Solid metal ball at the center"],
  ["Magma", "Melted rock underground"],
  ["Tectonic plates", "Moving pieces of Earth's shell"],
];

const SOLUTION_Q: Pol[] = [
  { q: "How can people slow erosion on a steep hillside?", e: "⛰️🌱", a: "Plant grass and trees to hold the soil", w: ["Remove all the plants", "Cover it with loose sand"], why: "Plant roots grip the soil, so rain and wind carry less of it away." },
  { q: "Why do engineers give buildings in earthquake zones flexible frames?", e: "🏢💥", a: "So they sway instead of snapping", w: ["So they float above the ground", "So they stop the earthquake"], why: "Flexible frames and special bases let buildings bend with the shaking instead of breaking." },
  { q: "What is a levee?", e: "🏞️🧱", a: "A raised bank that holds back floodwater", w: ["A machine that makes rain", "A kind of volcano"], why: "Levees line rivers to keep high water from flooding nearby towns." },
  { q: "Why do scientists watch volcanoes with sensors?", e: "🌋📡", a: "To warn people before an eruption", w: ["To make volcanoes erupt", "To keep the lava warm"], why: "Small earthquakes, swelling ground and gas changes can signal that an eruption is coming." },
  { q: "An earthquake starts while you're indoors. What should you do?", e: "💥🪑", a: "Drop, cover and hold on", w: ["Run outside right away", "Stand next to a window"], why: "Get under a sturdy table and hold on. Most injuries come from falling objects." },
  { q: "Why are seawalls built along some coasts?", e: "🌊🧱", a: "To protect land from wave erosion", w: ["To make bigger waves", "To keep the fish out"], why: "Seawalls take the force of waves, so storms don't wash away beaches and homes as quickly." },
  { q: "Why do beach towns plant grass on sand dunes?", e: "🏖️🌾", a: "Its roots hold the dunes in place", w: ["To feed the seagulls", "To make the sand hotter"], why: "Dune grass traps blowing sand and anchors dunes, which shield the coast from storms." },
  { q: "Farmers plow rows across a slope, not up and down it. Why?", e: "🚜⛰️", a: "The rows catch water and slow erosion", w: ["It's faster to drive that way", "Crops like to face sideways"], why: "Rows that follow the hill's curves act like tiny dams, keeping water and soil from rushing downhill." },
  { q: "A tsunami warning siren sounds at the beach. What should you do?", e: "🌊🚨", a: "Move to high ground right away", w: ["Go look at the water", "Wait on the sand"], why: "Tsunami waves can arrive within minutes. Get inland and uphill fast." },
  { q: "Why do engineers study rock layers before building a dam?", e: "🏞️🔍", a: "To be sure the ground is strong and stable", w: ["To find dinosaur eggs", "To make the water warmer"], why: "Weak or cracked rock could let water leak or the dam shift. A strong foundation keeps people safe." },
  { q: "Why is it risky to build a house at the edge of an eroding cliff?", e: "🏠🌊", a: "The cliff edge could crumble away", w: ["Cliffs grow taller each year", "The air is too thin there"], why: "Waves and weather slowly wear cliffs back. A house too close could end up over the edge." },
  { q: "How does a retaining wall help on a steep yard?", e: "🧱⛰️", a: "It holds back soil so it can't slide", w: ["It makes the hill steeper", "It pulls water uphill"], why: "A retaining wall holds soil in place on a slope, preventing slumps and small landslides." },
];

// ── Rock Cycle Reef ──────────────────────────────────────────────────────────────────────
const ROCK_Q: Pol[] = [
  { q: "How does igneous rock form?", e: "🌋🪨", a: "Melted rock cools and hardens", w: ["Layers of sand get pressed together", "Rock gets squeezed and heated"], why: "Igneous means “from fire.” It forms when magma or lava cools." },
  { q: "How does sedimentary rock form?", e: "🏖️📚", a: "Layers of sediment are pressed and cemented", w: ["Lava cools quickly", "Rock melts deep underground"], why: "Sand, mud and shells settle in layers. Over time, weight presses them and minerals glue them together." },
  { q: "How does metamorphic rock form?", e: "🔥⬇️", a: "Heat and pressure change existing rock", w: ["Lava cools on the surface", "Loose sand gets glued together"], why: "Metamorphic means “changed form.” Deep heat and pressure transform rock without melting it." },
  { q: "Which kind of rock is most likely to contain fossils?", e: "🐚🪨", a: "Sedimentary", w: ["Igneous", "Metamorphic"], why: "Fossils form in gently settling layers of sediment. Melting and heavy heating destroy them." },
  { q: "Pumice is so full of gas bubbles that it can…", e: "🌋🌊", a: "Float on water", w: ["Glow in the dark", "Bend like rubber"], why: "Pumice forms when frothy lava cools fast, trapping bubbles. It's a rock that floats!" },
  { q: "Obsidian is smooth and glassy. Why?", e: "⚫✨", a: "Lava cooled too fast for crystals to grow", w: ["Rivers polished it smooth", "It formed from pressed shells"], why: "Fast cooling freezes the rock before crystals can form, making natural volcanic glass." },
  { q: "Granite has big, easy-to-see crystals. What does that tell you?", e: "⛰️🔍", a: "Its magma cooled slowly underground", w: ["It cooled fast in the air", "It formed from layers of sand"], why: "Slow cooling gives crystals time to grow large. Fast cooling makes tiny crystals or glass." },
  { q: "Limestone gets squeezed and heated deep underground. What does it become?", e: "🗿🔥", a: "Marble", w: ["Granite", "Sandstone"], why: "Heat and pressure turn limestone into marble — a metamorphic rock used for statues." },
  { q: "Shale is heated and squeezed. What does it become?", e: "🏠🔥", a: "Slate", w: ["Obsidian", "Coal"], why: "Shale becomes slate, a metamorphic rock that splits into flat sheets — great for roof tiles." },
  { q: "A rock has clear stripes of layered sand. What type is it most likely?", e: "🏜️📚", a: "Sedimentary", w: ["Igneous", "A meteorite"], why: "Layers are a clue that sediment settled over time — like pages piling up in a book." },
  { q: "Which type of rock forms right after a volcano erupts?", e: "🌋🏝️", a: "Igneous", w: ["Sedimentary", "Metamorphic"], why: "Lava cools into igneous rock like basalt. Hawaii's islands are made of it." },
  { q: "Sandstone is heated and squeezed deep underground. What does it become?", e: "🏜️🔥", a: "Quartzite", w: ["Pumice", "Shale"], why: "Sandstone's grains fuse into hard quartzite, a metamorphic rock." },
];
const ROCK_SORT: SortMany = { prompt: "Igneous, sedimentary, or metamorphic?", bins: [{ id: "igneous", label: "Igneous (cooled magma)", emoji: "🌋" }, { id: "sedimentary", label: "Sedimentary (layers)", emoji: "🏖️" }, { id: "metamorphic", label: "Metamorphic (heat + squeeze)", emoji: "🔥" }], items: [
  ["Granite, cooled slowly underground", "igneous", "⛰️"], ["Obsidian, natural volcanic glass", "igneous", "⚫"], ["Pumice, full of gas bubbles", "igneous", "🌋"], ["Basalt from a cooled lava flow", "igneous", "🏝️"], ["Any rock made as lava hardens", "igneous", "🔥"],
  ["Sandstone, made of cemented sand", "sedimentary", "🏜️"], ["Limestone, full of shell fossils", "sedimentary", "🐚"], ["Shale, from squeezed mud", "sedimentary", "🟤"], ["Conglomerate, pebbles glued together", "sedimentary", "🪨"], ["Coal, from ancient swamp plants", "sedimentary", "🌿"],
  ["Marble, changed from limestone", "metamorphic", "🗿"], ["Slate, changed from shale", "metamorphic", "🏠"], ["Quartzite, changed from sandstone", "metamorphic", "💎"], ["Gneiss, with squeezed stripes", "metamorphic", "〰️"], ["Schist, with sparkly flat layers", "metamorphic", "✨"],
] };

const CYCLE_Q: Pol[] = [
  { q: "What is the rock cycle?", e: "🔄🪨", a: "Rocks slowly changing from one type to another", w: ["Rocks rolling down a hill", "Rocks staying the same forever"], why: "Over millions of years, any rock can become igneous, sedimentary or metamorphic rock." },
  { q: "Can a metamorphic rock ever become an igneous rock?", e: "🔥🌋", a: "Yes — if it melts and then cools", w: ["No — rocks never change type", "Only if it gets painted"], why: "Melt any rock into magma, let it cool, and you get igneous rock. The cycle has many paths." },
  { q: "What must happen first for igneous rock to become sedimentary rock?", e: "🌧️🪨", a: "It must be weathered into sediment", w: ["It must melt", "It must freeze solid"], why: "Weathering breaks rock into bits. Erosion carries them off, and they settle into layers." },
  { q: "What powers the rock cycle?", e: "☀️🌋", a: "Earth's inner heat and the Sun's energy", w: ["The Moon's light", "Electricity from lightning"], why: "Inner heat melts and changes rock; the Sun drives the weather and erosion that break it down." },
  { q: "Which step comes right after erosion in the rock cycle?", e: "🏞️⬇️", a: "Deposition — sediment settles", w: ["Melting", "Erupting"], why: "Moving water or wind drops its sediment, which piles up in layers." },
  { q: "Layers of sediment get buried deeper and deeper. What happens to them?", e: "📚⬇️", a: "They're pressed and cemented into rock", w: ["They float up to the surface", "They turn into water"], why: "The weight above squeezes out water, and dissolved minerals glue the grains together." },
  { q: "Rock is pushed down near a plate edge until it's hot enough to melt. It becomes…", e: "🌍🔥", a: "Magma", w: ["Sediment", "Soil"], why: "Melted rock is magma. When it cools, it forms new igneous rock." },
  { q: "How long does the rock cycle usually take?", e: "⏳🪨", a: "Millions of years", w: ["About a day", "About one year"], why: "Most rock changes are incredibly slow — though a volcano can make new rock in hours." },
  { q: "Does every rock follow the same path through the rock cycle?", e: "🔀🪨", a: "No — rocks can take many different paths", w: ["Yes, always the same order", "Yes, but only granite"], why: "A rock can skip steps or loop back. Sedimentary rock might melt; metamorphic rock might erode." },
  { q: "A mountain wears down into sand. What kind of rock is that sand on its way to becoming?", e: "⛰️🏖️", a: "Sedimentary rock", w: ["Igneous rock", "Metamorphic rock"], why: "Weathered grains get carried, deposited and pressed — the path to sedimentary rock." },
  { q: "Which TWO things turn rock into metamorphic rock?", e: "🔥⬇️", a: "Heat and pressure", w: ["Wind and rain", "Cooling and freezing"], why: "Deep underground, heat and pressure rearrange a rock's minerals without melting it." },
  { q: "Rocks deep inside some mountains look squished and striped. Why?", e: "🏔️〰️", a: "Colliding plates squeezed and heated them", w: ["Rivers painted stripes on them", "They grew stripes like a tiger"], why: "Colliding plates squeeze and heat rock, turning it metamorphic — often with bands or stripes." },
];
const CYCLE_STEPS: [string, string][] = [
  ["Magma cools into granite", "🌋"],
  ["Weathering breaks the granite into sand", "🌧️"],
  ["A river carries the sand to the sea", "🏞️"],
  ["Sand settles and hardens into sandstone", "🏖️"],
  ["Heat and pressure turn it into quartzite", "🔥"],
  ["It melts back into magma", "♨️"],
];
const PROCESS_MATCH: MatchBank = [
  ["Cooling", "Igneous rock from magma"],
  ["Weathering", "Rock broken into sediment"],
  ["Erosion", "Sediment carried away"],
  ["Deposition", "Sediment dropped in layers"],
  ["Pressing and cementing", "Sedimentary rock"],
  ["Heat and pressure", "Metamorphic rock"],
  ["Melting", "Magma"],
];

const MINERAL_Q: Pol[] = [
  { q: "What's the difference between a rock and a mineral?", e: "🪨💎", a: "Rocks are made of one or more minerals", w: ["Minerals are made of rocks", "They're exactly the same"], why: "A mineral is a natural solid with one recipe. Granite is a rock made of quartz, feldspar and mica." },
  { q: "What does a mineral's luster describe?", e: "✨💎", a: "How it shines in light", w: ["How heavy it is", "How hot it gets"], why: "Luster can be metallic like gold, glassy like quartz, or dull like chalk." },
  { q: "What is a streak test?", e: "🧱🖍️", a: "Scraping it on tile to see its powder color", w: ["Dropping it to see if it breaks", "Putting it in water to see if it floats"], why: "A mineral's powder color can differ from its outside color — and it's a more reliable clue." },
  { q: "Pyrite looks like shiny gold but leaves a greenish-black streak. What's its nickname?", e: "🟡🖤", a: "Fool's gold", w: ["Real gold", "Silver"], why: "Real gold leaves a gold-yellow streak. Pyrite's dark streak gives it away!" },
  { q: "How do geologists test a mineral's hardness?", e: "💅💎", a: "By seeing what it can scratch", w: ["By weighing it", "By checking its color"], why: "A harder mineral scratches a softer one. That's the idea behind the Mohs scale." },
  { q: "Why isn't color always a good way to identify a mineral?", e: "🌈💎", a: "Many minerals come in several colors", w: ["Minerals have no color", "Color only shows at night"], why: "Quartz can be clear, pink, purple or smoky. Streak and hardness are more reliable." },
  { q: "Which of these is a mineral?", e: "🔍💎", a: "Quartz", w: ["Granite", "Sandstone"], why: "Quartz is one mineral. Granite and sandstone are rocks made of minerals." },
  { q: "Halite is a mineral you probably eat. What is it?", e: "🧂🔍", a: "Table salt", w: ["Sugar", "Flour"], why: "Halite is salt! Its crystals are tiny cubes — look at salt grains with a magnifying glass." },
  { q: "Which property describes how a mineral splits along flat, smooth surfaces?", e: "📄💎", a: "Cleavage", w: ["Luster", "Streak"], why: "Minerals like mica peel into thin, flat sheets. That's called cleavage." },
  { q: "A mineral sticks to a magnet. Which mineral could it be?", e: "🧲🪨", a: "Magnetite", w: ["Quartz", "Talc"], why: "Magnetite is rich in iron and naturally magnetic — some pieces are magnets themselves!" },
  { q: "Diamond and pencil graphite are both pure carbon. Why are they so different?", e: "💎✏️", a: "Their atoms are arranged differently", w: ["Diamonds are painted", "Graphite is made of lead"], why: "Same element, different structure: diamond is the hardest mineral, graphite one of the softest." },
  { q: "Why do scientists test several properties before naming a mineral?", e: "🕵️💎", a: "One clue alone can fool you", w: ["Tests are just for fun", "Minerals change every hour"], why: "Combining luster, streak, hardness and more is like solving a mystery with many clues." },
];
const TEST_MATCH: MatchBank = [
  ["Luster", "How it shines"],
  ["Streak", "Color of its powder"],
  ["Hardness", "What it can scratch"],
  ["Cleavage", "Splits along flat surfaces"],
  ["Magnetism", "Whether a magnet pulls it"],
  ["Color", "How it looks (can fool you)"],
  ["Crystal shape", "The shape its crystals grow in"],
];

const MOHS_Q: Pol[] = [
  { q: "Which is the softest mineral on the Mohs scale?", e: "🧴🪶", a: "Talc", w: ["Diamond", "Quartz"], why: "Talc is a 1 — so soft you can scratch it with a fingernail." },
  { q: "Which is the hardest mineral on the Mohs scale?", e: "💎🔟", a: "Diamond", w: ["Talc", "Gypsum"], why: "Diamond is a 10, the hardest natural mineral. Diamond-tipped saws can cut stone." },
  { q: "Your fingernail is about 2.5 on the Mohs scale. Which can it scratch?", e: "💅🪨", a: "Talc (1)", w: ["Quartz (7)", "Diamond (10)"], why: "You can scratch only minerals softer than your nail, like talc and gypsum." },
  { q: "Mineral A scratches mineral B. Which is harder?", e: "🅰️🅱️", a: "Mineral A", w: ["Mineral B", "They're equally hard"], why: "Only a harder material can scratch a softer one." },
  { q: "A steel nail is about 5.5. Quartz is 7. What happens when you rub them together?", e: "🔩🔮", a: "The quartz scratches the steel", w: ["The steel scratches the quartz", "Nothing — they're equal"], why: "Quartz is harder than steel. That's why sand can scratch metal and glass." },
  { q: "Why are diamonds used on saw blades that cut stone?", e: "💎🪚", a: "Diamond is harder than any rock", w: ["Diamonds are shiny", "Diamonds are soft and bendy"], why: "Diamond is a 10, so it can scratch and cut almost anything — even granite." },
  { q: "Gypsum is a 2 on the Mohs scale. Can your fingernail (2.5) scratch it?", e: "💅⚪", a: "Yes — your nail is harder", w: ["No — gypsum is harder", "Only if the gypsum is wet"], why: "2.5 beats 2, so your fingernail can scratch gypsum." },
  { q: "Does a higher Mohs number mean a mineral is heavier?", e: "⚖️💎", a: "No — it means it's harder to scratch", w: ["Yes — harder means heavier", "Yes — it means it's bigger"], why: "Mohs measures scratch resistance, not weight or size. A tiny diamond is still a 10." },
  { q: "Quartz is a 7. Why is it so common in beach sand?", e: "🏖️🔮", a: "It's hard, so it resists wearing away", w: ["Waves create quartz", "It's the softest mineral"], why: "Softer minerals wear away faster. Tough quartz grains survive long trips down rivers to the beach." },
  { q: "Friedrich Mohs made his hardness scale in 1812. How does it work?", e: "📜💎", a: "It ranks 10 minerals by scratch tests", w: ["It weighs each mineral", "It measures how minerals melt"], why: "Each mineral on the list scratches the ones below it. Talc is 1; diamond is 10." },
  { q: "Calcite is a 3 and fluorite is a 4. Which one scratches the other?", e: "🪨🔍", a: "Fluorite scratches calcite", w: ["Calcite scratches fluorite", "Neither can scratch the other"], why: "The higher number is harder, so fluorite scratches calcite." },
  { q: "A mineral scratches glass (about 5.5) but not quartz (7). About how hard is it?", e: "🪟🔮", a: "About 6", w: ["About 2", "About 10"], why: "It's harder than glass but softer than quartz, so it falls in between — like feldspar, a 6." },
];
const MOHS_STEPS: [string, string][] = [
  ["Talc", "🧴"],
  ["Your fingernail", "💅"],
  ["A copper coin", "🪙"],
  ["A steel nail", "🔩"],
  ["Quartz", "🔮"],
  ["Diamond", "💎"],
];

// ── Body Systems Bay ─────────────────────────────────────────────────────────────────────
const SYSTEM_Q: Pol[] = [
  { q: "Which system carries oxygen and nutrients around your body in blood?", e: "🫀🩸", a: "The circulatory system", w: ["The digestive system", "The skeletal system"], why: "Your heart pumps blood through about 60,000 miles of blood vessels — enough to circle Earth twice!" },
  { q: "Which system brings oxygen into your body?", e: "🫁🌬️", a: "The respiratory system", w: ["The muscular system", "The nervous system"], why: "Your lungs take in oxygen and breathe out carbon dioxide — about 20,000 breaths a day." },
  { q: "Which system breaks food down into nutrients your body can use?", e: "🍎🌀", a: "The digestive system", w: ["The circulatory system", "The skeletal system"], why: "Digestion turns a sandwich into nutrients tiny enough to pass into your blood." },
  { q: "Which system is your body's control center, sending messages everywhere?", e: "🧠⚡", a: "The nervous system", w: ["The digestive system", "The skeletal system"], why: "Your brain, spinal cord and nerves send signals at up to about 250 miles per hour!" },
  { q: "Which system holds your body up and protects your organs?", e: "🦴🛡️", a: "The skeletal system", w: ["The respiratory system", "The nervous system"], why: "Your skull guards your brain and your ribs shield your heart and lungs. Adults have 206 bones." },
  { q: "Which system moves your body by pulling on your bones?", e: "💪🦴", a: "The muscular system", w: ["The circulatory system", "The digestive system"], why: "Muscles can only pull, not push, so they work in pairs — like your biceps and triceps." },
  { q: "Arteries carry blood…", e: "🫀➡️", a: "Away from the heart", w: ["Toward the heart", "Only to the lungs"], why: "Arteries carry blood away from the heart; veins bring it back. Memory trick: A is for Away!" },
  { q: "Babies are born with about 300 bones, but adults have 206. Why?", e: "👶🦴", a: "Some bones fuse together as you grow", w: ["Bones fall out like baby teeth", "Kids lose bones playing sports"], why: "Many soft baby bones join as they harden — like the plates of the skull." },
  { q: "Why do your heart and breathing speed up when you run?", e: "🏃🫀", a: "Your muscles need more oxygen, faster", w: ["Your body is scared of running", "Your stomach needs more food"], why: "Working muscles use lots of oxygen. Your lungs and heart team up to deliver more." },
  { q: "Which two systems team up to get oxygen to every cell?", e: "🫁🫀", a: "Respiratory and circulatory", w: ["Skeletal and digestive", "Digestive and muscular"], why: "Your lungs load oxygen into the blood; your heart pumps that blood to every cell." },
  { q: "You touch a hot pan and jerk your hand back before you even think. What did that?", e: "🔥✋", a: "Your nervous system — a reflex", w: ["Your digestive system", "Your skeletal system alone"], why: "Reflex signals loop through your spinal cord and back — faster than the message reaches your brain." },
  { q: "Where are new blood cells made?", e: "🦴🩸", a: "Inside your bones, in the marrow", w: ["In your stomach", "In your lungs"], why: "Bone marrow makes millions of new blood cells every second." },
];
const SYSTEM_JOB: MatchBank = [
  ["Circulatory", "Moves blood through the body"],
  ["Respiratory", "Takes in oxygen"],
  ["Digestive", "Breaks down food"],
  ["Nervous", "Sends signals and controls"],
  ["Skeletal", "Supports and protects"],
  ["Muscular", "Pulls bones to move"],
];
const ORGAN_SYSTEM: MatchBank = [
  ["Heart", "Circulatory system"],
  ["Lungs", "Respiratory system"],
  ["Stomach", "Digestive system"],
  ["Brain", "Nervous system"],
  ["Skull", "Skeletal system"],
  ["Biceps", "Muscular system"],
];

const ORGAN_Q: Pol[] = [
  { q: "What does your heart do?", e: "🫀💓", a: "Pumps blood through your body", w: ["Thinks your thoughts", "Digests your food"], why: "Your heart beats about 100,000 times a day, pumping blood nonstop." },
  { q: "What do your lungs do?", e: "🫁💨", a: "Take in oxygen and release carbon dioxide", w: ["Pump blood", "Store food"], why: "Millions of tiny air sacs pass oxygen into the blood and take carbon dioxide out." },
  { q: "Where are most nutrients absorbed into your blood?", e: "🌀🍎", a: "The small intestine", w: ["The stomach", "The esophagus"], why: "The small intestine is about 20 feet long, lined with tiny “fingers” that soak up nutrients." },
  { q: "What does your stomach do?", e: "🍲💪", a: "Churns food with acid to break it down", w: ["Pumps blood", "Takes in oxygen"], why: "Stomach muscles squeeze food while strong acid helps turn it into a thick soup." },
  { q: "What carries messages between your brain and the rest of your body?", e: "🧠⚡", a: "Nerves", w: ["Bones", "Blood vessels only"], why: "Nerves are like wires carrying electrical signals between your brain and body." },
  { q: "Why is your skull so important?", e: "💀🧠", a: "It protects your brain", w: ["It digests food", "It pumps blood"], why: "The skull is a hard helmet of fused bones wrapped around your brain." },
  { q: "What's the job of your diaphragm?", e: "🫁⬇️", a: "It helps you breathe", w: ["It pumps blood", "It moves food along"], why: "This dome-shaped muscle under your lungs moves down to pull air in, then up to push it out." },
  { q: "Veins carry blood…", e: "🔵🫀", a: "Back toward the heart", w: ["Away from the heart", "Only to your brain"], why: "Veins return blood to the heart. Arteries carry it away." },
  { q: "Why do muscles work in pairs?", e: "💪🔄", a: "Muscles can only pull, not push", w: ["One muscle is always asleep", "Pairs just look stronger"], why: "To bend your arm, the biceps pulls; to straighten it, the triceps pulls the other way." },
  { q: "What is the main job of your large intestine?", e: "💧🌀", a: "Soaking up water from leftover food", w: ["Making blood cells", "Sending nerve signals"], why: "The large intestine pulls water out of what's left, then the waste leaves the body." },
  { q: "What connects your muscles to your bones?", e: "🦵🔗", a: "Tendons", w: ["Nerves", "Arteries"], why: "Tendons are tough, cord-like bands. Feel the one at the back of your ankle — the Achilles tendon!" },
  { q: "What does your spinal cord do?", e: "🧵🧠", a: "Carries messages between brain and body", w: ["Pumps air into your lungs", "Holds your food"], why: "The spinal cord is a thick bundle of nerves, protected inside your backbone." },
];
const ORGAN_SORT_A: SortMany = { prompt: "Circulatory, respiratory, or digestive?", bins: [{ id: "circ", label: "Circulatory", emoji: "🫀" }, { id: "resp", label: "Respiratory", emoji: "🫁" }, { id: "dig", label: "Digestive", emoji: "🍎" }], items: [
  ["Heart", "circ", "🫀"], ["Arteries", "circ", "🔴"], ["Veins", "circ", "🔵"], ["Capillaries", "circ", "〰️"], ["Blood", "circ", "🩸"],
  ["Lungs", "resp", "🫁"], ["Windpipe (trachea)", "resp", "🌬️"], ["Nose", "resp", "👃"], ["Diaphragm", "resp", "⬇️"], ["Tiny air sacs", "resp", "🎈"],
  ["Stomach", "dig", "🍲"], ["Esophagus", "dig", "🥤"], ["Small intestine", "dig", "🌀"], ["Liver", "dig", "🟤"], ["Large intestine", "dig", "➰"],
] };
const ORGAN_SORT_B: SortMany = { prompt: "Skeletal, muscular, or nervous?", bins: [{ id: "skel", label: "Skeletal", emoji: "🦴" }, { id: "musc", label: "Muscular", emoji: "💪" }, { id: "nerv", label: "Nervous", emoji: "🧠" }], items: [
  ["Skull", "skel", "💀"], ["Ribs", "skel", "🦴"], ["Backbone (spine)", "skel", "🧍"], ["Thigh bone (femur)", "skel", "🦵"],
  ["Biceps", "musc", "💪"], ["Calf muscle", "musc", "🦶"], ["Tendons", "musc", "🔗"], ["Smiling muscles in your face", "musc", "😄"], ["Muscles that move your eyes", "musc", "👀"],
  ["Brain", "nerv", "🧠"], ["Spinal cord", "nerv", "🧵"], ["Nerves", "nerv", "⚡"], ["Touch sensors in your skin", "nerv", "✋"],
] };

const FOOD_PATH: [string, string][] = [
  ["Mouth: teeth chew, saliva softens", "👄"],
  ["Esophagus: muscles squeeze food down", "⬇️"],
  ["Stomach: acid churns food into soup", "🍲"],
  ["Small intestine: nutrients soak into blood", "🌀"],
  ["Large intestine: water is absorbed", "💧"],
  ["Waste leaves the body", "🚽"],
];
const AIR_PATH: [string, string][] = [
  ["Air enters your nose or mouth", "👃"],
  ["It travels down your windpipe", "🌬️"],
  ["It flows into your lungs", "🫁"],
  ["It reaches millions of tiny air sacs", "🎈"],
  ["Oxygen passes into your blood", "🩸"],
  ["Your heart pumps it all over your body", "🫀"],
];
const DIGEST_Q: Pol[] = [
  { q: "Where does digestion begin?", e: "👄🍎", a: "In the mouth", w: ["In the stomach", "In the small intestine"], why: "Chewing breaks food apart, and saliva starts breaking down starches right away." },
  { q: "Why should you chew your food well?", e: "😋🦷", a: "Smaller pieces are easier to digest", w: ["It makes food heavier", "It makes food colder"], why: "Chewing gives digestive juices more surface to work on — and helps you swallow safely." },
  { q: "How does food travel down your esophagus?", e: "⬇️💪", a: "Muscles squeeze it along in waves", w: ["Gravity only — it just falls", "Air blows it down"], why: "Waves of muscle push food to your stomach — you could even swallow while upside down!" },
  { q: "About how long is your small intestine?", e: "🌀📏", a: "About 20 feet", w: ["About 2 inches", "About 1 foot"], why: "It's coiled up inside you, but stretched out it would be longer than a car!" },
  { q: "Where do nutrients from food pass into your blood?", e: "🌀🩸", a: "The small intestine", w: ["The esophagus", "The mouth"], why: "Tiny finger-like villi line the small intestine and pass nutrients into the blood." },
  { q: "Your stomach makes strong acid. Why doesn't it digest itself?", e: "🍲🛡️", a: "A thick layer of mucus protects it", w: ["It does — and you grow a new one", "The acid is weak and harmless"], why: "Mucus coats the stomach wall, and the lining replaces itself every few days." },
  { q: "After digestion, which system delivers nutrients to your cells?", e: "🩸🚚", a: "The circulatory system", w: ["The skeletal system", "The respiratory system"], why: "Blood picks up nutrients from the intestines and delivers them all over the body." },
  { q: "Why does your stomach growl?", e: "🍲🔊", a: "Muscles squeeze gas and liquid inside", w: ["Your stomach is angry", "A bone is rubbing"], why: "The rumble is your digestive muscles moving air and fluid along — even when you're empty." },
  { q: "What does your liver make that helps digest fats?", e: "🟤🧈", a: "Bile", w: ["Saliva", "Blood"], why: "Bile breaks fat into tiny drops, the way dish soap breaks up grease." },
  { q: "Why is fiber, from fruits, veggies and whole grains, good for you?", e: "🥦🌾", a: "It helps food move smoothly through", w: ["It turns into bones", "It stops digestion"], why: "Fiber keeps things moving through the intestines and feeds helpful gut bacteria." },
  { q: "Trillions of bacteria live in your large intestine. Are they harmful?", e: "🦠🌀", a: "Most of them are helpful", w: ["They're all dangerous", "No bacteria live there"], why: "Helpful gut bacteria break down fiber, make some vitamins and help crowd out harmful germs." },
  { q: "Why is drinking water important for digestion?", e: "💧🍽️", a: "It softens food and helps it move along", w: ["It makes food taste salty", "It stops the stomach working"], why: "Water helps make saliva and digestive juices and keeps food moving through the intestines." },
];

const HABIT_Q: Pol[] = [
  { q: "Which habit makes your heart stronger?", e: "🫀🏃", a: "Exercise that gets you breathing hard", w: ["Sitting still all day", "Eating extra candy"], why: "Your heart is a muscle. Running, biking and swimming make it stronger." },
  { q: "Why do your bones need calcium and exercise?", e: "🦴🥛", a: "They help bones grow strong and dense", w: ["They make bones bendy", "Bones don't need anything"], why: "Calcium from milk, yogurt and leafy greens, plus running and jumping, builds strong bones." },
  { q: "Why is sleep so important for your brain?", e: "😴🧠", a: "It helps you remember and focus", w: ["Your brain shuts off completely", "It makes your bones lighter"], why: "During sleep your brain sorts and stores what you learned. Kids your age need about 9–12 hours." },
  { q: "What's the best way to protect your lungs?", e: "🫁🚭", a: "Never smoke or vape, and avoid smoke", w: ["Hold your breath often", "Breathe only through your mouth"], why: "Smoke damages the tiny air sacs in your lungs. Clean air keeps them healthy." },
  { q: "Why wear a helmet when you bike?", e: "🚲⛑️", a: "It protects your brain if you fall", w: ["It makes you pedal faster", "It keeps your hair neat"], why: "Your skull is strong, but a helmet adds a cushion that can prevent serious brain injuries." },
  { q: "Why should you drink water throughout the day?", e: "💧🧒", a: "Your body is mostly water and keeps losing it", w: ["Water is full of fat", "Water makes bones bendy"], why: "About 60% of your body is water. You lose some every day by breathing and sweating." },
  { q: "Why stretch before and after exercise?", e: "🤸💪", a: "It keeps muscles flexible", w: ["It makes muscles disappear", "It stops your heart"], why: "Flexible muscles and joints move more freely, which can help prevent some injuries." },
  { q: "Why wash your hands before you eat?", e: "🧼🍽️", a: "To keep germs out of your body", w: ["To make food taste better", "To cool your hands down"], why: "Soap and water wash away germs that could make you sick." },
  { q: "Which breakfast gives you the longest-lasting energy?", e: "🥣🍓", a: "Oatmeal with fruit and milk", w: ["A can of soda", "A plate of frosting"], why: "Whole grains, fruit and protein release energy slowly, so you stay focused longer." },
  { q: "How does sitting up straight help your body?", e: "🧍🫁", a: "It supports your spine and gives lungs room", w: ["It makes you taller forever", "It stops digestion"], why: "Good posture keeps your backbone aligned and lets your lungs fill all the way." },
  { q: "Why keep the volume down in headphones?", e: "🎧👂", a: "Very loud sound can damage hearing", w: ["Loud music makes ears grow", "Loud music helps you sleep"], why: "Tiny hair cells in your inner ear can be damaged by loud noise — and they don't grow back." },
  { q: "Why eat a “rainbow” of fruits and vegetables?", e: "🌈🥕", a: "Different colors give different nutrients", w: ["Colors make food spicier", "Only red foods have vitamins"], why: "Each color group carries different vitamins and minerals that help different systems." },
];
const HABIT_SORT: SortMany = { prompt: "Which body system does this habit help MOST?", bins: [{ id: "heart", label: "Heart and lungs", emoji: "🫀" }, { id: "bones", label: "Bones and muscles", emoji: "💪" }, { id: "brain", label: "Brain and nerves", emoji: "🧠" }, { id: "gut", label: "Digestion", emoji: "🍎" }], items: [
  ["Biking hard up a hill", "heart", "🚴"], ["Swimming laps", "heart", "🏊"], ["Staying away from smoke", "heart", "🚭"], ["Running around at recess", "heart", "🏃"],
  ["Drinking milk for calcium", "bones", "🥛"], ["Climbing the monkey bars", "bones", "🧗"], ["Carrying in the groceries", "bones", "🛍️"], ["Eating yogurt and leafy greens", "bones", "🥬"],
  ["Sleeping 9–12 hours a night", "brain", "😴"], ["Wearing a bike helmet", "brain", "⛑️"], ["Solving puzzles and reading", "brain", "🧩"], ["Turning headphone volume down", "brain", "🎧"],
  ["Chewing food slowly", "gut", "😋"], ["Eating veggies for fiber", "gut", "🥦"], ["Choosing whole grains", "gut", "🌾"], ["Drinking water with meals", "gut", "💧"],
] };

// ═══ 5th grade ═════════════════════════════════════════════════════════════════════════════

// ── Solar System Sea ─────────────────────────────────────────────────────────────────────
const INNER: [string, string][] = [["Mercury", "⚪"], ["Venus", "🟡"], ["Earth", "🌍"], ["Mars", "🔴"]];
const OUTER: [string, string][] = [["Jupiter", "🟠"], ["Saturn", "🪐"], ["Uranus", "🟢"], ["Neptune", "🔵"]];
const PLANET_Q: Pol[] = [
  { q: "Which is the largest planet?", e: "🟠🔭", a: "Jupiter", w: ["Saturn", "Earth"], why: "Jupiter is so big that about 1,300 Earths could fit inside it!" },
  { q: "Which planet is the hottest?", e: "🟡🔥", a: "Venus", w: ["Mercury", "Mars"], why: "Mercury is closer to the Sun, but Venus's thick clouds trap heat. It's hot enough to melt lead!" },
  { q: "Why does Mars look red?", e: "🔴🪨", a: "Its soil is full of rusty iron dust", w: ["It's covered in lava", "It's the hottest planet"], why: "Iron in Martian dust has rusted, coloring the whole planet red." },
  { q: "What are Saturn's rings made of?", e: "🪐🧊", a: "Chunks of ice and rock", w: ["Solid gold", "Rainbow-colored gas"], why: "Billions of icy pieces, from dust-sized to house-sized, circle Saturn in thin, wide rings." },
  { q: "Which planet is closest to the Sun?", e: "⚪☀️", a: "Mercury", w: ["Venus", "Earth"], why: "Mercury zips around the Sun in just 88 Earth days — the shortest year of any planet." },
  { q: "Is Pluto still called a planet?", e: "⚪❓", a: "No — it's a dwarf planet", w: ["Yes, it's the ninth planet", "No — it's a moon of Neptune"], why: "In 2006, scientists reclassified Pluto as a dwarf planet: it shares its orbit with many other icy objects." },
  { q: "Which planet is tipped on its side, rolling around the Sun like a ball?", e: "🟢↪️", a: "Uranus", w: ["Earth", "Mercury"], why: "Uranus is tilted about 98 degrees. Scientists think a giant collision knocked it over long ago." },
  { q: "Which planet has the fastest winds?", e: "🔵💨", a: "Neptune", w: ["Earth", "Mars"], why: "Winds on Neptune top 1,200 miles per hour — faster than the speed of sound on Earth!" },
  { q: "What is Jupiter's Great Red Spot?", e: "🟠🌀", a: "A giant storm wider than Earth", w: ["A huge volcano", "A red ocean"], why: "This swirling storm has raged for hundreds of years and is wider than our whole planet." },
  { q: "Which is the only planet known to have life?", e: "🌍🌱", a: "Earth", w: ["Mars", "Venus"], why: "Earth has liquid water, air we can breathe, and temperatures that are just right." },
  { q: "Which planet has the most known moons?", e: "🪐🌙", a: "Saturn", w: ["Mars", "Earth"], why: "Saturn has well over 200 known moons — and astronomers keep finding more!" },
  { q: "Venus spins very slowly. Which surprising fact is true?", e: "🟡🐢", a: "Its day is longer than its year", w: ["It has no day at all", "Its day is just one hour"], why: "Venus takes 243 Earth days to spin once, but only 225 days to circle the Sun." },
];
const PLANET_SORT: SortBank = { prompt: "Inner rocky planets or outer giant planets?", bins: ["Inner (rocky)", "Outer (giant)", "🪨", "🪐"], items: [
  ["Mercury", 1, "⚪"], ["Venus", 1, "🟡"], ["Earth", 1, "🌍"], ["Mars", 1, "🔴"],
  ["Has a solid, rocky surface", 1, "🪨"], ["Small and close to the Sun", 1, "☀️"], ["Has few or no moons", 1, "🌑"], ["A year under 2 Earth years", 1, "📅"],
  ["Jupiter", 0, "🟠"], ["Saturn", 0, "🪐"], ["Uranus", 0, "🟢"], ["Neptune", 0, "🔵"],
  ["Made mostly of gas and ice", 0, "💨"], ["Has rings", 0, "💍"], ["Has many moons", 0, "🌕"], ["A year of 12 to 165 Earth years", 0, "📆"],
] };
const PLANET_MATCH: MatchBank = [
  ["Mercury", "Closest to the Sun"],
  ["Venus", "Hottest planet"],
  ["Earth", "Only planet known to have life"],
  ["Mars", "The Red Planet"],
  ["Jupiter", "Largest planet"],
  ["Saturn", "Famous bright rings"],
  ["Uranus", "Spins on its side"],
  ["Neptune", "Fastest winds"],
];

const SUN_Q: Pol[] = [
  { q: "What is the Sun?", e: "☀️❓", a: "A star", w: ["A planet", "A giant campfire burning wood"], why: "The Sun is a star — a huge ball of hot gas that makes energy by fusing hydrogen into helium." },
  { q: "Why does the Sun look so much bigger and brighter than other stars?", e: "☀️⭐", a: "It's much closer to us", w: ["It's the biggest star in the universe", "Other stars switch off by day"], why: "The Sun is a medium-sized star. Many stars are far bigger — they're just much, much farther away." },
  { q: "Compared with other stars, the Sun is…", e: "☀️📏", a: "An average, medium-sized star", w: ["The biggest star there is", "The smallest star there is"], why: "Some stars are hundreds of times wider than the Sun; others are much smaller." },
  { q: "Why can't we see stars during the day?", e: "🌤️⭐", a: "Sunlight is too bright", w: ["Stars go away in the daytime", "Clouds always cover them"], why: "The stars are still there! The Sun's glare lights up our sky and drowns out their faint light." },
  { q: "What keeps the planets orbiting the Sun?", e: "☀️🪐", a: "The Sun's gravity", w: ["Magnetism", "Wind from space"], why: "The Sun's gravity pulls on the planets. Their forward motion keeps them circling instead of falling in." },
  { q: "What keeps the Moon orbiting Earth?", e: "🌍🌙", a: "Earth's gravity", w: ["The Sun's light", "A magnetic chain"], why: "Earth's gravity tugs on the Moon, curving its path into an orbit." },
  { q: "About how far is the Sun from Earth?", e: "☀️📏", a: "About 93 million miles", w: ["About 93 miles", "About 93 thousand miles"], why: "Sunlight takes about 8 minutes to cross that distance and reach us." },
  { q: "About how many Earths could fit inside the Sun?", e: "☀️🌍", a: "About 1.3 million", w: ["About 10", "About 100"], why: "The Sun holds more than 99% of all the mass in our solar system." },
  { q: "Which star is closest to Earth?", e: "⭐🌍", a: "The Sun", w: ["The North Star", "Sirius, the brightest night star"], why: "The Sun! The next closest star, Proxima Centauri, is over 4 light-years away." },
  { q: "If the Sun's gravity suddenly vanished, what would Earth do?", e: "🌍➡️", a: "Fly off in a straight line", w: ["Fall into the Sun", "Stop moving"], why: "Without the Sun's pull, nothing would curve Earth's path, so it would travel straight out into space." },
  { q: "Why do stars seem to twinkle?", e: "✨🌌", a: "Moving air bends their light", w: ["Stars blink on and off", "Stars spin very fast"], why: "Starlight passes through moving layers of air that bend it back and forth. From space, stars don't twinkle." },
  { q: "Where does the Sun's energy come from?", e: "☀️⚛️", a: "Fusing hydrogen into helium", w: ["Burning coal", "Giant electric wires"], why: "Deep in the Sun's core, hydrogen atoms smash together into helium, releasing enormous energy." },
];
const OBJECT_SORT: SortMany = { prompt: "Star, planet, moon, or dwarf planet?", bins: [{ id: "star", label: "Star", emoji: "⭐" }, { id: "planet", label: "Planet", emoji: "🌍" }, { id: "moon", label: "Moon", emoji: "🌙" }, { id: "dwarf", label: "Dwarf planet", emoji: "⚪" }], items: [
  ["The Sun", "star", "☀️"], ["Sirius", "star", "✨"], ["Polaris, the North Star", "star", "⭐"], ["Betelgeuse", "star", "🟠"], ["Proxima Centauri", "star", "🌟"],
  ["Earth", "planet", "🌍"], ["Mars", "planet", "🔴"], ["Saturn", "planet", "🪐"], ["Neptune", "planet", "🔵"], ["Venus", "planet", "🟡"],
  ["Earth's Moon", "moon", "🌕"], ["Titan, circling Saturn", "moon", "🌫️"], ["Europa, circling Jupiter", "moon", "🧊"], ["Ganymede, the biggest moon", "moon", "🌑"], ["Phobos, circling Mars", "moon", "🥔"],
  ["Pluto", "dwarf", "⚪"], ["Ceres", "dwarf", "🪨"], ["Eris", "dwarf", "❄️"], ["Makemake", "dwarf", "🗿"], ["Haumea", "dwarf", "🥚"],
] };

const MOTION_Q: Pol[] = [
  { q: "What causes day and night on Earth?", e: "🌍🌗", a: "Earth spinning on its axis", w: ["The Sun moving around Earth", "Clouds blocking the Sun"], why: "Earth rotates about once every 24 hours. The side facing the Sun has day; the other side has night." },
  { q: "How long does Earth take to revolve once around the Sun?", e: "🌍☀️", a: "About 365 days — one year", w: ["24 hours — one day", "About 30 days — one month"], why: "One trip around the Sun takes about 365¼ days. That extra ¼ day is why we have leap years!" },
  { q: "In space science, “rotation” means…", e: "🔄🌍", a: "Spinning on an axis", w: ["Traveling around the Sun", "Changing seasons"], why: "Rotation is spinning; revolution is traveling around another object." },
  { q: "Why does the Sun seem to rise in the east and set in the west?", e: "🌅🌍", a: "Earth spins from west to east", w: ["The Sun circles Earth every day", "The Sun drifts east to west through space"], why: "As Earth turns toward the east, the Sun appears over the eastern horizon first." },
  { q: "Why does the Moon seem to change shape?", e: "🌒🌔", a: "We see different amounts of its sunlit half", w: ["Earth's shadow covers part of it", "The Moon really shrinks and grows"], why: "Half the Moon is always lit by the Sun. As it orbits Earth, we see more or less of that lit half." },
  { q: "How long does the Moon take to go through all its phases?", e: "🌑🌕", a: "About a month (29½ days)", w: ["One day", "One year"], why: "The word “month” comes from “moon”! A full cycle of phases takes about 29½ days." },
  { q: "During a new moon, what do we see?", e: "🌑❓", a: "Almost nothing — its lit side faces away", w: ["A bright, full circle", "Exactly half the Moon"], why: "At new moon, the Moon is between Earth and the Sun, so its sunlit side points away from us." },
  { q: "Does the Moon make its own light?", e: "🌕💡", a: "No — it reflects sunlight", w: ["Yes, it glows by itself", "Only when it's full"], why: "The Moon is a rocky ball. Moonlight is really sunlight bouncing off its surface." },
  { q: "The Moon always shows Earth the same face. Why?", e: "🌕🔄", a: "It spins once for each trip around Earth", w: ["It doesn't spin at all", "Earth's mountains block the other side"], why: "Its spin and its orbit take the same amount of time, so the same side always faces us." },
  { q: "If the Moon looks bigger and brighter each night, it is…", e: "🌒🌔", a: "Waxing", w: ["Waning", "Eclipsing"], why: "Waxing means growing toward full. Waning means shrinking back toward new." },
  { q: "Which planet has the longest year?", e: "🔵📆", a: "Neptune — about 165 Earth years", w: ["Mercury — 88 days", "Earth — 365 days"], why: "Far-out planets travel bigger orbits more slowly. Neptune finished its first orbit since its discovery only in 2011." },
  { q: "What is Earth's axis?", e: "🌍📍", a: "An imaginary line Earth spins around", w: ["A real metal pole through Earth", "The path Earth takes around the Sun"], why: "The axis runs from the North Pole to the South Pole, and it's tilted about 23½ degrees." },
];
const WAXING: [string, string][] = [["New moon", "🌑"], ["Waxing crescent", "🌒"], ["First quarter", "🌓"], ["Waxing gibbous", "🌔"], ["Full moon", "🌕"]];
const WANING: [string, string][] = [["Full moon", "🌕"], ["Waning gibbous", "🌖"], ["Third quarter", "🌗"], ["Waning crescent", "🌘"], ["New moon", "🌑"]];

// ── Ecosystem Expanse ────────────────────────────────────────────────────────────────────
const LAND_CHAIN: [string, string][] = [["Sun", "☀️"], ["Grass", "🌾"], ["Grasshopper", "🦗"], ["Frog", "🐸"], ["Snake", "🐍"], ["Hawk", "🦅"]];
const OCEAN_CHAIN: [string, string][] = [["Sun", "☀️"], ["Tiny algae (phytoplankton)", "🌿"], ["Krill", "🦐"], ["Penguin", "🐧"], ["Leopard seal", "🦭"]];
const WEB_Q: Pol[] = [
  { q: "In a food chain diagram, what do the arrows show?", e: "🌾➡️", a: "The direction energy flows", w: ["Which animal is bigger", "Which animal is fastest"], why: "Arrows point from the food to the eater: grass → rabbit means energy flows from the grass to the rabbit." },
  { q: "What's the difference between a food chain and a food web?", e: "🕸️🔗", a: "A web shows many linked food chains", w: ["A web is only about spiders", "A chain always has more animals"], why: "Most animals eat more than one thing, so real ecosystems look like a web of connected chains." },
  { q: "Grass → rabbit → fox. If the rabbits disappeared, what would happen to the foxes?", e: "🦊🐇", a: "They'd have less food and might decline", w: ["They'd have more food", "Nothing would change"], why: "Foxes depend on rabbits. Losing a food source ripples up the chain." },
  { q: "Grass → rabbit → fox. If the rabbits disappeared, what would happen to the grass?", e: "🌾🐇", a: "It would likely grow thicker", w: ["It would die out", "It would stop growing"], why: "With nothing eating it, the grass could grow and spread — the change ripples down the chain too." },
  { q: "Where does almost every food chain on land begin?", e: "☀️🌱", a: "With the Sun's energy, captured by plants", w: ["With the biggest predator", "With the decomposers"], why: "Plants capture sunlight to make food, starting the flow of energy through the chain." },
  { q: "An owl eats mice, and mice eat seeds. What is the owl?", e: "🦉🐭", a: "A consumer — and a predator", w: ["A producer", "A decomposer"], why: "Owls can't make their own food, so they're consumers. They hunt, so they're predators too." },
  { q: "What is a predator?", e: "🦈🐟", a: "An animal that hunts and eats other animals", w: ["An animal that eats only plants", "A plant that makes its own food"], why: "Predators hunt prey. Hawks, sharks and even ladybugs (which eat aphids) are predators." },
  { q: "Which animal is an omnivore?", e: "🐻🍓", a: "A bear that eats berries and fish", w: ["A cow that eats only grass", "A lion that eats only meat"], why: "Omnivores eat both plants and animals. Herbivores eat plants; carnivores eat meat." },
  { q: "What are the main producers in the ocean?", e: "🌊🌿", a: "Tiny drifting algae called phytoplankton", w: ["Sharks and whales", "Rocks on the sea floor"], why: "Phytoplankton make food from sunlight — and about half the oxygen we breathe!" },
  { q: "Why is a food web more stable than a single food chain?", e: "🕸️⚖️", a: "Animals can switch to other foods", w: ["Webs have no predators", "Webs never change"], why: "If one food runs low, eaters in a web have other choices, so the system holds together." },
  { q: "Hawks eat snakes, snakes eat frogs, frogs eat insects. What is the frog?", e: "🐸🐍", a: "Both a predator and prey", w: ["Only a predator", "A producer"], why: "The frog hunts insects but is hunted by snakes — it's both predator and prey." },
  { q: "Krill are tiny shrimp-like animals. Why are they so important in Antarctica?", e: "🦐🐋", a: "Whales, seals and penguins all eat them", w: ["They make the sea ice", "They're the top predators"], why: "Krill link tiny algae to big animals. A blue whale can eat about 4 tons of krill in a day!" },
];

const ROLE_Q: Pol[] = [
  { q: "What is a producer?", e: "🌱☀️", a: "A living thing that makes its own food", w: ["An animal that hunts", "Something that breaks down dead things"], why: "Producers like plants and algae use sunlight to make sugar — food for themselves and everyone else." },
  { q: "What do decomposers do?", e: "🍄🍂", a: "Break down dead things and recycle nutrients", w: ["Make food from sunlight", "Hunt living animals"], why: "Decomposers turn dead plants and animals into nutrients that help new plants grow." },
  { q: "Where does most of a tree's mass come from?", e: "🌳❓", a: "Carbon dioxide from the air, plus water", w: ["Soil it eats through its roots", "Sunlight turning solid"], why: "Surprise! Trees build wood mostly from CO₂ in the air — soil adds only small amounts of minerals." },
  { q: "How do plants make their own food?", e: "🌿☀️", a: "Photosynthesis", w: ["Digestion", "Hibernation"], why: "Photosynthesis uses sunlight, water and carbon dioxide to make sugar — and releases oxygen." },
  { q: "Which gas do plants give off during photosynthesis?", e: "🌳💨", a: "Oxygen", w: ["Carbon dioxide", "Smoke"], why: "Plants take in carbon dioxide and give off the oxygen we breathe." },
  { q: "What would happen in a forest with no decomposers?", e: "🍂🪵", a: "Dead leaves and logs would pile up", w: ["Trees would grow faster", "Nothing would change"], why: "Without decomposers, nutrients would stay locked in dead stuff, and new plants would go hungry." },
  { q: "Are mushrooms plants?", e: "🍄🤔", a: "No — they're fungi, and they're decomposers", w: ["Yes, they're plants", "No — they're animals"], why: "Fungi can't make food from sunlight. They absorb nutrients from dead and decaying things." },
  { q: "A cow eats only grass. What kind of consumer is it?", e: "🐄🌾", a: "An herbivore", w: ["A carnivore", "A decomposer"], why: "Herbivores eat only plants. Cows have special stomachs for breaking down tough grass." },
  { q: "Why are producers called the base of every food web?", e: "🌱🏛️", a: "All other living things depend on their food", w: ["They're the biggest living things", "They eat everything else"], why: "Every consumer's energy traces back to producers capturing sunlight." },
  { q: "Which is a scavenger, eating animals that are already dead?", e: "🦅🦴", a: "A vulture", w: ["An oak tree", "A grasshopper"], why: "Scavengers like vultures and hyenas help clean up, so less energy goes to waste." },
  { q: "Mold grows on an old slice of bread. What role is the mold playing?", e: "🍞🦠", a: "Decomposer", w: ["Producer", "Predator"], why: "Mold is a fungus breaking down the bread — the same job it does on fallen fruit in a forest." },
  { q: "Venus flytraps catch insects. Are they still producers?", e: "🌿🪰", a: "Yes — they make food by photosynthesis", w: ["No — they're carnivores only", "No — they're decomposers"], why: "Flytraps photosynthesize like other plants. Bugs just add nutrients their soggy soil lacks." },
];
const ROLE_SORT: SortMany = { prompt: "Producer, consumer, or decomposer?", bins: [{ id: "producer", label: "Producer", emoji: "🌱" }, { id: "consumer", label: "Consumer", emoji: "🦊" }, { id: "decomposer", label: "Decomposer", emoji: "🍄" }], items: [
  ["Oak tree", "producer", "🌳"], ["Grass", "producer", "🌾"], ["Seaweed", "producer", "🌿"], ["Sunflower", "producer", "🌻"], ["Phytoplankton", "producer", "🟢"], ["Cactus", "producer", "🌵"],
  ["Rabbit", "consumer", "🐇"], ["Hawk", "consumer", "🦅"], ["Deer", "consumer", "🦌"], ["Shark", "consumer", "🦈"], ["Grasshopper", "consumer", "🦗"], ["Human", "consumer", "🧍"],
  ["Mushroom", "decomposer", "🍄"], ["Bacteria in the soil", "decomposer", "🦠"], ["Mold on old bread", "decomposer", "🍞"], ["Earthworm", "decomposer", "🪱"], ["Fungus on a rotting log", "decomposer", "🪵"],
] };

const ENERGY_Q: Pol[] = [
  { q: "Where does the energy in every food chain come from in the first place?", e: "☀️🔗", a: "The Sun", w: ["The soil", "The water"], why: "Producers capture sunlight and store it as chemical energy. It flows from there to every eater." },
  { q: "About how much energy passes from one level of a food chain to the next?", e: "📉🔗", a: "About 10%", w: ["All of it — 100%", "About half"], why: "Most energy is used for living — moving, growing, staying warm — or lost as heat. Only about 10% passes up." },
  { q: "Why are there far fewer hawks than mice in a meadow?", e: "🦅🐭", a: "Less energy is left at each higher level", w: ["Hawks don't like each other", "Mice are faster"], why: "Each level gets only a small share of the energy below it, so top predators are rare." },
  { q: "In an energy pyramid, which level is the widest?", e: "🔺🌱", a: "Producers, at the bottom", w: ["Top predators", "Decomposers, at the top"], why: "Producers hold the most energy, so they form the wide base of the pyramid." },
  { q: "Where does most of the energy go at each level of a food chain?", e: "🔥🐇", a: "It's used for living or lost as heat", w: ["It's stored forever in poop", "It goes back to the Sun"], why: "Animals burn energy to move, breathe and stay warm. Most of it escapes as heat." },
  { q: "Matter cycles in an ecosystem, but energy…", e: "♻️☀️", a: "Flows through and must keep coming in", w: ["Cycles around forever", "Is made by decomposers"], why: "Decomposers recycle nutrients, but energy keeps flowing in from the Sun and out as heat." },
  { q: "The grass in a meadow holds 10,000 units of energy. About how much reaches the rabbits?", e: "🌾🐇", a: "About 1,000 units", w: ["About 10,000 units", "About 10 units"], why: "About 10% passes up each level: 10,000 → about 1,000 for rabbits → about 100 for foxes." },
  { q: "Why does a meal of plants use the Sun's energy more efficiently than a meal of meat?", e: "🥗🍔", a: "Plants are lower on the energy pyramid", w: ["Plants have more calories than anything", "Meat has no energy"], why: "Energy is lost at every step up. Eating closer to the base wastes less of the Sun's original energy." },
  { q: "A dead whale sinks to the deep sea floor. What happens to its nutrients?", e: "🐋🌊", a: "Scavengers and decomposers recycle them", w: ["They vanish forever", "They float back up to the Sun"], why: "A “whale fall” can feed deep-sea communities for decades as its matter is recycled." },
  { q: "How do plants capture energy from the Sun?", e: "🍃☀️", a: "Their leaves absorb sunlight", w: ["Their roots eat sunlight", "Their flowers store sunbeams"], why: "Green chlorophyll in leaves captures light energy to make sugar during photosynthesis." },
  { q: "Which way does energy flow in a food chain?", e: "➡️🦊", a: "From producers to consumers", w: ["From top predators to plants", "From decomposers to the Sun"], why: "Energy moves from the Sun to producers, then on to the consumers that eat them." },
  { q: "Why don't food chains have dozens of levels?", e: "🔗❓", a: "Too little energy would be left at the top", w: ["There aren't enough kinds of animals", "Top predators would get too fast"], why: "With only about 10% passed along each step, the energy runs out after a few levels." },
];
const ECO_TERMS: MatchBank = [
  ["Producer", "Makes its own food"],
  ["Consumer", "Eats other living things"],
  ["Decomposer", "Breaks down dead matter"],
  ["Herbivore", "Eats only plants"],
  ["Carnivore", "Eats only animals"],
  ["Omnivore", "Eats plants and animals"],
  ["Predator", "Hunts other animals"],
  ["Prey", "Is hunted and eaten"],
];

const CHANGE_Q: Pol[] = [
  { q: "Sea otters eat sea urchins, and urchins eat kelp. What happens if the otters disappear?", e: "🦦🌿", a: "Urchins boom and kelp forests shrink", w: ["Kelp forests grow bigger", "Nothing changes"], why: "Otters keep urchins in check. Without them, urchins can mow down whole kelp forests." },
  { q: "What is an invasive species?", e: "🐸⚠️", a: "A newcomer that spreads and harms an ecosystem", w: ["Any animal that lives in a zoo", "A species that's endangered"], why: "With no natural predators in their new home, invasive species can take over and crowd out natives." },
  { q: "Cane toads were brought to Australia to eat beetles. What happened?", e: "🐸🦘", a: "They spread and poisoned native predators", w: ["They ate every beetle and left", "They became a favorite food"], why: "The poisonous toads multiplied fast. Many snakes, lizards and quolls died trying to eat them." },
  { q: "Burmese pythons now live wild in Florida's Everglades. Why is that a problem?", e: "🐍🐊", a: "They eat native animals and have few predators", w: ["They only eat invasive plants", "They help native rabbits grow"], why: "Escaped and released pet pythons have caused sharp drops in raccoons, rabbits and other mammals." },
  { q: "Why can removing just one species affect a whole ecosystem?", e: "🕸️✂️", a: "Living things are linked in food webs", w: ["One species never matters", "All animals eat the same food"], why: "Like pulling a thread from a web, losing one species tugs on everything connected to it." },
  { q: "A keystone species is one that…", e: "🏛️🦦", a: "Holds its ecosystem together", w: ["Is the largest animal around", "Lives only in caves"], why: "Remove a keystone species — like sea otters or beavers — and the whole ecosystem can change." },
  { q: "Beavers build dams across streams. How does that change the ecosystem?", e: "🦫🏞️", a: "It creates ponds that many animals use", w: ["It dries up all the land", "It has no effect"], why: "Beaver ponds become homes for fish, frogs, birds and insects. Beavers are nature's engineers." },
  { q: "A long drought kills many plants. What happens to the herbivores there?", e: "🏜️🦌", a: "They struggle to find food", w: ["They get more food", "Nothing changes for them"], why: "Less plant food means herbivores may starve or move away — and the predators that eat them feel it next." },
  { q: "Bee populations are dropping in some places. Why does that worry farmers?", e: "🐝🍎", a: "Bees pollinate many fruit and nut crops", w: ["Bees eat the crops", "Bees make the soil"], why: "About one of every three bites of food we eat depends on pollinators like bees." },
  { q: "Zebra mussels reached the Great Lakes on ships. What did they do?", e: "🐚🚢", a: "Crowded out native mussels and clogged pipes", w: ["Cleaned up oil spills only", "Disappeared right away"], why: "With no natural enemies, zebra mussels spread fast, smothering native species and blocking water pipes." },
  { q: "Why do rabbits cause so much damage in Australia?", e: "🐇🦘", a: "Few predators, so they overeat the plants", w: ["They're native and belong there", "They eat only invasive weeds"], why: "A few dozen rabbits released in the 1800s multiplied into hundreds of millions, stripping land bare." },
  { q: "Wolves returned to Yellowstone in 1995. What did they do to the elk?", e: "🐺🦌", a: "Hunted them, so elk numbers dropped", w: ["Became friends with them", "Had no effect at all"], why: "Fewer, warier elk let some streamside trees regrow — a ripple called a trophic cascade." },
];
const CONSERVE_Q: Pol[] = [
  { q: "Which choice helps protect ocean animals?", e: "🐢🛍️", a: "Using reusable bags and bottles", w: ["Letting balloons float away", "Leaving trash on the beach"], why: "Plastic in the ocean can tangle or be swallowed by turtles, birds and whales." },
  { q: "Why do people plant native flowers in their yards?", e: "🌸🐝", a: "They feed local pollinators and wildlife", w: ["Native plants need more water", "They scare away bees"], why: "Native plants and local insects evolved together, so they support far more wildlife." },
  { q: "A forest is cut down to build a parking lot. What happens to the animals?", e: "🌲🚧", a: "They lose their habitat", w: ["They get bigger homes", "Nothing changes for them"], why: "Habitat loss is the biggest threat to wildlife — animals lose food, shelter and places to raise young." },
  { q: "Why are national parks and wildlife refuges important?", e: "🏞️🦌", a: "They protect habitats from development", w: ["They're only for picnics", "They keep animals in cages"], why: "Protected areas give plants and animals safe places to live and help endangered species recover." },
  { q: "Bald eagles nearly vanished but recovered. What helped most?", e: "🦅📈", a: "Banning a pesticide and protecting them", w: ["Feeding them candy", "Moving them all to zoos"], why: "After the pesticide DDT was banned in 1972 and eagles were protected by law, their numbers soared." },
  { q: "Why is it bad to release a pet goldfish into a local pond?", e: "🐠🏞️", a: "It could become an invasive species", w: ["The fish will be lonely", "Ponds are too cold for fish"], why: "Released goldfish can grow huge, eat native species and spread fast." },
  { q: "How does recycling aluminum cans help the environment?", e: "♻️🥤", a: "It saves energy and resources", w: ["It makes more trash", "It means more mining"], why: "Recycling a can uses about 95% less energy than making a new one from raw ore." },
  { q: "Which choice helps keep rivers clean?", e: "🏞️🚯", a: "Keeping trash and chemicals out of storm drains", w: ["Pouring paint down the drain", "Washing oil into the street"], why: "Storm drains often flow straight to rivers and the ocean, with no cleaning along the way." },
  { q: "Why do scientists count animal populations year after year?", e: "📊🦉", a: "To spot problems early and protect species", w: ["To give every animal a name", "To make animals famous"], why: "Long-term counts show which species are declining, so people can act before it's too late." },
  { q: "How does composting food scraps help?", e: "🍂🪱", a: "Decomposers turn scraps into rich soil", w: ["It makes more garbage", "It feeds invasive species"], why: "Compost returns nutrients to the soil instead of sending scraps to a landfill." },
  { q: "How do wildlife bridges over highways help animals?", e: "🌉🦌", a: "They let animals cross safely between habitats", w: ["They make roads faster for cars", "They keep animals on the road"], why: "Bridges and tunnels for wildlife cut down on collisions and reconnect habitats split by roads." },
  { q: "What's one way kids can help an ecosystem near them?", e: "🧒🌱", a: "Pick up litter and plant native plants", w: ["Feed bread to ducks every day", "Take shells and rocks home from parks"], why: "Small actions add up! Bread isn't healthy for ducks, and parks need their rocks and shells." },
];
const HELP_SORT: SortBank = { prompt: "Does it help or harm an ecosystem?", bins: ["Helps", "Harms", "🌱", "⚠️"], items: [
  ["Planting native wildflowers", 1, "🌸"], ["Picking up litter at the beach", 1, "🏖️"], ["Recycling cans and paper", 1, "♻️"], ["Composting food scraps", 1, "🍂"],
  ["Using a reusable water bottle", 1, "🚰"], ["Protecting wetlands", 1, "🦆"], ["Planting trees", 1, "🌳"], ["Turning off lights to save energy", 1, "💡"],
  ["Releasing pet fish into a pond", 0, "🐠"], ["Letting balloons float away", 0, "🎈"], ["Dumping oil down a storm drain", 0, "🛢️"], ["Paving over a forest", 0, "🚧"],
  ["Littering plastic bags", 0, "🛍️"], ["Overusing bug spray on gardens", 0, "🧪"], ["Taking shells and rocks from parks", 0, "🐚"], ["Leaving a campfire burning", 0, "🔥"],
] };

// ── Matter Mix Marina ────────────────────────────────────────────────────────────────────
const MATTER_CHANGE_Q: Pol[] = [
  { q: "What's the difference between a physical change and a chemical change?", e: "✂️🔥", a: "A chemical change makes a new substance", w: ["Physical changes are always bigger", "Chemical changes only happen in labs"], why: "Physical changes alter shape or state. Chemical changes create something new, like rust or ash." },
  { q: "Ice melts into water. What kind of change is that?", e: "🧊💧", a: "Physical — it's still water", w: ["Chemical — a new substance formed", "Not a change at all"], why: "Melting changes the state, not the substance. Freeze it again and you have ice." },
  { q: "An iron nail rusts. What kind of change is that?", e: "🔩🟤", a: "Chemical — rust is a new substance", w: ["Physical — just a color change", "No change — rust is just dirt"], why: "Iron combines with oxygen and water to form rust, a brand-new substance." },
  { q: "Which is a clue that a chemical change happened?", e: "🧪🥤", a: "Gas bubbles form when two things mix", w: ["The object changes shape", "The object is cut in half"], why: "A new gas, a new color, light, heat or a new smell can all signal a chemical change." },
  { q: "You mix baking soda and vinegar, and it fizzes. Why?", e: "🧪💨", a: "They react and make carbon dioxide gas", w: ["The vinegar is boiling", "Air was trapped in the powder"], why: "That's a chemical change: the reaction makes new substances, including bubbly CO₂ gas." },
  { q: "Burning a log is which kind of change?", e: "🪵🔥", a: "Chemical", w: ["Physical", "Neither"], why: "Burning turns wood into ash, smoke and gases. You can't un-burn it!" },
  { q: "Tearing paper into pieces is which kind of change?", e: "📄✂️", a: "Physical", w: ["Chemical", "Neither"], why: "Each piece is still paper. Only the size and shape changed." },
  { q: "Why is baking a cake a chemical change?", e: "🎂🔥", a: "The batter turns into new substances", w: ["The cake gets warm", "The batter changes shape"], why: "Heat causes reactions that make gas bubbles and new flavors. You can't unbake a cake!" },
  { q: "Water boils into steam. Is a new substance made?", e: "♨️💧", a: "No — steam is still water, as a gas", w: ["Yes — steam is a new substance", "Yes — steam turns into air"], why: "Boiling is a physical change. Cool the steam and it turns back into liquid water." },
  { q: "A banana turns brown as it ripens. What kind of change is that?", e: "🍌🟤", a: "Chemical", w: ["Physical", "Neither"], why: "Ripening and browning are chemical reactions inside the fruit — new substances form." },
  { q: "Dissolving sugar in water is called a physical change. Why?", e: "🍬💧", a: "The sugar is still there, just spread out", w: ["The sugar is destroyed", "The water turns into sugar"], why: "Let the water evaporate and the sugar is left behind. Nothing new was made." },
  { q: "Which of these is a chemical change?", e: "🎆❓", a: "A firework exploding", w: ["Freezing juice into ice pops", "Chopping carrots"], why: "Fireworks react to make light, heat, sound, smoke and new substances." },
];
const PHYS_CHEM_SORT: SortBank = { prompt: "Physical change or chemical change?", bins: ["Physical change", "Chemical change", "✂️", "🔥"], items: [
  ["Melting ice", 1, "🧊"], ["Cutting paper", 1, "✂️"], ["Boiling water", 1, "♨️"], ["Freezing juice", 1, "🧃"],
  ["Crushing a can", 1, "🥫"], ["Dissolving sugar in tea", 1, "🍵"], ["Sharpening a pencil", 1, "✏️"], ["Chopping carrots", 1, "🥕"],
  ["Burning wood", 0, "🔥"], ["A nail rusting", 0, "🔩"], ["Baking bread", 0, "🍞"], ["Cooking an egg", 0, "🍳"],
  ["Fireworks exploding", 0, "🎆"], ["Milk going sour", 0, "🥛"], ["Baking soda and vinegar fizzing", 0, "🧪"], ["A cut apple turning brown", 0, "🍎"],
] };

const PARTICLE_Q: Pol[] = [
  { q: "How do the particles in a solid behave?", e: "🧊🔬", a: "Packed tightly, vibrating in place", w: ["Spread far apart, zooming around", "Not moving at all, ever"], why: "Solid particles are locked close together, jiggling in place — so solids keep their shape." },
  { q: "Why does a liquid take the shape of its container?", e: "💧🥛", a: "Its particles can slide past each other", w: ["Liquids have no particles", "Its particles are glued tight"], why: "Liquid particles stay close but flow around each other, so a liquid fills the bottom of any container." },
  { q: "Why does a gas spread out to fill a whole room?", e: "💨🏠", a: "Its particles spread out and move freely", w: ["Gas particles are huge", "Gas particles stick to walls"], why: "Gas particles zoom around with lots of space between them, spreading to fill any container." },
  { q: "Heating a substance makes its particles…", e: "🔥🔬", a: "Move faster", w: ["Move slower", "Grow bigger"], why: "Heat adds energy, so particles speed up — enough, and a solid melts or a liquid boils." },
  { q: "A 100-gram ice cube melts completely. What's the mass of the water?", e: "🧊⚖️", a: "100 grams", w: ["Less — water is lighter than ice", "More — water is heavier"], why: "Melting doesn't add or remove matter. Mass is conserved — it stays exactly the same." },
  { q: "You dissolve 10 grams of salt in 100 grams of water. What's the total mass?", e: "🧂⚖️", a: "110 grams", w: ["100 grams — the salt disappeared", "90 grams"], why: "The salt is still there, just spread out. Mass is always conserved." },
  { q: "Why does a pumped-up ball weigh a little more than a flat one?", e: "🏀⚖️", a: "Air has mass", w: ["Pumping makes rubber heavier", "It doesn't weigh any more"], why: "Air is matter, so it has mass. More air packed inside means a slightly heavier ball." },
  { q: "What is density?", e: "🧱🧽", a: "How much mass is packed into a space", w: ["How tall something is", "How hot something is"], why: "A brick and a sponge of the same size have different densities — the brick packs in far more mass." },
  { q: "A huge log floats, but a tiny pebble sinks. Why?", e: "🪵🪨", a: "The log is less dense than water", w: ["The log is lighter than the pebble", "Pebbles don't like water"], why: "Floating depends on density, not weight. The heavy log is less dense than water; the pebble is denser." },
  { q: "What does “soluble” mean?", e: "🍬💧", a: "It can dissolve in a liquid", w: ["It sinks in water", "It sticks to magnets"], why: "Sugar and salt are soluble in water. Sand isn't — it just sinks to the bottom." },
  { q: "Why can air be squeezed into a bike tire, but a rock can't be squeezed?", e: "🚲💨", a: "Gas particles have lots of space between them", w: ["Gas particles shrink", "Rocks are softer than air"], why: "Pushing gas particles closer is easy because there's so much empty space between them." },
  { q: "A puddle disappears on a sunny day. Where did the water go?", e: "☀️💧", a: "It evaporated into the air as a gas", w: ["The heat destroyed it", "It turned into nothing"], why: "The water became invisible water vapor. Matter doesn't vanish — it changes form." },
];
const STATE_SORT: SortMany = { prompt: "Solid, liquid, or gas?", bins: [{ id: "solid", label: "Solid", emoji: "🧊" }, { id: "liquid", label: "Liquid", emoji: "💧" }, { id: "gas", label: "Gas", emoji: "💨" }], items: [
  ["Ice cube", "solid", "🧊"], ["Rock", "solid", "🪨"], ["Wooden block", "solid", "🪵"], ["Coin", "solid", "🪙"], ["Pencil", "solid", "✏️"],
  ["Milk", "liquid", "🥛"], ["Orange juice", "liquid", "🧃"], ["Honey", "liquid", "🍯"], ["Rain", "liquid", "🌧️"], ["Melted chocolate", "liquid", "🍫"],
  ["Steam (water vapor)", "gas", "♨️"], ["Helium in a party balloon", "gas", "🎈"], ["Air in a bike tire", "gas", "🚲"], ["Bubbles in soda", "gas", "🥤"], ["The oxygen we breathe", "gas", "🌬️"],
] };
const PROPERTY_MATCH: MatchBank = [
  ["Density", "Mass packed into a space"],
  ["Solubility", "Ability to dissolve"],
  ["Magnetism", "Pulled by a magnet"],
  ["Conductivity", "Lets heat or electricity flow"],
  ["Hardness", "Resists scratching"],
  ["Boiling point", "Temperature where a liquid boils"],
  ["Melting point", "Temperature where a solid melts"],
];

const MIX_Q: Pol[] = [
  { q: "What is a mixture?", e: "🥗🥜", a: "Substances combined but not changed", w: ["A brand-new substance", "Only liquids stirred together"], why: "In a mixture, each part keeps its own properties — like a salad or trail mix." },
  { q: "What is a solution?", e: "🧂💧", a: "A mixture where one substance dissolves evenly", w: ["A mixture with chunks you can see", "A solid that floats on water"], why: "In a solution, like salt water, the dissolved substance spreads out evenly and you can't see it." },
  { q: "Is trail mix a solution?", e: "🥜🍫", a: "No — it's a mixture with parts you can see", w: ["Yes — it's a solution", "No — it's a new substance"], why: "You can see and pick out each part — nuts, raisins, pretzels. Nothing dissolves." },
  { q: "How could you separate iron filings from sand?", e: "🧲🏖️", a: "Use a magnet", w: ["Add water and wait", "Shake it harder"], why: "Iron is magnetic and sand isn't, so a magnet pulls out the iron." },
  { q: "How could you get the salt back out of salt water?", e: "🧂☀️", a: "Let the water evaporate", w: ["Use a magnet", "Pour it through a strainer"], why: "The water turns to vapor and leaves the salt behind. That's how sea salt is made!" },
  { q: "Why can't a coffee filter separate salt from salt water?", e: "☕🧂", a: "Dissolved salt is too tiny to catch", w: ["Salt is magnetic", "Filters only work on juice"], why: "Dissolved salt is spread out as tiny particles that slip right through the filter's holes." },
  { q: "How could you separate sand from water?", e: "🏖️💧", a: "Pour it through a filter", w: ["Use a magnet", "Stir it faster"], why: "Sand doesn't dissolve, so the filter catches it while the water drips through." },
  { q: "In which does sugar dissolve fastest?", e: "🍬🌡️", a: "Hot water", w: ["Ice water", "They're exactly the same"], why: "Faster-moving particles in hot water break up the sugar more quickly. Stirring helps too!" },
  { q: "Oil and water are poured into a jar. What happens?", e: "🫒💧", a: "They separate into layers", w: ["They form a solution", "The oil turns into water"], why: "Oil doesn't dissolve in water, and it's less dense, so it floats on top." },
  { q: "Clear lemonade is water, lemon juice and dissolved sugar. Is it a solution?", e: "🍋🥤", a: "Yes — the sugar dissolves evenly", w: ["No — it's a new substance", "No — it's a solid"], why: "The sugar spreads evenly through the water, so every sip tastes the same. That's a solution." },
  { q: "In salt water, which part is the solvent?", e: "🧂💧", a: "The water", w: ["The salt", "The cup"], why: "The solvent does the dissolving (water). The solute is what gets dissolved (salt)." },
  { q: "You mix sand and gravel, then separate them again. What happens to their total mass?", e: "🪨⚖️", a: "Nothing — mass is conserved", w: ["The mix weighs more", "The mix weighs less"], why: "Mixing and separating don't create or destroy matter. Every grain is still there." },
];
const MIX_SORT: SortBank = { prompt: "Can you see the parts, or is it dissolved evenly?", bins: ["Parts you can see", "Dissolved evenly (solution)", "🥗", "🧂"], items: [
  ["Trail mix", 1, "🥜"], ["Salad", 1, "🥗"], ["Sand and water", 1, "🏖️"], ["Cereal and milk", 1, "🥣"],
  ["Fruit salad", 1, "🍉"], ["Oil and vinegar dressing", 1, "🫒"], ["Pebbles and soil", 1, "🪨"], ["Vegetable soup", 1, "🍲"],
  ["Salt water", 0, "🧂"], ["Sugar stirred into tea", 0, "🍵"], ["Clear apple juice", 0, "🧃"], ["Air (gases mixed evenly)", 0, "🌬️"],
  ["Lemonade with no pulp", 0, "🍋"], ["Soda pop (gas dissolved)", 0, "🥤"], ["Food coloring stirred into water", 0, "🎨"],
] };

const METHOD: [string, string][] = [
  ["Ask a question", "❓"],
  ["Make a hypothesis (a testable prediction)", "💡"],
  ["Plan and run a fair experiment", "🧪"],
  ["Observe and measure carefully", "📏"],
  ["Analyze the data and draw a conclusion", "📊"],
  ["Share your results", "📢"],
];
const FAIR_Q: Pol[] = [
  { q: "You test whether plants grow taller with more sunlight. What do you change on purpose?", e: "🌱☀️", a: "The amount of sunlight", w: ["The type of plant", "The amount of water"], why: "In a fair test you change just one thing — the independent variable. Here, it's sunlight." },
  { q: "Testing sunlight and plant growth, what should stay the same for every plant?", e: "🪴⚖️", a: "Water, soil, pot size and plant type", w: ["Only the plant's name", "Nothing — change it all"], why: "Keeping everything else the same (controlled variables) makes sure sunlight is the only cause." },
  { q: "Maya tests which paper towel soaks up the most water. What does she measure?", e: "🧻💧", a: "How much water each towel soaks up", w: ["The color of each towel", "The price of each towel"], why: "What you measure is the dependent variable — it depends on what you changed." },
  { q: "Why should you repeat an experiment several times?", e: "🔁📊", a: "To make sure the results are reliable", w: ["To make it take longer", "To get the answer you wanted"], why: "One test could be a fluke. Repeating it shows whether the results hold up." },
  { q: "Leo compares bounces on concrete and grass but drops the ball from different heights. What's wrong?", e: "🏀📏", a: "He changed two variables at once", w: ["Nothing — that's fair", "He should use two balls"], why: "If the height changes too, you can't tell whether the surface or the height made the difference." },
  { q: "What is a hypothesis?", e: "💡🔬", a: "A testable prediction", w: ["A proven fact", "The final answer"], why: "A hypothesis is an educated guess you can test, like “If I add plant food, the bean will grow taller.”" },
  { q: "Your results don't match your hypothesis. What should you do?", e: "📊🤔", a: "Report what really happened and learn", w: ["Change the data to match", "Hide the results"], why: "Scientists learn a lot from surprises. Honest data is the heart of science." },
  { q: "Why do scientists use a control group?", e: "🧪⚖️", a: "To compare against the group they changed", w: ["To control the scientists", "To make the test faster"], why: "A control gets no change, so you can see what difference your one change really made." },
  { q: "Ana tests whether salt water freezes more slowly than plain water. Which cup is the control?", e: "🧊🧂", a: "The cup of plain water", w: ["The cup of salt water", "The freezer itself"], why: "The plain-water cup has no salt added. It's what Ana compares the salty cup against." },
  { q: "Which question can be tested with an experiment?", e: "❓🧪", a: "Does warm water dissolve sugar faster?", w: ["Which color is the prettiest?", "Is summer the best season?"], why: "Testable questions can be answered by measuring. “Prettiest” and “best” are opinions." },
  { q: "Why do scientists measure with tools like rulers and scales?", e: "📏⚖️", a: "Measurements are more exact than guesses", w: ["Tools make results bigger", "Guessing is against the rules"], why: "Numbers let you compare results fairly — and let other people check your work." },
  { q: "Sam tests three plant foods but gives each plant a different amount of water. Is it fair?", e: "🌱💧", a: "No — the water should be the same for all", w: ["Yes — more variety is better", "Yes — water doesn't matter"], why: "Only the plant food should change. Different amounts of water would muddy the results." },
];
const METHOD_WORDS: MatchBank = [
  ["Hypothesis", "A testable prediction"],
  ["Variable", "Something that can change in a test"],
  ["Control", "The unchanged group, for comparing"],
  ["Data", "Measurements and observations"],
  ["Conclusion", "What the results show"],
  ["Observation", "What you notice with senses or tools"],
];

// ═══ The voyage ════════════════════════════════════════════════════════════════════════════
export const BIG_WORLDS: WorldDef[] = [
  // 3rd grade
  { id: "forces", title: "Force & Motion Falls", emoji: "🎢", grade: "3", items: 7, blurb: "Pushes, pulls, gravity, friction and magnets — what makes things move, stop and turn.",
    talk: ["Why can you run on a sidewalk but slip on ice?", "If friction disappeared for one day, what would be hardest to do?"],
    challenge: "Build a book ramp and roll a toy car onto tile, then carpet, then a towel. Measure how far it goes each time. Which surface has the most friction?",
    stages: [
      st("Pushes & pulls", "🛒", [politeT("forces-basics", FORCE_BASICS, false, "s"), sortT("forces-push-pull", PUSH_PULL, false, 6, "s")]),
      st("Friction", "🛷", [politeT("forces-friction", FRICTION_Q, false, "s"), sortT("forces-friction-sort", FRICTION_SORT, false, 6, "s")]),
      st("Balanced or unbalanced?", "⚖️", [politeT("forces-balanced", BALANCE_Q, false, "s"), matchT("forces-words", "Match each force word to its meaning", FORCE_WORDS, false, "s")]),
      st("Magnet magic", "🧲", [politeT("forces-magnets", MAGNET_Q, false, "s"), sortT("forces-magnetic", MAGNET_SORT, false, 6, "s")], 1),
    ] },
  { id: "weather-climate", title: "Weather & Climate Coast", emoji: "🌦️", grade: "3", items: 7, blurb: "Weather vs. climate, the tools that measure the sky, and how to stay storm smart.",
    talk: ["How is today's weather different from our town's climate?", "Which weather tool would you most like to own, and what would you track with it?"],
    challenge: "Make a rain gauge from a clear, straight-sided jar and a ruler. Set it out in the open, away from trees and roofs, and measure after the next rain.",
    stages: [
      st("Weather or climate?", "🌦️", [politeT("weather-climate", WX_CLIMATE_Q, false, "s"), sortT("weather-climate-sort", WX_SORT, false, 6, "s")]),
      st("Weather tools", "🌡️", [politeT("weather-tools", WX_TOOL_Q, false, "s"), matchT("weather-tools-match", "Match each weather tool to what it measures", WX_TOOLS, false, "s")]),
      st("Climate zones", "🌎", [politeT("weather-zones", ZONES_Q, false, "s"), matchT("weather-zones-match", "Match each climate to what it's like", ZONE_MATCH, false, "s")]),
      st("Storm smart", "⛈️", [politeT("weather-storms", STORM_Q, false, "s"), politeT("weather-forecast", FORECAST_Q, false, "s")]),
    ] },
  { id: "adaptations", title: "Adaptation Atoll", emoji: "🦎", grade: "3", items: 7, blurb: "Camouflage, mimicry, migration and hibernation — how living things survive.",
    talk: ["If you could have one animal adaptation, which would you pick — and why?", "What's something you were born with, and something you had to learn?"],
    challenge: "Cut paper strips in five colors and scatter them on the grass or a rug. Give a grown-up 30 seconds to find them. Which colors were hardest to spot — and why?",
    stages: [
      st("Body or behavior?", "🦒", [politeT("adapt-basics", ADAPT_Q, false, "s"), sortT("adapt-body-behavior", ADAPT_SORT, false, 6, "s")]),
      st("Hide & trick", "🦎", [politeT("adapt-camouflage", CAMO_Q, false, "s"), matchT("adapt-animal-match", "Match each animal to its adaptation", ADAPT_MATCH, false, "s")]),
      st("Winter plans", "❄️", [politeT("adapt-migrate-hibernate", MIGRATE_Q, false, "s"), sortManyT("adapt-winter", WINTER_SORT, false, 2, "s")]),
      st("Born with it or learned?", "🧬", [politeT("adapt-traits", TRAIT_Q, false, "s"), sortT("adapt-inherited-learned", TRAIT_SORT, false, 6, "s")], 1),
    ] },
  { id: "fossils", title: "Fossil Fjord", emoji: "🦴", grade: "3", items: 7, blurb: "Bones turned to stone, footprints in rock, and the true story of the dinosaurs.",
    talk: ["If scientists found your footprints a million years from now, what could they figure out about you?", "Why do you think birds survived when the other dinosaurs didn't?"],
    challenge: "Press a shell, a leaf or a toy's foot into play dough to make a “mold fossil.” Trade with a grown-up — can you each guess what made the other's print?",
    stages: [
      st("How fossils form", "🦴", [politeT("fossils-forming", FORM_Q, false, "s"), orderT("fossils-steps", "Put the steps of fossil formation in order", FOSSIL_STEPS, false, "s"), sortT("fossils-body-trace", FOSSIL_KIND_SORT, false, 6, "s")]),
      st("Fossil clues", "🔍", [politeT("fossils-clues", CLUE_Q, false, "s"), matchT("fossils-clue-match", "Match each fossil find to what it tells us", FOSSIL_MATCH, false, "s")]),
      st("Paleontologists at work", "⛏️", [politeT("fossils-dig", DIG_Q, false, "s"), orderT("fossils-dig-steps", "Put the steps of a fossil dig in order", DIG_STEPS, false, "s"), sortT("fossils-body-trace", FOSSIL_KIND_SORT, false, 6, "s")], 1),
      st("Extinction & true facts", "🦖", [politeT("fossils-extinction", EXTINCT_Q, false, "s"), sortT("fossils-dino-myths", DINO_TRUTH, false, 6, "s")]),
    ] },
  { id: "simple-machines", title: "Simple Machine Shipyard", emoji: "⚙️", grade: "3", items: 7, blurb: "Levers, pulleys, ramps and screws — clever ways to make work easier.",
    talk: ["What simple machines did you use today without noticing?", "How do you think people long ago moved giant stones with only ramps and levers?"],
    challenge: "Make a lever: lay a ruler across a pencil and put a small toy on one end. Press the other end, then slide the pencil closer to the toy. When is lifting easiest?",
    stages: [
      st("Six simple machines", "⚙️", [politeT("machines-basics", MACHINE_Q, false, "s"), matchT("machines-examples", "Match each simple machine to an example", MACHINE_MATCH, false, "s")]),
      st("Name that machine", "🔧", [politeT("machines-which", WHICH_Q, false, "s"), sortManyT("machines-sort-lift", MACHINE_SORT_LIFT, false, 2, "s"), sortManyT("machines-sort-slope", MACHINE_SORT_SLOPE, false, 2, "s")]),
      st("Less force, more distance", "💪", [politeT("machines-tradeoff", TRADEOFF_Q, false, "s"), matchT("machines-parts", "Match each machine to how it's built", MACHINE_PARTS, false, "s")]),
      st("Compound machines", "🚲", [politeT("machines-compound", COMPOUND_Q, false, "s"), matchT("machines-examples", "Match each simple machine to an example", MACHINE_MATCH, false, "s")], 1),
    ] },
  // 4th grade
  { id: "energy", title: "Energy Estuary", emoji: "⚡", grade: "4", items: 7, blurb: "Light, heat, sound, motion and more — energy never disappears, it changes form.",
    talk: ["Where did the energy in your breakfast come from before it was food?", "If our town used only renewable energy, which kind would work best here — and why?"],
    challenge: "Drop a ball from knee height, waist height and shoulder height. Which bounce is highest? Talk about where the ball's energy came from — and where it went.",
    stages: [
      st("Forms of energy", "⚡", [politeT("energy-forms", FORMS_Q, false, "s"), matchT("energy-forms-match", "Match each form of energy to an example", FORMS_MATCH, false, "s")]),
      st("Energy changes form", "🔄", [politeT("energy-changes", TRANSFER_Q, false, "s"), orderT("energy-flashlight", "Put the flashlight's energy path in order", FLASHLIGHT_STEPS, false, "s"), orderT("energy-sun-to-you", "Trace the energy from the Sun to your muscles", SUN_STEPS, false, "s")]),
      st("Stored or moving?", "🎢", [politeT("energy-kinetic-potential", KP_Q, false, "s"), sortT("energy-kp-sort", KP_SORT, false, 6, "s")]),
      st("Renewable or not?", "♻️", [politeT("energy-resources", RESOURCE_Q, false, "s"), sortT("energy-renewable", RENEW_SORT, false, 6, "s")]),
    ] },
  { id: "circuits", title: "Circuit Cove", emoji: "💡", grade: "4", items: 7, blurb: "Batteries, bulbs and switches — close the loop and the light comes on.",
    talk: ["What would a day without electricity be like?", "Why do you think the lights in our home are wired so one can be off while others stay on?"],
    challenge: "Go on a conductor hunt with a grown-up: look at an unplugged lamp cord, a plug and a tool handle. Which parts are metal conductors, and which are plastic or rubber insulators — and why?",
    stages: [
      st("Open or closed?", "💡", [politeT("circuits-basics", CIRCUIT_Q, false, "s"), sortT("circuits-light-up", LIGHT_SORT, false, 6, "s")]),
      st("Conductors & insulators", "🔌", [politeT("circuits-conductors", COND_Q, false, "s"), sortT("circuits-conductor-sort", COND_SORT, false, 6, "s")]),
      st("Series or parallel?", "🔀", [politeT("circuits-series-parallel", SERIES_Q, false, "s"), matchT("circuits-parts", "Match each circuit part to its job", PARTS_MATCH, false, "s")]),
      st("Electric safety", "⚠️", [politeT("circuits-safety", SAFETY_Q, false, "s"), sortT("circuits-safe-sort", SAFE_SORT, false, 6, "s")], 1),
    ] },
  { id: "earth-changes", title: "Shifting Earth Shoals", emoji: "🌋", grade: "4", items: 7, blurb: "Weathering breaks it, erosion moves it, volcanoes build it — Earth keeps changing.",
    talk: ["What changes have you noticed outside — a washed-out path, a cracked sidewalk, a new pile of sand?", "Would you rather live near a volcano, an earthquake fault or a crumbling sea cliff? How would you stay safe?"],
    challenge: "Build two small hills of dirt or sand in pans, and press grass or leaves into one. Sprinkle both with a watering can like rain. Which hill erodes less — and why?",
    stages: [
      st("Break, move, drop", "🌊", [politeT("earth-weathering-erosion", WEATHER_ROCK_Q, false, "s"), sortManyT("earth-wed-sort", WED_SORT, false, 2, "s")]),
      st("Fast or slow?", "⏱️", [politeT("earth-fast-slow", FASTSLOW_Q, false, "s"), sortT("earth-fast-slow-sort", FASTSLOW_SORT, false, 6, "s")]),
      st("Earth's layers", "🌍", [politeT("earth-layers", LAYER_Q, false, "s"), orderT("earth-layers-order", "Put Earth's layers in order, from the surface to the center", LAYERS, false, "s"), matchT("earth-layers-match", "Match each part of Earth to what it's like", LAYER_MATCH, false, "s")]),
      st("Living on a changing Earth", "🏗️", [politeT("earth-hazards", SOLUTION_Q, false, "s"), sortManyT("earth-wed-sort", WED_SORT, false, 2, "s")], 1),
    ] },
  { id: "rocks-minerals", title: "Rock Cycle Reef", emoji: "🪨", grade: "4", items: 7, blurb: "Igneous, sedimentary and metamorphic rock — and the minerals inside them.",
    talk: ["If a rock could tell its life story, what might have happened to it?", "Diamond and pencil graphite are both pure carbon. Why do you think they're so different?"],
    challenge: "Collect five rocks outside. Sort them by color, layers, sparkle and feel. Then scratch-test them: can your fingernail, a coin or a steel spoon scratch each one?",
    stages: [
      st("Three kinds of rock", "🪨", [politeT("rocks-types", ROCK_Q, false, "s"), sortManyT("rocks-types-sort", ROCK_SORT, false, 2, "s")]),
      st("The rock cycle", "🔄", [politeT("rocks-cycle", CYCLE_Q, false, "s"), orderT("rocks-cycle-path", "Follow one rock around the rock cycle", CYCLE_STEPS, false, "s"), matchT("rocks-processes", "Match each process to what it makes", PROCESS_MATCH, false, "s")]),
      st("Mineral detectives", "🔎", [politeT("rocks-minerals", MINERAL_Q, false, "s"), matchT("rocks-mineral-tests", "Match each mineral clue to what it tells you", TEST_MATCH, false, "s")]),
      st("The Mohs scale", "💎", [politeT("rocks-mohs", MOHS_Q, false, "s"), orderT("rocks-mohs-order", "Order these from softest to hardest", MOHS_STEPS, false, "s")], 1),
    ] },
  { id: "body-systems", title: "Body Systems Bay", emoji: "🫀", grade: "4", items: 7, blurb: "Bones, muscles, heart, lungs, gut and brain — the teams that keep you going.",
    talk: ["Which body system do you think works hardest — and why?", "What's one healthy habit our family could start this week, and which system would it help?"],
    challenge: "Count your heartbeats for 15 seconds (two fingers on your wrist), then do 30 jumping jacks and count again. What changed — and which two systems teamed up?",
    stages: [
      st("Meet the systems", "🫀", [politeT("body-systems", SYSTEM_Q, false, "s"), matchT("body-system-jobs", "Match each body system to its job", SYSTEM_JOB, false, "s"), matchT("body-organ-system", "Match each organ to its body system", ORGAN_SYSTEM, false, "s")]),
      st("Which system?", "🧠", [politeT("body-organs", ORGAN_Q, false, "s"), sortManyT("body-organ-sort-a", ORGAN_SORT_A, false, 2, "s"), sortManyT("body-organ-sort-b", ORGAN_SORT_B, false, 2, "s")]),
      st("The food journey", "🍎", [politeT("body-digestion", DIGEST_Q, false, "s"), orderT("body-food-path", "Put the path food takes in order", FOOD_PATH, false, "s"), orderT("body-air-path", "Follow a breath of air into your body", AIR_PATH, false, "s")]),
      st("Healthy habits", "🏃", [politeT("body-habits", HABIT_Q, false, "s"), sortManyT("body-habit-sort", HABIT_SORT, false, 2, "s")], 1),
    ] },
  // 5th grade
  { id: "solar-system", title: "Solar System Sea", emoji: "🪐", grade: "5", items: 7, blurb: "Eight planets, one medium-sized star, and the gravity that holds it all together.",
    talk: ["If you could visit one planet in a super-safe spaceship, which would you pick — and what would you pack?", "Why do you think people believed for so long that the Sun moved around Earth?"],
    challenge: "Tonight, sketch the Moon's shape. Look again in three or four nights. Is it waxing or waning? (No Moon? It may be new — or up in the daytime sky!)",
    stages: [
      st("Planets in order", "🪐", [politeT("space-planets", PLANET_Q, false, "s"), orderT("space-inner-order", "Put the inner planets in order, starting nearest the Sun", INNER, false, "s"), orderT("space-outer-order", "Put the outer planets in order, starting nearest the Sun", OUTER, false, "s")]),
      st("Rocky or giant?", "🌍", [politeT("space-planets", PLANET_Q, false, "s"), sortT("space-inner-outer", PLANET_SORT, false, 6, "s"), matchT("space-planet-match", "Match each planet to its fact", PLANET_MATCH, false, "s")]),
      st("The Sun & gravity", "☀️", [politeT("space-sun-gravity", SUN_Q, false, "s"), sortManyT("space-objects", OBJECT_SORT, false, 2, "s")]),
      st("Days, years & Moon phases", "🌙", [politeT("space-motion", MOTION_Q, false, "s"), orderT("space-moon-waxing", "Order the Moon's phases from new moon to full moon", WAXING, false, "s"), orderT("space-moon-waning", "Order the Moon's phases from full moon back to new moon", WANING, false, "s")]),
    ] },
  { id: "ecosystems", title: "Ecosystem Expanse", emoji: "🦊", grade: "5", items: 7, blurb: "Food webs, energy from the Sun, and how one change ripples through an ecosystem.",
    talk: ["Pick something you ate today. Can you trace its energy all the way back to the Sun?", "If you could protect one ecosystem on Earth, which would you choose — and why?"],
    challenge: "Go on a backyard or park safari with a grown-up. Find a producer, a consumer and a decomposer (peek under a log or a leaf pile!). Can you link them into a food chain?",
    stages: [
      st("Who eats whom?", "🦊", [politeT("eco-food-webs", WEB_Q, false, "s"), orderT("eco-chain-land", "Put this food chain in order, starting with the Sun", LAND_CHAIN, false, "s"), orderT("eco-chain-ocean", "Put this ocean food chain in order, starting with the Sun", OCEAN_CHAIN, false, "s")]),
      st("Producers, consumers, decomposers", "🍄", [politeT("eco-roles", ROLE_Q, false, "s"), sortManyT("eco-roles-sort", ROLE_SORT, false, 2, "s")]),
      st("Follow the energy", "☀️", [politeT("eco-energy", ENERGY_Q, false, "s"), matchT("eco-terms", "Match each word to its meaning", ECO_TERMS, false, "s")]),
      st("Ripples & choices", "🌎", [politeT("eco-change", CHANGE_Q, false, "s"), sortT("eco-help-harm", HELP_SORT, false, 6, "s"), politeT("eco-conservation", CONSERVE_Q, false, "s")]),
    ] },
  { id: "matter-changes", title: "Matter Mix Marina", emoji: "🧪", grade: "5", items: 7, blurb: "Melt it, mix it, burn it, measure it — and test ideas like a real scientist.",
    talk: ["What physical change and what chemical change did you see in the kitchen this week?", "Why do you think scientists change only one thing at a time in an experiment?"],
    challenge: "Fair test! Stir a spoonful of sugar into a cup of warm water and another into a cup of cold water — same cups, same amount, same stirring. Which dissolves first?",
    stages: [
      st("Physical or chemical?", "🔥", [politeT("matter-changes", MATTER_CHANGE_Q, false, "s"), sortT("matter-physical-chemical", PHYS_CHEM_SORT, false, 6, "s")]),
      st("Particles & properties", "🧊", [politeT("matter-particles", PARTICLE_Q, false, "s"), sortManyT("matter-states", STATE_SORT, false, 2, "s"), matchT("matter-properties", "Match each property to what it means", PROPERTY_MATCH, false, "s")]),
      st("Mixtures & solutions", "🥤", [politeT("matter-mixtures", MIX_Q, false, "s"), sortT("matter-mixture-solution", MIX_SORT, false, 6, "s")]),
      st("The scientific method", "🔬", [politeT("matter-fair-test", FAIR_Q, false, "s"), orderT("matter-sci-method", "Put the steps of the scientific method in order", METHOD, false, "s"), matchT("matter-method-words", "Match each science word to its meaning", METHOD_WORDS, false, "s")]),
    ] },
];
