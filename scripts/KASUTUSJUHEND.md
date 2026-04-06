# Video-Bridge backup ja taastamine

## NPM käsud

- `npm run backup`
  Loob väikese projekti backupi kausta `~/VS-Code-Projects/_workspace_backups/Video-Bridge`.
- `npm run restore`
  Taastab viimase backupi praegusesse projektikausta, kui see on tühi või sisaldab ainult `.git` kausta.

## Mida backup sisaldab

- kogu lähtekood
- `package.json`, `package-lock.json` ja muud konfiguratsioonifailid
- olemasolevad `.env` failid, et taastamine oleks kohe kasutatav

## Mida backup ei sisalda

- `node_modules`
- `dist`, `dist-ssr`
- `.git`
- `.vite`
- logifailid

## Säilitamine

- backupi failinimi sisaldab täielikku ajatempliga kuupäeva ja kellaaega
- alles hoitakse ainult 3 viimast backupi

## Taastamine nullist

1. Loo tühi projektikaust või tühjenda olemasolev kaust.
2. Käivita seal `npm run restore` või otse `bash scripts/restore-workspace.sh /soovitud/kaust`.
3. Pärast taastamist käivita `npm install`.
4. Vajadusel käivita projekt tavapäraselt, näiteks `npm run dev`.

## Märkused

- taastamise skript kasutab vaikimisi kõige uuemat backupi
- kui sihtkaust pole tühi, katkestab skript töö turvalisuse tõttu
