import { z } from "zod";
export const brand = {
  name:"AGON Performance",
  palette:{navy:"#1F3A5F",sage:"#6B8F71",ivory:"#E8E1D6",sand:"#C7A380",terracotta:"#D9735D"},
  typography:"Montserrat bold headlines, Poppins supporting copy, high contrast and generous spacing",
  identity:"Premium realistic sports editorial, expert approachable coach voice, useful before promotional.",
  imagery:"Original or licensed photos and footage, natural movement and anatomy, no fabricated testimonials or product imagery.",
} as const;
export const managers = [
  {name:"Creative Director",role:"Brand identity, palette, typography and campaign concept",status:"Brief generation"},
  {name:"Content Strategist",role:"Audience, objective and useful takeaway",status:"Brief generation"},
  {name:"Reel Director",role:"15–30 second narrative, shot list, pacing, subtitles, licensed audio direction",status:"Storyboard planning"},
  {name:"Post & Carousel Designer",role:"1080 × 1350 editorial layouts; 4–6 slides for carousels",status:"Layout planning"},
  {name:"Copywriter",role:"Clear hook, actionable caption and one relevant CTA",status:"Draft generation"},
  {name:"Quality Manager",role:"Check brief completeness; require human visual review",status:"Brief checks only"},
  {name:"Publishing Manager",role:"Owner approval, verified media and duplicate protection",status:"Manual image test"},
  {name:"Performance Analyst",role:"Learn from verified reach, saves, shares and watch time",status:"Analytics integration pending"},
] as const;
export const creativeSchema=z.object({
  objective:z.string().min(1).max(200),
  audience:z.string().min(1).max(200),
  visualDirection:z.string().min(1).max(500),
  assetRequirements:z.array(z.string().min(1).max(240)).min(1).max(6),
  execution:z.array(z.string().min(1).max(300)).min(3).max(6),
  audioDirection:z.string().max(240),
  reviewNotes:z.array(z.string().min(1).max(240)).max(6),
});
export type CreativeBrief=z.infer<typeof creativeSchema>;
export const creativePrompt = [
  "Simulate a coordinated editorial team in one bounded model call, not independent agents. Return JSON with hook, caption, scenes, and creative object.",
  "Creative Director: follow the fixed AGON brand: "+JSON.stringify(brand),
  "Content Strategist: choose one concrete audience, objective and useful takeaway.",
  "Reel Director: for Reels write 3–6 timed beats totaling 15–30 seconds; specify realistic shots, readable subtitles and rights-cleared audio direction. Hook within 2 seconds.",
  "Post & Carousel Designer: for a post describe one strong photo-led editorial layout; for a carousel plan 4–6 slides with actionable takeaway and a clear cover. Use 1080x1350; Reels 1080x1920.",
  "Copywriter: avoid vague motivation, generic filler and unsupported claims. One useful takeaway and one natural CTA. Never invent client results, prices or endorsements.",
  "Quality Manager: report missing assets, risks and revisions in reviewNotes; do not assert rendered visual quality, rights clearance or claim any asset exists.",
  "Publishing Manager: no automatic publishing or approval. Performance Analyst: no invented metrics.",
  "creative fields: objective, audience, visualDirection, assetRequirements (1–6 strings), execution (3–6 strings), audioDirection (string, empty for stills), reviewNotes (0–6 strings). Keep strings concise.",
].join("\n");
export function localCreativeBrief(format:string, topic:string, scenes:string[]):CreativeBrief {
 const reel=format==="Reel", carousel=format==="Carousel";
 return {
  objective:"Teach one practical takeaway about "+topic.toLowerCase(),
  audience:"Adults interested in sustainable training, nutrition and performance",
  visualDirection:"Premium photo-led editorial. Navy or ivory base, sage accent, strong headline and generous spacing. Natural light, realistic anatomy; avoid generic stock or fake product imagery.",
  assetRequirements:[reel?"Original or rights-cleared vertical footage for each shot":"Original or rights-cleared editorial photo appropriate to the topic","Approved AGON logo and readable typography"],
  execution:reel?["0–2s: concise hook on a compelling moving shot","2–8s: "+(scenes[1]||"Show a practical coaching example").slice(0,220),"8–17s: add a concrete coaching takeaway","17–22s: understated AGON closing and CTA"]:carousel?["Slide 1: clear benefit-led cover","Slide 2: explain the problem","Slide 3: practical takeaway with example","Slide 4: actionable checklist and CTA"]:["Hero: meaningful editorial photograph","Overlay: short headline and one sage accent","Footer: subtle AGON identity and concise CTA"],
  audioDirection:reel?"Rights-cleared instrumental track or original gym sound; captions remain legible without audio.":"",
  reviewNotes:["Source and verify media rights","Inspect final visual composition and movement before approval","Confirm the educational message is accurate"],
 };
}
export function briefChecks(brief:CreativeBrief) {
 const valid=creativeSchema.safeParse(brief).success;
 return {complete:valid,visualStatus:"Not reviewed",publishingReady:false};
}
