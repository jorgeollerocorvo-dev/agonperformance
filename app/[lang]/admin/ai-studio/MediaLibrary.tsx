"use client";
import { useState } from "react";
type Asset={id:string;title:string;category:string;source:string;width:number;height:number};
const categories=["training","nutrition","coaching","lifestyle","clothing","background","product"];
function guess(name:string,fallback:string){
 const n=name.toLowerCase();
 if(/squat|kettlebell/.test(n))return "training";
 if(/bowl|chicken|kitchen/.test(n))return "nutrition";
 if(/coaching/.test(n))return "coaching";
 if(/stretch|post_workout_exit/.test(n))return "lifestyle";
 return fallback;
}
export default function MediaLibrary({initial,days}:{initial:Asset[];days:{day:string;topic:string}[]}){
 const [assets,setAssets]=useState(initial),[category,setCategory]=useState("training"),[source,setSource]=useState("chatgpt-generated"),[filter,setFilter]=useState("all"),[files,setFiles]=useState<File[]>([]),[confirmed,setConfirmed]=useState(false),[auto,setAuto]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function upload(){
  setBusy(true);let count=0;const failures:string[]=[];
  for(const file of files){
   const form=new FormData();form.set("file",file);form.set("title",file.name.replace(/\.[^.]+$/,"").replaceAll("_"," ").slice(0,120));form.set("category",auto?guess(file.name,category):category);form.set("source",source);form.set("approved","yes");
   try{const r=await fetch("/api/admin/agon-hq/media",{method:"POST",body:form});const data=await r.json();if(!r.ok||!data.asset)throw Error(data.message);const a=data.asset as Asset;setAssets(prev=>prev.some(x=>x.id===a.id)?prev:[...prev,a]);count++;}catch{failures.push(file.name);}
  }
  setMessage(count+" accepted. "+(failures.length?"Failed: "+failures.join(", "):"Ready for automatic asset selection."));setBusy(false);setConfirmed(false);
 }
 async function attach(day:string){setBusy(true);try{const r=await fetch("/api/admin/agon-hq/media",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"attach",day})});const d=await r.json();setMessage(d.message);if(r.ok)window.location.reload();}catch{setMessage("Attachment unavailable. Refresh and check draft.");}finally{setBusy(false);}}
 return <section className="rounded-2xl border border-[var(--border)] p-5 space-y-4">
 <h2 className="text-xl font-bold">AGON Media Library</h2>
 <p className="text-sm">Import approved ChatGPT images and original photography. Daily creative managers select relevant images automatically, avoiding recent reuse when alternatives exist. Generic imagery is never substituted for actual products.</p>
 <p>{assets.length} / 60 approved assets · private shared database</p>
 <div className="grid gap-3 sm:grid-cols-2">
 <label className="text-sm">Media source<select className="block border rounded p-2 w-full" value={source} onChange={e=>setSource(e.target.value)}><option value="chatgpt-generated">ChatGPT generated</option><option value="original">Original photography</option><option value="licensed">Rights-cleared media</option></select></label>
 <label className="text-sm">Default category<select className="block border rounded p-2 w-full" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
 </div>
 <label className="flex gap-2 text-sm"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/>Recognize filenames from the first ChatGPT image pack</label>
 <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{setFiles(Array.from(e.target.files||[]));setConfirmed(false);}} className="block max-w-full"/>
 <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed these images and authorize AGON to use them. Generated imagery must not be represented as real clients, actual products or actual app screenshots.</label>
 <button type="button" disabled={busy||!confirmed||!files.length} onClick={()=>void upload()} className="rounded-lg bg-[#1F3A5F] text-white px-4 py-2 disabled:opacity-40">{busy?"Working…":"Import approved images ("+files.length+")"}</button>
 {message&&<p role="status">{message}</p>}
 <label className="text-sm">Filter <select value={filter} onChange={e=>setFilter(e.target.value)} className="border rounded p-2"><option value="all">All categories</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{assets.filter(a=>filter==="all"||filter===a.category).map(a=><article key={a.id} className="rounded-lg border overflow-hidden"><img loading="lazy" src={"/api/admin/agon-hq/media?id="+a.id} alt={a.title} className="w-full aspect-[4/5] object-cover"/><div className="p-2 text-xs"><strong>{a.title}</strong><p>{a.category} · {a.source}</p></div></article>)}</div>
 {days.length>0&&<details><summary className="font-semibold cursor-pointer">Attach an image to existing drafts</summary>{days.map(d=><div key={d.day} className="flex flex-wrap gap-2 items-center mt-2"><span>{d.day} · {d.topic}</span><button type="button" disabled={busy} onClick={()=>void attach(d.day)} className="border rounded px-3 py-1">Select matching image</button></div>)}</details>}
 <p className="text-xs">Images are normalized to JPEG. Owner approval and final visual review are separate. No automatic publishing is enabled.</p>
 </section>;
}
