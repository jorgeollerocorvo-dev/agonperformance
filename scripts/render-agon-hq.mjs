import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function wrap(text, limit = 24) {
  const words = text.trim().split(/\s+/u).flatMap(word => {
    const chars = Array.from(word); const chunks = [];
    while (chars.length) chunks.push(chars.splice(0, limit).join(''));
    return chunks;
  });
  const lines = [];
  for (const word of words) {
    const last = lines.at(-1);
    if (last && Array.from(last + ' ' + word).length <= limit) lines[lines.length - 1] += ' ' + word;
    else lines.push(word);
  }
  if (lines.length > 10) throw new Error('Scene too long to render legibly');
  return lines.join('\n');
}
function ffmpeg(args, cwd) {
  const result = spawnSync(process.env.FFMPEG_BIN || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...args], { cwd, encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0) throw new Error('FFmpeg failed: ' + (result.stderr || result.error?.message || '').slice(0, 500));
}
export function renderReel(draft, output) {
  if (draft?.format !== 'Reel' || !draft.copy || !Array.isArray(draft.copy.scenes)) throw new Error('Reel draft required');
  if (draft.copy.scenes.length < 3 || draft.copy.scenes.length > 5 || typeof draft.copy.hook !== 'string') throw new Error('Invalid scenes');
  const slides = [draft.copy.hook, ...draft.copy.scenes, 'Train smarter.\nAGON PERFORMANCE\nLink in bio.'];
  if (slides.some(s => typeof s !== 'string' || !s.trim() || s.length > 280)) throw new Error('Invalid slide text');
  const dest = resolve(output);
  if (!dest.endsWith('.mp4')) throw new Error('Output must be MP4');
  const work = mkdtempSync(join(tmpdir(), 'agon-hq-'));
  try {
    for (let i = 0; i < slides.length; i++) {
      writeFileSync(join(work, 'slide.txt'), wrap(slides[i]), 'utf8');
      const filters = [
        'drawbox=x=72:y=120:w=936:h=1680:color=0x6B8F71:t=4',
        'drawbox=x=100:y=220:w=880:h=12:color=0x6B8F71:t=fill',
        "drawtext=font=DejaVu Sans:text='AGON PERFORMANCE':expansion=none:fontsize=46:fontcolor=0xE8E1D6:x=(w-tw)/2:y=148",
        'drawtext=font=DejaVu Sans:textfile=slide.txt:expansion=none:fontsize=52:fontcolor=0xE8E1D6:line_spacing=20:x=(w-tw)/2:y=(h-th)/2',
        "drawtext=font=DejaVu Sans:text='" + (i+1) + ' / ' + slides.length + "':expansion=none:fontsize=34:fontcolor=0xA7C6AC:x=(w-tw)/2:y=1700",
      ].join(',');
      ffmpeg(['-f','lavfi','-i','color=c=0x1F3A5F:s=1080x1920:r=30','-vf',filters,'-t','4','-an','-c:v','libx264','-threads','2','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','segment'+i+'.mp4'], work);
    }
    writeFileSync(join(work,'concat.txt'), slides.map((_,i)=>"file 'segment"+i+".mp4'").join('\n'));
    ffmpeg(['-f','concat','-safe','1','-i','concat.txt','-c','copy','-movflags','+faststart',dest], work);
    return dest;
  } finally { rmSync(work, { recursive:true, force:true }); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 4) throw new Error('Usage: node scripts/render-agon-hq.mjs draft.json output.mp4');
  console.log(renderReel(JSON.parse(readFileSync(process.argv[2],'utf8')), process.argv[3]));
}
