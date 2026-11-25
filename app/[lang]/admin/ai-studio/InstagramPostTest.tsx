"use client";
import { useState } from "react";
type Result={stage?:string;metaStatus?:string;media?:string;message?:string};
export default function InstagramPostTest({day}:{day:string}) {
  const [result,setResult]=useState<Result>({});
  const [busy,setBusy]=useState(false);
  async function run(action:string) {
    if(action==="publish" && !window.confirm("Publish this approved image and caption publicly to @agonperformanceqa now?")) return;
    setBusy(true);
    try {
      const response=await fetch("/api/admin/agon-hq/publish",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({day,action}),signal:AbortSignal.timeout(80000)});
      if(!response.headers.get("content-type")?.includes("application/json")) {setResult({message:"Request unavailable. Refresh the dashboard and check status before attempting again."});return;}
      setResult(await response.json() as Result);
    } catch {setResult({message:"Request outcome uncertain. Check status before attempting again."});}
    finally {setBusy(false);}
  }
  const button="rounded-lg border px-3 py-2 font-semibold disabled:opacity-50";
  return <div className="space-y-3 rounded-xl border border-[var(--border)] p-3">
    <p className="font-bold">Instagram image publishing test</p>
    <p className="text-sm">Preview the branded JPEG and approved caption first. Preparation uploads to a private Meta container but does not publish.</p>
    <a href={"/api/admin/agon-hq/publish?preview=1&day="+encodeURIComponent(day)} target="_blank" rel="noreferrer" className="underline">Preview Instagram image (JPEG)</a>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} disabled={busy||Boolean(result.stage&&result.stage!=="not prepared")} onClick={()=>run("prepare")}>Prepare Instagram post</button>
      <button type="button" className={button} disabled={busy} onClick={()=>run("status")}>Check upload status</button>
      {result.stage==="container"&&result.metaStatus==="FINISHED"&&<button type="button" disabled={busy} onClick={()=>run("publish")} className="rounded-lg bg-[#1F3A5F] px-3 py-2 text-white font-semibold">Publish approved post now</button>}
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
