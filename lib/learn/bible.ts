import type { Activity, Band, VerseStep } from "./types";
import { numberWord, pick, pickN, rng, shuffle, type Rng, type Topic } from "./gen";

// Scripture memory for the Lighthouse course. Verses are the King James Version (public domain,
// and the traditional memory text of children's Bible clubs), word for word — with a kid-sized
// "what it means" for every one, because a verse you understand is a verse you keep.
//
// How a verse is learned (the vanishing-cue ladder memory research recommends): hear it and see
// it → fill one missing word → build it from pieces → fill several words → recall it from first
// letters only → know where it lives and what it means. Each verse is its own skill
// ("f:verse:<id>"), so the mastery engine brings it back on a spaced schedule — the way a club
// leader has kids say old verses again before moving on.

export type Verse = {
  id: string;
  ref: string;
  text: string;
  /** What it means, in a child's words. */
  meaning: string;
  pic: string;
  /** Two wrong ideas about it (for "what does it mean?"). */
  not: [string, string];
  band: Band;
};

const v = (band: Band, id: string, ref: string, text: string, pic: string, meaning: string, not: [string, string]): Verse => ({ id, ref, text, pic, meaning, not, band });

export const VERSES: Verse[] = [
  // ── Little Lights (Pre-K–K): short verses, said and heard ─────────────────────────────────
  v("little", "gen1-1", "Genesis 1:1", "In the beginning God created the heaven and the earth.", "🌍", "God made everything — the sky, the land, and everything in them.", ["The earth made itself.", "People made the sky."]),
  v("little", "gen1-31", "Genesis 1:31", "And God saw every thing that he had made, and, behold, it was very good.", "🌈", "Everything God made is very good — and that includes you!", ["God thought His world was boring.", "Only some of God's things are good."]),
  v("little", "ps139-14", "Psalm 139:14", "I will praise thee; for I am fearfully and wonderfully made.", "🧒", "God made me in an amazing way, so I thank Him!", ["I made myself.", "Some kids are made better than others."]),
  v("little", "1jn4-8", "1 John 4:8", "God is love.", "❤️", "Everything God does comes from His love.", ["God is grumpy.", "God only loves grown-ups."]),
  v("little", "1jn4-19", "1 John 4:19", "We love him, because he first loved us.", "🤗", "God loved us first — so we love Him back!", ["God loves us only if we are perfect.", "We have to love God first before He loves us."]),
  v("little", "ps23-1", "Psalm 23:1", "The LORD is my shepherd; I shall not want.", "🐑", "God takes care of me like a shepherd cares for his sheep, so I have what I need.", ["God is far away and doesn't care.", "I have to take care of myself all alone."]),
  v("little", "1pet5-7", "1 Peter 5:7", "Casting all your care upon him; for he careth for you.", "🎈", "Give your worries to God, because He cares about you.", ["Keep all your worries inside.", "God is too busy for little worries."]),
  v("little", "1cor1-9", "1 Corinthians 1:9", "God is faithful.", "🌈", "God always keeps His promises.", ["God forgets His promises.", "God changes His mind about loving us."]),
  v("little", "ps56-3", "Psalm 56:3", "What time I am afraid, I will trust in thee.", "🛡️", "When I feel scared, I can trust God.", ["Brave kids are never scared.", "When I'm scared, I should hide from God."]),
  v("little", "josh1-9", "Joshua 1:9", "Be strong and of a good courage.", "💪", "Be brave — God is with you wherever you go.", ["Only grown-ups can be brave.", "Being brave means you never need help."]),
  v("little", "luke2-11", "Luke 2:11", "For unto you is born this day in the city of David a Saviour, which is Christ the Lord.", "👶", "Jesus was born to be our Savior!", ["Jesus was just an ordinary baby.", "Jesus was born in a big palace."]),
  v("little", "mark4-39", "Mark 4:39", "Peace, be still.", "🌊", "Jesus is so powerful that even the wind and the waves obey Him.", ["Jesus was scared of the storm.", "The storm stopped all by itself."]),
  v("little", "matt19-26", "Matthew 19:26", "With God all things are possible.", "⭐", "Nothing is too hard for God.", ["Some things are too hard for God.", "We can do anything without God."]),
  v("little", "matt28-6", "Matthew 28:6", "He is not here: for he is risen, as he said.", "🌅", "Jesus came back to life, just like He promised!", ["Jesus is still in the tomb.", "Jesus forgot His promise."]),
  v("little", "john3-16a", "John 3:16", "For God so loved the world.", "🌍", "God loves everyone in the whole world — and that means you!", ["God loves only some people.", "God loves the world but not me."]),
  v("little", "eph6-1", "Ephesians 6:1", "Children, obey your parents in the Lord: for this is right.", "👨‍👩‍👧", "God wants children to listen to and obey their moms and dads.", ["Only obey when you feel like it.", "Parents should obey their children."]),
  v("little", "eph4-32a", "Ephesians 4:32", "And be ye kind one to another.", "💖", "God wants us to be kind to each other.", ["Be kind only to your friends.", "Kindness doesn't matter."]),
  v("little", "col3-9a", "Colossians 3:9", "Lie not one to another.", "🗣️", "Always tell each other the truth.", ["Little fibs are okay.", "Lying is fine if nobody finds out."]),
  v("little", "ps118-24", "Psalm 118:24", "This is the day which the LORD hath made; we will rejoice and be glad in it.", "☀️", "Every day is a gift from God, so let's be happy in it!", ["Only birthdays are special days.", "Rainy days are bad days."]),
  v("little", "ps136-1a", "Psalm 136:1", "O give thanks unto the LORD; for he is good.", "🙏", "Thank God, because He is good!", ["Only say thank you for big presents.", "God is good only sometimes."]),
  v("little", "heb13-5a", "Hebrews 13:5", "I will never leave thee, nor forsake thee.", "🤝", "God promises to always be with me.", ["God leaves when I make mistakes.", "God is only with me at church."]),
  v("little", "ps119-105", "Psalm 119:105", "Thy word is a lamp unto my feet, and a light unto my path.", "🔦", "The Bible is like a light that shows me which way to go.", ["The Bible is just an old book.", "I can find my way without any help."]),
  v("little", "ps4-8", "Psalm 4:8", "I will both lay me down in peace, and sleep: for thou, LORD, only makest me to dwell in safety.", "🌙", "I can go to sleep in peace, because God keeps me safe.", ["Nighttime is when God stops watching.", "I have to stay awake to be safe."]),
  v("little", "ps150-6", "Psalm 150:6", "Let every thing that hath breath praise the LORD.", "🎶", "Everyone who breathes can praise God — that's you too!", ["Only singers can praise God.", "Praise is only for grown-ups."]),

  // ── Bright Beams (1st–2nd): the good news, the Bible, and living it ──────────────────────
  v("middle", "john3-16", "John 3:16", "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", "❤️", "God loves the world so much that He gave His Son, Jesus. Everyone who believes in Jesus will live forever with God.", ["We get to heaven by being good enough.", "God loves only the people who love Him first."]),
  v("middle", "rom3-23", "Romans 3:23", "For all have sinned, and come short of the glory of God.", "💔", "Everyone has done wrong things — we all need God's help.", ["Only really bad people sin.", "Kids never sin."]),
  v("middle", "rom6-23", "Romans 6:23", "For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.", "🎁", "Sin brings death, but God offers a free gift: life forever through Jesus.", ["We earn heaven by doing chores.", "God's gift costs a lot of money."]),
  v("middle", "rom5-8", "Romans 5:8", "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.", "✝️", "God showed His love by sending Jesus to die for us — even before we loved Him.", ["Jesus died only for good people.", "God loves us only when we're perfect."]),
  v("middle", "1cor15-3", "1 Corinthians 15:3-4", "Christ died for our sins according to the scriptures; And that he was buried, and that he rose again the third day according to the scriptures.", "🌅", "Jesus died for our sins, was buried, and came back to life on the third day — just like the Bible said.", ["Jesus stayed in the grave.", "Jesus died because He did something wrong."]),
  v("middle", "john1-12", "John 1:12", "But as many as received him, to them gave he power to become the sons of God, even to them that believe on his name.", "👨‍👩‍👧‍👦", "Everyone who believes in Jesus becomes part of God's family.", ["Only grown-ups can be in God's family.", "You join God's family by being born in a church."]),
  v("middle", "acts16-31", "Acts 16:31", "Believe on the Lord Jesus Christ, and thou shalt be saved, and thy house.", "🙌", "Trust in Jesus, and He will save you.", ["You have to be perfect to be saved.", "Saving yourself is up to you."]),
  v("middle", "1jn1-9", "1 John 1:9", "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.", "🧼", "When we tell God what we did wrong, He forgives us and makes our hearts clean.", ["God stays mad when we do wrong.", "We should hide our sins from God."]),
  v("middle", "2tim3-16a", "2 Timothy 3:16", "All scripture is given by inspiration of God.", "📖", "God gave us the whole Bible — it is His Word.", ["People made up the Bible on their own.", "Only some of the Bible is from God."]),
  v("middle", "ps119-11", "Psalm 119:11", "Thy word have I hid in mine heart, that I might not sin against thee.", "💗", "When I learn God's Word by heart, it helps me choose what's right.", ["Hide your Bible so no one sees it.", "Memorizing verses is just for grown-ups."]),
  v("middle", "mark4-41", "Mark 4:41", "What manner of man is this, that even the wind and the sea obey him?", "⛵", "Jesus is more than a man — He is God, and even storms obey Him!", ["The disciples weren't surprised at all.", "The wind stopped because it got tired."]),
  v("middle", "luke19-10", "Luke 19:10", "For the Son of man is come to seek and to save that which was lost.", "🔎", "Jesus came to find and save people who are lost in sin.", ["Jesus only came for people who never mess up.", "Jesus came to find lost toys."]),
  v("middle", "gal5-22", "Galatians 5:22-23", "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, Meekness, temperance: against such there is no law.", "🍇", "When God's Spirit lives in us, He grows good things in us: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness and self-control.", ["The fruit of the Spirit is apples and grapes.", "We grow good fruit all by ourselves."]),
  v("middle", "1thes5-17", "1 Thessalonians 5:17", "Pray without ceasing.", "🙏", "You can talk to God any time, all day long.", ["Only pray at bedtime.", "God only listens at church."]),
  v("middle", "matt6-9", "Matthew 6:9", "Our Father which art in heaven, Hallowed be thy name.", "☁️", "God is our Father in heaven, and His name is holy and special.", ["God's name is just an ordinary word.", "God is far away and not our Father."]),
  v("middle", "prov12-22", "Proverbs 12:22", "Lying lips are abomination to the LORD: but they that deal truly are his delight.", "😊", "God hates lying, but He is delighted when we tell the truth.", ["Small lies don't matter to God.", "Telling the truth is only for church."]),
  v("middle", "col3-20", "Colossians 3:20", "Children, obey your parents in all things: for this is well pleasing unto the Lord.", "👍", "Obeying your parents makes God happy.", ["Obey only when it's fun.", "Obey only when someone is watching."]),
  v("middle", "ex20-12", "Exodus 20:12", "Honour thy father and thy mother.", "🏡", "Show respect to your mom and dad with your words and actions.", ["Honor means ignore.", "Only honor them on their birthdays."]),
  v("middle", "ex20-16", "Exodus 20:16", "Thou shalt not bear false witness against thy neighbour.", "🚫", "Don't lie about other people.", ["Lying about people is okay if they're mean.", "It's only wrong to lie to grown-ups."]),
  v("middle", "matt22-39", "Matthew 22:39", "Thou shalt love thy neighbour as thyself.", "🤝", "Treat other people with the same love and care you want.", ["Love only the neighbors next door.", "Love yourself more than anyone else."]),
  v("middle", "1sam16-7", "1 Samuel 16:7", "For man looketh on the outward appearance, but the LORD looketh on the heart.", "💗", "God cares about what's inside you more than how you look.", ["God likes the tallest, strongest people best.", "Looks matter most to God."]),
  v("middle", "prov17-17a", "Proverbs 17:17", "A friend loveth at all times.", "🧑‍🤝‍🧑", "A true friend keeps loving you in good times and hard times.", ["Friends only love you when you share.", "A friend leaves when things get hard."]),
  v("middle", "john14-15", "John 14:15", "If ye love me, keep my commandments.", "❤️", "We show we love Jesus by obeying Him.", ["Saying 'I love Jesus' is enough.", "Jesus doesn't care if we obey."]),
  v("middle", "matt5-16", "Matthew 5:16", "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.", "🕯️", "Let your good actions shine like a light, so people see them and praise God.", ["Hide your good deeds.", "Do good things so people praise you."]),
  v("middle", "prov20-11", "Proverbs 20:11", "Even a child is known by his doings, whether his work be pure, and whether it be right.", "👣", "People can tell what you're like by what you do.", ["What you do doesn't matter if you're a kid.", "People only notice what grown-ups do."]),
  v("middle", "gen50-20", "Genesis 50:20", "But as for you, ye thought evil against me; but God meant it unto good.", "🌈", "Even when people do bad things, God can bring good out of it.", ["Joseph stayed angry at his brothers forever.", "God can't fix bad things."]),
  v("middle", "esther4-14", "Esther 4:14", "And who knoweth whether thou art come to the kingdom for such a time as this?", "👑", "God puts us in the right place at the right time to do brave, good things.", ["Esther became queen just by luck.", "God never has a plan for us."]),
  v("middle", "dan6-22", "Daniel 6:22", "My God hath sent his angel, and hath shut the lions' mouths.", "🦁", "God protected Daniel, who trusted Him.", ["The lions just weren't hungry.", "Daniel stopped praying to stay safe."]),
  v("middle", "josh24-15", "Joshua 24:15", "But as for me and my house, we will serve the LORD.", "🏠", "Our family chooses to follow God.", ["Serving God is only for pastors.", "Everyone should serve themselves first."]),
  v("middle", "1sam17-47", "1 Samuel 17:47", "For the battle is the LORD's.", "🪨", "When we face giant problems, God fights for us.", ["David won because he was the biggest.", "We have to win our battles alone."]),
  v("middle", "ruth1-16", "Ruth 1:16", "For whither thou goest, I will go.", "🤝", "Ruth loved Naomi and stayed loyal to her.", ["Ruth went home and left Naomi alone.", "Loyalty means sticking around only when it's easy."]),
  v("middle", "1sam3-10", "1 Samuel 3:10", "Speak; for thy servant heareth.", "👂", "Samuel was ready to listen to God and obey.", ["Samuel told God to be quiet.", "Only grown-ups can listen to God."]),
  v("middle", "gen15-6", "Genesis 15:6", "And he believed in the LORD; and he counted it to him for righteousness.", "✨", "Abraham trusted God's promise, and God counted his faith as right.", ["Abraham earned God's love by being rich.", "Abraham didn't believe God."]),
  v("middle", "matt4-19", "Matthew 4:19", "Follow me, and I will make you fishers of men.", "🎣", "Jesus calls us to follow Him and help others know Him too.", ["Jesus wanted them to catch more fish for dinner.", "Following Jesus is only for fishermen."]),
  v("middle", "luke10-27", "Luke 10:27", "Thou shalt love the Lord thy God with all thy heart.", "💛", "Love God with everything you've got.", ["Love God a little, when you have time.", "Loving God is only for Sundays."]),
  v("middle", "prov3-5a", "Proverbs 3:5", "Trust in the LORD with all thine heart.", "🧭", "Trust God completely — with your whole heart.", ["Trust only what you can see.", "Trust God about half the time."]),

  // ── Lighthouse Keepers (3rd–5th): the whole story, deeper truths, and a life that matches ─
  v("big", "john1-1", "John 1:1", "In the beginning was the Word, and the Word was with God, and the Word was God.", "📜", "Jesus, the Word, has always existed — He was with God, and He is God.", ["Jesus was created like the angels.", "The Word means the Bible's first sentence."]),
  v("big", "2tim3-16", "2 Timothy 3:16", "All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness.", "📖", "God breathed out all of Scripture. It teaches us, corrects us, and trains us to live right.", ["Only the parts we like are from God.", "The Bible is just good advice from wise people."]),
  v("big", "heb11-1", "Hebrews 11:1", "Now faith is the substance of things hoped for, the evidence of things not seen.", "🔭", "Faith is being sure of what God promised — even before we can see it.", ["Faith means believing for no reason.", "If you can't see it, it isn't real."]),
  v("big", "john14-6", "John 14:6", "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.", "🛤️", "Jesus is the only way to God the Father. He is the truth, and He gives life.", ["There are many roads to God, so it doesn't matter.", "Jesus was just one good teacher among many."]),
  v("big", "isa9-6", "Isaiah 9:6", "For unto us a child is born, unto us a son is given: and the government shall be upon his shoulder: and his name shall be called Wonderful, Counsellor, The mighty God, The everlasting Father, The Prince of Peace.", "👑", "Long before Jesus was born, God promised a child who would be the Mighty God and the Prince of Peace.", ["Isaiah was talking about a regular king.", "This verse was written after Jesus came."]),
  v("big", "luke2-52", "Luke 2:52", "And Jesus increased in wisdom and stature, and in favour with God and man.", "🌱", "Jesus grew in His mind, His body, with God and with people — and we can grow in all four ways too.", ["Jesus was never a kid.", "Growing up only means getting taller."]),
  v("big", "john8-12", "John 8:12", "I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.", "💡", "Jesus is the light. Following Him keeps us out of the darkness of sin.", ["Jesus was talking about the sun.", "We can make our own light without Jesus."]),
  v("big", "eph2-8", "Ephesians 2:8-9", "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.", "🎁", "We are saved by God's grace when we trust Jesus — it's a gift, not something we earn.", ["We're saved by doing enough good things.", "Grace means God doesn't care about sin."]),
  v("big", "rom10-9", "Romans 10:9", "That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.", "🗣️", "If you declare that Jesus is Lord and truly believe God raised Him from the dead, you will be saved.", ["Saying the right words is enough, even if you don't believe.", "You have to earn it first."]),
  v("big", "rom10-13", "Romans 10:13", "For whosoever shall call upon the name of the Lord shall be saved.", "📣", "Anyone at all who calls on Jesus will be saved.", ["Only certain people are allowed to call on God.", "God ignores some people."]),
  v("big", "1jn5-13", "1 John 5:13", "These things have I written unto you that believe on the name of the Son of God; that ye may know that ye have eternal life.", "✅", "God wants believers to KNOW they have eternal life — not just hope so.", ["No one can know if they're saved.", "Eternal life starts only when you're old."]),
  v("big", "2cor5-17", "2 Corinthians 5:17", "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.", "🦋", "When you belong to Jesus, He makes you new on the inside.", ["Following Jesus means nothing changes.", "We make ourselves new by trying harder."]),
  v("big", "isa53-6", "Isaiah 53:6", "All we like sheep have gone astray; we have turned every one to his own way; and the LORD hath laid on him the iniquity of us all.", "🐑", "We've all wandered away like sheep, but God put all our sin on Jesus.", ["Only some people have gone astray.", "We have to carry our own sin."]),
  v("big", "matt1-21", "Matthew 1:21", "And she shall bring forth a son, and thou shalt call his name JESUS: for he shall save his people from their sins.", "👶", "Jesus' name means \"the Lord saves\" — He came to save us from our sins.", ["Jesus was named after a king.", "Jesus came to save people from bad weather."]),
  v("big", "prov10-9", "Proverbs 10:9", "He that walketh uprightly walketh surely: but he that perverteth his ways shall be known.", "🧭", "Honest people walk safely, but crooked ways always come to light.", ["Sneaky people never get caught.", "Honesty makes life more dangerous."]),
  v("big", "num32-23", "Numbers 32:23", "Be sure your sin will find you out.", "🔦", "Hidden wrongs don't stay hidden — God sees, and the truth comes out.", ["If you hide it well, it's gone forever.", "God doesn't notice small sins."]),
  v("big", "luke16-10", "Luke 16:10", "He that is faithful in that which is least is faithful also in much: and he that is unjust in the least is unjust also in much.", "🪙", "Honest in little things means honest in big things — and the opposite is true too.", ["Little things don't count.", "You can start being honest when you're older."]),
  v("big", "prov28-13", "Proverbs 28:13", "He that covereth his sins shall not prosper: but whoso confesseth and forsaketh them shall have mercy.", "🔓", "Hiding sin won't go well, but confessing it and turning from it brings mercy.", ["The best plan is to cover up your mistakes.", "Confessing makes God love you less."]),
  v("big", "ps34-13", "Psalm 34:13", "Keep thy tongue from evil, and thy lips from speaking guile.", "🤐", "Guard your words: no mean talk, and no tricky, lying talk.", ["Tricky words are fine if they're funny.", "Only bad words count — lies don't."]),
  v("big", "john8-32", "John 8:32", "And ye shall know the truth, and the truth shall make you free.", "🕊️", "Knowing and living the truth sets us free — lies trap us.", ["The truth is a cage.", "Lies make life easier."]),
  v("big", "eph4-25", "Ephesians 4:25", "Wherefore putting away lying, speak every man truth with his neighbour: for we are members one of another.", "🤝", "Put lying away — tell the truth, because we belong to each other.", ["Lying is okay with strangers.", "The truth only matters at school."]),
  v("big", "prov11-3", "Proverbs 11:3", "The integrity of the upright shall guide them: but the perverseness of transgressors shall destroy them.", "🧭", "Honesty guides good people, but crooked choices destroy the people who make them.", ["Integrity slows you down.", "Crooked choices lead to success."]),
  v("big", "james1-19", "James 1:19", "Wherefore, my beloved brethren, let every man be swift to hear, slow to speak, slow to wrath.", "👂", "Listen a lot, talk carefully, and be slow to get angry.", ["Talk first, listen later.", "Getting angry fast shows you're strong."]),
  v("big", "prov15-1", "Proverbs 15:1", "A soft answer turneth away wrath: but grievous words stir up anger.", "🕊️", "A gentle answer calms anger down; harsh words make it worse.", ["Yelling back ends arguments fastest.", "Harsh words prove you're right."]),
  v("big", "eph4-29", "Ephesians 4:29", "Let no corrupt communication proceed out of your mouth, but that which is good to the use of edifying, that it may minister grace unto the hearers.", "🏗️", "Let only helpful, kind words come out of your mouth — words that build people up.", ["Mean jokes are okay if you're kidding.", "Words don't really affect people."]),
  v("big", "phil2-14", "Philippians 2:14", "Do all things without murmurings and disputings.", "😊", "Do what you need to do without complaining or arguing.", ["Complain first, then obey.", "It's fine to argue every time you're asked."]),
  v("big", "james3-4", "James 3:4", "Behold also the ships, which though they be so great, and are driven of fierce winds, yet are they turned about with a very small helm, whithersoever the governor listeth.", "⛵", "A tiny rudder steers a giant ship — and your small tongue steers your whole life.", ["Ships steer themselves.", "Small things never matter."]),
  v("big", "james3-5", "James 3:5", "Even so the tongue is a little member, and boasteth great things. Behold, how great a matter a little fire kindleth!", "🔥", "The tongue is small but can do huge damage, like a little spark that starts a forest fire.", ["Words can't hurt anyone.", "Only big people can cause big problems."]),
  v("big", "prov18-21", "Proverbs 18:21", "Death and life are in the power of the tongue.", "💬", "Our words can hurt or help — they have real power.", ["Words are just sounds.", "Only actions have power."]),
  v("big", "ps141-3", "Psalm 141:3", "Set a watch, O LORD, before my mouth; keep the door of my lips.", "🚪", "We can ask God to guard our mouths, like a guard at a door.", ["We can control our words without God's help.", "This verse is about brushing your teeth."]),
  v("big", "ps19-14", "Psalm 19:14", "Let the words of my mouth, and the meditation of my heart, be acceptable in thy sight, O LORD, my strength, and my redeemer.", "💭", "I want my words and my thoughts to please God.", ["Only my words matter, not my thoughts.", "God doesn't care what I think about."]),
  v("big", "eph6-11", "Ephesians 6:11", "Put on the whole armour of God, that ye may be able to stand against the wiles of the devil.", "🛡️", "Put on all of God's armor so you can stand strong against the devil's tricks.", ["God's armor is made of metal.", "You can fight temptation alone."]),
  v("big", "eph6-17", "Ephesians 6:17", "And take the helmet of salvation, and the sword of the Spirit, which is the word of God.", "⚔️", "Salvation guards our minds, and God's Word is our sword against lies and temptation.", ["The sword is a real sword for fighting people.", "The Bible can't help when we're tempted."]),
  v("big", "matt5-9", "Matthew 5:9", "Blessed are the peacemakers: for they shall be called the children of God.", "🕊️", "God blesses people who make peace and calls them His children.", ["Peacemakers are people who make peas.", "God blesses people who win fights."]),
  v("big", "matt5-8", "Matthew 5:8", "Blessed are the pure in heart: for they shall see God.", "🤍", "People whose hearts are clean and true will see God.", ["Only your outside needs to be clean.", "Pure in heart means never feeling sad."]),
  v("big", "matt7-12", "Matthew 7:12", "Therefore all things whatsoever ye would that men should do to you, do ye even so to them.", "🔄", "Treat others the way you want to be treated.", ["Treat others the way they treat you.", "Be nice only if they're nice first."]),
  v("big", "matt5-44", "Matthew 5:44", "But I say unto you, Love your enemies, bless them that curse you, do good to them that hate you, and pray for them which despitefully use you, and persecute you.", "💗", "Love and pray even for people who are mean to you.", ["Get even with people who are mean.", "Ignore your enemies forever."]),
  v("big", "matt6-33", "Matthew 6:33", "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.", "👑", "Put God first, and He will take care of what you need.", ["Get everything you want first, then think about God.", "Seeking God means playing hide-and-seek."]),
  v("big", "matt7-24", "Matthew 7:24", "Therefore whosoever heareth these sayings of mine, and doeth them, I will liken him unto a wise man, which built his house upon a rock.", "🪨", "Whoever hears Jesus' words AND does them is like a wise builder on solid rock.", ["Just hearing Jesus' words is enough.", "Build on sand so it's comfy."]),
  v("big", "acts1-8", "Acts 1:8", "But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth.", "🌍", "The Holy Spirit gives believers power to tell everyone about Jesus — near and far.", ["Only pastors can tell others about Jesus.", "Tell about Jesus only in your hometown."]),
  v("big", "rom1-16", "Romans 1:16", "For I am not ashamed of the gospel of Christ: for it is the power of God unto salvation to every one that believeth.", "📣", "The good news about Jesus is God's power to save — nothing to be embarrassed about.", ["The gospel is something to keep secret.", "The gospel is just a nice story."]),
  v("big", "prov3-5", "Proverbs 3:5-6", "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.", "🧭", "Trust God completely — not just your own ideas — and He will guide your path.", ["Trust only what you can figure out.", "God guides only grown-ups."]),
  v("big", "prov1-7", "Proverbs 1:7", "The fear of the LORD is the beginning of knowledge: but fools despise wisdom and instruction.", "🦉", "Real wisdom starts with respecting God.", ["Being smart just means knowing lots of facts.", "Wise people never need teaching."]),
  v("big", "prov22-1", "Proverbs 22:1", "A good name is rather to be chosen than great riches, and loving favour rather than silver and gold.", "🏅", "Being known as a good, honest person is worth more than being rich.", ["Money is the most important thing.", "Your name only matters if you're famous."]),
  v("big", "prov16-18", "Proverbs 16:18", "Pride goeth before destruction, and an haughty spirit before a fall.", "📉", "Pride and showing off lead to a fall.", ["Bragging makes you stronger.", "Pride keeps you safe."]),
  v("big", "prov16-32", "Proverbs 16:32", "He that is slow to anger is better than the mighty; and he that ruleth his spirit than he that taketh a city.", "🧘", "Controlling your temper takes more strength than winning a battle.", ["Angry people are the strongest.", "Self-control is for weak people."]),
  v("big", "prov6-6", "Proverbs 6:6", "Go to the ant, thou sluggard; consider her ways, and be wise.", "🐜", "Look how hard the ant works — learn to work hard and not be lazy.", ["Ants are lazy.", "Hard work is a waste of time."]),
  v("big", "prov1-8", "Proverbs 1:8", "My son, hear the instruction of thy father, and forsake not the law of thy mother.", "👂", "Listen to your dad's teaching and don't ignore your mom's guidance.", ["Parents' advice is old-fashioned.", "Listen to your parents only when you agree."]),
  v("big", "mark10-45", "Mark 10:45", "For even the Son of man came not to be ministered unto, but to minister, and to give his life a ransom for many.", "🤲", "Jesus came to serve and to give His life for us — so we serve too.", ["Jesus came to be served like a king.", "Serving others is beneath us."]),
  v("big", "phil2-3", "Philippians 2:3", "Let nothing be done through strife or vainglory; but in lowliness of mind let each esteem other better than themselves.", "🤝", "Don't be selfish or show off — treat other people as more important than yourself.", ["Look out for number one.", "Humble means thinking you're worthless."]),
  v("big", "col3-23", "Colossians 3:23", "And whatsoever ye do, do it heartily, as to the Lord, and not unto men.", "💪", "Do everything with your whole heart, as if you're doing it for Jesus.", ["Do your best only when people are watching.", "Chores don't matter to God."]),
  v("big", "gal6-9", "Galatians 6:9", "And let us not be weary in well doing: for in due season we shall reap, if we faint not.", "🌾", "Don't give up doing good — the harvest comes at the right time.", ["If good doesn't pay off fast, quit.", "Doing good never makes a difference."]),
  v("big", "matt22-37", "Matthew 22:37", "Thou shalt love the Lord thy God with all thy heart, and with all thy soul, and with all thy mind.", "❤️", "Love God with everything you are — heart, soul and mind.", ["Loving God is just a feeling.", "Love God with whatever is left over."]),
  v("big", "john13-34", "John 13:34", "A new commandment I give unto you, That ye love one another; as I have loved you, that ye also love one another.", "💞", "Jesus commands us to love each other the way He loves us.", ["Love only people who love you back.", "Jesus' love is only for church friends."]),
  v("big", "rom12-21", "Romans 12:21", "Be not overcome of evil, but overcome evil with good.", "🌟", "Don't let evil beat you — beat evil by doing good.", ["Fight evil with more evil.", "Doing good is weak."]),
  v("big", "1cor10-13", "1 Corinthians 10:13", "There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able; but will with the temptation also make a way to escape, that ye may be able to bear it.", "🚪", "Every temptation is normal, and God is faithful — He always gives a way out.", ["Some temptations are too strong to fight.", "God tempts us to see if we'll fail."]),
  v("big", "ps51-10", "Psalm 51:10", "Create in me a clean heart, O God; and renew a right spirit within me.", "🤍", "God, make my heart clean and help me want what's right.", ["I can clean my own heart.", "My heart doesn't matter, only my actions."]),
  v("big", "2tim2-15", "2 Timothy 2:15", "Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth.", "🛠️", "Study God's Word carefully so you understand it and live it out well.", ["Study is only for school.", "You don't need to understand the Bible."]),
  v("big", "1tim4-12", "1 Timothy 4:12", "Let no man despise thy youth; but be thou an example of the believers, in word, in conversation, in charity, in spirit, in faith, in purity.", "⭐", "Even kids can be great examples of following Jesus — in what they say and do.", ["Kids are too young to matter to God.", "Only grown-ups can be good examples."]),
  v("big", "1jn3-18", "1 John 3:18", "My little children, let us not love in word, neither in tongue; but in deed and in truth.", "🤲", "Show love with actions and honesty, not just words.", ["Saying 'I love you' is enough.", "Love is only a feeling."]),
  v("big", "1pet2-17", "1 Peter 2:17", "Honour all men. Love the brotherhood. Fear God. Honour the king.", "🙇", "Respect everyone, love fellow believers, honor God, and respect leaders.", ["Respect only people you like.", "Leaders don't deserve respect."]),
  v("big", "rom12-10", "Romans 12:10", "Be kindly affectioned one to another with brotherly love; in honour preferring one another.", "🏆", "Love each other like family, and try to outdo each other in showing honor.", ["Try to get more honor than everyone else.", "Love only your real brothers and sisters."]),
  v("big", "matt4-4", "Matthew 4:4", "It is written, Man shall not live by bread alone, but by every word that proceedeth out of the mouth of God.", "📖", "We need God's Word even more than food — Jesus used Scripture to beat temptation.", ["Bread is all we really need.", "Jesus won by arguing louder."]),
  v("big", "john11-25", "John 11:25", "I am the resurrection, and the life: he that believeth in me, though he were dead, yet shall he live.", "🌅", "Jesus has power over death; everyone who believes in Him will live forever.", ["Death is stronger than Jesus.", "Only good people live forever."]),
  v("big", "john10-11", "John 10:11", "I am the good shepherd: the good shepherd giveth his life for the sheep.", "🐑", "Jesus is our Good Shepherd who gave His life for us, His sheep.", ["A good shepherd runs from danger.", "Jesus only cares about real sheep."]),
  v("big", "john6-35", "John 6:35", "I am the bread of life: he that cometh to me shall never hunger.", "🍞", "Jesus fills the deepest hunger of our hearts, like bread for the soul.", ["Jesus was talking about a bakery.", "We'll never need to eat again."]),
  v("big", "john15-5", "John 15:5", "I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit.", "🍇", "Stay connected to Jesus like a branch to a vine, and good fruit grows in your life.", ["Branches grow fine on their own.", "This verse is about gardening tips."]),
  v("big", "isa41-10", "Isaiah 41:10", "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.", "✋", "Don't be afraid — God is with you, makes you strong, and holds you up.", ["God helps only strong people.", "Fear means God has left."]),
  v("big", "lam3-22", "Lamentations 3:22-23", "It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.", "🌄", "God's love and mercy are fresh every single morning.", ["God's mercy runs out.", "God is only kind on good days."]),
  v("big", "matt28-19", "Matthew 28:19", "Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost.", "🗺️", "Jesus sends His followers to help people everywhere become His disciples.", ["Keep the good news to yourself.", "Only people in Israel can follow Jesus."]),
  v("big", "micah6-8", "Micah 6:8", "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?", "⚖️", "God has shown us what's good: be fair, love being kind, and walk humbly with Him.", ["God wants us to be the most important.", "Being fair doesn't matter to God."]),
];

export const VERSE_BY_ID = new Map(VERSES.map((x) => [x.id, x]));
export const verseSkill = (id: string) => `f:verse:${id}`;

// ── Words ───────────────────────────────────────────────────────────────────────────────────
/** A verse's words with their punctuation split off ("world," → core "world", post ","). */
export function verseWords(text: string): { pre: string; core: string; post: string }[] {
  return text.split(/\s+/).filter(Boolean).map((t) => {
    const m = /^([^A-Za-z']*)(.*?)([^A-Za-z']*)$/.exec(t);
    return { pre: m?.[1] ?? "", core: m?.[2] ?? t, post: m?.[3] ?? "" };
  });
}

const STOP = new Set(
  "the and a an of to in is it be for that as by on with unto which all but not are we he his him i my me you your ye thou thee thy this so or at from our us they them their shall hath was were have has do did if no nor yet into upon even also there then than what who whom these those every any one more most such own out up down very may let said saith art hast been will when where how her she its had both thing things came come".split(" "),
);
/** Words worth recalling (not "the", "and", "unto"… and not LORD in capitals, a giveaway). */
export function keyIndexes(text: string): number[] {
  return verseWords(text)
    .map((w, i) => ({ w: w.core, i }))
    .filter(({ w }) => w.length >= 3 && /^[A-Za-z']+$/.test(w) && !STOP.has(w.toLowerCase()) && w !== w.toUpperCase())
    .map(({ i }) => i);
}

/** Content words for look-alike wrong choices, by band: little sailors get short, everyday words
 *  (ideally ones with a picture); bigger sailors get the whole library. */
const ARCHAIC = /(?:eth|est)$|^(?:unto|hath|doth|shalt|wilt|thine|mine|whither|whosoever|behold)$/i;
const poolFor = (bands: Band[], maxLen = 99, plain = false) => {
  const s = new Set<string>();
  for (const x of VERSES)
    if (bands.includes(x.band))
      for (const i of keyIndexes(x.text)) {
        const w = verseWords(x.text)[i].core;
        if (w.length <= maxLen && !(plain && ARCHAIC.test(w))) s.add(w);
      }
  return [...s];
};
const POOLS: Record<Band, string[]> = {
  little: [...new Set([...poolFor(["little"], 7, true), "love", "light", "happy", "kind", "sheep", "stars", "home", "friend", "heart", "sky", "sun", "help", "good", "glad"])],
  middle: poolFor(["little", "middle"]),
  big: poolFor(["little", "middle", "big"]),
};

/** Pictures for words a pre-reader can't read yet. */
export const WORD_PIC: Record<string, string> = {
  God: "✨", love: "❤️", loved: "❤️", world: "🌍", earth: "🌍", heaven: "☁️", shepherd: "🐑", light: "💡", lamp: "🔦", path: "🛤️", feet: "🦶",
  afraid: "😨", trust: "🤝", strong: "💪", courage: "🦁", good: "👍", kind: "💖", parents: "👨‍👩‍👧", obey: "👂", children: "🧒", day: "☀️", glad: "😄",
  thanks: "🙏", praise: "🙌", peace: "🕊️", still: "🤫", risen: "🌅", born: "👶", Saviour: "✝️", beginning: "🌱", created: "🌍", made: "🛠️",
  breath: "🌬️", sleep: "😴", safety: "🛡️", care: "🎈", faithful: "🌈", possible: "⭐", leave: "🚪", Lie: "🙊", wonderfully: "🌟", truth: "🗣️",
  sheep: "🐑", fire: "🔥", ships: "⛵", tongue: "👅", heart: "💗", word: "📖", Son: "👑", gift: "🎁", life: "🌱", sin: "💔", sinned: "💔", bread: "🍞",
};

/** "1 John 4:19" → "First John, four nineteen" (how kids say a reference out loud). */
export function refSpoken(ref: string): string {
  const m = /^(?:(\d)\s+)?([A-Za-z ]+?)\s+(\d+):(\d+)(?:-(\d+))?$/.exec(ref.trim());
  if (!m) return ref;
  const ord = m[1] ? ["", "First", "Second", "Third"][Number(m[1])] + " " : "";
  const verses = m[5] ? `${numberWord(Number(m[4]))} through ${numberWord(Number(m[5]))}` : numberWord(Number(m[4]));
  return `${ord}${m[2]}, ${numberWord(Number(m[3]))}, ${verses}`;
}

/** What the voice reads (KJV small capitals become words, old spellings are said right). */
export function verseSpeech(text: string): string {
  return text
    .replace(/\bLORD\b/g, "Lord")
    .replace(/\bGOD\b/g, "God")
    .replace(/\bJESUS\b/g, "Jesus")
    .replace(/\bshew(ed)?\b/g, "show$1")
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}️‍⃣]/gu, "") // pictures aren't read aloud
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── Items ───────────────────────────────────────────────────────────────────────────────────
const base = (x: Verse, step: VerseStep): Activity => ({ kind: "verse", ref: x.ref, text: x.text, pic: x.pic, meaning: x.meaning, v: step, skill: verseSkill(x.id) });

const isCap = (w: string) => /^[A-Z]/.test(w);

/** Look-alike wrong words: similar length, not already in the verse, and in the same case as
 *  the answer (a capital letter would give it away). */
function decoysFor(r: Rng, x: Verse, word: string, n: number): string[] {
  const inVerse = new Set(verseWords(x.text).map((w) => w.core.toLowerCase()));
  // Pre-readers choose by picture: their wrong choices come from words that have one.
  const pictured = Object.keys(WORD_PIC).filter((p) => !inVerse.has(p.toLowerCase()) && (isCap(word) || !isCap(p)));
  const pool = x.band === "little" && pictured.length >= n ? pictured : POOLS[x.band];
  const ok = pool.filter((p) => !inVerse.has(p.toLowerCase()) && (isCap(word) || !isCap(p)));
  const close = ok.filter((p) => Math.abs(p.length - word.length) <= 3);
  const picked = pickN(r, close.length >= n ? close : ok, n);
  const styled = picked.map((d) => (isCap(word) && !isCap(d) ? d[0].toUpperCase() + d.slice(1) : d));
  return [...new Set(styled)].filter((d) => d.toLowerCase() !== word.toLowerCase());
}

/** Pick `n` blank positions spread across the verse. */
function spreadPick(r: Rng, idx: number[], n: number): number[] {
  if (idx.length <= n) return idx;
  const out: number[] = [];
  const seg = idx.length / n;
  for (let k = 0; k < n; k++) out.push(idx[Math.min(idx.length - 1, Math.floor(k * seg + r() * seg))]);
  return [...new Set(out)].sort((a, b) => a - b);
}

export function verseBlanks(r: Rng, x: Verse, n: number, cue: "full" | "letters" = "full"): Activity {
  const words = verseWords(x.text);
  const keys = keyIndexes(x.text);
  const at = spreadPick(r, keys.length ? keys : words.map((_, i) => i), n);
  return base(x, { step: "blanks", cue, blanks: at.map((i) => ({ at: i, options: shuffle(r, [words[i].core, ...decoysFor(r, x, words[i].core, 2)]) })) });
}

/** Little words a piece shouldn't end on ("…the" | "third day…"). */
const GLUE = new Set("the a an of to in is my his her our your thy and but that with unto for be not shall will which who are was by on at from as o all even so no nor or into upon this these those he i we ye they it".split(" "));

/** Split into k pieces of about the same size, at natural phrase breaks: after punctuation if it's
 *  anywhere near, never after a little glue word — the best split by a small dynamic program. */
export function verseChunks(text: string, k: number): string[] {
  const toks = text.split(/\s+/).filter(Boolean);
  const n = toks.length;
  k = Math.max(2, Math.min(k, n));
  const ideal = n / k;
  const endCost = (j: number) => {
    if (j === n || /[,;:.!?]$/.test(toks[j - 1])) return 0;
    return GLUE.has(toks[j - 1].replace(/[^A-Za-z']/g, "").toLowerCase()) ? 7 : 3;
  };
  const size = (len: number) => ((len - ideal) / ideal) ** 2 * 6;
  const dp: number[][] = Array.from({ length: k + 1 }, () => Array(n + 1).fill(Infinity));
  const from: number[][] = Array.from({ length: k + 1 }, () => Array(n + 1).fill(-1));
  dp[0][0] = 0;
  for (let c = 1; c <= k; c++)
    for (let j = c; j <= n - (k - c); j++)
      for (let i = c - 1; i < j; i++) {
        const cost = dp[c - 1][i] + size(j - i) + endCost(j);
        if (cost < dp[c][j]) {
          dp[c][j] = cost;
          from[c][j] = i;
        }
      }
  const cuts: number[] = [];
  for (let c = k, j = n; c > 0; c--) {
    cuts.unshift(j);
    j = from[c][j];
  }
  return cuts.map((end, i) => toks.slice(i ? cuts[i - 1] : 0, end).join(" "));
}

/** How many pieces a band builds a verse from (fixed per verse, so the pieces can be recorded). */
export function chunkCount(x: Verse, band: Band): number {
  const n = verseWords(x.text).length;
  if (band === "little") return n <= 8 ? 2 : 3;
  if (band === "middle") return Math.min(5, Math.max(3, Math.round(n / 5)));
  return Math.min(7, Math.max(3, Math.round(n / 4)));
}

export function verseTiles(r: Rng, x: Verse, band: Band, decoy = false): Activity {
  const k = chunkCount(x, band);
  const chunks = verseChunks(x.text, k);
  let decoys: string[] | undefined;
  if (decoy) {
    const other = pick(r, VERSES.filter((o) => o.id !== x.id && o.band === x.band));
    const oc = verseChunks(other.text, k);
    const d = oc[Math.floor(r() * oc.length)];
    if (!chunks.includes(d)) decoys = [d];
  }
  return base(x, { step: "tiles", chunks, decoys });
}

const refRoot = (ref: string) => ref.replace(/-\d+$/, "");

export function verseRef(r: Rng, x: Verse): Activity {
  const others = [...new Set(VERSES.filter((o) => refRoot(o.ref) !== refRoot(x.ref)).map((o) => o.ref))];
  const near = [...new Set(VERSES.filter((o) => o.band === x.band && refRoot(o.ref) !== refRoot(x.ref)).map((o) => o.ref))];
  const wrong = pickN(r, near.length >= 2 ? near : others, 2);
  return base(x, { step: "ref", options: shuffle(r, [x.ref, ...wrong]) });
}

export function verseMeaning(r: Rng, x: Verse): Activity {
  return base(x, { step: "meaning", options: shuffle(r, [x.meaning, ...x.not]), answer: x.meaning });
}

export const verseListen = (x: Verse): Activity => base(x, { step: "listen" });

const wordCount = (x: Verse) => verseWords(x.text).length;

/** One practice item for a verse at difficulty d (0 → 1), sized to the child's band. */
export function verseItem(r: Rng, x: Verse, band: Band, d: number): Activity {
  const n = wordCount(x);
  if (band === "little") {
    if (n <= 3) return d < 0.5 ? verseMeaning(r, x) : verseTiles(r, x, band);
    return d < 0.34 ? verseBlanks(r, x, 1) : d < 0.67 ? verseTiles(r, x, band) : verseMeaning(r, x);
  }
  if (band === "middle") {
    if (d < 0.25 && n > 3) return verseBlanks(r, x, 1);
    if (d < 0.5) return verseTiles(r, x, band);
    if (d < 0.75) return n >= 8 ? verseBlanks(r, x, 2) : verseMeaning(r, x);
    return r() < 0.5 ? verseRef(r, x) : verseMeaning(r, x);
  }
  if (d < 0.2) return verseBlanks(r, x, Math.min(2, Math.max(1, Math.floor(n / 8))));
  if (d < 0.45) return verseTiles(r, x, band, n >= 10);
  if (d < 0.7) return verseBlanks(r, x, Math.min(4, Math.max(2, Math.round(n / 7))), n >= 8 ? "letters" : "full");
  return r() < 0.5 ? verseRef(r, x) : verseMeaning(r, x);
}

/** The whole ladder for one verse — a "learn this verse" level: hear it, then recall it with
 *  less and less help (one word → pieces → what it means → several words → where it's found). */
export function verseLadder(x: Verse, band: Band, seed: string): Activity[] {
  const r = rng(seed);
  const n = wordCount(x);
  if (band === "little") {
    const out: Activity[] = [verseListen(x), verseMeaning(r, x)];
    if (n >= 3) out.push(verseBlanks(r, x, 1), verseTiles(r, x, band), verseBlanks(r, x, 1));
    else out.push(verseTiles(r, x, band));
    return out;
  }
  if (band === "middle")
    return [verseListen(x), ...(n >= 3 ? [verseBlanks(r, x, 1)] : []), verseTiles(r, x, band), verseMeaning(r, x), ...(n >= 6 ? [verseBlanks(r, x, Math.min(3, Math.max(1, Math.round(n / 8))))] : []), verseRef(r, x)];
  return [
    verseListen(x),
    verseBlanks(r, x, Math.min(2, Math.max(1, Math.round(n / 9)))),
    verseTiles(r, x, band),
    verseMeaning(r, x),
    verseBlanks(r, x, Math.min(4, Math.max(2, Math.round(n / 6))), n >= 8 ? "letters" : "full"),
    verseRef(r, x),
  ];
}

/** A review topic for a set of verses (builds items for exactly the verse a skill names). */
export function versesTopic(key: string, ids: string[], band: Band): Topic {
  const list = ids.map((id) => VERSE_BY_ID.get(id)).filter((x): x is Verse => !!x);
  return {
    key: `verses-${key}`,
    gen: (r, d) => verseItem(r, pick(r, list), band, d),
    forSkill: (skill, r) => {
      const x = list.find((y) => verseSkill(y.id) === skill);
      return x ? verseItem(r, x, band, r()) : null;
    },
  };
}
