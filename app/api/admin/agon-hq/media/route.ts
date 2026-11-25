import { createHash } from "node:crypto";
import sharp from "sharp";
import { requireHqOwner } from "@/lib/agon-hq-owner";
import { mediaList, mediaBytes, mediaMeta, saveMedia, chooseMedia } from "@/lib/agon-media";
import { prisma } from "@/lib/prisma";
import { hqDrafts } from "@/lib/agon-hq";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const json=(data:object,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request:Request){
 await requireHqOwner();
 const id=new URL(request.url).searchParams.get("id");
 if(!id)return json({assets:await mediaList()});
 const item=await mediaBytes(id);
 return item?new Response(new Uint8Array(item.bytes),{headers:{"Content-Type":"image/jpeg","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}}):new Response(null,{status:404});
}
export async function POST(request:Request){
 await requireHqOwner();
 if(request.headers.get("origin")!=="https://web-production-83d44.up.railway.app")return json({message:"Forbidden"},403);
 try{
  if(request.headers.get("content-type")?.includes("application/json")){
   const body=await request.json();
   if(body.action!=="attach"||typeof body.day!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(body.day))return json({message:"Invalid request"},400);
   const d=(await hqDrafts()).find(d=>d.day===body.day&&["draft","approved"].includes(d.status)&&!d.product&&d.copy);
   if(!d)return json({message:"No eligible draft"},409);
   const id=await chooseMedia(d.topic,d.day);
   if(!id)return json({message:"Upload an approved image for this topic first."},409);
   await prisma.$transaction(async tx=>{
    if(await tx.aiCache.findUnique({where:{promptHash:"agon-hq-v1:publish:"+d.day}}))throw Error("Publication already prepared");
    const row=await tx.aiCache.findUnique({where:{promptHash:d.key}});
    if(!row)throw Error("Draft unavailable");
    const data=JSON.parse(row.response);
    if(!["draft","approved"].includes(data.status)||data.product||data.mediaId)throw Error("Draft cannot be changed");
    await tx.aiCache.update({where:{promptHash:d.key},data:{response:JSON.stringify({...data,mediaId:id})}});
   },{isolationLevel:"Serializable"});
   return json({message:"Approved library image attached. Refresh to review."});
  }
  if(Number(request.headers.get("content-length")||0)>9*1024*1024)return json({message:"Upload too large"},413);
  const form=await request.formData(),file=form.get("file");
  if(!(file instanceof File)||file.size>8*1024*1024||file.size===0||form.get("approved")!=="yes")return json({message:"Choose a photo up to 8 MB and confirm usage rights."},400);
  const input=sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:25_000_000,failOn:"error"});
  const m=await input.metadata();
  if(!["jpeg","png","webp"].includes(m.format||"")||!m.width||!m.height||Math.min(m.width,m.height)<600)return json({message:"Use JPEG, PNG or WebP, at least 600 px on each side."},400);
  const bytes=await input.rotate().resize({width:1350,height:1600,fit:"inside",withoutEnlargement:true}).flatten({background:"#E8E1D6"}).jpeg({quality:86}).toBuffer();
  const dims=await sharp(bytes).metadata();
  const meta=mediaMeta.parse({id:createHash("sha256").update(bytes).digest("hex"),title:String(form.get("title")||file.name).slice(0,120),category:form.get("category"),source:form.get("source"),approved:true,width:dims.width,height:dims.height});
  await saveMedia(meta,bytes);
  return json({message:"Approved asset saved",asset:meta});
 }catch{return json({message:"Unable to save or attach media. Check format, library limit and publication state."},409);}
}
