import { prisma } from "@/lib/prisma";
import { z } from "zod";
export const categories=["training","nutrition","coaching","lifestyle","clothing","background","product"] as const;
export const mediaMeta=z.object({id:z.string().regex(/^[a-f0-9]{64}$/),title:z.string().min(1).max(120),category:z.enum(categories),source:z.enum(["chatgpt-generated","original","licensed"]),approved:z.literal(true),width:z.number().int().positive(),height:z.number().int().positive()});
export type MediaMeta=z.infer<typeof mediaMeta>;
const metaPrefix="agon-hq-v1:media-meta:", dataPrefix="agon-hq-v1:media-data:";
export async function mediaList(){
 const rows=await prisma.aiCache.findMany({where:{promptHash:{startsWith:metaPrefix}},orderBy:{createdAt:"asc"},take:60});
 return rows.flatMap(r=>{try{const m=mediaMeta.safeParse(JSON.parse(r.response));return m.success?[m.data]:[];}catch{return [];}});
}
export async function mediaBytes(id:string){
 if(!/^[a-f0-9]{64}$/.test(id))return null;
 const meta=await prisma.aiCache.findUnique({where:{promptHash:metaPrefix+id}});
 if(!meta)return null;
 const parsed=mediaMeta.safeParse(JSON.parse(meta.response));
 if(!parsed.success)return null;
 const row=await prisma.aiCache.findUnique({where:{promptHash:dataPrefix+id}});
 return row?{meta:parsed.data,bytes:Buffer.from(row.response,"base64")}:null;
}
export async function saveMedia(meta:MediaMeta,bytes:Buffer){
 const valid=mediaMeta.parse(meta);
 if(bytes.length>1024*1024)throw Error("Media exceeds limit");
 await prisma.$transaction(async tx=>{
  const existing=await tx.aiCache.findUnique({where:{promptHash:metaPrefix+valid.id}});
  if(existing)return;
  const count=await tx.aiCache.count({where:{promptHash:{startsWith:metaPrefix}}});
  if(count>=60)throw Error("Library limit reached");
  await tx.aiCache.create({data:{promptHash:metaPrefix+valid.id,response:JSON.stringify(valid),provider:"agon-hq-media"}});
  await tx.aiCache.create({data:{promptHash:dataPrefix+valid.id,response:bytes.toString("base64"),provider:"agon-hq-media-bytes"}});
 },{isolationLevel:"Serializable"});
}
export function categoryForTopic(topic:string){
 if(/catalog|clothing|wear/i.test(topic))return "product";
 if(/nutrition|fuel/i.test(topic))return "nutrition";
 if(/coaching/i.test(topic))return "coaching";
 if(/recovery|lifestyle/i.test(topic))return "lifestyle";
 return "training";
}
export async function chooseMedia(topic:string,day:string,exclude:string[]=[]){
 const category=categoryForTopic(topic);
 if(category==="product")return undefined; // never substitute generic images for a real catalog item
 const available=(await mediaList()).filter(m=>m.category===category&&!exclude.includes(m.id));
 if(!available.length)return undefined;
 const index=Math.floor(Date.parse(day+"T00:00:00Z")/86400000)%available.length;
 return available[Math.max(0,index)]?.id;
}
