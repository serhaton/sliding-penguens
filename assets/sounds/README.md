# Sesler

Bu klasördeki `.wav` dosyaları **yer tutucudur**: `scripts/generate-placeholder-sounds.mjs`
ile sentezlenmiş basit seslerdir. Gerçek ses geldiğinde aynı dosya adıyla üstüne yaz;
kodda değişiklik gerekmez (bkz. `src/services/audio.ts`).

Biçim: WAV ya da M4A/AAC, 44.1 kHz. Efektler mono ve kısa; müzikler stereo ve döngüsel
(başı ile sonu ek yeri duyulmadan birleşmeli).

## Efektler

| Dosya | Durum | Ne zaman | Tarif |
|---|---|---|---|
| `tap.wav` | yer tutucu | Penguene ya da butona dokunma | "pıt" — kısa, yumuşak, tok bir tık (≤ 80 ms) |
| `slide.wav` | yer tutucu | Penguen kayarken | "vıııınn" — buz üstünde kayma hışırtısı (~400 ms) |
| `bump.wav` | yer tutucu | Bir engele çarpıp durma | yumuşak "tok" — sert değil, yastık gibi |
| `enter.wav` | yer tutucu | Igloya giriş | neşeli "ding" — iki notalı çan |
| `win.wav` | yer tutucu | Bölüm sonu | kısa, yükselen melodi (~1 sn) |
| `star.wav` | yer tutucu | Bölüm sonunda her yıldız düşerken | tek parlak çan; üç kez art arda çalınır |
| `nope.wav` | yer tutucu | Hareket edemeyen penguene dokunma | iki alçak, sevimli "ı-ıh" |
| `crack.wav` | yer tutucu | Çatlak buz kırılırken | buz çıtırtısı + küçük "şlop" |
| `wake.wav` | yer tutucu | Uyuyan penguen uyanırken | yükselen, şaşkın bir cıvıltı |
| `coin.wav` | eksik | Coin sayacı dolarken | hafif şıngırtı; hızlı tekrar edilebilir olmalı |
| `button.wav` | eksik | Arayüz butonları | `tap`ten daha sessiz, nötr bir tık |
| `undo.wav` | eksik | Geri al | kısa "geri sarma" hışırtısı |
| `hint.wav` | eksik | İpucu gösterilirken | parıltı / ışıltı |
| `turn.wav` | eksik | Düelloda sıra değişimi | iki notalı yumuşak uyarı |
| `duel-win.wav` | eksik | Düello galibiyeti | `win`den daha coşkulu kısa fanfar |
| `duel-lose.wav` | eksik | Düello mağlubiyeti | kısa, tatlı, üzücü olmayan "aaav" |
| `sticker.wav` | eksik | Tepki çıkartması gönderme | baloncuk "pop" |

## Karakter sesleri

Her penguenin kendine özgü minik sesleri. Kısa (≤ 600 ms), sözsüz, sevimli.
Her karakter için dört ses: `hop` (dokununca "hadi!"), `oops` (çarpınca),
`happy` (igloya girince), `idle` (boşta, kişiliğe özgü).

| Karakter | Kişilik | `idle` sesi | Dosyalar |
|---|---|---|---|
| Pıtı / Pip | meraklı | "hmm?" mırıltısı | `piti-hop.wav`, `piti-oops.wav`, `piti-happy.wav`, `piti-idle.wav` |
| Mandi / Tango | aceleci | sabırsız "hıh hıh" | `mandi-*.wav` |
| Nar / Ruby | utangaç | kısık kıkırdama | `nar-*.wav` |
| Limon / Sunny | neşeli | cıvıl cıvıl kıkırdama | `limon-*.wav` |
| Nane / Minty | uykucu | esneme | `nane-*.wav` |
| Erik / Plum | gururlu | "hı-hım" boğaz temizleme | `erik-*.wav` |

Durum: hepsi eksik.

## Müzik

| Dosya | Durum | Nerede | Tarif |
|---|---|---|---|
| `music-main.m4a` | eksik | Ana ekran, harita, bölümler | sakin ama neşeli, lo-fi tadında döngü (60–90 sn, ~80 BPM) |
| `music-duel.m4a` | eksik | Düello | aynı dünyadan, biraz daha enerjik döngü (~100 BPM) |

Müzik efektlerin altında kalmalı; efektlerle aynı anda çalınca yormamalı.
