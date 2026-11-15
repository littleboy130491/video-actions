# Review checklist (run before showing the owner, and before every final)

## Commands
```bash
V=out/name_draft.mp4
ffmpeg -v error -i $V -vf "fps=2,scale=180:-1,tile=12x6" -frames:v 1 sheet.jpg            # every 0.5 s
for t in 0.0 0.8 5.3 12.4; do ffmpeg -v error -ss $t -i $V -frames:v 1 -y still_$t.png; done # full size
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of csv=p=0 $V
python3 - <<'EOF'   # motion energy every 0.5 s: near-0 stretches = dead camera, spikes every frame = flicker
import subprocess,numpy as np
V='out/name_draft.mp4'
def f(t): return np.frombuffer(subprocess.run(['ffmpeg','-v','error','-ss',str(t),'-i',V,'-frames:v','1','-vf','scale=108:192','-f','rawvideo','-pix_fmt','gray','-'],capture_output=True).stdout,np.uint8).astype(float)
print([round(abs(f(t)-f(t+1/30)).mean(),1) for t in np.arange(0,30,0.5)])
EOF
```

## Checks
- [ ] Frame 0 is interesting (image or action in progress); something visual within 1.5 s.
- [ ] No double images in fast motion (blur, not two copies); scenes with cuts declare `cutTimes`.
- [ ] No camera jumps at cuts (compare t−0.07 / t / t+0.07); no plain dissolves where a designed move was planned.
- [ ] No dead stretches > ~1 s (camera alive) and no flicker unless intended.
- [ ] Subjects fill ≥ 60 % of the frame; no large empty areas (incl. the bottom third).
- [ ] Text readable on a phone (headlines ≥ 96 px, labels ≥ 40 px), enough time to read (≥ 0.25 s/word).
- [ ] Safe zones: text/UI within y 260–1540, right 140 px clear.
- [ ] No text over photos (promo/explainer); no label overlays; no AI-slop decoration.
- [ ] Faithful to the client: fonts, colours, copy, hero video/layers match the live site/Figma.
- [ ] Pages shown at full width; photos not pixelated (zoom limits respected).
- [ ] Every cursor/action has a visible result (timelapse).
- [ ] All numbers/claims real; invented copy flagged to the owner.
- [ ] Ending flows into the outro (match its first frame colour).
- [ ] ffprobe: 1080×1920, 30 fps, expected duration; final has an audio stream.

Report to the owner: what changed, the timeline (scene ↔ seconds), remaining weak spots, questions.
