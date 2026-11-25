import { createHmac, timingSafeEqual } from "node:crypto";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { requireHqOwner } from "@/lib/agon-hq-owner";
import { hqDrafts } from "@/lib/agon-hq";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const origin = "https://web-production-83d44.up.railway.app";
const account = "17841458256775193";
const validDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day);
const idOk = (id: unknown): id is string => typeof id === "string" && /^\d{8,25}$/.test(id);
const json = (body: object, status = 200) => Response.json(body, {status,headers:{"Cache-Control":"private, no-store"}});
function sign(day: string, expiry: string) {
  if (!process.env.AUTH_SECRET) throw new Error("Signing unavailable");
  return createHmac("sha256", process.env.AUTH_SECRET).update("agon-hq-jpeg-v1:"+day+":"+expiry).digest("hex");
}
async function approved(day: string) {
  return (await hqDrafts()).find(d=>d.day===day && d.status==="approved" && d.format==="Post" && d.copy && !d.product);
}
type State = { stage: "creating" | "container" | "publishing" | "published" | "blocked"; container?: string; media?: string; message?: string };
const stateKey = (day: string) => "agon-hq-v1:publish:"+day;
async function state(day: string) {
  const row = await prisma.aiCache.findUnique({where:{promptHash:stateKey(day)}});
  return row ? {row,data:JSON.parse(row.response) as State} : null;
}
async function transition(day: string, previous: string, next: State) {
  return (await prisma.aiCache.updateMany({where:{promptHash:stateKey(day),response:previous},data:{response:JSON.stringify(next)}})).count === 1;
}
async function graph(node: string, fields?: Record<string,string>) {
  const token = process.env.AGON_HQ_INSTAGRAM_TOKEN?.trim();
  const version = process.env.AGON_HQ_INSTAGRAM_API_VERSION || "v25.0";
  if (!token || !/^v\d{2}\.\d$/.test(version)) throw new Error("Meta configuration unavailable");
  const url = "https://graph.facebook.com/"+version+"/"+node;
  const res = await fetch(url,{method:fields?"POST":"GET",headers:{Authorization:"Bearer "+token,...(fields?{"Content-Type":"application/x-www-form-urlencoded"}:{})},body:fields?new URLSearchParams(fields):undefined,cache:"no-store",signal:AbortSignal.timeout(20000)});
  if (!res.ok) throw new Error("Meta HTTP "+res.status);
  return await res.json() as {id?:string;username?:string;status_code?:string};
}
export async function GET(request: Request) {
  const u = new URL(request.url), day = u.searchParams.get("day") || "", expiry = u.searchParams.get("exp") || "", sig = u.searchParams.get("sig") || "";
  if (!validDay(day)) return new Response(null,{status:404});
  if (u.searchParams.get("preview")==="1") await requireHqOwner();
  else {
    if (!/^\d{10}$/.test(expiry) || Number(expiry)<Date.now()/1000 || !/^[a-f0-9]{64}$/.test(sig)) return new Response(null,{status:404});
    const expected=sign(day,expiry);
    if (!timingSafeEqual(Buffer.from(sig,"hex"),Buffer.from(expected,"hex"))) return new Response(null,{status:404});
  }
  const d=await approved(day);
  if (!d?.copy) return new Response(null,{status:404});
  const png = new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",background:"#1F3A5F",color:"#E8E1D6",padding:84,fontFamily:"sans-serif"}}>
      <div style={{display:"flex",flexDirection:"column",gap:24}}><div style={{fontSize:38,fontWeight:700,letterSpacing:3}}>AGON PERFORMANCE</div><div style={{height:12,width:160,background:"#6B8F71"}}/></div>
      <div style={{display:"flex",flexDirection:"column",gap:30}}><div style={{fontSize:35,color:"#C6DAC8"}}>{d.topic.toUpperCase()}</div><div style={{fontSize:d.copy.hook.length>85?64:84,fontWeight:700,lineHeight:1.14,overflowWrap:"break-word"}}>{d.copy.hook}</div></div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}><div style={{height:3,width:"100%",background:"#6B8F71"}}/><div style={{fontSize:34,color:"#C6DAC8"}}>Train smarter. · Link in bio</div></div>
    </div>,{width:1080,height:1350});
  const jpeg=await sharp(Buffer.from(await png.arrayBuffer())).jpeg({quality:90}).toBuffer();
  return new Response(new Uint8Array(jpeg),{headers:{"Content-Type":"image/jpeg","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
export async function POST(request: Request) {
  await requireHqOwner();
  if (request.headers.get("origin") !== origin) return json({message:"Open the owner dashboard on the AGON website."},403);
  let input: {day?:string;action?:string};
  try {input=await request.json();} catch {return json({message:"Invalid request"},400);}
  const day=input?.day || "", action=input?.action || "";
  if (!validDay(day) || !["prepare","status","publish"].includes(action)) return json({message:"Invalid request"},400);
  const d=await approved(day);
  if (!d?.copy) return json({message:"Only approved non-product image posts are supported in this test."},409);
  let existing=await state(day);
  if (action==="status") {
    if (!existing) return json({stage:"not prepared"});
    if (existing.data.stage!=="container" || !idOk(existing.data.container)) return json(existing.data);
    try {const meta=await graph(existing.data.container+"?fields=status_code");return json({...existing.data,metaStatus:meta.status_code || "UNKNOWN"});}
    catch {return json({...existing.data,message:"Container status unavailable. No publication attempted."},503);}
  }
  if (action==="prepare") {
    if (existing) return json(existing.data);
    try {
      const profile=await graph(account+"?fields=id,username");
      if (profile.username?.toLowerCase()!=="agonperformanceqa" || profile.id!==account) return json({message:"Expected account not verified."},409);
      const exp=String(Math.floor(Date.now()/1000)+3600), sig=sign(day,exp);
      const image=origin+"/api/admin/agon-hq/publish?day="+day+"&exp="+exp+"&sig="+sig;
      const probe=await fetch(image,{cache:"no-store",signal:AbortSignal.timeout(15000)});
      if (!probe.ok || !probe.headers.get("content-type")?.includes("image/jpeg")) return json({message:"JPEG delivery failed; no Meta container created."},503);
      await probe.arrayBuffer();
      const initial: State={stage:"creating"};
      try {await prisma.aiCache.create({data:{promptHash:stateKey(day),response:JSON.stringify(initial),provider:"agon-hq-publish"}});}
      catch(e) {if((e as {code?:string}).code==="P2002") return json({message:"An attempt already exists. Check status."},409);throw e;}
      try {
        const meta=await graph(account+"/media",{image_url:image,caption:d.copy.caption});
        if (!idOk(meta.id)) throw new Error("No container ID");
        const next: State={stage:"container",container:meta.id,message:"Media container created; nothing published."};
        await transition(day,JSON.stringify(initial),next);
        return json(next);
      } catch {
        const next: State={stage:"blocked",message:"Container creation failed or result uncertain. No automatic retry; investigate before creating another."};
        await transition(day,JSON.stringify(initial),next);return json(next,503);
      }
    } catch {return json({message:"Preparation failed before publishing. Check connection and media delivery."},503);}
  }
  if (!existing || existing.data.stage!=="container" || !idOk(existing.data.container)) return json({message:"No ready container; no publish attempted."},409);
  const container=existing.data.container;
  try {
    const profile=await graph(account+"?fields=id,username");
    if(profile.id!==account || profile.username?.toLowerCase()!=="agonperformanceqa") return json({message:"Expected account not verified."},409);
    const meta=await graph(container+"?fields=status_code");
    if(meta.status_code!=="FINISHED") return json({stage:"container",metaStatus:meta.status_code,message:"Wait for FINISHED before publishing."},409);
  } catch {return json({message:"Could not verify readiness. Nothing published."},503);}
  const pending: State={stage:"publishing",container};
  if(!await transition(day,existing.row.response,pending)) return json({message:"Another attempt already started."},409);
  try {
    const meta=await graph(account+"/media_publish",{creation_id:container});
    if(!idOk(meta.id)) throw new Error("No published media ID");
    const done: State={stage:"published",container,media:meta.id,message:"Instagram returned a published media ID."};
    await transition(day,JSON.stringify(pending),done);return json(done);
  } catch {
    return json({stage:"publishing",message:"Publishing outcome uncertain. Do not retry; check Instagram manually to avoid duplicates."},503);
  }
}
