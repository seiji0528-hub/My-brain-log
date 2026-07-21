// タグ文字列から常に同じ色を導き、カード左端の「背表紙」やチップの色に使う。
const PALETTE = [
  { bg: "bg-accent-pale", text: "text-accent-soft", bar: "bg-accent" },
  { bg: "bg-gold-pale", text: "text-gold", bar: "bg-gold" },
  { bg: "bg-[#E4EDE7]", text: "text-[#3C6B57]", bar: "bg-[#3C6B57]" },
  { bg: "bg-[#F1E1E6]", text: "text-[#93445A]", bar: "bg-[#93445A]" },
  { bg: "bg-[#E7E3F3]", text: "text-[#5A4E8F]", bar: "bg-[#5A4E8F]" },
];

export function colorForTag(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
