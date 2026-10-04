// Hero Cards — a collectible binder of Bible heroes for the Lighthouse course. Each card is won
// by passing the level that tells that hero's story (a perfect pass makes it shine), so every card
// in the binder is a story the child actually knows. The back of each card holds the hero's
// strength, a verse to remember, and one fact worth retelling at dinner.

export type HeroRarity = "common" | "rare" | "epic";
export type Hero = {
  id: string;
  name: string;
  /** The card's big picture — the hero's signature moment. */
  emoji: string;
  /** Their strength, as a badge on the card ("Obeys God"). */
  trait: string;
  color: string;
  ref: string;
  fact: string;
  rarity: HeroRarity;
};

const h = (id: string, name: string, emoji: string, trait: string, color: string, ref: string, fact: string, rarity: HeroRarity): Hero => ({ id, name, emoji, trait, color, ref, fact, rarity });

export const HEROES: Hero[] = [
  h("noah", "Noah", "🚢", "Obeys God", "#1cb0f6", "Genesis 6:22", "Noah built the ark exactly the way God said — even before a single raindrop fell.", "common"),
  h("david", "David", "🪨", "Trusts God's power", "#3ccf6e", "1 Samuel 17:47", "David was a young shepherd who had protected his sheep from a lion and a bear.", "common"),
  h("daniel", "Daniel", "🦁", "Faithful in prayer", "#ff9149", "Daniel 6:22", "Daniel kept praying three times a day even when it was against the law.", "common"),
  h("mary", "Mary", "⭐", "Says yes to God", "#8b6cff", "Luke 1:38", "Mary told the angel, “Be it unto me according to thy word” — yes to God's plan.", "common"),
  h("lunch-boy", "The Boy Who Shared", "🧺", "Gives what he has", "#ffc83d", "John 6:9", "His small lunch of five loaves and two fish fed more than five thousand people.", "common"),
  h("jonah", "Jonah", "🐋", "Second chances", "#22c59b", "Jonah 2:9", "Jonah prayed from inside a great fish — and God gave him a second chance.", "common"),
  h("zacchaeus", "Zacchaeus", "🌳", "Makes it right", "#7cc54b", "Luke 19:8", "After meeting Jesus, Zacchaeus paid back four times what he had cheated.", "common"),
  h("miriam", "Miriam", "🧺", "Watches and speaks up", "#ff6aa2", "Exodus 2:7", "Miriam bravely spoke to a princess and got her baby brother's own mom to care for him.", "rare"),
  h("moses", "Moses", "🌊", "Leads God's people", "#1491cf", "Exodus 14:13", "Moses told a terrified crowd, “Fear ye not… see the salvation of the LORD.”", "rare"),
  h("joshua", "Joshua", "🎺", "Courage to obey", "#e0a21a", "Joshua 1:9", "Joshua led God's people around Jericho thirteen times before the walls fell.", "rare"),
  h("joseph", "Joseph", "🧥", "Forgives", "#ff7363", "Genesis 50:20", "Joseph forgave the brothers who sold him — and saved them from a famine.", "rare"),
  h("samuel", "Samuel", "👂", "Listens to God", "#4c5bd4", "1 Samuel 3:10", "Samuel heard God call his name when he was just a boy.", "rare"),
  h("ruth", "Ruth", "🌾", "Loyal love", "#c97733", "Ruth 1:16", "Ruth's loyalty made her the great-grandmother of King David.", "rare"),
  h("esther", "Esther", "👑", "Brave for others", "#e05fb0", "Esther 4:14", "Esther risked her life to save her people — after three days of prayer and fasting.", "rare"),
  h("abraham", "Abraham", "✨", "Trusts God's promises", "#6e5bff", "Genesis 15:6", "Abraham believed God's promise of a family like the stars — and Isaac was born when he was 100.", "rare"),
  h("peter", "Peter", "🎣", "Forgiven and bold", "#2bb3a3", "Matthew 4:19", "A fisherman who walked on water, failed, was forgiven, and became a fearless leader.", "rare"),
  h("bartimaeus", "Bartimaeus", "👀", "Keeps calling out", "#14a07c", "Mark 10:52", "When people told him to be quiet, Bartimaeus shouted to Jesus even louder.", "rare"),
  h("samaritan", "The Good Samaritan", "🩹", "Shows mercy", "#3ccf6e", "Luke 10:37", "Jesus' story of a stranger who stopped to help when others walked past.", "rare"),
  h("nathan", "Nathan", "👉", "Tells the truth", "#8b6cff", "2 Samuel 12:7", "Nathan told a king the hard truth — and helped him turn back to God.", "epic"),
  h("paul", "Paul", "✉️", "Changed by Jesus", "#ff9149", "2 Corinthians 5:17", "Once an enemy of Christians, Paul wrote 13 letters that are now in the Bible.", "epic"),
  h("silas", "Silas", "🎶", "Praises in hard times", "#1cb0f6", "Acts 16:25", "Silas sang hymns at midnight in jail — and an earthquake set everyone free.", "epic"),
  h("john-baptist", "John the Baptist", "🕊️", "Points to Jesus", "#22c59b", "John 1:29", "John said, “Behold the Lamb of God, which taketh away the sin of the world.”", "epic"),
];

export const HERO_BY_ID = new Map(HEROES.map((x) => [x.id, x]));
export const HERO_RARITY_COLOR: Record<HeroRarity, string> = { common: "#1cb0f6", rare: "#22c59b", epic: "#8b6cff" };
