import { config } from "./config";

export interface Suggestion {
  text: string;
  prompt: string;
}

const subject = config.promptSubject;

const artStyles = ["anime", "art nouveau", "ukiyo-e", "watercolor"];

const basePrompts: { text: string; prompt: string }[] = [
  {
    text: "Boardroom Dominance",
    prompt: `${subject} wearing a meticulously tailored dark power suit, standing at the head of a sleek glass conference table with arms folded and an authoritative gaze`,
  },
  {
    text: "Luxury Brand CEO",
    prompt: `${subject} in a high-fashion suit with gold accents, overseeing a runway show, exuding total confidence`,
  },
  {
    text: "Cyberpunk Mercenary",
    prompt: `${subject} in a neon-lit futuristic alley, equipped with high-tech gear and a glowing visor`,
  },
  {
    text: "Ancient Egyptian Queen",
    prompt: `${subject} draped in opulent gold jewelry, wearing a regal headdress and flowing white linens, framed by towering stone pillars`,
  },
  {
    text: "Steampunk Inventor",
    prompt: `${subject} surrounded by whirring mechanical contraptions, sporting a leather corset, goggles atop her head, and a determined expression`,
  },
  {
    text: "Post-Apocalyptic Warrior",
    prompt: `${subject} roaming a desolate wasteland in tattered tactical gear, armed with a makeshift rifle, fierce and unyielding`,
  },
  {
    text: "Retro 1950s Pin-Up",
    prompt: `${subject} in a polka-dot swing dress and vintage curls, leaning playfully against a bright red classic car`,
  },
  {
    text: "Cyber Goddess",
    prompt: `${subject} in flowing metallic robes, eyes glowing with digital power, hovering above a neon-lit futuristic temple`,
  },
  {
    text: "Gothic Vampire Countess",
    prompt: `${subject} in a lavish Victorian gown of dark velvet, pale skin accented by crimson lips, stepping through a candlelit corridor`,
  },
  {
    text: "Beach Pin-Up",
    prompt: `${subject} in a high-waisted vintage bikini, smiling confidently under the sun, waves crashing in the background`,
  },
];

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getRandomSuggestions(count: number = 5): Suggestion[] {
  const shuffledPrompts = shuffle(basePrompts);
  const shuffledStyles = shuffle(artStyles);

  return shuffledPrompts.slice(0, count).map((item, index) => ({
    text: item.text,
    prompt: `${item.prompt}, in the style of ${
      shuffledStyles[index % shuffledStyles.length]
    }`,
  }));
}
