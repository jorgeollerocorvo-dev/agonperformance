"use client";
import { useState } from "react";
const C={navy:"#1F3A5F",sage:"#6B8F71",ivory:"#E8E1D6",sand:"#C7A380",white:"#FFFFFF",pale:"#D5E1D5"};
const esc=(s:string)=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
function text(x:number,y:number,value:string,size=36,fill=C.navy,weight=500){return '<text x="'+x+'" y="'+y+'" fill="'+fill+'" font-size="'+size+'" font-weight="'+weight+'">'+esc(value)+'</text>';}
function box(x:number,y:number,w:number,h:number,fill:string,r=0){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+fill+'"/>';}
function photo(x:number,y:number,w:number,h:number,url:string,label:string){
 return url?'<image x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid meet" href="'+esc(url)+'"/>':box(x,y,w,h,"#F5EFE7",24)+text(x+24,y+h/2,label,25,C.navy,600)+text(x+24,y+h/2+36,"Add actual photo",22,C.navy,400);
}
const header=(n:number,dark=false)=>text(64,86,"AGON / FUEL",38,dark?C.ivory:C.navy,800)+text(836,86,"01 · "+n+"/5",27,dark?C.pale:C.navy,500)+box(64,116,952,3,dark?C.sage:C.navy);
const footer=(dark=false)=>box(64,1230,952,3,dark?C.sage:C.navy)+text(64,1280,"QATAR SUPERMARKET SHOWDOWN",25,dark?C.ivory:C.navy,700)+text(840,1280,"AGON",28,dark?C.ivory:C.navy,800);
function svg(i:number,regular:string,high:string){
 const dark=i===1||i===4;
 let body=box(0,0,1080,1350,dark?C.navy:C.ivory)+header(i+1,dark);
 if(i===0){
  body+=text(64,216,"SAME SIZE.",78,C.navy,800)+text(64,306,"3× THE PROTEIN?",76,C.navy,800)+text(64,365,"Baladna chocolate milk · 360 ml",36);
  body+=photo(64,420,456,480,regular,"REGULAR")+photo(560,420,456,480,high,"HIGH PROTEIN");
  body+=text(88,995,"9.7g",90,C.navy,800)+text(584,995,"30g",90,C.navy,800)+text(90,1042,"Regular",32)+text(585,1042,"High protein",32)+text(64,1165,"Is it worth paying double?",46,C.navy,700);
 }else if(i===1){
  body+=text(64,228,"THE PROTEIN",76,C.ivory,800)+text(64,315,"COMPARISON.",76,C.ivory,800)+text(64,390,"Per 360 ml bottle",34,C.pale);
  body+=text(64,522,"REGULAR",30,C.pale,700)+text(64,620,"9.7g",90,C.ivory,800)+box(64,657,300,42,C.ivory,21);
  body+=text(64,810,"HIGH PROTEIN",30,C.pale,700)+text(64,908,"30g",90,C.ivory,800)+box(64,945,930,42,C.sage,21)+text(64,1125,"About 3.1× as much protein.",43,C.ivory,700);
 }else if(i===2){
  body+=text(64,218,"WHAT ARE YOU",76,C.navy,800)+text(64,306,"PAYING FOR?",76,C.navy,800)+text(64,374,"Listed prices at LuLu Qatar",34);
  body+=box(64,435,456,430,"#F5EFE7",28)+box(560,435,456,430,C.navy,28)+text(90,507,"REGULAR",30,C.navy,700)+text(90,655,"3 QAR",83,C.navy,800)+text(90,742,"≈ 3.2g protein/QAR",30)+text(585,507,"HIGH PROTEIN",30,C.pale,700)+text(585,655,"6 QAR",83,C.ivory,800)+text(585,742,"5g protein/QAR",30,C.ivory);
  body+=text(64,970,"More protein per riyal.",58,C.navy,800)+text(64,1036,"But compare the whole nutrition label.",36)+text(64,1145,"Retail prices may change.",28);
 }else if(i===3){
  body+=text(64,218,"WHICH FITS",80,C.navy,800)+text(64,310,"YOUR GOAL?",80,C.navy,800);
  body+=box(64,390,952,300,C.navy,28)+text(96,460,"01 / HIGH PROTEIN",32,C.pale,700)+text(96,541,"Need more daily protein?",49,C.ivory,800)+text(96,608,"A convenient way to add more protein.",35,C.ivory);
  body+=box(64,720,952,300,"#F5EFE7",28)+text(96,790,"02 / REGULAR",32,C.navy,700)+text(96,871,"Already meeting your target?",43,C.navy,800)+text(96,938,"A lower-cost option may suit you.",35);
  body+=text(64,1135,"Check calories, sugars and your total diet.",37,C.navy,600);
 }else{
  body+=text(64,240,"SHOP",120,C.ivory,800)+text(64,372,"SMARTER.",120,C.ivory,800)+text(64,520,"FUEL",120,C.pale,800)+text(64,652,"BETTER.",120,C.pale,800)+box(64,760,952,4,C.sage)+text(64,864,"Save this for your next",52,C.ivory,700)+text(64,929,"supermarket visit.",52,C.ivory,700)+text(64,1090,"TRAIN. EAT. PERFORM.",37,C.pale,800);
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" font-family="Arial, sans-serif">'+body+footer(dark)+'</svg>';
}
const reels=[
 {title:"AGON FUEL · Post-workout nutrition",hook:"You train hard. Are you fueling your recovery?",beats:["0–3s: athlete finishes session; hook","3–6s: balanced meal close-up","6–10s: protein source","10–14s: rice, potatoes or oats","14–18s: colorful produce","18–22s: water and recovery","22–25s: AGON closing"],assets:"Original or licensed gym and meal footage, water shot, approved logo, rights-cleared audio."},
 {title:"AGON COACH · More than a workout plan",hook:"Online coaching should be more than a PDF workout plan.",beats:["0–3s: coach on camera","3–7s: actual AGON app recording","7–11s: athlete training","11–15s: coach reviewing progress","15–19s: coaching support","19–23s: app and training","23–25s: verified offer and closing"],assets:"Actual AGON screen recordings, original coach footage, consent for any client images; verify trial offer before export."},
];
export default function PremiumPilot(){
 const [regular,setRegular]=useState(""),[high,setHigh]=useState(""),[index,setIndex]=useState(0),[checked,setChecked]=useState(false),[error,setError]=useState("");
 const source=svg(index,regular,high);
 async function load(file:File|undefined,set:(value:string)=>void){
  if(!file)return;setChecked(false);setError("");
  if(file.size>15*1024*1024){setError("Choose a photo under 15 MB.");return;}
  try{const bitmap=await createImageBitmap(file);const canvas=document.createElement("canvas");const ratio=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);const ctx=canvas.getContext("2d");if(!ctx)throw Error();ctx.fillStyle="#FFFFFF";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();set(canvas.toDataURL("image/jpeg",0.93));}catch{setError("Unable to read this photo. Try a JPEG or PNG.");}
 }
 async function download(n:number){
  const data=svg(n,regular,high),url=URL.createObjectURL(new Blob([data],{type:"image/svg+xml;charset=utf-8"}));try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext("2d");if(!ctx)throw Error();ctx.drawImage(img,0,0);const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",0.95));if(!blob)throw Error();const jpeg=URL.createObjectURL(blob);const a=document.createElement("a");a.href=jpeg;a.download="agon-fuel-001-slide-"+(n+1)+".jpg";a.click();setTimeout(()=>URL.revokeObjectURL(jpeg),1500);}catch{setError("JPEG export failed. Try a different browser.");}finally{URL.revokeObjectURL(url);}
 }
 return <section className="rounded-2xl border border-[var(--border)] p-5 space-y-4">
 <h2 className="text-xl font-bold">Premium pilot · AGON FUEL / COACH</h2><p>Five-slide Supermarket Showdown carousel and two Reel production briefs. This is a private production workspace, not a live publishing queue.</p>
 <p className="text-sm">Source-checked figures: Baladna regular 2.7g protein per 100 ml (9.7g per bottle), high protein 30g per bottle; LuLu listed 3 and 6 QAR. Confirm current bottles, prices and nutrition labels before publication.</p>
 <div className="flex flex-wrap gap-3 text-sm underline"><a href="https://baladna.com/en/product/fresh-milk/chocolate-flavored-milk" target="_blank" rel="noreferrer">Regular nutrition</a><a href="https://baladna.com/en/product/hi-protein/low-fat-chocolate-flavored-milk" target="_blank" rel="noreferrer">High-protein product</a><a href="https://gcc.luluhypermarket.com/en-qa/baladna-fresh-milk-chocolate-360-ml/p/1743171" target="_blank" rel="noreferrer">Regular price</a><a href="https://gcc.luluhypermarket.com/en-qa/baladna-high-protein-chocolate-milk-360-ml/p/2293983/" target="_blank" rel="noreferrer">High-protein price</a></div>
 <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Actual regular bottle photo<input type="file" accept="image/*" className="block max-w-full" onChange={e=>void load(e.target.files?.[0],setRegular)}/></label><label className="text-sm">Actual high-protein bottle photo<input type="file" accept="image/*" className="block max-w-full" onChange={e=>void load(e.target.files?.[0],setHigh)}/></label></div>
 <p className="text-xs">Photos remain in this browser session; use your own or rights-cleared packshots. No fake labels or AI-generated packaging.</p>
 <div className="max-w-sm mx-auto"><img width={1080} height={1350} alt={"Pilot carousel slide "+(index+1)} src={"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source)} className="rounded-xl w-full h-auto"/></div>
 <div className="flex gap-2 flex-wrap">{[0,1,2,3,4].map(n=><button type="button" key={n} onClick={()=>setIndex(n)} className={"rounded-lg border px-3 py-2 "+(index===n?"bg-[#1F3A5F] text-white":"")}>{n+1}</button>)}</div>
 <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} disabled={!regular||!high} onChange={e=>setChecked(e.target.checked)}/>Both photos and usage rights, current label values, prices and final layout have been checked.</label>
 <button type="button" onClick={()=>void download(index)} disabled={!checked} className="rounded-lg bg-[#1F3A5F] text-white px-4 py-2 font-semibold disabled:opacity-40">Download reviewed slide JPEG</button>
 <p className="text-xs">Export each of the five slides, then upload in order to Instagram. API carousel publishing is not implemented here. Do not publish placeholder designs.</p>
 {error&&<p role="alert">{error}</p>}
 <details><summary className="font-bold cursor-pointer">Carousel caption</summary><p className="whitespace-pre-wrap mt-2">QATAR SUPERMARKET SHOWDOWN 🇶🇦{"\n\n"}Two chocolate milks, same bottle size. About three times the protein in the high-protein version for twice the listed price. If you need more daily protein, it could be convenient. If you already meet your target, regular milk may suit your budget. Compare the full nutrition label and your total diet.{"\n\n"}Save this for your next supermarket visit.{"\n\n"}#AgonPerformance #QatarFitness #QatarSupermarkets #SportsNutrition</p></details>
 <div className="grid gap-3">{reels.map(r=><details key={r.title} className="rounded-lg border border-[var(--border)] p-3"><summary className="font-bold">{r.title} · Footage required</summary><p className="mt-2">{r.hook}</p><ol className="list-decimal pl-5">{r.beats.map(b=><li key={b}>{b}</li>)}</ol><p className="text-sm mt-2">Assets: {r.assets}</p><p className="text-xs">Planning complete; no finished video generated.</p></details>)}</div>
 </section>;
}
