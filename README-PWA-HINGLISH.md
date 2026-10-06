# LiveWire — Android / PWA (Hinglish)

Ye wahi LiveWire viewer hai, par web app ki tarah. Phone ke browser me kholo,
"Add to Home Screen" karo — bas app jaisa ban jayega. Desktop pe bhi install ho
jayega (Electron .exe ka option ban jayega).

## Zaroori shart

- Relay **`wss://`** pe hona chahiye (ngrok ya VPS). LAN `ws://192.168...` phone
  se kaam nahi karega, aur PWA sirf HTTPS pe install hoti hai.
- Tumhara ngrok URL: `wss://crusader-sandworm-approval.ngrok-free.dev` — yahi
  app me daalna hai.

## Files

```
webapp/
  index.html
  app.js
  manifest.json
  service-worker.js
  icons/icon-192.png
  icons/icon-512.png
```

Pura `webapp` folder host karna hai. PWA ko HTTPS chahiye, isliye seedha file
kholne se install nahi hoga — kahin host karna zaroori hai.

## Host kaise kare — 2 aasan free tarike

### Tarika 1 — Netlify Drop (sabse fast, 1 min)

1. [app.netlify.com/drop](https://app.netlify.com/drop) kholo
2. `webapp` folder ko browser me **drag & drop** karo
3. Turant ek URL milega, jaise `https://random-name.netlify.app`
4. Bas — wahi URL phone pe kholo

### Tarika 2 — GitHub Pages

1. GitHub pe ek repo banao (jaise `livewire-web`)
2. `webapp` ke andar ki saari files repo me daalo (index.html root pe ho)
3. Repo Settings → Pages → Branch `main` / root → Save
4. Kuch minute me `https://username.github.io/livewire-web/` live ho jayega

## Phone pe install (Android / Chrome)

1. Host kiya hua URL Chrome me kholo
2. Menu (⋮) → **Add to Home screen** (ya "Install app")
3. Naam confirm → Add
4. Home screen pe LiveWire icon aa jayega — tap karke app jaisa khulega

Pehli baar khulne pe **Setup** panel apne aap khulega:
- Relay address: `wss://crusader-sandworm-approval.ngrok-free.dev`
- Pairing code: wahi jo extension/desktop me hai (jaise `JAY42`)
- Connect dabao

## iPhone pe (Safari)

1. URL Safari me kholo
2. Share button → **Add to Home Screen**
3. Baaki same

## Kaam kaise karta hai

- App relay se `wss://` pe judti hai, viewer ban ke — bilkul desktop jaisa
- Naya reply upar, purana niche (recent-first)
- "Show recent" se kitne dikhein wo set kar sakte ho
- Reply pe Copy button — clipboard me chala jayega

## Dhyan dene wali baatein

- **ngrok URL fixed hona chahiye.** Free ngrok me dev domain permanent hai, to
  theek. Random quick-tunnel use kiya to har baar app me URL badalna padega.
- **Relay + ngrok chalu hone chahiye.** Phone app sirf viewer hai — relay band to
  kuch nahi aayega.
- **Background me phone reply miss kar sakta hai** jab app poori tarah band ho.
  App wapas kholte hi reconnect ho jati hai (relay backlog se recent messages aa
  jayenge).
- Update karna ho (nayi files host ki) to phone pe app ek baar band karke kholo,
  service worker naya version le lega.

## Icon badalna ho

`icons/icon-192.png` aur `icons/icon-512.png` apne se replace kar dena (same naam,
same size). Abhi ek simple default icon diya hai.
