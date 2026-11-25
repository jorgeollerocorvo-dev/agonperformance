"use client";
import { useEffect, useState } from "react";
type Result={stage?:string;metaStatus?:string;media?:string;message?:string};
export default function InstagramPostTest({day}:{day:string}) {
  const [result,setResult]=useState<Result>({});
  const [busy,setBusy]=useState(false);
  const [preview,setPreview]=useState("");
  const [previewLoaded,setPreviewLoaded]=useState(false);
  const [confirmed,setConfirmed]=useState(false);
  const [previewError,setPreviewError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    let objectUrl="";
    setPreview("");setPreviewLoaded(false);setConfirmed(false);setPreviewError("");
    fetch("/api/admin/agon-hq/publish?preview=1&day="+encodeURIComponent(day),{credentials:"same-origin",cache:"no-store",signal:controller.signal})
      .then(async response=>{
        if(!response.ok||!response.headers.get("content-type")?.includes("image/jpeg")) throw new Error("Preview unavailable");
        const blob=await response.blob();
        if(controller.signal.aborted)return;
        objectUrl=URL.createObjectURL(blob);
        setPreview(objectUrl);
      })
      .catch(()=>{if(!controller.signal.aborted)setPreviewError("Image preview unavailable. Refresh the dashboard before attempting to publish.");});
    return ()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[day]);
  async function run(action:string) {
    if(action==="publish" && !window.confirm("Publish this approved image and caption publicly to @agonperformanceqa now?")) return;
    setBusy(true);
    try {
      const response=await fetch("/api/admin/agon-hq/publish",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({day,action,visualConfirmed:confirmed}),signal:AbortSignal.timeout(80000)});
      if(!response.headers.get("content-type")?.includes("application/json")) {setResult({message:"Request unavailable. Refresh the dashboard and check status before attempting again."});return;}
      setResult(await response.json() as Result);
    } catch {setResult({message:"Request outcome uncertain. Check status before attempting again."});}
    finally {setBusy(false);}
  }
  const button="rounded-lg border px-3 py-2 font-semibold disabled:opacity-50";
  return <div className="space-y-3 rounded-xl border border-[var(--border)] p-3">
    <p className="font-bold">Instagram image publishing test</p>
    <p className="text-sm">Preview the branded JPEG and approved caption first. Preparation uploads to a private Meta container but does not publish.</p>
    <div className="max-w-sm space-y-2">
      {preview?<img src={preview} alt="Actual AGON Instagram image for approval" width={1080} height={1350} onLoad={()=>setPreviewLoaded(true)} onError={()=>{setPreviewLoaded(false);setPreviewError("Unable to display preview.");}} className="w-full h-auto rounded-xl border border-[var(--border)]"/>:<p className="text-sm">{previewError||"Rendering exact Instagram preview…"}</p>}
      {previewLoaded&&<a href={preview} download={"agon-"+day+".jpg"} className="underline text-sm">Download exact JPEG</a>}
    </div>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={!previewLoaded||busy} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/>I have reviewed the image, caption and accuracy; this is ready for Instagram.</label>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} disabled={!confirmed||busy||Boolean(result.stage&&result.stage!=="not prepared")} onClick={()=>run("prepare")}>Prepare Instagram post</button>
      <button type="button" className={button} disabled={busy} onClick={()=>run("status")}>Check upload status</button>
      {confirmed&&result.stage==="container"&&result.metaStatus==="FINISHED"&&<button type="button" disabled={busy} onClick={()=>run("publish")} className="rounded-lg bg-[#1F3A5F] px-3 py-2 text-white font-semibold">Publish approved post now</button>}
    </div>
    <div aria-live="polite" className="text-sm space-y-1">
      {busy&&<p>Working…</p>}
      {result.stage&&<p>Stage: {result.stage}</p>}
      {result.metaStatus&&<p>Meta status: {result.metaStatus}</p>}
      {result.media&&<p>Published media ID: {result.media}</p>}
      {result.message&&<p>{result.message}</p>}
    </div>
  </div>;
}
