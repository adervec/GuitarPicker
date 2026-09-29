// Ported from the vanilla app's src/music/instrument-guide.js — trimmed to
// the 16 instruments entities/instrument/model/data.js models here (the
// vanilla source has 59; same trimming rationale as INSTRUMENTS there: add
// more only if a ported song/Tuner target needs one). Prose is otherwise
// verbatim; the derived-facts and Markdown-export functions are ported as-is,
// re-pointed at this pilot's INSTRUMENTS/ALT_TUNINGS/note-math/song data so
// the guide can't drift from what this pilot actually plays, same as upstream.
import { INSTRUMENTS, ALT_TUNINGS, STRING_LABELS, HARMONICA_BLOW, HARMONICA_DRAW, type InstrumentDef } from "./data";
import { midiToName, midiToFreq } from "@/shared/lib/note-math";
import { builtinSongs } from "@/entities/song/model/songs-data";

export interface GuideEntry {
  family: string;
  tagline: string;
  overview: string;
  anatomy: string[];
  playing: string[];
  techniques: string[];
  tips: string[];
  care?: string;
  inApp: string[];
  range?: string;
}

export const GUIDE: Record<keyof typeof INSTRUMENTS, GuideEntry> = {
  "acoustic-guitar": {
    family: "Plucked string (fretted)",
    tagline: "The all-rounder: six steel strings, no amp needed, at home in folk, blues, pop, and campfire singalongs.",
    overview: "The steel-string acoustic guitar projects sound from its hollow wooden body — the strings drive the bridge, the bridge drives the top, and the top moves the air. It accompanies a voice as happily as it carries a melody, and it is GuitarPicker's default instrument: every drill and most of the built-in library are written for it.",
    anatomy: [
      "Body — the hollow resonating box; the spruce or cedar top (soundboard) produces most of the volume and tone.",
      "Sound hole — lets the air inside the body couple to the room.",
      "Bridge & saddle — anchor the strings on the top and transfer their vibration into it.",
      "Neck & fretboard — the playing surface; frets divide it into exact semitone steps.",
      "Nut — the slotted strip at the top of the neck that spaces the strings and sets their open length.",
      "Headstock & tuning machines — geared pegs that set each string's pitch.",
    ],
    playing: [
      "Sit with the waist of the body on your right thigh (right-handed), neck angled slightly up, back straight.",
      "Fretting hand: thumb behind the neck, fingers curled so the fingertips press the strings just behind a fret — not on top of it, not far from it.",
      "Strumming hand: hold the pick between thumb and the side of the index finger, or brush with your thumb; strum from the elbow with a loose wrist.",
      "Start with open chords (E minor, A minor, D, G, C) and one-strum-per-beat changes before adding rhythm patterns.",
      "Press only as hard as needed for a clean note — buzzing means move closer to the fret, muted thuds mean an adjacent finger is touching the string.",
    ],
    techniques: [
      "Strumming — rhythm patterns mixing down- and up-strokes; the engine of song accompaniment.",
      "Fingerpicking — thumb covers the bass strings, fingers arpeggiate the treble; Travis picking alternates the thumb.",
      "Flatpicking — single-note melodies and runs with a pick, the bluegrass lead voice.",
      "Palm muting — the picking-hand palm rests lightly on the strings at the bridge for a percussive chug.",
      "Hammer-ons & pull-offs — sound notes with the fretting hand alone for fast legato lines.",
      "Slides — glide a fretted finger up or down to the target fret without lifting.",
      "Barre chords — the index finger frets all six strings; movable chord shapes for any key.",
      "Capo — a clamp that raises all open strings, letting you play open shapes in any key.",
    ],
    tips: [
      "Ten focused minutes a day beats one long weekly session — chord changes are muscle memory.",
      "Tune every time you play; practicing on an out-of-tune guitar trains your ear wrong.",
      "Sore fingertips are normal for the first two or three weeks — calluses fix it. Light-gauge strings help.",
      "Practice chord changes in pairs (G→C, C→D) with a metronome before playing whole songs.",
      "Let ring only the strings the chord needs — mute the rest with spare finger edges.",
    ],
    care: "Wipe the strings after playing and change them when they sound dull or feel rough. Solid-wood bodies like 40–50% humidity — keep the guitar away from radiators and use a case humidifier in dry winters.",
    inApp: [
      "All skill drills and Training courses are graded on acoustic guitar.",
      "The app suggests a capo per song key (shown as a 🔼 badge) and draws fingering relative to it.",
    ],
  },

  "electric-guitar": {
    family: "Plucked string (fretted, amplified)",
    tagline: "Same six strings as the acoustic, but solid-bodied and amplified — the voice of rock, blues, funk, and jazz.",
    overview: "An electric guitar barely makes a sound on its own: magnetic pickups sense the steel strings' vibration and send it to an amplifier, which defines as much of the tone as the guitar does. Thinner strings and a lower action make it physically easier to fret than an acoustic, and the extra sustain and effects open techniques an acoustic can't match.",
    anatomy: [
      "Solid body — no resonating box; sustain and feedback resistance instead of acoustic volume.",
      "Pickups — magnetic coils under the strings (bright single-coils vs. thicker humbuckers); a selector switch blends them.",
      "Volume & tone knobs — passive controls shaping the signal before the amp.",
      "Bridge — fixed or tremolo/vibrato type; sets intonation and string height.",
      "Output jack — to the amplifier; the amp and its gain/EQ are half your instrument.",
      "Neck & frets — typically slimmer than an acoustic, with more frets (22 modeled here).",
    ],
    playing: [
      "Everything from the acoustic applies — posture, fretting just behind the fret, relaxed picking.",
      "Start with a clean amp tone; dial in gain and effects only after notes are clean and in time.",
      "Control noise: rest unused fingers or your palm across idle strings — amplification makes every accidental ring audible.",
      "Practice both seated and standing with a strap set so the neck sits at the same height either way.",
    ],
    techniques: [
      "String bending — push a string sideways to raise its pitch a half or whole step; the signature blues/rock voice.",
      "Vibrato — rhythmic finger wobble on a held note.",
      "Palm muting — tighter and chunkier than on acoustic, the backbone of rock rhythm.",
      "Power chords — two/three-note root-and-fifth shapes that thrive under distortion.",
      "Legato — hammer-ons and pull-offs chained for fast fluid lines.",
      "Slides, double stops, pinch harmonics — expressive lead vocabulary.",
    ],
    tips: [
      "Buy a decent small amp (or a headphone modeler) before a second guitar — tone lives there.",
      "Distortion hides sloppy fretting from you, not from listeners: practice riffs clean first.",
      "Half-step-down tuning (a common rock tuning) is one click away in the Tuner.",
    ],
    care: "Wipe strings and fretboard after playing; a hair of neck relief and stable humidity keep the low action buzz-free. Crackling knobs or jacks want contact cleaner, not force.",
    inApp: [
      "For grading, let the mic hear a clean tone — either the amp at conversation volume or the unplugged strings up close. Heavy distortion confuses pitch detection.",
    ],
  },

  "bass": {
    family: "Plucked string (fretted, low register)",
    tagline: "Four thick strings, one octave below the guitar's bottom four — the bridge between rhythm and harmony.",
    overview: "The bass guitar holds a band together: it locks rhythmically with the drums while spelling out the harmony one low note at a time. Standard tuning is E1 A1 D2 G2 — the same intervals as the guitar's lowest four strings, an octave down. Lines are mostly single notes, which makes the bass one of the fastest instruments to start being useful on, and one of the deepest to master.",
    anatomy: [
      "Long scale neck — usually 34\", giving the low strings their tension and clarity.",
      "Four thick strings — roundwound (bright, growly) or flatwound (smooth, thumpy).",
      "Pickups — precision (split) and jazz (single-coil pair) styles are the classic flavors.",
      "Bridge & tuners — heavier-duty versions of the guitar's hardware.",
    ],
    playing: [
      "Pluck with alternating index and middle fingers over the pickup, or use a pick for attack and speed.",
      "Fret with one finger per fret where you can; the wide spacing low on the neck may need a shift instead of a stretch.",
      "Start by playing the root note of each chord on the beat — that alone is a working bass line.",
      "Mute relentlessly: the fretting hand and spare plucking fingers keep the other strings quiet, or low notes wash together.",
    ],
    techniques: [
      "Fingerstyle — alternating two-finger plucking, the default sound.",
      "Pick playing — even attack and punch, common in rock.",
      "Walking bass — one note per beat connecting chords by scale and chromatic steps (jazz, blues).",
      "Slap & pop — thumb slap on low strings, finger pop on high; percussive funk.",
      "Slides & ghost notes — the grease between the notes that makes a line groove.",
    ],
    tips: [
      "Play with a metronome or drum loop from day one — timing is the job description.",
      "Learn where every root note is on the E and A strings; most lines start there.",
      "Simple and locked-in beats busy and loose, every time.",
    ],
    care: "Bass strings last long but die dull — change them when the growl goes. Otherwise the acoustic-guitar care rules apply: wipe down, stable humidity, occasional neck check.",
    inApp: [
      "Very low notes are hard for microphone pitch detection — if grading struggles on E1/A1, move the mic close to the strings (or amp) or practice the line an octave up.",
      "Drop-D tuning is available in the Tuner.",
    ],
  },

  "ukulele": {
    family: "Plucked string (fretted, nylon)",
    tagline: "Four nylon strings, a cheerful voice, and the friendliest learning curve in the string family.",
    overview: "The soprano/concert ukulele is tuned G4 C4 E4 A4 — and unusually, the G string is tuned *high*, sitting between the E and A in pitch. This \"reentrant\" tuning gives the uke its close-voiced, sparkling strum. Nylon strings are gentle on fingertips, the neck fits small hands, and three easy chords unlock hundreds of songs.",
    anatomy: [
      "Small hollow body — soprano, concert, and tenor sizes share the same tuning; baritone is tuned differently (not modeled here).",
      "Nylon strings — low tension, soft attack, no calluses required.",
      "Reentrant G string — the 4th string is tuned above the 3rd; strums stay in a bright, narrow pitch band.",
      "Friction or geared tuners — geared hold pitch better on cheap instruments.",
    ],
    playing: [
      "Cradle the body against your chest with the strumming forearm; no strap needed.",
      "Strum with the pad of your index finger (down with the nail side, up with the pad), around where the neck meets the body.",
      "C major is one finger; add A minor, F, and G7 and you can play a songbook's worth of tunes.",
      "New nylon strings stretch — retune often for the first week.",
    ],
    techniques: [
      "Island strum — the d-du-udu pattern behind most uke songs.",
      "Chunking — a muted percussive strum with the strumming-hand palm.",
      "Fingerpicking — thumb and two fingers arpeggiating; campanella style lets notes ring across strings.",
      "Hammer-ons & slides — the same fretted-instrument vocabulary as guitar, in miniature.",
    ],
    tips: [
      "Tune every session — nylon drifts with temperature far more than steel.",
      "If a chord buzzes, check that your fretting fingers arch enough to miss the neighboring strings; the frets are close together.",
      "The uke is quiet — perfect for practice at hours when a guitar would be rude.",
    ],
    care: "Nearly zero-maintenance: wipe it down and keep it out of direct sun and hot cars. Nylon strings last ages; change them when they won't hold tune or intonate.",
    inApp: [
      "\"Ode to Joy (Ukulele)\" in the library is arranged for it.",
      "The fretboard hint understands the reentrant high-G when picking which string to show for a note.",
    ],
  },

  "mandolin": {
    family: "Plucked string (fretted, double courses)",
    tagline: "Eight strings in four unison pairs, tuned in fifths like a violin — the bright chop of bluegrass and folk.",
    overview: "The mandolin is strung in four *courses* — pairs of strings tuned in unison — at G3 D4 A4 E5, exactly a violin's tuning. Fifths tuning makes scale and chord shapes small and symmetric, and the doubled strings give the mandolin its shimmering, cutting voice. GuitarPicker models each course as one string.",
    anatomy: [
      "Double courses — eight strings, four pitches; each pair is fretted and picked as one.",
      "Carved or flat top — the carved, f-hole \"F-style/A-style\" tops bark; flat tops sound sweeter.",
      "Short scale — around 14\", with narrow fret spacing that rewards fingertip precision.",
      "Floating bridge & tailpiece — the bridge is held by string tension; its position sets intonation.",
    ],
    playing: [
      "Use a fairly stiff pick and press each course so both strings sound as one clean note.",
      "Hold the pick loosely and pick from the wrist; tremolo depends on a relaxed hand.",
      "Fifths tuning means one fingering pattern for a major scale works in every key — learn it once, move it anywhere.",
      "Two-finger \"chop\" chord shapes cover most folk and bluegrass accompaniment.",
    ],
    techniques: [
      "Tremolo — rapid down-up picking that sustains a note; the mandolin's signature singing voice.",
      "The chop — a damped off-beat chord that acts as the bluegrass snare drum.",
      "Double stops — two courses at once, in sweet thirds and open fifths.",
      "Crosspicking — banjo-roll-like arpeggio patterns across the courses.",
    ],
    tips: [
      "Tune each pair dead-on to itself — a slightly-off unison sounds worse than a slightly-off note.",
      "Squeeze from the thumb, not the whole hand: the doubled strings need firm but relaxed pressure.",
      "Violin players: your left hand already knows this instrument. Guitar players: your right hand does.",
    ],
    care: "Wipe the strings, watch humidity like an acoustic guitar, and don't knock the floating bridge — if it shifts, intonation goes with it (align it so the 12th-fret note matches the open string's octave).",
    inApp: [
      "Modeled as four single strings (one per course) for tuning and fingering.",
    ],
  },

  "violin": {
    family: "Bowed string (fretless)",
    tagline: "Four strings, no frets, and a bow — total control of pitch and tone, and total responsibility for both.",
    overview: "The violin is tuned in fifths at G3 D4 A4 E5 and played with a rosined bow. With no frets, every note's intonation is yours to place by ear — which is exactly why the app's cents-based grading is so useful here: it tells you *how far* off a note is, not just that it's wrong. Expect the first weeks to be about tone and posture more than notes.",
    anatomy: [
      "Body — arched top and back with f-holes; the bridge stands between them and carries the strings' vibration.",
      "Fingerboard — smooth ebony, no frets; finger placement alone sets pitch.",
      "Bow — a wooden (or carbon) stick strung with hair; rosin makes the hair grip the string.",
      "Pegs & fine tuners — pegs for coarse tuning at the scroll, fine tuners at the tailpiece.",
      "Chin & shoulder rest — let the head, not the left hand, support the instrument.",
    ],
    playing: [
      "Stand or sit tall; the violin rests between collarbone and jaw, supported without the left hand.",
      "Bow hold: thumb bent against the frog, fingers draped relaxed over the stick — tension is the enemy of tone.",
      "Draw the bow parallel to the bridge, in the lane between bridge and fingerboard; straight bowing is the first battle.",
      "Left-hand fingers drop onto their tips; each finger \"knows\" a spot — first-position tapes are a legitimate beginner aid.",
      "Practice long open-string bows daily: smooth, even, edge-to-edge tone before any fingered notes.",
    ],
    techniques: [
      "Arco vs. pizzicato — bowed vs. plucked.",
      "Vibrato — a rolling oscillation of the fingertip that warms sustained notes (a months-in skill).",
      "Slurs & string crossings — multiple notes per bow, and clean lane changes between strings.",
      "Shifting — sliding the whole hand to higher positions to reach the upper range.",
      "Double stops — bowing two strings at once.",
    ],
    tips: [
      "Check intonation against open strings constantly — a fingered G should ring sympathetically with the open G.",
      "Ten slow, in-tune minutes beat an hour of fast and sour; the ear you build is the instrument.",
      "Rosin the bow lightly and regularly; a new bow needs a good first rosining before it will speak at all.",
    ],
    care: "Loosen the bow hair after every session and wipe rosin dust off the strings and top. Keep it in its case (violins and door frames are old enemies), and let a luthier handle bridge or soundpost issues.",
    inApp: [
      "No fingering panel — the violin is fretless; use the note names on the highway and let your ear place them.",
      "The Tuner's cents needle doubles as an intonation coach: play slow scales and watch how close each note lands.",
    ],
    range: "G3 – E7 (practical)",
  },

  "piano": {
    family: "Keyboard",
    tagline: "Eighty-eight keys, melody and harmony under ten fingers — music theory laid out in a straight line.",
    overview: "The piano is the clearest map of Western music: every pitch in order, white naturals and black sharps/flats, chords and melody available at once. GuitarPicker grades a single melody line by ear through your microphone, which works with an acoustic piano or any keyboard playing out loud. Range modeled in notation: A0 to C8.",
    anatomy: [
      "Keyboard — 88 weighted keys on a full piano; the pattern of 2-and-3 black keys repeats every octave.",
      "Action & hammers — pressing a key throws a felt hammer at the strings; touch controls dynamics.",
      "Pedals — sustain (right) lifts the dampers so notes ring; soft (left) mellows the attack.",
      "Digital keyboards — same layout; weighted keys are worth it if piano technique matters to you.",
    ],
    playing: [
      "Sit centered on middle C, forearms level with the keys, fingers curved as if holding a bubble.",
      "Find C: the white key left of any pair of black keys; middle C sits near the keyboard's center.",
      "Learn five-finger positions and the C major scale hands-separately, then together.",
      "Play hands separately until each is secure — coordination comes from two solved parts, not one struggled one.",
    ],
    techniques: [
      "Scales & arpeggios — the daily vocabulary of key and chord shapes under the fingers.",
      "Chord voicings — the same chord spread in different octaves and inversions.",
      "Pedaling — timing the sustain pedal on chord changes for a seamless wash.",
      "Dynamics — the piano's full name is pianoforte: soft-loud is the expressive core.",
    ],
    tips: [
      "Slow practice with a metronome, hands separate, is the fastest route — every shortcut is slower.",
      "Sing the melody line while playing it; the ear and hand reinforce each other.",
      "Label-free is better long-term: learn the key geography, not sticker positions.",
    ],
    care: "Acoustic pianos want tuning once or twice a year and stable humidity. Digital keyboards want a dust cover and not much else.",
    inApp: [
      "Pitch detection is monophonic — play the graded melody line by itself; save two-handed arrangements for after the run.",
      "For a digital keyboard, play through speakers so the mic can hear it (or mic a headphone cup in a pinch).",
    ],
    range: "A0 – C8",
  },

  "voice": {
    family: "Voice",
    tagline: "The instrument you already own — GuitarPicker's Karaoke mode turns it into a graded one.",
    overview: "Singing is pitch-matching with your body: breath drives the vocal folds, and resonance in the throat and mouth shapes the tone. GuitarPicker's Karaoke view scores your singing against a song's melody with octave-agnostic grading — sing in whatever octave fits your voice and the app compares the pitch class, showing a live pitch ribbon as you go.",
    anatomy: [
      "Breath support — the diaphragm and abdominal muscles meter a steady airstream; all steadiness starts here.",
      "Vocal folds — vibrate to create pitch; tension and length set the note.",
      "Resonators — throat, mouth, and nasal spaces amplify and color the sound.",
      "Registers — chest voice (low, full), head voice (high, light), and the mix between them.",
    ],
    playing: [
      "Warm up before singing: gentle humming, lip trills, and sirens gliding low-to-high.",
      "Stand tall, shoulders loose; breathe low into the belly, not up into the chest.",
      "Match pitch against a reference daily — the app's tuner or a played note; sustain and adjust until it locks.",
      "Sing songs in a comfortable key; straining at range extremes builds habits, not range.",
      "Stay hydrated and stop when it hurts — hoarseness is a stop sign, not a rite of passage.",
    ],
    techniques: [
      "Breath control — long steady hisses and phrases; the note is only as stable as the air.",
      "Pitch matching — the trainable core skill; interval work in the Theory Games helps.",
      "Registers & mix — smoothing the break between chest and head voice.",
      "Diction & phrasing — words carried on the melody without chopping the airflow.",
      "Vibrato — a relaxed, even oscillation that appears when tension leaves.",
    ],
    tips: [
      "Record yourself — the voice you hear inside your head is not the one the room hears.",
      "Quiet, accurate practice beats loud, approximate practice.",
      "Typical comfortable ranges — Bass E2–E4 · Baritone A2–A4 · Tenor C3–C5 · Alto F3–F5 · Mezzo A3–A5 · Soprano C4–C6. Find yours with the Tuner and pick songs to suit.",
    ],
    care: "Sleep, water, and warm-ups are voice maintenance. Avoid shouting over noise, and rest the voice when sick — it is the one instrument you can't restring.",
    inApp: [
      "Karaoke mode: word-by-word teleprompter, per-line count-in, backing + optional guide vocal, and a sing-and-score pass with a live pitch ribbon and letter grade.",
      "Scoring is octave-agnostic — sing in your own octave.",
      "Songs can carry a dedicated vocal melody (set in the Song Editor — not part of this pilot); otherwise scoring falls back to the instrument melody.",
    ],
    range: "E2 – C6 (spanning common voice types)",
  },

  "harmonica": {
    family: "Free-reed wind",
    tagline: "Ten holes in a pocket-sized package — breathe out for the chord tones, in for the rest.",
    overview: "The Richter-tuned 10-hole diatonic harmonica (\"blues harp\") plays a fixed key — this one is C. Each hole sounds one note when you blow (exhale) and a different one when you draw (inhale). Blow notes spell a C major chord everywhere on the harp; draw notes fill in the scale. The middle octave (holes 4–7) contains a complete C major scale, which is where melodies live.",
    anatomy: [
      "Comb — the slotted body (plastic, wood, or metal) your air travels through.",
      "Reed plates — brass plates riveted with tuned reeds; blow reeds on top, draw reeds below.",
      "Reeds — one per hole per direction; each is a tiny tuned strip that vibrates in the airstream.",
      "Cover plates — the metal shells your hands cup around to shape the tone.",
    ],
    playing: [
      "Hold it in the left hand, low notes (hole 1) to the left, cupped in both palms.",
      "Start with whole-mouth chords: gently breathe out and in while sliding around — a Richter harp harmonizes with itself.",
      "For single notes, pucker as if whistling so only one hole gets air (or use tongue blocking: cover several holes and open a corner).",
      "Breathe from the belly, through the harp — think \"sigh into it\", never force.",
      "Learn melodies in holes 4–7 first: the complete major-scale octave with no missing notes.",
    ],
    techniques: [
      "Single-note playing — clean one-hole notes via puckering or tongue blocking; the gateway skill.",
      "Hand effects — opening and closing the cup for wah and tremolo.",
      "Vibrato — throat or hand vibrato on sustained notes.",
      "Bending — dropping a draw note's pitch by reshaping the mouth (draw holes 1–6); how blues players find the missing notes. An advanced skill — the app charts only unbent notes.",
      "Positions — the same C harp played centered on G (\"2nd position\"/cross harp) gives the bluesy mixolydian sound.",
    ],
    tips: [
      "If two notes sound at once, shrink your mouth opening — precision comes before speed.",
      "Practice breathing patterns without the harp: out-out-in-out to a beat; the harp is a breathing instrument.",
      "The bottom octave is missing F4 and A4, the top is missing B6 — melodies using them need bends or a different-key harp; the app marks such notes as \"not on a C harp\".",
    ],
    care: "Tap the harp (holes down) after playing to clear moisture and let it air-dry. Never soak a wooden comb, and don't share a harp — it is effectively a mouthpiece.",
    inApp: [
      "The play view shows a 🎺 Holes strip: which hole to play and whether to blow (↑) or draw (↓).",
      "\"When the Saints (Harmonica)\" in the library sits entirely in holes 4–7.",
      "Only the C diatonic is modeled — no bends, no other keys (yet).",
    ],
  },

  "recorder": {
    family: "Woodwind (fipple flute)",
    tagline: "The ten-dollar school instrument that is secretly a serious one — real repertoire, instant first note.",
    overview: "The soprano recorder makes a note the moment you breathe into it — the fipple (the whistle-style mouthpiece) does the hard part, leaving your fingers free to learn the holes. It is likely the cheapest real instrument you can buy, and the skills transfer: breath control, phrasing, and reading melody all carry to every other wind. Its written range starts at C5, an octave above middle C.",
    anatomy: [
      "Fipple / windway — the mouthpiece duct that splits your airstream and makes the tone; no embouchure to learn.",
      "Head, body & foot joints — three pieces on most recorders; twist gently to assemble.",
      "Seven finger holes + one thumb hole — the thumb hole at the back also \"pinches\" open to jump the second octave.",
      "Baroque vs. German fingering — Baroque (English) is standard; check before learning charts (a Baroque F uses a forked fingering).",
    ],
    playing: [
      "Rest the mouthpiece on your lower lip and blow gently — say \"doo\" to start each note (tonguing), don't just breathe.",
      "Left hand on top (thumb on the back hole), right hand below; pads of the fingers seal the holes flat, not fingertips.",
      "First notes: B, A, G — thumb plus the top one, two, then three fingers — and you can already play Hot Cross Buns.",
      "Squeaks mean too much air or a leaking hole — blow softer and re-seat your fingers.",
      "Open the thumb hole to a sliver (pinching) to reach the second octave.",
    ],
    techniques: [
      "Tonguing — articulating notes with \"doo\"/\"too\"; the recorder equivalent of picking.",
      "Slurring — moving fingers while the air continues, for smooth phrases.",
      "Breath shaping — the recorder has no volume knob; dynamics come from phrasing and articulation, since blowing harder raises pitch.",
      "Forked fingerings — non-adjacent hole patterns for accidentals (F, B♭).",
    ],
    tips: [
      "Blow less than you think — the recorder wants a warm sigh, not a whistle-blast.",
      "Cover holes with flat finger pads and check each new note for leaks by listening for the squeak.",
      "A plastic Yamaha or Aulos (~$10) plays genuinely well — no need for wood to learn.",
    ],
    care: "Shake out moisture and swab the bore after playing; let it air-dry disassembled. Plastic recorders can be washed in lukewarm soapy water — one more reason they make perfect starters.",
    inApp: [
      "\"Hot Cross Buns (Recorder)\" in the library is the classic first tune, arranged in the easy bottom register.",
      "The recorder sits an octave up — if a song reads too low, it needs transposing (the Song Editor's transpose isn't part of this pilot).",
    ],
    range: "C5 – D7",
  },

  "e-drums": {
    family: "Percussion (unpitched)",
    tagline: "Rhythm is the half of music the other instruments borrow — practice it silently on pads, graded on timing.",
    overview: "Electronic drums — from $50 tabletop pads to full mesh kits — put a whole drum kit in headphones. Drums are unpitched, so GuitarPicker grades them differently: instead of matching pitch, it listens for the *hit* itself and scores how close each strike lands to the beat. Any drum voice counts; the note lanes just show the pattern (kick low, snare middle, hi-hat high).",
    anatomy: [
      "Pads — rubber or mesh heads with velocity sensors; mesh feels closest to real drums.",
      "Module (\"brain\") — turns pad hits into sounds; headphone out is the neighbor-friendly feature.",
      "Kick pad & hi-hat pedal — the feet's half of the kit; tabletop kits fake these with extra pads or switches.",
      "Sticks — 5A is the standard starter size.",
    ],
    playing: [
      "Sit tall, elbows loose, and let the stick rebound — a bounce, not a push; the pad does half the work.",
      "Start with the money beat: hi-hat eighth notes, kick on 1 and 3, snare on 2 and 4 — it powers half of popular music.",
      "Count out loud (\"1 & 2 & 3 & 4 &\") — the voice locks the limbs together.",
      "Slow is smooth: practice at a tempo where you never flam, then inch the metronome up.",
    ],
    techniques: [
      "Single & double stroke rolls — RLRL and RRLL; the first two rudiments carry you far.",
      "Paradiddle — RLRR LRLL; the coordination unlock for moving around the kit.",
      "Ghost notes & accents — quiet snare fills between backbeats; dynamics are the groove.",
      "Limb independence — layering kick patterns under a steady hand ostinato.",
    ],
    tips: [
      "Timing beats speed, always — the metronome is your bandmate, not your examiner.",
      "No kit yet? Practice pads (or a pillow) plus sticks cost almost nothing and build the same hands.",
      "Keep the speakers on (or let the pads' own sound reach the mic) so the app can hear your hits.",
    ],
    care: "Electronic kits are low-maintenance: dust the pads, don't strike rims with the shoulder of the stick, and keep drinks away from the module.",
    inApp: [
      "Timing-only grading: a hit within ±70 ms of the beat is Perfect, ±150 ms is Good — any pad, any drum sound.",
      "\"Backbeat Basics (Drums)\" in the library is the starter groove (kick/snare, then eighth-note hats).",
      "The app hears hits through the mic — play with the kit's speaker on, or tap a practice pad near the mic; it can't read MIDI from the module (yet).",
    ],
    range: "Unpitched — graded on hit timing",
  },

  "classical-guitar": {
    family: "Plucked string (fretted)",
    tagline: "Nylon strings, wide neck, fingers only — the gentlest guitar on beginner fingertips.",
    overview: "The classical (Spanish) guitar uses nylon trebles and nylon-core wound basses at roughly half the tension of steel strings. That makes it far kinder to new fingertips, and its wide flat fingerboard gives each finger room — at the cost of the volume and bite a steel-string gives a strummed song. It is the instrument of classical repertoire, flamenco, and bossa nova.",
    anatomy: [
      "Nylon strings — trebles are plain nylon, basses are nylon floss wound with silver-plated copper.",
      "Slotted headstock — strings wind onto rollers through the head rather than onto vertical posts.",
      "Fan-braced top — a light, thin soundboard braced in a fan; it needs low tension, so never fit steel strings.",
      "Wide flat fingerboard — about 52 mm at the nut versus 43 mm on a steel-string, and usually no fret markers.",
      "Tie-block bridge — strings are knotted at the bridge instead of held by pins.",
    ],
    playing: [
      "Sit with the guitar on the left thigh (or use a footstool/support) so the neck rises at about 45° — this is a seated, two-hands-free posture.",
      "Right hand: thumb (p) plays the three bass strings, index/middle/ring (i, m, a) take G, B, and E.",
      "Alternate i and m for single-note lines — never repeat the same finger twice in a row.",
      "Free stroke (tirando) is the default: the finger clears the neighbouring string. Rest stroke (apoyando) lands on it for a fatter melody tone.",
      "Grow a few millimetres of nail on the right hand and shape it smooth — the nail plus fingertip makes the tone.",
    ],
    techniques: [
      "Arpeggios — the p-i-m-a patterns that underpin most of the repertoire.",
      "Rasgueado — the flamenco fan-strum, fingers flicked out one after another.",
      "Tremolo — p plus a-m-i repeated fast on one note, the effect in Recuerdos de la Alhambra.",
      "Full barre — essential here; the wide neck makes it a genuine strength exercise.",
      "Golpe & tambora — percussive taps on the top or strings, borrowed from flamenco.",
    ],
    tips: [
      "New nylon strings stretch for days — expect to retune constantly for the first week, then they settle.",
      "If your fingertips hurt on a steel-string, this is the honest fix; the notes are identical and everything transfers.",
      "Keep the right-hand nails filed and polished; a snag or a rough edge is instantly audible.",
    ],
    care: "Never fit steel strings — the top is not braced for the tension. Wipe strings after playing, and keep it humidified in dry winters like any solid-wood guitar.",
    inApp: [
      "Tuned exactly like a steel-string guitar, so every guitar song, drill, and chord shape in the app applies unchanged.",
      "Fingering hints show the same fretboard dots — but ignore the pick advice and use p-i-m-a.",
    ],
  },

  "bass-5": {
    family: "Plucked string (fretted)",
    tagline: "Four-string bass plus a low B — the bottom five semitones modern music keeps asking for.",
    overview: "A five-string bass adds a low B below E, extending the range down to B0 (about 31 Hz). Beyond the extra notes, the real benefit is position: notes that used to demand a jump down the neck now sit under your hand on the B string. Standard in gospel, metal, worship, and most modern session work.",
    anatomy: [
      "Low B string — .125–.135 gauge; tension and a long scale are what stop it flapping.",
      "35\" scale (on many models) — an inch longer than the classic 34\" to tighten that B.",
      "Wider string spacing or a wider neck — worth trying in person; hand size genuinely matters here.",
    ],
    playing: [
      "Anchor the plucking-hand thumb on the B string when not using it — it is the biggest sympathetic ringer on the instrument.",
      "The B string repeats the same fourths pattern; the fretboard shapes you know shift over, nothing new to learn.",
      "Use the B for position, not just for low notes: playing E on the B string's fifth fret keeps your hand where the rest of the phrase is.",
    ],
    techniques: [
      "Floating thumb — the plucking thumb moves down the strings, muting everything below the one you are playing.",
      "Fingerstyle alternation — index and middle alternating, the default bass technique.",
      "Slap & pop — thumb strikes the low strings, fingers snap the high ones.",
    ],
    tips: [
      "Set-up matters more than on a four-string. A badly set-up B string is the usual reason players say five-strings sound floppy.",
      "Roll a little low bass off your amp: the fundamental of B0 is below what most speakers reproduce anyway.",
    ],
    care: "Wipe strings after playing; heavy-gauge strings die as fast as any. Check neck relief when changing string brands.",
    inApp: [
      "The tuner lists all five strings, low B first.",
      "Four-string bass songs play unchanged — the B string is simply extra room.",
    ],
  },

  "cello": {
    family: "Bowed string",
    range: "C2 – A5 (practical)",
    tagline: "The closest instrument to the human voice, played sitting down and wrapped around you.",
    overview: "The cello is tuned C–G–D–A, an octave below the viola, and sits between the knees on an endpin. Its range covers most of the singing human voice and then some, which is why it carries so much melodic writing despite nominally being a bass instrument. It is physically the most comfortable of the bowed strings — no awkward arm position, everything in front of you.",
    anatomy: [
      "Endpin — the adjustable spike that takes the instrument's weight and sets its height.",
      "Four strings, C–G–D–A, thickest to thinnest.",
      "Bow — shorter and heavier than a viola bow, held palm-down but with a more open hand.",
      "Bridge and sound post — the sound post inside the body is the \"soul\" of the instrument; never let it fall.",
    ],
    playing: [
      "Set the endpin so the C-string peg sits near your left ear and the instrument leans into your chest.",
      "Left-hand fingers are spaced a whole tone apart in lower positions — a wider stretch than any violinist uses.",
      "Bow parallel to the bridge, arm weight doing the work; the elbow leads on the down bow.",
      "Thumb position (thumb pressed across the strings as a movable nut) unlocks the upper register — expect it eventually.",
    ],
    techniques: [
      "Legato and détaché bowing — the fundamentals of phrasing.",
      "Vibrato — from the left arm, wider and slower than on violin.",
      "Pizzicato — plucked; the cello's pizzicato is one of the great sounds in the orchestra.",
      "Spiccato — a bounced bow for light, separated notes.",
    ],
    tips: [
      "Get the seat height right before anything else: knees slightly below hips, instrument stable without gripping.",
      "Practise scales with a drone playing the tonic — intonation on a fretless instrument is an ear skill, not a finger skill.",
      "Use an endpin stopper on hard floors; it protects the floor and stops the cello sliding away mid-phrase.",
    ],
    care: "Wipe rosin off after playing, loosen the bow, and keep humidity stable — cracks and fallen sound posts are both humidity stories.",
    inApp: [
      "The tuner covers C–G–D–A, an octave below the viola.",
      "Cents-accurate pitch grading is genuinely useful here — play long tones and watch how steady you actually are.",
    ],
  },

  "double-bass": {
    family: "Bowed string",
    range: "E1 – G4 (practical, sounding)",
    tagline: "The biggest voice in the orchestra and the heartbeat of jazz — tuned in fourths, unlike its family.",
    overview: "The double bass is the odd one out among bowed strings: it is tuned in fourths (E–A–D–G) rather than fifths, it is played standing or on a high stool, and it sounds an octave below where it is written. It is equally at home bowed in an orchestra and plucked in a jazz rhythm section, and its notes are the foundation everything else is tuned against.",
    anatomy: [
      "Enormous body with sloped shoulders — a hangover from its viol ancestry, and what lets you reach up the neck.",
      "Four strings, E–A–D–G (a low C extension is common in orchestral work).",
      "Two bow styles — French (held like a cello bow) and German (held underhand); both are standard, pick one.",
      "Adjustable bridge and endpin — the instrument is set up to the player's height.",
    ],
    playing: [
      "Stand with the bass leaning into your body, its back against your torso, weight on the endpin — you should not be holding it up.",
      "Left hand uses one-finger-per-semitone (Simandl) spacing in the low positions; the stretches are large, so the hand shape is fixed, not spread.",
      "Pizzicato for jazz: pull across the string with the side of the index finger, not down.",
      "Sounds an octave lower than written — every bassist reads transposed, and this is normal.",
    ],
    techniques: [
      "Walking bass — quarter-note lines outlining the chords, the core jazz skill.",
      "Arco vs pizzicato — bowed for orchestral work, plucked for jazz; genuinely two techniques.",
      "Shifting and thumb position — the neck is long, so moving up it is routine rather than advanced.",
      "Slap bass — the percussive rockabilly technique where the strings snap back against the fingerboard.",
    ],
    tips: [
      "Technique here is injury prevention. Get a teacher for the first few months; the leverage involved punishes bad habits.",
      "Practise intonation against a drone or a piano — on an instrument this long, small errors are large distances.",
    ],
    care: "Humidity, again, is the enemy. Transport with a padded cover, and have the bridge and sound post checked yearly.",
    inApp: [
      "The tuner covers E–A–D–G at sounding pitch — the same tuning as a bass guitar, an octave down.",
      "The pitch detector tracks low E (about 41 Hz) reliably; get close to the mic and play with a full bow or a firm pluck.",
    ],
  },

  "drum-kit": {
    family: "Percussion (unpitched)",
    range: "Unpitched — graded on hit timing",
    tagline: "The acoustic original: four limbs, one groove, and the loudest instrument in any room.",
    overview: "The acoustic drum kit assembles several separate percussion instruments into one playing position: bass drum under the right foot, hi-hat under the left, snare between the knees, toms and cymbals around them. Drums are unpitched, so GuitarPicker grades them on timing alone — how close each hit lands to the beat — rather than on pitch.",
    anatomy: [
      "Bass (kick) drum — played with a foot pedal; the pulse.",
      "Snare drum — wires stretched under the bottom head give the crack; the backbeat.",
      "Toms — rack and floor toms, tuned but unpitched in practice; the fills.",
      "Hi-hat — two cymbals on a pedal-operated stand, playable open, closed, or with the foot.",
      "Ride and crash cymbals — the sustained pulse and the accents.",
    ],
    playing: [
      "Set the throne so your thighs are roughly parallel to the floor and both feet sit naturally on the pedals.",
      "Hold the sticks at the balance point (about a third from the butt) and let them rebound — the stick does the work.",
      "The money beat: hi-hat on every eighth, kick on 1 and 3, snare on 2 and 4. That single pattern covers an enormous amount of music.",
      "Count out loud. It is the fastest way to make four limbs agree with each other.",
    ],
    techniques: [
      "Single and double stroke rolls — the first two rudiments, and the foundation of everything.",
      "Paradiddle (RLRR LRLL) — the coordination pattern that unlocks moving around the kit.",
      "Ghost notes — very quiet snare hits between backbeats; what makes a groove feel alive.",
      "Limb independence — the long project: each limb doing something different, reliably.",
    ],
    tips: [
      "Practise with a metronome from day one. Drummers are hired for time, not for fills.",
      "A practice pad builds the same hands for a fraction of the noise and the money.",
      "Wear ear protection. An acoustic kit is loud enough to damage hearing permanently, and it does.",
    ],
    care: "Change heads when they lose tone or dent, keep the lugs tensioned evenly, and check cymbal felts so metal never touches metal.",
    inApp: [
      "Timing-only grading: a hit within ±70 ms of the beat is Perfect, ±150 ms is Good — any drum, any part of the kit.",
      "\"Backbeat Basics (Drums)\" is the starter groove in the library.",
      "The mic hears hits, not which drum you struck, so the note lanes are a guide to the pattern rather than a rule.",
    ],
  },
};

export interface InstrumentFacts {
  inst: InstrumentDef;
  strings: { label: string; note: string; midi: number; freq: number }[];
  range: string;
  tunings: { name: string; notes: string }[];
  songs: number;
  panel: string | null;
  tuner: boolean;
}

/** Derived facts for one instrument: strings table, range, tunings, song count, app support. */
export function instrumentFacts(id: keyof typeof INSTRUMENTS): InstrumentFacts {
  const inst = INSTRUMENTS[id];
  const g = GUIDE[id];
  const strings = inst.strings.map((m, i) => ({
    label: (STRING_LABELS[id] || [])[i] || midiToName(m).name,
    note: midiToName(m).full, midi: m, freq: midiToFreq(m),
  }));
  const range = g.range || (inst.strings.length
    ? `${midiToName(Math.min(...inst.strings)).full} – ${midiToName(Math.max(...inst.strings) + inst.frets).full}`
    : id === "harmonica" ? `${midiToName(HARMONICA_BLOW[0]).full} – ${midiToName(HARMONICA_BLOW[9]).full}` : "—");
  const tunings = Object.entries(ALT_TUNINGS[id] || {}).map(([name, t]) =>
    ({ name, notes: t.map((m) => midiToName(m).full).join(" ") }));
  const songs = builtinSongs().filter((s) => (s.instrument || "acoustic-guitar") === id).length;
  const panel = inst.kind === "fretted" ? "fretboard dots" : id === "harmonica" ? "hole + breath strip" : null;
  return { inst, strings, range, tunings, songs, panel, tuner: inst.strings.length > 0 };
}

/** Richter C-diatonic hole chart rows: { hole, blow, draw } note names. */
export function harmonicaChart(): { hole: number; blow: string; draw: string }[] {
  return HARMONICA_BLOW.map((b, i) => ({ hole: i + 1, blow: midiToName(b).full, draw: midiToName(HARMONICA_DRAW[i]).full }));
}

// ---------- Markdown export (mirrors the vanilla app's docs/INSTRUMENTS.md generator, scoped to this pilot's 16 instruments) ----------
export function buildInstrumentsMarkdown(): string {
  const ids = Object.keys(GUIDE) as (keyof typeof INSTRUMENTS)[];
  const L: string[] = [];
  L.push("# GuitarPicker (pilot) instrument guide", "");
  L.push("The instruments this FSD/Next/RQ pilot models: what each is, how to play it, and how the pilot supports it.");
  L.push("Hard facts (tunings, ranges, hole charts, song counts) are generated from the app's own data, so this");
  L.push("guide always matches what the pilot actually plays. Also readable in-app under **Instruments**.", "");
  L.push("## Contents", "");
  for (const id of ids) L.push(`- ${INSTRUMENTS[id].name}`);
  L.push("");

  for (const id of ids) {
    const g = GUIDE[id], f = instrumentFacts(id);
    L.push(`## ${INSTRUMENTS[id].name}`, "", `*${g.tagline}*`, "", g.overview, "");

    L.push("**At a glance**", "", "| | |", "|---|---|", `| Family | ${g.family} |`, `| Range (as modeled) | ${f.range} |`);
    if (f.strings.length) L.push(`| Strings | ${f.strings.length} — ${f.strings.map((s) => s.note).join(" ")} |`);
    if (f.inst.frets) L.push(`| Frets modeled | ${f.inst.frets} |`);
    L.push(`| Tuner | ${f.tuner ? "yes" + (f.tunings.length > 1 ? ` (${f.tunings.map((t) => t.name).join(", ")})` : "") : "—"} |`);
    L.push(`| Play-view fingering hint | ${f.panel || "—"} |`);
    L.push(`| Built-in songs written for it | ${f.songs} |`, "");

    if (f.strings.length) {
      L.push("**Strings** (low string first)", "", "| String | Note | MIDI | Frequency |", "|---|---|---|---|");
      for (const s of f.strings) L.push(`| ${s.label} | ${s.note} | ${s.midi} | ${s.freq.toFixed(1)} Hz |`);
      L.push("");
      const alts = f.tunings.filter((t) => t.name !== "standard");
      if (alts.length) L.push("**Alternate tunings:** " + alts.map((t) => `${t.name} = ${t.notes}`).join(" · "), "");
    }
    if (id === "harmonica") {
      const ch = harmonicaChart();
      L.push("**Hole chart (Richter-tuned C diatonic)**", "");
      L.push("| Hole | " + ch.map((h) => h.hole).join(" | ") + " |");
      L.push("|---|" + ch.map(() => "---").join("|") + "|");
      L.push("| Blow ↑ | " + ch.map((h) => h.blow).join(" | ") + " |");
      L.push("| Draw ↓ | " + ch.map((h) => h.draw).join(" | ") + " |", "");
    }

    const section = (title: string, items: string[] | undefined, ordered?: boolean) => {
      if (!items || !items.length) return;
      L.push(`### ${title}`, "");
      items.forEach((t, i) => L.push(`${ordered ? `${i + 1}.` : "-"} ${t}`));
      L.push("");
    };
    section("Anatomy", g.anatomy);
    section("How to play", g.playing, true);
    section("Techniques", g.techniques);
    section("Beginner tips", g.tips);
    if (g.care) L.push("### Care", "", g.care, "");
    const app = [
      f.tuner ? `Tuner: supported${f.tunings.length > 1 ? ` — tunings: ${f.tunings.map((t) => t.name).join(", ")}` : ""}.`
              : "Tuner: not applicable (nothing to tune string-by-string).",
      f.panel ? `Play view shows a ${f.panel} fingering hint for every note.`
              : "Play view grades by pitch alone — no fingering hint for this instrument.",
      `${f.songs} built-in song${f.songs === 1 ? "" : "s"} written for it${id === "acoustic-guitar" ? " (plus every drill)" : ""}.`,
      ...(g.inApp || []),
    ];
    section("In GuitarPicker", app);
  }
  return L.join("\n");
}
