// The instrument guide, single-sourced: prose lives here, hard facts (tunings,
// ranges, hole charts, song counts) are derived from notes.js/songs.js so the
// guide can never drift from what the app actually plays. Rendered two ways:
// the Instruments view (in-app) and docs/INSTRUMENTS.md (node gen-docs.mjs).
import { INSTRUMENTS, ALT_TUNINGS, STRING_LABELS, HARMONICA_BLOW, HARMONICA_DRAW, midiToName, midiToFreq } from "./notes.js";
import { builtinSongs } from "./songs.js";

export const GUIDE = {
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
      "Songs can carry a dedicated vocal melody (set in the Song Editor); otherwise scoring falls back to the instrument melody.",
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
      "The recorder sits an octave up — if a song reads too low, copy it in the Song Editor and transpose +12.",
    ],
    range: "C5 – D7",
  },

  "whistle": {
    family: "Woodwind (fipple flute)",
    tagline: "Six holes, one key, pure Irish sparkle — the folk session instrument that costs less than lunch.",
    overview: "The tin whistle (penny whistle) is a six-hole fipple flute, most commonly in the key of D — the home key of Irish and folk session music. Like the recorder it sounds instantly, but with an even simpler fingering logic: lift fingers one at a time from the bottom and you climb the D major scale. Blow harder to jump the octave.",
    anatomy: [
      "Fipple mouthpiece — whistle-style; the instrument makes the tone for you.",
      "Brass or nickel tube — cylindrical bore; tuneable models have a sliding head.",
      "Six finger holes — no thumb hole; the second octave comes from breath pressure alone.",
      "Keys of whistle — D is standard; a C whistle plays the same fingerings a tone lower.",
    ],
    playing: [
      "Six fingers down = D5; lift from the bottom one at a time for E, F#, G, A, B, C#, and all-open (or blow harder) for the octave.",
      "Tongue each note with \"too\" for crisp articulation; slur within phrases for the folk lilt.",
      "Overblow gently — the second octave needs only slightly more air, not a blast.",
      "Play along with slow session tunes (jigs and airs) — the whistle is a by-ear tradition.",
    ],
    techniques: [
      "Cuts & taps — grace-note flicks that decorate a melody; the heart of Irish ornamentation.",
      "Rolls — cut + tap on one note, the signature session ornament.",
      "Slides — sliding a finger off a hole to bend into a note.",
      "Breath vibrato — a gentle pulse of air on long notes.",
    ],
    tips: [
      "The whistle is diatonic: songs in D and G (and their relative minors) lie perfectly; other keys fight you — transpose the song, not yourself.",
      "Second-octave squawks are breath, not fingers — practice octave jumps on one note until the flip is clean.",
      "A Feadóg, Generation, or Clarke (~$10–15) is the real instrument the professionals started on.",
    ],
    care: "Shake it out after playing and let it dry. That's the whole maintenance schedule.",
    inApp: [
      "Modeled as the standard D whistle — songs in D or G major fit best; use the Song Editor's transpose to move a tune into range.",
    ],
    range: "D5 – D7",
  },

  "flute": {
    family: "Woodwind (transverse)",
    tagline: "The concert woodwind: silvery tone from an air-reed you shape yourself.",
    overview: "The transverse flute makes its sound the way blowing across a bottle does — your lips aim an airstream at the edge of the embouchure hole, and shaping that airstream (the embouchure) is the flute's central skill and its steepest early hill. Student flutes reach down to C4 and up past C7. Of the instruments here it is the least \"cheap\" new (decent student models cost real money), but used student flutes are plentiful and school-band ubiquitous.",
    anatomy: [
      "Head joint — holds the lip plate and embouchure hole; where all tone is made (practice with it alone at first).",
      "Body & foot joint — the keyed tube; the Boehm key system lets nine fingers govern sixteen-plus tone holes.",
      "Keys & pads — sprung cups that seal the holes; leaks here are the classic cause of \"suddenly can't play low notes\".",
      "Crown & cork — the head-joint plug; its position affects tuning (leave it where the cleaning-rod mark says).",
    ],
    playing: [
      "Start with the head joint alone: lower lip covering about a quarter of the hole, blow across (not into) it, and hunt for the sweet spot that sings.",
      "Say \"too\" to start notes; keep corners of the mouth firm but the center relaxed.",
      "Hold the assembled flute out to your right, balanced on three points: chin, left index-finger base, right thumb.",
      "First notes: B4, A4, G4 (left hand only), then add the right hand downward.",
      "Faster air and a smaller aperture — not more pressure — lift you to the second octave.",
    ],
    techniques: [
      "Embouchure control — tone color, pitch, and octave all live in the lips and air speed.",
      "Tonguing — single (\"too\"), later double (\"too-koo\") for fast passages.",
      "Vibrato — a slow pulse of the air column, added once tone is steady.",
      "Harmonics & overblowing — the same fingering yields multiple partials with faster air.",
    ],
    tips: [
      "Ten minutes of head-joint-only long tones a day builds the flute skill; everything else is fingerings.",
      "Dizziness when starting is normal (lots of air, little resistance) — sit down, breathe, shorten sessions.",
      "Buy used student flutes (Yamaha, Gemeinhardt) — band programs recycle them cheaply; have pads checked before blaming yourself for leaks.",
    ],
    care: "Swab the inside dry after every session and wipe fingerprints off the keys. Never wash it; pads hate water. An annual check-up keeps the pads sealing.",
    inApp: [
      "Play melodies an octave up where written low — the mic hears the flute's strong fundamental well from C5 upward.",
    ],
    range: "C4 – C7",
  },

  "melodica": {
    family: "Free-reed keyboard (wind)",
    tagline: "A keyboard you blow into — piano fingering plus breath expression for about the price of a video game.",
    overview: "The melodica is a free-reed instrument (harmonica's cousin) with a piano keyboard on top: press keys, blow into the mouthpiece, and every pressed key sounds. It is the cheapest way to get real keyboard skills with built-in dynamics — your breath is the volume pedal. A 32-key model spans F3 to C6.",
    anatomy: [
      "Keyboard — piano layout; whatever you learn here transfers straight to piano.",
      "Reed bank — one free reed per key, sounded by your airstream.",
      "Mouthpiece — a short stub for holding it upright, or a flexible tube for playing it flat on a table with two hands.",
      "Moisture release valve — a button that vents condensation.",
    ],
    playing: [
      "Hold it with the left hand strap and play with the right, or lay it flat and use the tube mouthpiece for two-handed playing.",
      "Steady breath = steady tone; pulse your breath for accents, tongue \"too\" for crisp starts.",
      "Chords work — blow slightly harder when holding several keys, since they share your air.",
      "All piano-side basics apply: five-finger positions, C major scale, simple triads.",
    ],
    techniques: [
      "Breath dynamics — crescendo and fade on held notes, something a cheap keyboard can't do.",
      "Articulation — tonguing separates notes sharing one finger; slur by keeping air moving.",
      "Vibrato — pulse the airstream gently on sustained notes.",
      "Two-handed table playing — with the tube, treat it as a small breath-powered piano.",
    ],
    tips: [
      "Think of it as a piano teacher that fits in a backpack — learn keyboard geography here, graduate anywhere.",
      "Short notes cost little air; long chords drain you — phrase like a singer and breathe where the music breathes.",
      "Suzuki and Yamaha 32-key models (~$30–50) are the reliable starters.",
    ],
    care: "Press the moisture valve and blow the condensation out after playing, wipe the mouthpiece, and let it dry open. Wash mouthpieces regularly.",
    inApp: [
      "Modeled like a keyboard: melody grading through the mic works the same as piano, and the breath gives the mic a clear, steady tone to track.",
    ],
    range: "F3 – C6 (32-key)",
  },

  "kalimba": {
    family: "Lamellophone (plucked tines)",
    tagline: "Seventeen steel tines on a resonant block — a music box you actually play, gentle on ears and wallets.",
    overview: "The kalimba (thumb piano) descends from the African mbira family: tuned steel tines mounted over a resonator, plucked downward with the thumbnails. The common 17-key model is tuned to C major across two-plus octaves (C4–E6), with the longest tine (lowest note) in the center and notes alternating left-right outward — so scale runs zig-zag between thumbs, and adjacent tines form chord-friendly thirds.",
    anatomy: [
      "Tines — flat steel keys; length sets pitch, and each is individually tunable by sliding it under the bridge.",
      "Bridge & pressure bar — clamp the tines at their speaking length.",
      "Resonator — a hollow box (with sound hole) or solid board; box models add wah effects, solid boards sustain evenly.",
      "Tuning hammer — a small metal hammer for tapping tines up or down in pitch.",
    ],
    playing: [
      "Hold it in both hands, thumbs above the tines, fingers wrapped behind the body.",
      "Pluck with the edge of the thumbnail sliding off the tine tip — flesh-only plucks sound dull and hurt sooner.",
      "Middle = lowest note (C4), then notes alternate: right thumb takes C4's right neighbor (D4), left takes the left one (E4)... learn the zig-zag scale slowly.",
      "Adjacent tines are a third apart — brush two at once for instant harmony, three for a chord.",
    ],
    techniques: [
      "Glissando — sweep a thumb across several tines for the signature sparkle.",
      "Wah — on box kalimbas, cover and open the sound holes with your fingers while notes ring.",
      "Two-thumb independence — melody in one thumb, accompaniment pattern in the other.",
      "Chord brushing — deliberate two/three-tine strokes built on the alternating-thirds layout.",
    ],
    tips: [
      "Check tuning with the app's tuner-style ear (play a tine, compare to the note names) and tap tines back with the hammer — they drift with heavy playing.",
      "Sticker note-names on the tines are training wheels; fine to use, plan to peel.",
      "Nails matter: a millimeter of thumbnail makes every note cleaner. $20–30 buys a genuinely good instrument (Gecko, Hluru).",
    ],
    care: "Keep it dry, wipe the tines to prevent rust, and re-tune occasionally. Box kalimbas dislike humidity swings like any hollow wooden instrument.",
    inApp: [
      "Its gentle, pure tone is one of the easiest sounds for the app's pitch detection to track — a great low-frustration first instrument.",
      "C-major songs in the C4–E6 range fit as-is; copy and transpose others in the Song Editor.",
    ],
    range: "C4 – E6 (17 tines)",
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

  "baritone-guitar": {
    family: "Plucked string (fretted)",
    tagline: "A guitar tuned a fourth low — the growl under surf, doom, and cinematic twang.",
    overview: "A baritone guitar has a longer scale (typically 27–30 inches) and heavier strings so it can sit comfortably at B–E–A–D–F♯–B, a perfect fourth below standard. Every chord shape you know still works; everything just sounds a fourth lower. It fills the space between guitar and bass, and it is the sound of surf instrumentals, spaghetti-western themes, and a lot of modern heavy music.",
    anatomy: [
      "Long scale length — 27\" and up; the extra string length is what keeps low B tight instead of floppy.",
      "Heavy string set — typically .013–.062 or thicker; standard sets will rattle at this tuning.",
      "Wider nut slots — cut for the fatter strings, so a baritone neck is not just a long guitar neck.",
    ],
    playing: [
      "Play it exactly like a guitar — the shapes, scales, and fretboard patterns are unchanged, only the pitch moves.",
      "Because it is a fourth down, a shape you call G sounds D. Read chord charts as-is if the whole band transposes, or transpose in your head if not.",
      "Pick nearer the bridge for definition — low strings turn to mud fast when struck over the neck.",
      "Palm muting matters more here than on a standard guitar; it keeps the low end from smearing.",
    ],
    techniques: [
      "Tremolo picking — the surf/spaghetti-western signature, fast repeated down-up strokes.",
      "Single-note lines over chords — baritones speak most clearly one note at a time.",
      "Doubling — track the same riff on guitar and baritone for a huge composite tone.",
    ],
    tips: [
      "It is not a bass: it has six strings and plays chords. Think of it as a guitar with a lower voice.",
      "Amp or record with less low-end boost than you would use for a guitar; the instrument supplies it already.",
    ],
    care: "Standard guitar care, but do not drop a normal string set on it — the tension is wrong and the nut slots will not fit.",
    inApp: [
      "The tuner and fretboard hints use B–E–A–D–F♯–B, so the dots land where your fingers actually go.",
      "Guitar songs will sit a fourth low unless you transpose them in the Song Editor first.",
    ],
  },

  "guitar-7": {
    family: "Plucked string (fretted)",
    tagline: "Standard guitar plus a low B — extended range without leaving guitar behind.",
    overview: "A seven-string guitar adds a low B below the usual six. The top six strings are tuned exactly as a normal guitar, so nothing you know is invalidated — you simply gain a fifth of extra range downward. Jazz players use it for self-accompanied bass lines; metal players use it for riffs below the standard guitar floor.",
    anatomy: [
      "Seventh (low B) string — .056–.070 gauge, sitting above the low E.",
      "Wider neck — about 48 mm at the nut; the extra string has to go somewhere.",
      "Longer scale on many models (25.5–27\") to keep the B tight.",
    ],
    playing: [
      "Everything on strings 1–6 is identical to a six-string. Learn the seventh as a bonus, not a rewrite.",
      "The low B repeats the pattern: it is a fourth below E, exactly as A is a fourth below D.",
      "Muting is the real skill — an unplayed low B rings sympathetically and turns riffs to mush. Rest the picking-hand palm on it by default.",
    ],
    techniques: [
      "Drop-A tuning — slack the seventh to A for one-finger power chords, the metal standard.",
      "Walking bass with chords — the jazz seven-string idiom: thumb-ish bass line on 7 and 6, chords above.",
      "Extended chord voicings — a bass note below a familiar shape opens inversions a six-string cannot reach.",
    ],
    tips: [
      "If riffs sound muddy, it is nearly always muting, not the guitar or amp.",
      "Start by playing your existing repertoire and just not touching the seventh string — get comfortable, then reach for it.",
    ],
    care: "As a six-string. Check the neck relief seasonally — the extra string adds tension the truss rod has to balance.",
    inApp: [
      "Fretboard hints draw all seven strings, low B at the bottom.",
      "Six-string songs play unchanged; the app simply never asks for the seventh string.",
    ],
  },

  "guitar-12": {
    family: "Plucked string (fretted)",
    tagline: "Six courses of doubled strings — one strum and it already sounds like two guitars.",
    overview: "A twelve-string is a six-string with each string doubled: the four lowest pairs are tuned an octave apart, the top two pairs in unison. The tiny timing and tuning differences between the paired strings create the shimmering chorus that defines the sound — think jangling folk-rock and Hotel California's intro. Fingering is unchanged; you simply fret both strings of each course at once.",
    anatomy: [
      "Courses — six pairs, not twelve independent strings; you fret and pick each pair as one.",
      "Octave strings — the thin partners on the E, A, D, and G courses, tuned an octave up. They provide the shimmer.",
      "Reinforced neck and body — roughly double the string tension of a six-string, so the build is heavier.",
    ],
    playing: [
      "Fret with a little extra pressure and slightly flatter fingertips — you are pushing two strings, not one.",
      "Strum rather than pick single notes; the instrument is at its best in open chords with lots of ringing strings.",
      "Many players tune the whole instrument a whole step down and capo up to relieve tension — historically standard.",
    ],
    techniques: [
      "Open-chord jangle — first-position shapes let the octave strings ring; the classic use.",
      "Drone strings — DADGAD and open tunings sound enormous on twelve.",
      "Capo work — a capo on the fifth or seventh fret gives the bright mandolin-like tone heard on countless records.",
    ],
    tips: [
      "Tuning takes twice as long and matters twice as much — a slightly off octave string is instantly obvious.",
      "Barre chords are hard work here. Build up to them; do not start your guitar journey on a twelve-string.",
    ],
    care: "Slacken the strings if storing it for months — the tension is punishing on the neck. Otherwise treat it as an acoustic.",
    inApp: [
      "The tuner and fretboard hints treat it as six courses (the fundamental of each pair), which is exactly how you finger it.",
      "Tune each octave partner to the same note name an octave up — the app's per-string targets get you there one string at a time.",
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

  "banjo": {
    family: "Plucked string (fretted)",
    tagline: "A drum with a neck: five strings, open-G tuning, and the drone that makes it a banjo.",
    overview: "The five-string banjo has a skin (now usually mylar) head stretched over a rim, which is why it barks rather than sings. Its defining oddity is the fifth string: short, high, and starting at the fifth fret, tuned to g above the middle of the instrument's range. It is played as a drone under the melody, and it is what makes rolls sound the way they do.",
    anatomy: [
      "Head & rim — a drum head under tension; tightening it brightens and loudens the instrument.",
      "Fifth string & its tuning peg — sticks out of the side of the neck at the fifth fret; it is never fretted in standard playing.",
      "Tone ring — the heavy metal ring under the head on resonator banjos; the source of bluegrass volume and ring.",
      "Resonator or open back — resonators throw sound forward (bluegrass); open backs are softer and mellower (clawhammer).",
      "Bridge — a small floating bridge held in place only by string tension; its position sets the intonation.",
    ],
    playing: [
      "Standard tuning is open G (g D G B D): strum all five open strings and you have a G chord.",
      "Bluegrass style: metal picks on thumb, index, and middle; the hand anchors lightly on the head.",
      "Clawhammer style: no picks — the back of the index or middle nail strikes down onto a string, the thumb catches the fifth string on the way back.",
      "Learn rolls before songs. The forward roll (T-I-M, T-I-M) is the fundamental unit of bluegrass banjo.",
    ],
    techniques: [
      "Forward, backward, and alternating rolls — repeating eight-note picking patterns that carry the melody inside them.",
      "Bum-ditty — the clawhammer basic: strike, strum, thumb the fifth string.",
      "Slides, hammer-ons, pull-offs — banjo melody is mostly made with the left hand between picked notes.",
      "Choke (bending) — pushing a string sideways at the tenth fret, the classic banjo cry.",
    ],
    tips: [
      "If it sounds out of tune up the neck, check the floating bridge position before blaming the tuning.",
      "The fifth string is a drone: in standard playing you almost never fret it, you just let it ring.",
      "Banjos go out of tune with weather and head tension — retune more often than you would a guitar.",
    ],
    care: "Keep the head tension consistent, wipe strings after playing, and check that the bridge has not crept — mark its position lightly with a pencil.",
    inApp: [
      "The tuner lists the strings in playing order (fifth string g first), matching the pegs as you reach for them.",
      "Fretboard hints show the fifth string as its own line, but remember it only starts at the fifth fret.",
    ],
  },

  "tenor-banjo": {
    family: "Plucked string (fretted)",
    tagline: "Four strings in fifths, played with a pick — the drive behind Irish trad and trad jazz.",
    overview: "The tenor banjo has four strings, a shorter neck, and no drone string. Tuned in fifths (C–G–D–A, or G–D–A–E in Irish sessions), it is played with a plectrum for melody rather than rolls. It supplied the rhythm chop in 1920s jazz bands, and today it is a staple of Irish traditional music.",
    anatomy: [
      "Four strings — no fifth-string drone, so the neck is a clean, ordinary fretboard.",
      "Short scale — 17 frets on a 19\" scale (jazz) or 21\" (Irish); tight spacing suits fast tune playing.",
      "Head, rim, and (usually) resonator — the same drum-with-a-neck construction as the five-string.",
    ],
    playing: [
      "Tuned in fifths, so scale shapes repeat identically across every pair of strings — a big advantage over guitar's mixed intervals.",
      "Hold the pick firmly and play from the wrist; Irish tune playing is almost all down-up alternation at speed.",
      "Irish players usually retune to G–D–A–E (an octave below the fiddle), so fiddle and mandolin tunes transfer note for note.",
    ],
    techniques: [
      "Triplets — the ornament that defines Irish banjo, three fast picked notes squeezed into one beat.",
      "Chop chords — short muted four-string stabs on the offbeat, the trad-jazz rhythm role.",
      "Single-string melody with drone strings ringing underneath.",
    ],
    tips: [
      "Decide early which tuning you want: CGDA for jazz and old-time, GDAE if you are heading for sessions.",
      "Because it is tuned in fifths, learning one scale shape gets you the whole neck — practise it in every position.",
    ],
    care: "As the five-string: watch head tension and bridge placement, wipe strings after playing.",
    inApp: [
      "Tuned CGDA here, identical to the mandola — mandolin and fiddle tunes map straight across.",
      "Set the tuner to GDAE by picking the mandolin if you play Irish tuning an octave up.",
    ],
  },

  "baritone-ukulele": {
    family: "Plucked string (fretted)",
    tagline: "A ukulele tuned like a guitar's top four strings — the easiest crossover instrument there is.",
    overview: "The baritone ukulele is tuned D–G–B–E, exactly the top four strings of a guitar. That makes it the natural bridge between the two instruments: every guitar chord shape you know works on it, and the sound is warmer and deeper than a soprano uke's. It is also non-reentrant — the strings run low to high in order, unlike the soprano's high-G.",
    anatomy: [
      "Larger body — roughly 30\" overall, closer to a small guitar than a soprano uke.",
      "Four nylon strings, low to high — no reentrant high string.",
      "Longer scale (about 19\") — more space between frets than any smaller ukulele.",
    ],
    playing: [
      "Any guitar chord shape played on the top four strings works here, unchanged and with the same name.",
      "Strum with the thumb or fingers over the end of the fretboard rather than over the soundhole — that is where a uke's sweet spot is.",
      "Coming from soprano uke? Every shape you know moves: what you called C is now G.",
    ],
    techniques: [
      "Guitar chord vocabulary — the whole point; borrow shapes freely.",
      "Fingerpicking — the wider spacing and lower tuning suit thumb-and-fingers patterns beautifully.",
      "Campanella — melody spread across strings so each note rings into the next, a signature ukulele texture.",
    ],
    tips: [
      "If you play guitar, this is the fastest new instrument you will ever pick up — allow about ten minutes.",
      "Nylon strings stretch: retune constantly for the first few days after a change.",
    ],
    care: "Wipe the strings, avoid extremes of humidity, and expect to change nylon strings once or twice a year.",
    inApp: [
      "Tuned D–G–B–E, so guitar fingering hints for the top four strings translate directly.",
      "The tuner has it as its own instrument — do not use the soprano ukulele setting, the tuning is different.",
    ],
  },

  "mandola": {
    family: "Plucked string (fretted)",
    tagline: "The mandolin's bigger sibling, a fifth lower — warmer, darker, still tuned in fifths.",
    overview: "The mandola is to the mandolin what the viola is to the violin: same construction, same four courses of doubled strings, tuned a fifth lower to C–G–D–A. Every mandolin shape and scale moves across unchanged, just sounding a fifth down. It fills the middle voice in mandolin ensembles and gives folk arrangements a body the mandolin cannot reach.",
    anatomy: [
      "Four courses of paired strings — eight strings total, each pair tuned in unison.",
      "Longer scale than a mandolin (about 16.5\") with a correspondingly larger body.",
      "Arched or flat top — arched for the bluegrass-derived bark, flat for a rounder folk tone.",
    ],
    playing: [
      "Fifths tuning again: one scale shape covers the whole fretboard, moved across strings.",
      "Fret firmly — you are pushing two strings per course, as on the mandolin.",
      "Down-up alternate picking is the backbone; keep the pick shallow so it clears both strings of each course cleanly.",
    ],
    techniques: [
      "Tremolo — rapid repeated picking to sustain a note, the signature of the mandolin family.",
      "Double stops — two courses at once; in fifths tuning these fall naturally under the fingers.",
      "Chop chords — muted rhythmic stabs on the backbeat, borrowed straight from bluegrass mandolin.",
    ],
    tips: [
      "If you play mandolin, transpose in your head or just read a fifth lower — the fingers already know what to do.",
      "It shares CGDA with the tenor banjo and viola; music for any of them can be read directly.",
    ],
    care: "Keep the bridge seated correctly (it usually floats), wipe strings after playing, and keep it cased in dry weather.",
    inApp: [
      "Tuned C–G–D–A with fretboard hints on all four courses.",
      "Mandolin songs in the library will sound a fifth low — transpose them up five semitones in the Song Editor to match.",
    ],
  },

  "bouzouki": {
    family: "Plucked string (fretted)",
    tagline: "Long-necked, ringing, and tuned in fourths and fifths — the backbone of Irish session accompaniment.",
    overview: "The Irish bouzouki descends from the Greek instrument but was rebuilt in the 1960s for accompanying traditional music: a flat back, a long neck, and four courses usually tuned G–D–A–D. That tuning gives constant open drones and ambiguous, modal-sounding chords that suit tunes without pushing them into major or minor. It is a rhythm instrument first and a melody instrument second.",
    anatomy: [
      "Four courses of paired strings — the lower pairs often tuned in octaves for extra shimmer.",
      "Long scale (24–26\") — the source of the sustain and the drone-heavy ring.",
      "Flat or lightly arched back — the Irish redesign; Greek bouzoukis have a bowl back and a different sound.",
    ],
    playing: [
      "GDAD tuning means the top and bottom are both D — strum open and you get a rich D-suspended drone.",
      "Play with a heavy pick, from the wrist, favouring the rhythm; the tune belongs to the fiddle or flute.",
      "Two-finger chord shapes are the norm. Leave strings open deliberately — the ambiguity is the point.",
    ],
    techniques: [
      "Drone chords — shapes that keep open D strings ringing under changing bass notes.",
      "Triplet strums — the rhythmic ornament that pushes a session tune forward.",
      "Counter-melody — playing a moving bass line against the tune rather than block chords.",
    ],
    tips: [
      "Resist full six-string-guitar chord thinking; the plainer the shape, the better it sits under a tune.",
      "GDAE (an octave below the mandolin) is the other common tuning if you want tunes rather than accompaniment.",
    ],
    care: "Long-scale instruments are tension-sensitive: check the neck seasonally and keep it humidified.",
    inApp: [
      "Tuned GDAD, with GDAE offered as an alternate in the tuner.",
      "Fretboard hints treat each course as one string, which is how you fret it.",
    ],
  },

  "cavaquinho": {
    family: "Plucked string (fretted)",
    tagline: "Brazil's tiny four-string engine — the sound driving samba and choro.",
    overview: "The cavaquinho is a small steel-strung four-string from Portugal, adopted and transformed in Brazil. Tuned D–G–B–D, it sounds brighter and sharper than a ukulele thanks to its steel strings, and its job in a samba group is rhythmic: fast, percussive chord stabs that lock with the pandeiro. It also carries melody in choro.",
    anatomy: [
      "Steel strings — the key difference from a ukulele, and the source of the cutting tone.",
      "Small body, about 14\" scale — the whole instrument is roughly ukulele-sized.",
      "Flat fingerboard with a slight radius, played with a pick or a shaped thumbnail.",
    ],
    playing: [
      "Standard Brazilian tuning is D–G–B–D. Portuguese players often use D–A–B–E instead; check which one your music assumes.",
      "The right hand does the work: short, tight, percussive strokes with a pick, muting between chords.",
      "In samba the cavaquinho plays the offbeats — the space between the strums matters as much as the strums.",
    ],
    techniques: [
      "Ritmo de samba — the syncopated stroke pattern that defines the style.",
      "Chord melody in choro — melody notes on top of moving chord shapes.",
      "Percussive muting — the fretting hand releases pressure to make a click instead of a chord.",
    ],
    tips: [
      "Ukulele players: the tuning is different and the strings are steel — expect firmer pressure and a new set of shapes.",
      "Practice with a metronome on beats 2 and 4 only; samba lives in the gaps.",
    ],
    care: "Steel strings on a small body means real tension — keep it cased, wipe strings, and change them when they dull.",
    inApp: [
      "Tuned D–G–B–D (Brazilian) with fretboard hints on all four strings.",
      "Its bright steel tone is easy for the pitch detector to track, even at fast tempos.",
    ],
  },

  "dulcimer": {
    family: "Plucked string (fretted)",
    range: "D3 – D6 (diatonic frets — chromatic notes need a 6½ fret)",
    tagline: "Three strings, a diatonic fretboard, and no wrong notes — the friendliest fretted instrument alive.",
    overview: "The Appalachian (mountain) dulcimer sits flat on your lap and has only three strings, usually tuned D–A–D. Its great trick is a diatonic fretboard: the frets give a major scale rather than every semitone, so almost anything you play in the key sounds right. Beginners can play a recognisable tune within minutes, which is why it has been a folk teaching instrument for two centuries.",
    anatomy: [
      "Hourglass or teardrop body — long, narrow, and played horizontally on the lap.",
      "Diatonic frets — spaced to a major scale; most modern dulcimers add a \"6½\" fret for extra flexibility.",
      "Three strings — melody, middle, and bass (some have a doubled melody string, making four).",
      "Noter — a short wooden dowel used to slide along the melody string in the traditional style.",
    ],
    playing: [
      "Lay it flat across your lap, tuning pegs to the left, and strum toward yourself with a pick or your fingers.",
      "Traditional style: fret only the melody string (with a noter), let the other two drone.",
      "Chord-melody style: fret across all three strings for full chords, more like a guitar.",
      "In D–A–D, the 3rd fret on the melody string is the tonic — count frets from there when reading dulcimer tab.",
    ],
    techniques: [
      "Noter-and-drone — the oldest style; melody on one string over a constant open drone.",
      "Flatpicking chord-melody — modern style using all three strings.",
      "Hammer-ons and pull-offs — easy on low-tension strings, and the main source of ornament.",
    ],
    tips: [
      "Because the frets are diatonic, improvising in the key is nearly foolproof — a genuinely great first instrument.",
      "Dulcimer music is written in its own tab numbered by fret, not standard notation; learn to read it early.",
      "Retune to D–A–A (Ionian) for older tune books that assume it.",
    ],
    care: "Very low tension and light build — keep it out of hot cars, wipe the strings, and it will last generations.",
    inApp: [
      "The tuner lists all three strings; alternate D–A–A and D–G–D tunings are in the dropdown.",
      "Fretboard hints assume chromatic fret spacing, so treat them as a guide to pitch rather than a literal fret count — your frets are diatonic.",
    ],
  },

  "fretless-bass": {
    family: "Plucked string (fretless)",
    range: "E1 – G4 (practical)",
    tagline: "The same bass with the frets taken out — every note is yours to find, and to bend.",
    overview: "A fretless bass has a smooth fingerboard: pitch is decided entirely by where your finger lands, exactly as on a double bass. You gain glissando, true vibrato, and the singing \"mwah\" that made Jaco Pastorius famous; you give up the guarantee that a note is in tune. It is the same instrument as a fretted bass in every other respect — tuning, strings, technique, role.",
    anatomy: [
      "Unfretted fingerboard — often with fret lines drawn on as a visual guide, sometimes with nothing at all.",
      "Flatwound or nylon-tape strings (commonly) — kinder to the wood and part of the classic sound.",
      "Epoxy-coated boards on some models, which let you use roundwounds without carving grooves into the fingerboard.",
    ],
    playing: [
      "Play directly over where the fret wire would be, not behind it — that is the single biggest adjustment from a fretted bass.",
      "Use your ears constantly. Practise long tones against a drone so intonation errors are obvious.",
      "Vibrato comes from rolling the finger along the string's length, not across it.",
      "Keep the fretting-hand thumb behind the neck as an anchor — consistent hand position is consistent intonation.",
    ],
    techniques: [
      "Glissando — sliding between notes with no step, the instrument's signature.",
      "Mwah — the growl from a low action letting the string brush the board slightly; part technique, part set-up.",
      "Harmonics — ring clearly here and are a favourite fretless texture.",
    ],
    tips: [
      "Start on a lined fretless. Purists sniff; your intonation will thank you.",
      "Record yourself. Fretless intonation errors are much easier to hear on playback than in the moment.",
    ],
    care: "Roundwound strings will wear grooves in an uncoated fingerboard over time — either accept it, use flatwounds, or get the board coated.",
    inApp: [
      "The pitch grader is the perfect fretless practice partner: it scores exactly how many cents off you landed.",
      "Fingering hints are switched off — there are no frets to point at. Use the tuner and your ears.",
    ],
  },

  "oud": {
    family: "Plucked string (fretless)",
    range: "C2 – C5 (practical)",
    tagline: "The fretless ancestor of the lute — the central instrument of Arabic, Turkish, and Persian music.",
    overview: "The oud is a short-necked, fretless, pear-bodied lute with eleven or thirteen strings in courses. Having no frets is not a limitation but a requirement: the maqam system it serves uses intervals — notably the three-quarter-tone — that simply do not exist on a fretted instrument. Its deep, woody voice has anchored music from Morocco to Iran for over a thousand years.",
    anatomy: [
      "Bowl back — dozens of thin wooden ribs glued into a deep rounded body; extremely light.",
      "Fretless neck — short and wide, allowing microtonal placement anywhere along the string.",
      "Decorative sound holes (rosettes) — usually one large and two small, intricately carved.",
      "Risha — the plectrum, traditionally an eagle feather quill, now usually plastic; long and flexible.",
    ],
    playing: [
      "Tunings vary by region; Arabic oud is commonly C–F–A–D–G–C from low to high, with the lowest string single.",
      "Hold the risha between thumb and index, and play with a loose wrist — the stroke is a sweep, not a stab.",
      "Alternate down and up strokes for runs; the tremolo on a single note is a core sound.",
      "Learn a maqam (Rast, Bayati, Hijaz) as a phrase vocabulary, not just as a scale — each has expected movement.",
    ],
    techniques: [
      "Taqsim — improvised solo exposition of a maqam; the heart of oud playing.",
      "Tremolo — rapid alternating strokes to sustain a melody note.",
      "Quarter-tone inflection — placing notes deliberately between the piano's keys, the sound of the tradition.",
    ],
    tips: [
      "Do not judge your intonation by a chromatic tuner alone; much of this music lives between the notes on purpose.",
      "The bowl is fragile and light. Treat it more like a violin than a guitar.",
    ],
    care: "Extremely humidity-sensitive — a cracked rib is a repair-shop job. Keep it cased and stable, and never leave it in a car.",
    inApp: [
      "The tuner covers the six main courses (C–F–A–D–G–C); tune each course's pair to the same note.",
      "GuitarPicker grades in equal temperament, so it will mark true quarter-tones as out of tune — use it for tuning and for Western-scale practice, not for judging maqam intonation.",
    ],
  },

  "viola": {
    family: "Bowed string",
    range: "C3 – A6 (practical)",
    tagline: "A fifth below the violin, and the inner voice that makes string writing sound whole.",
    overview: "The viola is slightly larger than a violin and tuned a fifth lower to C–G–D–A, giving it a darker, reedier voice. It reads alto clef — the one clef most musicians never learn — which is part of why violists are always in demand. In a string quartet it supplies the harmonic middle; without it the texture hollows out.",
    anatomy: [
      "Larger body — 15–16.5\" typically, sized to the player's arm rather than to a standard.",
      "Four strings, C–G–D–A — the same fifths pattern as the violin, moved down.",
      "Bow — heavier and slightly shorter than a violin bow, to drive the thicker strings.",
      "Chin rest and shoulder rest — the instrument is held by the jaw, not the hand.",
    ],
    playing: [
      "Hold it as a violin: on the collarbone, supported by the jaw, left hand free to move along the neck.",
      "Bow between bridge and fingerboard, parallel to the bridge, with weight from the arm rather than grip from the fingers.",
      "Thicker strings need more bow weight and a slightly slower stroke than a violin — pressing faster makes it choke.",
      "Learn alto clef from the start rather than transposing in your head; middle C sits on the centre line.",
    ],
    techniques: [
      "Détaché, legato, staccato — the basic bow strokes that shape every phrase.",
      "Vibrato — an oscillation from the wrist or arm; slower and wider than a violinist's suits the instrument.",
      "Double stops — two strings at once, natural in fifths tuning.",
      "Shifting — moving the left hand into higher positions to reach beyond first position.",
    ],
    tips: [
      "Size matters: play the largest instrument you can comfortably reach, and no larger. Injury lives at the other end of that scale.",
      "Tune with fine adjusters on the tailpiece — pegs alone are far too coarse for fifths.",
      "Rosin the bow, but sparingly; a bow that has never been rosined makes no sound at all.",
    ],
    care: "Wipe rosin dust off the top and strings after every session — left alone it welds to the varnish. Loosen the bow hair when you put it away.",
    inApp: [
      "The tuner covers C–G–D–A; use it with the fine adjusters, not the pegs.",
      "No fingering hints — there are no frets. The pitch grader in cents is the honest feedback for intonation practice.",
      "Shares its tuning with the mandola and tenor banjo, so their music reads across directly.",
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

  "erhu": {
    family: "Bowed string",
    range: "D4 – D7 (practical)",
    tagline: "Two strings, no fingerboard, and a voice that sounds uncannily like singing.",
    overview: "The erhu is a Chinese two-string fiddle with a small resonating body covered in python skin (or a synthetic substitute), and no fingerboard at all — the strings float in the air and you stop them by pressing them against nothing but each other's tension. The bow hair passes between the two strings and is permanently attached to the instrument. Its expressive, vocal quality makes it one of the most recognisable sounds in the world.",
    anatomy: [
      "Sound box — small hexagonal or octagonal resonator with a skin membrane at the front.",
      "Two strings, tuned D4 and A4, a fifth apart.",
      "No fingerboard — fingers press the strings in mid-air, which is why intonation is entirely by ear and muscle memory.",
      "Bow threaded between the strings — you cannot remove it without unstringing the instrument.",
      "Qianjin — a loop of string near the top that acts as the nut, setting the vibrating length.",
    ],
    playing: [
      "Sit with the sound box on your left thigh, neck vertical, and the skin facing forward.",
      "Bow horizontally: pushing outward sounds the outer string, pulling inward sounds the inner one.",
      "Left-hand fingers press the string sideways against nothing — there is no board to stop against, so pressure controls pitch as much as position does.",
      "Learn the first position thoroughly before shifting; with no frets or board, position is pure memory.",
    ],
    techniques: [
      "Huayin (sliding tones) — the portamento between notes that gives the erhu its vocal character.",
      "Rouxian — a vibrato produced by rocking the finger and varying pressure.",
      "Bow tremolo and staccato — the articulation vocabulary for faster passages.",
    ],
    tips: [
      "Because there is no fingerboard, intonation drifts with hand fatigue. Short, frequent practice beats long sessions.",
      "The skin is affected by humidity — the tone genuinely changes with the weather, and that is normal.",
    ],
    care: "Loosen nothing (the bow stays threaded), keep the skin away from damp and direct heat, and store it in its case flat.",
    inApp: [
      "The tuner covers both strings, D4 and A4.",
      "Cents-level pitch feedback is especially useful on an instrument with no fingerboard to reference.",
    ],
  },

  "electric-piano": {
    family: "Keyboard",
    range: "E1 – E7 (73-key Rhodes); models vary",
    tagline: "Tines and reeds struck by hammers — the bell-like keyboard of soul, jazz, and seventies pop.",
    overview: "Electric pianos like the Fender Rhodes and Wurlitzer are mechanical instruments, not synthesizers: hammers strike metal tines or reeds, and a pickup turns their vibration into a signal. The result is a bell-like, slightly compressed tone that gets grittier the harder you play, which is why it sits so well in soul, jazz, and gospel. Modern digital versions model this behaviour closely.",
    anatomy: [
      "Keys and hammers — the same escapement idea as an acoustic piano, in a smaller mechanism.",
      "Tines or reeds — a Rhodes strikes tines with tonebars; a Wurlitzer strikes flat reeds. Different instruments, different tone.",
      "Pickups — electromagnetic, one per note, which is why the instrument needs an amp.",
      "Sustain pedal — same job as on an acoustic piano.",
    ],
    playing: [
      "Touch is everything: velocity changes the timbre, not just the volume. Play softly for a bell, hard for a bark.",
      "Voicing matters — spread chords out and leave space in the low register, which turns muddy quickly.",
      "The classic sound is a Rhodes through a little amp overdrive and a stereo tremolo.",
    ],
    techniques: [
      "Comping — rhythmic chord punctuation behind a soloist, the primary jazz keyboard role.",
      "Rootless voicings — leaving the root to the bass and playing the colour tones; the standard jazz approach.",
      "Bark and bell dynamics — deliberately using velocity as a tone control.",
    ],
    tips: [
      "If you play piano, everything transfers. Adjust for the shorter, lighter key action.",
      "Beware low-register clusters: what sounds full on an acoustic piano turns to mud on an electric.",
    ],
    care: "Real Rhodes and Wurlitzers need periodic tine/reed regulation and voicing — treat them as instruments needing a technician, not as furniture.",
    inApp: [
      "Play through a speaker so the mic can hear it; the pitch detector tracks it cleanly.",
      "Piano songs and drills apply unchanged — it is the same keyboard layout.",
    ],
  },

  "organ": {
    family: "Keyboard",
    range: "C2 – C7 (61-key manual)",
    tagline: "Sustained, unchanging tone and drawbars instead of dynamics — a keyboard that behaves like a wind instrument.",
    overview: "An organ note does not decay: hold a key and the sound continues at full strength until you let go. That single fact changes everything about how you play one. Hammond-style electric organs shape tone with drawbars (mixing harmonics like an additive synthesizer) and add a rotating Leslie speaker for movement; pipe organs do the same job with ranks of physical pipes and stops.",
    anatomy: [
      "Manuals — one or more keyboards, often two on a Hammond, played simultaneously with different registrations.",
      "Drawbars or stops — the tone controls; each one adds a harmonic at a chosen strength.",
      "Expression pedal — controls volume with the foot, since key velocity does nothing.",
      "Pedalboard — bass notes played with the feet on larger instruments.",
      "Leslie speaker — a rotating horn producing the characteristic swirling chorus.",
    ],
    playing: [
      "Velocity does nothing. Dynamics come from the expression pedal and from registration — this is the hardest adjustment for pianists.",
      "Articulation replaces dynamics: because notes do not decay, phrasing is created by exactly when you release them.",
      "Legato fingering (substituting fingers on a held key) lets lines connect without a gap.",
      "Learn a few drawbar registrations by heart — 888000000 for a fat gospel sound, 800000888 for a bright jazz tone.",
    ],
    techniques: [
      "Drawbar registration — building a tone from harmonics rather than choosing a preset.",
      "Leslie speed changes — flipping between chorale and tremolo is itself a musical gesture.",
      "Percussion and key click — the Hammond's transient character, part of the instrument's identity.",
      "Palm smears and glissandi — the gospel and rock vocabulary.",
    ],
    tips: [
      "If you come from piano, practise releasing notes deliberately. Sloppy releases are inaudible on a piano and glaring on an organ.",
      "Keep your left hand out of the low register in a full band — the bass player owns it.",
    ],
    care: "Digital organs need nothing. Vintage tonewheel Hammonds need oiling on a schedule — genuinely, they have oil cups.",
    inApp: [
      "Sustained organ notes are the easiest thing in the world for the pitch grader to track — expect high accuracy scores.",
      "Piano songs work unchanged, though they will sound very different without decay.",
    ],
  },

  "synth": {
    family: "Keyboard",
    range: "C2 – C6 (49-key); octave shift and patch move it",
    tagline: "A keyboard that can be any sound — including sounds no acoustic instrument can make.",
    overview: "A synthesizer generates sound electronically rather than mechanically. The classic subtractive design starts with harmonically rich oscillators, carves them with a filter, and shapes the result over time with envelopes and LFOs. Understanding those four blocks gets you most of the way to programming any synth ever made, hardware or software.",
    anatomy: [
      "Oscillators — the raw waveform (saw, square, triangle, sine) and the starting harmonic content.",
      "Filter — usually low-pass; the cutoff and resonance controls are the most expressive knobs on the instrument.",
      "Envelopes (ADSR) — attack, decay, sustain, release; how a sound evolves from keypress to release.",
      "LFO — a slow oscillator used to modulate pitch (vibrato), filter (wobble), or volume (tremolo).",
      "Pitch and mod wheels — real-time expression, the closest a synth gets to a bow.",
    ],
    playing: [
      "Learn the four blocks by ear: set a saw wave, then sweep the filter cutoff and listen to what each control actually does.",
      "Short attack for percussive sounds, long attack for pads — the envelope decides the instrument's character more than the waveform does.",
      "Use the mod wheel; a static synth line sounds like a demo, a modulated one sounds played.",
      "Monophonic lead patches with portamento demand different phrasing than polyphonic pads — treat them as different instruments.",
    ],
    techniques: [
      "Subtractive programming — start bright, filter down to taste.",
      "Filter sweeps — automating cutoff across a phrase, the fundamental synth gesture.",
      "Portamento/glide — sliding between notes on a mono patch.",
      "Layering — stacking two patches (e.g. a bright pluck over a soft pad) for a composite instrument.",
    ],
    tips: [
      "Program your own patch from scratch once a week. Preset-only players never learn the instrument.",
      "If a bassline sounds weak, it is usually the envelope, not the volume.",
    ],
    care: "Nothing mechanical to maintain; keep dust out of the faders and don't spill anything into it.",
    inApp: [
      "Use a clean, sustained patch when practising with the grader — heavy detune, chorus, or noise makes pitch detection unreliable.",
      "Sawtooth or square with minimal effects tracks best; pads with slow attack may not register in time.",
    ],
  },

  "accordion": {
    family: "Keyboard (free reed)",
    range: "F3 – A6 (41-key piano treble); bass side adds below",
    tagline: "A portable orchestra: melody in one hand, chords and bass in the other, powered by your arms.",
    overview: "The accordion sounds by pulling air past free reeds with a bellows, so volume comes entirely from your arms — it is a genuinely dynamic instrument, unlike most keyboards. The right hand plays melody on piano keys or buttons; the left hand plays bass notes and pre-formed chords via the Stradella button system. One player covers a whole band's worth of parts, which is why it anchors folk music from Paris to Buenos Aires to Texas.",
    anatomy: [
      "Bellows — the lungs; opening and closing both produce sound, and the pressure controls volume.",
      "Treble (right) side — piano keys or a chromatic button array.",
      "Bass (left) side — Stradella buttons: two rows of bass notes and four rows of ready-made major, minor, seventh, and diminished chords.",
      "Reed blocks — banks of free reeds; registers/couplers switch between them to change the tone.",
      "Shoulder straps and bass strap — the instrument is worn, and the left hand slides under a strap to work the bellows.",
    ],
    playing: [
      "Sit with the instrument's weight on your left thigh and the straps taking the rest; the bellows open down and to the left.",
      "Bellows direction is not a note change on a piano accordion — push and pull sound the same (unlike a diatonic button accordion).",
      "Dynamics come from bellows pressure alone. Practise a long, even note and watch how hard that actually is.",
      "On the Stradella bass, the counter-bass row and chord rows are laid out in fifths — learn the circle of fifths and the layout is already familiar.",
    ],
    techniques: [
      "Bellows shake — rapid direction changes for a percussive tremolo effect.",
      "Oom-pah — alternating bass note and chord in the left hand, the fundamental accompaniment pattern.",
      "Register changes — switching reed banks mid-piece for orchestral contrast.",
      "Air button — releases the bellows silently so you can reset without making a sound.",
    ],
    tips: [
      "Practise the left hand alone, without looking. You cannot see the bass buttons while playing, ever.",
      "Plan your bellows direction like a wind player plans breaths — running out mid-phrase is the classic beginner problem.",
    ],
    care: "Store it upright, never flat on the bellows. Reeds are tuned by a specialist; keep it dry, as leather reed valves warp with damp.",
    inApp: [
      "The pitch grader tracks the treble side well; play melody lines rather than full chords when practising with it.",
      "Its steady, sustained tone gives very stable readings — good for interval and ear training.",
    ],
  },

  "recorder-alto": {
    family: "Woodwind (fipple flute)",
    range: "F4 – G6",
    tagline: "The grown-up recorder: a fifth below the soprano, and the one with the real repertoire.",
    overview: "The alto (treble) recorder in F is the serious member of the family — the instrument Handel, Telemann, and Bach actually wrote for. It is larger and lower than the school soprano, with a rounder tone and enough breath demand to reward good control. Fingerings are the same shapes as a soprano's but produce different note names, which is the one real hurdle when switching.",
    anatomy: [
      "Three joints — head, body, and foot; the foot joint rotates to suit your little finger.",
      "Fipple (windway and labium) — the built-in whistle mechanism; you do not form an embouchure.",
      "Seven finger holes plus a thumb hole — the thumb hole doubles as the octave vent.",
      "Double holes on the lower fingers, for semitones.",
    ],
    playing: [
      "Warm the head joint in your hands first — condensation in a cold windway makes it choke and gurgle.",
      "Blow gently and steadily. The recorder needs far less air pressure than any other wind instrument; over-blowing sharpens it badly.",
      "Seal the holes with the fleshy pads of the fingers, not the tips. Any leak means a squeak.",
      "Pinch the thumb hole to a narrow crescent to reach the second octave — this is the technique that unlocks the instrument.",
      "In F, all fingers down is F4; the soprano's same shape gives C5. Learn the notes fresh rather than transposing.",
    ],
    techniques: [
      "Tonguing — \"du\" or \"tu\" to start each note cleanly; double-tonguing (\"du-gu\") for fast passages.",
      "Thumbing — the pinched thumb hole for the upper register.",
      "Alternate (fork) fingerings — for tuning adjustments and for trills.",
      "Vibrato — breath vibrato from the diaphragm, used sparingly in Baroque style.",
    ],
    tips: [
      "A wooden alto sounds better but needs breaking in gradually — an hour a day at first, no more.",
      "If notes gurgle, it is moisture. Cover the window and blow sharply through the instrument to clear it.",
      "Baroque and German fingering systems differ. Buy Baroque; it is the standard.",
    ],
    care: "Swab the bore after every session. Wooden recorders need occasional bore oiling and hate sudden temperature changes.",
    inApp: [
      "Pick the alto (not soprano) here so the guide's fingering advice and range match your instrument.",
      "The recorder's pure, harmonic-poor tone is the easiest thing in the app for the pitch detector to read.",
    ],
  },

  "ocarina": {
    family: "Woodwind (vessel flute)",
    range: "A4 – F6 (12-hole alto C)",
    tagline: "A clay egg with holes that plays a full scale — pocket-sized, cheap, and instantly playable.",
    overview: "An ocarina is a closed vessel flute: unlike a tube, the whole enclosed volume resonates, so pitch depends on the total open hole area rather than on where the holes are. That means the finger holes can be any size in any position, and it is why ocarina fingering charts look chaotic compared to a recorder's. The 12-hole alto C is the standard modern instrument.",
    anatomy: [
      "Vessel body — usually ceramic; the whole chamber is the resonator.",
      "Mouthpiece with fipple — like a recorder, no embouchure needed.",
      "Ten finger holes plus two thumb holes — different sizes, deliberately.",
    ],
    playing: [
      "All holes covered gives the lowest note; uncover progressively for the scale. Hole size, not position, sets each step.",
      "Breath pressure controls pitch far more than on a recorder — blow harder for high notes, gentler for low ones, or it plays flat.",
      "Cover holes completely with the finger pads; a partial cover bends the note, which is useful once deliberate.",
      "Ceramic instruments are brittle. Use a neck strap.",
    ],
    techniques: [
      "Breath dynamics — deliberately shading pitch with air pressure, both a hazard and an expressive tool.",
      "Half-holing — partially uncovering a hole for semitones the fingering chart does not provide.",
      "Vibrato — breath pulses from the diaphragm.",
    ],
    tips: [
      "The single biggest beginner problem is playing flat in the upper register. Push more air as you go up.",
      "Buy a tuned instrument from a real maker; decorative tourist ocarinas are often not in tune with themselves.",
    ],
    care: "It is pottery — it survives water but not floors. Rinse and dry occasionally, and keep it in a padded case.",
    inApp: [
      "The pitch grader is genuinely helpful here because breath pressure changes pitch so much — you can see your air control.",
      "Its clean, flute-like tone tracks reliably even quite quietly.",
    ],
  },

  "pan-flute": {
    family: "Woodwind (edge-blown)",
    range: "G3 – C6 (20-pipe)",
    tagline: "One pipe per note, no holes to cover, no fingerings to learn — just aim and blow.",
    overview: "A pan flute is a raft of stopped pipes of different lengths. There are no finger holes at all: you slide the instrument along your lower lip and blow across the top of whichever pipe you need. That makes it conceptually the simplest wind instrument there is and physically one of the most demanding, because every single note is a fresh act of aim and embouchure.",
    anatomy: [
      "Pipes — usually bamboo, stopped at the bottom with cork or wax; length sets pitch, and the wax is how it is tuned.",
      "Curved or straight raft — curved rafts are easier to reach across.",
      "Binding — the cord or bands holding the raft together.",
    ],
    playing: [
      "Rest the pipes on your lower lip and blow across the far edge — like blowing across a bottle top, not into it.",
      "Move the instrument with your hands, not your head. The lips stay put and the flute slides.",
      "Tilt the raft slightly toward you to sharpen a note, away to flatten it — this is your intonation control.",
      "Expect the first sessions to produce more air than tone. Getting a clear note reliably is the whole beginner curriculum.",
    ],
    techniques: [
      "Portamento — sliding between adjacent pipes with the breath still flowing, the instrument's signature sound.",
      "Tilting for semitones — notes outside the diatonic scale come from tilting the pipe, not from extra pipes.",
      "Vibrato — from the diaphragm, heavily used in Romanian nai playing.",
    ],
    tips: [
      "Tune the room, not the flute: pan flutes are sensitive to temperature, and pitch rises noticeably as they warm.",
      "Practise scales slowly with a tuner. Aim is the entire technique.",
    ],
    care: "Bamboo cracks if it dries out. Keep it out of direct sun, and re-wax the pipe stops if it drifts out of tune.",
    inApp: [
      "The tuner and the play-along grader both give you exactly the feedback this instrument needs: am I hitting the pitch centre?",
      "Because notes are separate pipes, timing across leaps is the hard part — the note highway shows you the gaps.",
    ],
  },

  "piccolo": {
    family: "Woodwind (transverse flute)",
    range: "D5 – C8",
    tagline: "Half a flute, an octave up, and audible over an entire orchestra.",
    overview: "The piccolo is a flute at half length, sounding an octave higher than written. Its top register can cut through a full orchestra and a marching band alike, which is its purpose — and its danger, because at that pitch every intonation error is brutally exposed. It uses the same fingerings as the flute, so for a flautist it is a doubling instrument, not a new one.",
    anatomy: [
      "Two joints only — head and body; there is no foot joint.",
      "Conical or cylindrical bore — wooden piccolos are conical and mellower, metal ones cylindrical and brighter.",
      "Smaller embouchure hole — the reason it needs a much more focused airstream than a flute.",
    ],
    playing: [
      "Fingerings are identical to the flute; the embouchure is not. Aim for a smaller, faster, more focused airstream.",
      "Use less air than you expect, but at higher pressure — beginners typically overblow and go sharp.",
      "It sounds an octave above what is written; the part on your stand is not the pitch coming out.",
      "Play in short sessions at first. It is fatiguing for your lips and for everyone else's ears.",
    ],
    techniques: [
      "Focused embouchure control — the whole game, especially above the staff.",
      "Double and triple tonguing — piccolo parts are frequently fast and articulate.",
      "Dynamic control in the high register — playing quietly up top is the mark of a real player.",
    ],
    tips: [
      "Wooden piccolos are standard in orchestras, metal in marching bands. That is a genuine tonal difference, not snobbery.",
      "Tune warm. A cold piccolo is flat and will not settle until you have played it for a few minutes.",
    ],
    care: "Swab after playing. Wooden piccolos crack if played cold or dried out — warm the headjoint in your hands first, always.",
    inApp: [
      "Pitch detection works up here, but stand back from the mic; a piccolo close-up will clip the input and read erratically.",
      "The app grades sounding pitch, so a written C6 will register as C7. Transpose parts up an octave in the Song Editor to match what you read.",
    ],
  },

  "clarinet": {
    family: "Woodwind (single reed)",
    range: "D3 – B♭6 (sounding; a B♭ instrument)",
    tagline: "The widest range in the woodwind family, and the one that overblows at the twelfth.",
    overview: "The clarinet's cylindrical bore makes it behave like a stopped pipe: it produces only odd harmonics, so it overblows a twelfth rather than an octave. That single acoustic fact explains its huge range, its distinctive hollow low register, and why its fingering system is more complicated than a flute's. It is a B♭ instrument, so written C sounds B♭.",
    anatomy: [
      "Mouthpiece, reed, and ligature — a single cane reed clamped against the mouthpiece; the reed is a consumable.",
      "Barrel — the short joint below the mouthpiece; pulling it out slightly flattens the whole instrument for tuning.",
      "Upper and lower joints — the main body with the key work.",
      "Register key — the thumb key that jumps you up a twelfth, not an octave.",
      "Bell — affects the lowest notes only.",
    ],
    playing: [
      "Embouchure: lower lip cushioned over the bottom teeth, top teeth on the mouthpiece, corners firm — think of the word \"ee\".",
      "Take in about a centimetre of mouthpiece and blow a steady, supported air stream from the diaphragm.",
      "The chalumeau (low) register is the easy one. Crossing the break into the clarion register is the classic beginner wall — practise slurring B♮ to C repeatedly.",
      "Reeds: strength 2 to 2.5 to start. A reed that is too hard makes the instrument feel impossible.",
    ],
    techniques: [
      "Crossing the break — the fingering leap from A/B♭ to B♮; smooth it and the instrument opens up.",
      "Legato and staccato tonguing — the tip of the tongue lightly touching the reed tip.",
      "Glissando — the famous Rhapsody in Blue smear, made by sliding fingers off tone holes while relaxing the embouchure.",
      "Altissimo — the third register, reached with the register key plus alternate fingerings.",
    ],
    tips: [
      "Rotate three or four reeds rather than playing one to death; they last far longer and play more consistently.",
      "Squeaks are almost always embouchure or a leaky finger, not the instrument.",
      "Swab the bore every single time. Moisture is what cracks wooden clarinets.",
    ],
    care: "Swab after playing, grease corks occasionally, and have the pads checked yearly. Wooden instruments need gentle break-in and stable humidity.",
    inApp: [
      "Ranges here are sounding pitch — the mic hears B♭ when you finger C. Transpose written parts down two semitones in the Song Editor, or just play what the highway shows.",
      "The clarinet's strong fundamental makes it very reliable for the pitch grader across its whole range.",
    ],
  },

  "alto-sax": {
    family: "Woodwind (single reed)",
    range: "D♭3 – A♭5 (sounding; an E♭ instrument)",
    tagline: "The most popular saxophone: loud, expressive, and quick to a first tune.",
    overview: "The alto saxophone is a conical-bore single-reed instrument made of brass — acoustically a woodwind, physically a horn. Its conical bore means it overblows at the octave, so the fingering system is far more regular than a clarinet's, and beginners get a scale much faster. It is the standard school saxophone and the lead voice in most saxophone writing.",
    anatomy: [
      "Mouthpiece, reed, ligature — as a clarinet, but larger and with a wider tip opening.",
      "Conical brass body with a curved neck (crook) and a flared bell.",
      "Octave key — the thumb key that jumps the register by an octave.",
      "Neck strap or harness — the instrument hangs from your neck; it is heavy enough to matter.",
    ],
    playing: [
      "Embouchure is looser than a clarinet's: lower lip over the teeth, but with a relaxed, \"oh\"-shaped oral cavity.",
      "Support from the diaphragm and keep the throat open. A pinched throat gives a thin, squeezed tone.",
      "Adjust the neck strap so the mouthpiece comes to you — never bend your neck down to the instrument.",
      "Fingering is largely one-key-per-note down the instrument, which is why the first octave comes quickly.",
    ],
    techniques: [
      "Vibrato — a jaw motion, not a breath one; typically added toward the end of a long note.",
      "Growling — humming while playing, the raspy R&B effect.",
      "Altissimo — notes above the written high F, produced with overtone fingerings and embouchure control.",
      "Subtone — a breathy, soft low register, the ballad sound.",
    ],
    tips: [
      "Long tones every day. Saxophone tone is 90% air support and embouchure, and both are built by long tones.",
      "A mouthpiece upgrade transforms a cheap saxophone more than a new saxophone does.",
      "It is an E♭ instrument: written C sounds E♭. Concert-pitch music must be transposed up a major sixth to read.",
    ],
    care: "Swab after playing, remove the reed and let it dry, and get the pads checked annually. Never leave a reed on the mouthpiece.",
    inApp: [
      "Ranges and note targets are sounding pitch — the app hears what leaves the bell, not what is on your page.",
      "A saxophone's rich harmonics are still tracked reliably; play into the mic from a metre or so away to avoid overload.",
    ],
  },

  "tenor-sax": {
    family: "Woodwind (single reed)",
    range: "A♭2 – E♭5 (sounding; a B♭ instrument)",
    tagline: "The saxophone with the big voice — jazz's lead instrument and rock's most recognisable solo horn.",
    overview: "The tenor saxophone is pitched a fourth below the alto, in B♭, with a larger body and a broader, warmer tone. It is the classic jazz voice — Coltrane, Rollins, Getz — and the horn on most rock and soul records. Fingering is identical to the alto, so switching between them costs nothing but a change of transposition and a slightly bigger air supply.",
    anatomy: [
      "Larger conical body with a distinctive bent neck.",
      "Bigger mouthpiece and reed than an alto's — and a correspondingly larger air requirement.",
      "Octave key, palm keys, and spatula keys — the same layout as the alto, scaled up.",
    ],
    playing: [
      "The fingerings are the alto's exactly; only the transposition and the physical size change.",
      "Bigger horn, more air: expect to breathe more deeply and more often than on alto.",
      "A slightly more open embouchure than alto suits the tenor's broader tone.",
      "As a B♭ instrument, written C sounds B♭ — concert music transposes up a major second.",
    ],
    techniques: [
      "Subtone — the breathy, intimate low register that defines tenor ballad playing.",
      "Growl and overtone screaming — the R&B and rock vocabulary.",
      "Altissimo — the extended upper register above written F.",
      "Bending and scooping into notes, borrowed straight from the blues.",
    ],
    tips: [
      "If you double on alto, practise both regularly. The embouchure difference is subtle and easy to lose.",
      "Reed strength around 2.5 is a good starting point; go softer if the low notes will not speak.",
    ],
    care: "Identical to alto: swab, dry the reed, service the pads. The larger body means more moisture, so swabbing matters more.",
    inApp: [
      "Sounding pitch again — a written C reads as B♭ on the note highway.",
      "The lower range sits comfortably in the pitch detector's sweet spot; expect very stable tracking.",
    ],
  },

  "trumpet": {
    family: "Brass",
    range: "E3 – C6 (sounding; a B♭ instrument)",
    tagline: "Three valves and your lips — the brightest, most direct voice in the brass family.",
    overview: "On a trumpet, your lips are the sound source: they buzz into a cup mouthpiece and the tube amplifies and shapes the result. The three valves only redirect air through extra tubing, changing the harmonic series you are playing on. That means the same fingering produces many notes, and which one you get is decided entirely by your embouchure — the reason trumpet is hard early and rewarding later.",
    anatomy: [
      "Mouthpiece — a cup and a throat; size and depth change tone and endurance significantly.",
      "Three valves — lowering pitch by 2, 1, and 3 semitones respectively, combinable.",
      "Leadpipe and bell — the taper and flare that make a trumpet sound like a trumpet.",
      "Tuning slide and valve slides — main tuning plus per-valve correction for intonation.",
      "Water key (\"spit valve\") — for condensation, which is mostly what it is.",
    ],
    playing: [
      "Buzz your lips alone first, then on the mouthpiece alone, before adding the instrument. This is the foundation.",
      "Keep the corners of the mouth firm and the centre relaxed; press the mouthpiece lightly — pressure is the enemy of endurance.",
      "The same fingering plays a whole harmonic series; you select the note with lip tension and air speed.",
      "Practise in short bursts with rests. Lips are muscle, and they fatigue like muscle.",
    ],
    techniques: [
      "Lip slurs — moving between harmonics without changing valves; the core flexibility exercise.",
      "Single, double, and triple tonguing — \"tu\", \"tu-ku\", \"tu-tu-ku\" for fast passages.",
      "Mutes — straight, cup, harmon, plunger; each is a different instrument in effect.",
      "Half-valve and shakes — the jazz colour vocabulary.",
    ],
    tips: [
      "Endurance builds slowly and disappears fast. Daily short practice beats twice-weekly marathons decisively.",
      "If your tone is thin, check that you are not simply pressing harder to reach high notes.",
      "It is a B♭ instrument: written C sounds B♭.",
    ],
    care: "Oil the valves every few days, grease the slides monthly, and give it a bath a few times a year. Dried valve oil is the usual cause of sticking valves.",
    inApp: [
      "Note targets are sounding pitch, so a written C plays as B♭ on the highway.",
      "Trumpet is loud — stand well back from the mic, or the input will clip and pitch readings will jump.",
    ],
  },

  "trombone": {
    family: "Brass",
    range: "E2 – B♭4 (tenor; concert pitch)",
    tagline: "No valves, no frets, no keys — a slide, your ear, and infinite pitches in between.",
    overview: "The trombone changes pitch with a telescoping slide instead of valves, which makes it the only brass instrument with genuinely continuous pitch. There are seven nominal slide positions, but they are targets rather than stops — nothing clicks into place. That is why trombonists have famously good ears, and why the instrument can glissando like no other brass.",
    anatomy: [
      "Slide — the outer and inner tubes; its smoothness is the instrument's playability.",
      "Seven positions — each one semitone lower than the last, first position being the slide fully in.",
      "Bell section and tuning slide.",
      "F attachment (on many tenors) — a valve-operated extra length that fills the gap in the low range.",
    ],
    playing: [
      "Buzz the lips as on any brass instrument; the mouthpiece is larger and the buzz lower and looser than a trumpet's.",
      "Move the slide with the wrist and forearm, fast and decisively — a slow slide between notes is an audible smear.",
      "Positions are approximate. Adjust by ear constantly, especially in the upper register where they compress.",
      "Learn positions with a tuner initially, then trust your ear — the instrument demands it.",
    ],
    techniques: [
      "Glissando — the trombone's party trick, and only possible between notes within one harmonic series.",
      "Legato tonguing — a soft \"doo\" to connect notes without a slur break, since true slurs need the slide to move silently.",
      "Lip slurs — moving between harmonics in a fixed position.",
      "Plunger and mute work — the classic big-band wah.",
    ],
    tips: [
      "Read in concert pitch from bass clef — unlike most brass, tenor trombone is non-transposing.",
      "Keep the slide immaculate. A sticky slide makes the instrument unplayable, and it is nearly always dirt, not damage.",
      "Watch out for people. The slide reaches a long way in seventh position.",
    ],
    care: "Clean and lubricate the slide weekly with slide cream and a water spray. Never let the slide get dented — a bent slide is a workshop job.",
    inApp: [
      "Continuous pitch makes the cents readout genuinely useful: it shows exactly how far off a position you are landing.",
      "Non-transposing, so concert-pitch songs in the library match what you read without adjustment.",
    ],
  },

  "french-horn": {
    family: "Brass",
    range: "B1 – F5 (sounding; an F instrument)",
    tagline: "Twelve feet of coiled tubing and a hand in the bell — the warmest and least forgiving brass instrument.",
    overview: "The horn has about twice the tubing of a trumpet wound into a circle, a deep funnel mouthpiece, and a right hand placed inside the bell that adjusts both tone and pitch. Its harmonics sit very close together in the playing range, so neighbouring notes share fingerings and are separated only by the embouchure — which is exactly why it has a reputation for difficulty and for cracked notes even among professionals.",
    anatomy: [
      "Coiled tubing — around 12 feet on an F horn, 9 on a B♭ side.",
      "Rotary valves — operated by the left hand, unlike the piston valves of most brass.",
      "Funnel mouthpiece — deeper and narrower than a trumpet's, giving the mellow tone.",
      "Bell and right hand — the hand's position inside the bell shades the tone and can lower pitch (stopping).",
      "Double horn thumb trigger — switches between the F and B♭ sides for security in the upper range.",
    ],
    playing: [
      "Sit with the bell resting on your right thigh (or off the leg for a more open sound), right hand cupped inside the bell.",
      "The mouthpiece placement is roughly two-thirds upper lip, one-third lower — higher than other brass.",
      "Because harmonics are close together, hearing the note before you play it is not optional; sing it, then play it.",
      "Use the B♭ side above about written G for security.",
    ],
    techniques: [
      "Hand stopping — pushing the hand fully into the bell for a muted, buzzy tone (and a semitone pitch shift).",
      "Lip trills — the horn's characteristic ornament, oscillating between adjacent harmonics.",
      "Wide legato leaps — the horn's most idiomatic writing, and the hardest to make secure.",
    ],
    tips: [
      "Sing your part before playing it. On the horn this is technique, not a warm-up nicety.",
      "As an F instrument, written C sounds F — a perfect fifth down.",
      "Missed notes happen to everyone on this instrument. Keep going; stopping to fix them is the real error.",
    ],
    care: "Rotary valves need proper rotor oil at the bearings and the spindles. Flush the horn a few times a year and keep the slides greased.",
    inApp: [
      "The app grades sounding pitch, a fifth below what you read.",
      "The horn's mellow tone has a weak fundamental in places — play toward the mic and expect the tuner to prefer the mid range.",
    ],
  },

  "tuba": {
    family: "Brass",
    range: "D1 – F4 (BB♭)",
    tagline: "The foundation the whole band stands on — the lowest and largest voice in the brass family.",
    overview: "The tuba is the bass of the brass family, with up to eighteen feet of tubing and a mouthpiece you could drink from. It takes enormous quantities of air rather than enormous pressure, and its role is foundational: the tuba defines the harmony's bottom and the ensemble's pulse. BB♭ is the common band and beginner size; CC is standard in orchestras.",
    anatomy: [
      "Huge conical bore and bell — everything about the instrument is scaled up.",
      "Three to five valves — the fourth and fifth exist to correct the intonation problems the low range creates.",
      "Very large mouthpiece — a deep cup for a slow, loose lip buzz.",
      "Piston or rotary valves, depending on the instrument's heritage.",
    ],
    playing: [
      "Breathe from the bottom of the lungs and use volume of air, not pressure — this is the opposite instinct from trumpet.",
      "Keep the lip buzz slow and loose. Tightening up simply stops the low notes speaking.",
      "Support the instrument on your lap or a stand so no effort goes into holding it.",
      "Play long tones daily; the tuba's job is steady, secure sound, and that is what long tones build.",
    ],
    techniques: [
      "Air management — planning breaths across phrases, the defining tuba skill.",
      "False tones and pedal notes — the range below the normal fundamental.",
      "Valve combinations for intonation — using the fourth valve rather than 1–3 for low notes.",
      "Oom-pah — the bass half of march and polka rhythm, the tuba's traditional bread and butter.",
    ],
    tips: [
      "Practise breathing away from the instrument. Most tuba problems are air problems.",
      "BB♭ tubas read at concert pitch in bass clef in British brass bands but transposed in some traditions — check which your part assumes.",
    ],
    care: "Big instruments collect a lot of moisture. Empty the water keys often, flush the instrument seasonally, and dent-proof it with a proper case.",
    inApp: [
      "The pitch detector reaches down to around 40 Hz reliably; the lowest pedal tones may read erratically.",
      "Play a metre or so from the mic — a tuba at close range overwhelms most microphones.",
    ],
  },

  "harmonica-chromatic": {
    family: "Free reed (wind)",
    range: "C4 – C7 (12-hole)",
    tagline: "A harmonica with a slide button — every semitone, any key, no bending required.",
    overview: "The chromatic harmonica adds a spring-loaded slide button that switches between two reed plates a semitone apart. Press it and every note rises by one semitone, which gives you the full chromatic scale without the bending techniques a diatonic harp requires. It is the jazz and classical harmonica — Toots Thielemans and Larry Adler's instrument — and it plays in any key from one instrument.",
    anatomy: [
      "Slide button — the defining feature; in, everything is a semitone higher.",
      "Two reed plates per hole — natural and sharp, selected by the slide.",
      "Windsaver valves — thin plastic flaps that stop air leaking through the unused reed; they make the instrument efficient and also make it fussier.",
      "Mouthpiece — usually a smooth slider plate rather than the open comb of a diatonic.",
    ],
    playing: [
      "Standard tuning repeats a C major scale across four octaves (12-hole), so one blow/draw pattern works everywhere.",
      "Use tongue blocking rather than lip pursing: the tongue covers unwanted holes, and it is the standard chromatic technique.",
      "Breathe gently. Windsaver valves stick and rattle if you blow hard, and the instrument does not need force.",
      "The slide is worked with the index finger of the holding hand, and should move crisply, in time.",
    ],
    techniques: [
      "Tongue blocking — the foundation for octaves, splits, and clean single notes.",
      "Slide trills — rapid button work for ornaments.",
      "Octave splits — tongue covering the middle holes to play two notes an octave apart.",
      "Vibrato — from the hands or the throat, sparingly.",
    ],
    tips: [
      "Do not treat it as a big diatonic harp. Bending is not the technique here; the slide is.",
      "It is significantly more expensive and more delicate than a diatonic. Keep it in its case.",
      "A 12-hole in C is the standard starting instrument, and covers most repertoire.",
    ],
    care: "Never eat before playing and rinse your mouth first — food residue kills windsaver valves. Tap moisture out after playing and store it flat.",
    inApp: [
      "This is the chromatic instrument; the app's hole-and-breath strip is built for the 10-hole diatonic C harp, so it is not shown here.",
      "Every semitone is available, so any song in the library is playable without transposing.",
    ],
  },

  "glockenspiel": {
    family: "Tuned percussion (metal)",
    range: "G5 – C8 (sounds two octaves above written)",
    tagline: "Steel bars, hard mallets, and a bright bell tone that cuts through anything.",
    overview: "A glockenspiel is a set of tuned steel bars laid out like a piano keyboard and struck with hard mallets. It is small, cheap, indestructible, and impossible to play out of tune, which makes it one of the best first melodic instruments for a child — and it is a standard orchestral colour, sounding two octaves above where it is written.",
    anatomy: [
      "Steel bars — arranged in two rows like piano white and black keys.",
      "Frame — usually a simple case; orchestral models have resonators and a damper pedal.",
      "Mallets — brass, plastic, or hard rubber; harder mallets mean a brighter, more cutting attack.",
    ],
    playing: [
      "Hold the mallets loosely between thumb and first finger and let them rebound — striking down and holding kills the ring.",
      "Strike the centre of each bar; the ends and the nodes give a dull thud.",
      "Alternate hands (R-L-R-L) for runs, exactly like drum sticking.",
      "There is no dynamic subtlety at the quiet end; it speaks or it does not. Use mallet choice for tone instead.",
    ],
    techniques: [
      "Alternating sticking — the basis of all keyboard-percussion runs.",
      "Rolls — rapid alternation on one bar to sustain a note.",
      "Four-mallet grip — for chords, on larger instruments.",
    ],
    tips: [
      "Steel rings for a long time. Damping (with a hand or a pedal) is a real technique, not an afterthought.",
      "The sound is fixed and bright — use it sparingly, and it will always be heard.",
    ],
    care: "Almost indestructible. Keep the bars clean, do not use metal mallets on them, and store the mallets separately so they do not deform.",
    inApp: [
      "Very high pitches: keep some distance from the mic and expect the tuner to be most reliable below about C7.",
      "The app grades sounding pitch, two octaves above the written part.",
    ],
  },

  "xylophone": {
    family: "Tuned percussion (wood)",
    range: "F4 – C8 (sounds an octave above written)",
    tagline: "Wooden bars with a dry, woody crack — the sharpest attack in the mallet family.",
    overview: "The xylophone has rosewood or synthetic bars over tuned resonator tubes. Its bars are cut with a deep arch underneath that tunes the overtone to a twelfth above the fundamental, which gives it the bright, dry, slightly hollow crack that distinguishes it from a marimba's warm hum. It sounds one octave above written.",
    anatomy: [
      "Rosewood or kelon bars — arranged chromatically like a keyboard.",
      "Resonator tubes — tuned pipes under each bar that reinforce the fundamental.",
      "Arched undercut — the tuning geometry, and the reason the tone is bright rather than warm.",
      "Hard mallets — rubber, plastic, or wood; softer mallets on a xylophone just sound weak.",
    ],
    playing: [
      "Strike the centre of the bar with a relaxed wrist and let the mallet bounce off.",
      "For the accidental (upper) row, aim at the near end of the bar, not the middle — that is where the reach is comfortable.",
      "Runs use strict alternation; plan the sticking so you do not cross over awkwardly.",
      "It has almost no sustain. Rhythmic precision matters more here than on any other mallet instrument.",
    ],
    techniques: [
      "Alternating and double sticking.",
      "Rolls — needed constantly, because a single note dies immediately.",
      "Four-mallet playing (Stevens or Burton grip) for chordal writing.",
      "Glissando — dragging a mallet across the bars, an orchestral staple.",
    ],
    tips: [
      "Practise scales with strict alternation before letting yourself double-stick; bad sticking habits are hard to unlearn.",
      "Rosewood is temperature and humidity sensitive; synthetic bars stay in tune and survive touring.",
    ],
    care: "Keep rosewood bars out of sun and damp. Check the cord that suspends the bars for wear, and never set anything on top of them.",
    inApp: [
      "Sounding pitch is an octave above the written part — transpose parts up 12 semitones in the Song Editor to match.",
      "The very short sustain means the grader gets a brief window per note; play close to the mic for reliable detection.",
    ],
  },

  "marimba": {
    family: "Tuned percussion (wood)",
    range: "C2 – C7 (5-octave)",
    tagline: "The warm, wooden, deep-voiced mallet instrument — and the one with a serious solo repertoire.",
    overview: "A marimba's bars are undercut to tune the first overtone to two octaves above the fundamental, giving a mellow, rounded tone quite unlike a xylophone's crack. Large concert instruments span five octaves, are played with four (sometimes six) mallets, and carry a genuine solo literature. It is a non-transposing instrument: written pitch is sounding pitch.",
    anatomy: [
      "Wide rosewood or synthetic bars, graduated enormously in size from top to bottom.",
      "Long resonator tubes — the bass resonators can be over a metre long, often with decorative mitred ends.",
      "Height-adjustable frame — the instrument is played standing and must fit the player.",
      "Soft yarn mallets — graded in hardness; bass bars need soft mallets or they simply thud.",
    ],
    playing: [
      "Stand centred on the instrument and move your whole body along it — reaching from a fixed position causes injuries.",
      "Use the mallet appropriate to the register: hard mallets on bass bars damage them and sound bad.",
      "Roll to sustain. A marimba note decays quickly, so lyrical playing is almost entirely rolled.",
      "Four-mallet grip (Stevens or Burton) is the standard for solo repertoire — learn one properly rather than improvising a hold.",
    ],
    techniques: [
      "Independent roll — sustaining chords while an inner voice moves.",
      "One-handed roll — sustaining with one hand while the other plays melody.",
      "Lateral and double-vertical strokes — the four-mallet vocabulary.",
      "Dead strokes — pressing the mallet into the bar for a muted, choked note.",
    ],
    tips: [
      "Mallet choice is half of your tone. Carry a graded set and actually change them mid-piece.",
      "Non-transposing, so it reads and sounds the same as piano music — a good route into the repertoire.",
    ],
    care: "Rosewood bars are expensive and humidity-sensitive. Cover the instrument, keep it away from radiators, and never lean on the resonators.",
    inApp: [
      "The low register sits right in the pitch detector's comfortable range and tracks well.",
      "Written pitch equals sounding pitch — piano songs in the library transfer directly.",
    ],
  },

  "vibraphone": {
    family: "Tuned percussion (metal)",
    range: "F3 – F6",
    tagline: "Aluminium bars, a sustain pedal, and motor-driven fans that make it shimmer — jazz's mallet instrument.",
    overview: "The vibraphone is the only mallet instrument with a damper pedal, which makes it the only one that can truly sustain and phrase like a piano. Rotating discs at the top of each resonator open and close, producing the tremolo (misnamed \"vibrato\") that gives the instrument its name. Its aluminium bars ring for a very long time, so pedalling and damping are the core techniques.",
    anatomy: [
      "Aluminium bars — long sustain, mellow when struck with soft mallets.",
      "Damper bar and pedal — felt bar pressed against all bars at once, lifted by the foot.",
      "Rotating fan discs and motor — the tremolo effect, with variable speed.",
      "Resonator tubes tuned to each bar.",
    ],
    playing: [
      "The pedal is not optional. Every phrase is pedalled, and half-pedalling shades the sustain.",
      "Mallet damping — pressing a mallet onto a ringing bar while playing others — is the technique that separates real players from beginners.",
      "Play with soft to medium yarn mallets; hard mallets on aluminium sound harsh.",
      "Turn the motor off for most jazz playing. The shimmer is a specific effect, not a default.",
    ],
    techniques: [
      "Pedalling and half-pedalling — sustain control, exactly as on a piano.",
      "Mallet dampening — silencing individual notes with the mallet head while others continue.",
      "Four-mallet chord voicings — the Milt Jackson and Gary Burton vocabulary.",
      "Bowing — drawing a double bass bow across a bar edge for an ethereal sustained tone.",
    ],
    tips: [
      "Learn mallet damping early. Without it, everything you play smears into everything else.",
      "Motor speed is an expressive control; slow shimmer for ballads, off for bebop.",
    ],
    care: "Keep the motor serviced and the damper felt clean and un-compressed. Aluminium bars are durable but dent if struck with anything hard.",
    inApp: [
      "Long sustain makes the pitch grader very happy — vibraphone gives some of the steadiest readings of any instrument here.",
      "Turn the motor off when practising with the app; the tremolo modulates pitch slightly and can unsettle the detector.",
    ],
  },

  "handpan": {
    family: "Tuned percussion (steel)",
    range: "D3 – A4 (D minor, 9 notes typical)",
    tagline: "A steel shell tuned to one scale, played with the hands — no wrong notes, ever.",
    overview: "A handpan is two steel shells glued into a hollow lens, with a central \"ding\" note and a ring of tone fields around it, each tuned to a note of a single scale. You cannot play a wrong note, because only the scale's notes exist on the instrument. That is its appeal and its limitation: hugely rewarding immediately, and locked to one key unless you buy another.",
    anatomy: [
      "Ding — the central dome note, the tonic of the scale.",
      "Tone fields — the dimpled areas around the top shell, each a tuned note.",
      "Gu — the hole in the bottom shell, which acts as a Helmholtz resonator and can be played as a bass.",
      "Scale — set at manufacture; D Kurd (D minor) is the most common.",
    ],
    playing: [
      "Rest it on your lap or a stand and play with the pads of your fingers and the fleshy base of the thumb — never with sticks.",
      "Strike and lift immediately; letting your hand rest on a tone field chokes the note.",
      "The tone fields are large: hit the centre, and let the instrument ring.",
      "Build grooves from simple alternation between the ding and one or two tone fields before adding more.",
    ],
    techniques: [
      "Ghost notes — soft slaps on the shell between the tuned notes, providing the percussive layer.",
      "Gu bass — striking or covering the bottom hole for a deep resonant thump.",
      "Rolls and finger drumming — using multiple fingers for rapid single-note repetition.",
    ],
    tips: [
      "Choose the scale before the instrument. You are buying a key, not just a drum.",
      "Fingernails must be short. This is not a style point; long nails damage the tuning fields.",
    ],
    care: "Steel rusts — wipe it after every session and oil it periodically. Never let anything hard touch the tone fields; a dent is a retuning job.",
    inApp: [
      "Only the scale's notes exist, so songs in matching keys (D minor for a D Kurd) work; others will ask for notes you do not have.",
      "The pitch grader tracks its clear, bell-like fundamentals reliably.",
    ],
  },

  "steel-pan": {
    family: "Tuned percussion (steel)",
    range: "D4 – F6 (lead/tenor pan)",
    tagline: "Trinidad's national instrument, hammered from an oil drum — melody from a piece of scrap steel.",
    overview: "The steel pan is the only acoustic instrument family invented in the twentieth century. A steel drum head is sunk into a bowl and note areas are hammered, grooved, and tuned into its surface; each note area is a separate tuned membrane. The lead (tenor) pan carries the melody in a steel band, with lower pans covering harmony and bass across a whole orchestra of instruments.",
    anatomy: [
      "Sunken playing surface — the concave face with note areas hammered into it.",
      "Note areas — separated by grooves; their size determines pitch, and their arrangement follows the circle of fifths, not a keyboard.",
      "Skirt — the cylindrical remainder of the drum, which acts as the resonator; longer skirts mean lower pans.",
      "Rubber-tipped sticks — the tip material substantially changes the tone.",
    ],
    playing: [
      "Strike about a third of the way from the edge of the note area, not dead centre, and let the stick rebound.",
      "The layout follows the cycle of fifths around the pan, so scales are a pattern of jumps, not a straight line — learn the geography deliberately.",
      "Keep the wrists loose and the sticks light; force produces a clang, not volume.",
      "Rolls sustain notes, exactly as on other mallet instruments.",
    ],
    techniques: [
      "Rolls — the primary sustain technique.",
      "Strumming — rapid alternating notes in the harmony pans, the rhythmic engine of a steel band.",
      "Double stops — two notes at once, awkward on a circle-of-fifths layout and worth practising.",
    ],
    tips: [
      "Spend real time learning where the notes are. The layout is the instrument's main learning curve, and it is unlike any keyboard.",
      "Pans need retuning periodically by a specialist — it is normal maintenance, not damage.",
    ],
    care: "Chrome or painted pans should be kept dry and covered. Never stack anything in the bowl, and never strike it with anything but proper sticks.",
    inApp: [
      "Its clear, ringing fundamentals track well in the tuner and the play-along grader.",
      "Non-transposing, so library songs in its range play as written.",
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

  "cajon": {
    family: "Percussion (unpitched)",
    range: "Unpitched — graded on hit timing",
    tagline: "A wooden box you sit on and play with your hands — a whole rhythm section that fits in a rucksack.",
    overview: "The cajón is a plywood box with a thin front plate (the tapa) and a sound hole in the back. Sitting on it and striking the tapa near the top gives a snare-like crack; striking the centre gives a bass thump. Most modern cajóns have guitar strings or snare wires behind the tapa for extra sizzle. Born in coastal Peru, it is now the default acoustic percussion instrument worldwide.",
    anatomy: [
      "Tapa — the thin playing face, screwed on loosely at the top corners so it can slap.",
      "Sound hole — in the rear panel; it projects the bass.",
      "Internal snares — guitar strings or snare wires against the tapa; often adjustable.",
      "Body — thicker plywood on the sides and back, providing the resonant chamber.",
    ],
    playing: [
      "Sit on top, lean slightly forward, and let your hands hang naturally onto the face.",
      "Bass tone: strike the centre of the tapa with a flat, relaxed hand and lift away immediately.",
      "Slap tone: strike the top corner with the fingers, close to where the tapa is loose.",
      "The basic groove is bass on 1 and 3, slap on 2 and 4 — a drum kit's backbeat with two hands.",
    ],
    techniques: [
      "Bass and slap — the two core tones, and the whole vocabulary in combination.",
      "Ghost notes — soft finger taps filling the gaps between main strokes.",
      "Rim and side hits — for a drier click, and for variety.",
      "Heel-toe — rocking a foot against the side for an extra voice.",
    ],
    tips: [
      "Tune the snares if yours are adjustable — too much sizzle muddies the bass tone completely.",
      "Play with relaxed hands. Tension both hurts you and deadens the box.",
      "It is the ideal instrument for playing along with an acoustic guitar: no volume mismatch, no setup.",
    ],
    care: "Wooden, so keep it out of damp and direct sun. Check the tapa screws occasionally — the sound depends on their tension.",
    inApp: [
      "Graded on timing only: bass or slap, either counts as a hit.",
      "Its sharp attack makes it very reliable for the app's onset detection.",
    ],
  },

  "djembe": {
    family: "Percussion (unpitched)",
    range: "Unpitched — graded on hit timing",
    tagline: "A goblet drum from West Africa with three clear tones and enormous volume for its size.",
    overview: "The djembe is a rope-tuned goblet drum, traditionally carved from a single piece of hardwood with a goat skin head. Its shape focuses sound out of the narrow stem, which is why a hand drum can be loud enough to lead an ensemble. It produces three distinct tones — bass, tone, and slap — and virtually all djembe music is built from combinations of those three.",
    anatomy: [
      "Goblet-shaped shell — a wide bowl narrowing to a stem and flaring at the foot.",
      "Goat skin head — thin and responsive; synthetic heads exist and are far more weather-stable.",
      "Rope tuning system — vertical ropes pulled into diamond-shaped rows (mali weave) to raise tension.",
      "Rings — metal hoops holding the skin, which the rope pulls down.",
    ],
    playing: [
      "Tilt the drum forward on a stand or between your knees so the bottom is open — a djembe flat on the ground barely speaks.",
      "Bass: strike the centre with a flat hand and let it rebound.",
      "Tone: strike the edge with the fingers together, palm off the head.",
      "Slap: like a tone but with relaxed, slightly spread fingers whipping into the edge — the hardest of the three, and the last to arrive.",
    ],
    techniques: [
      "Bass–tone–slap combinations — the entire vocabulary; every rhythm is a sequence of these three.",
      "Rolls — fast alternating hands, usually tones.",
      "Flams — two hands striking a fraction apart for a thicker accent.",
      "Call and response — the lead djembe signals changes to the ensemble; the traditional structure.",
    ],
    tips: [
      "Slaps hurt until your technique is right. If your hands sting, you are hitting with the palm rather than snapping the fingers.",
      "Skin heads tighten in dry heat and go dead in damp. Rope-tuning is a normal, expected part of playing.",
    ],
    care: "Keep the skin out of direct sun, and never leave the drum in a car. Retune by pulling the mali weave when the head goes slack.",
    inApp: [
      "Timing-only grading — bass, tone, and slap all register as hits.",
      "Play close to the mic; the bass tone in particular is more felt than heard at a distance.",
    ],
  },

  "bongos": {
    family: "Percussion (unpitched)",
    range: "Unpitched — graded on hit timing",
    tagline: "Two small drums held between the knees — the highest, fastest voice in Latin percussion.",
    overview: "Bongos are a joined pair of small drums — the smaller macho and the larger hembra — played with the fingers and palms while gripped between the knees. In Cuban music the bongosero plays the martillo (\"hammer\") pattern, a steady eighth-note figure that decorates the groove, then switches to a cowbell for the louder sections.",
    anatomy: [
      "Macho — the smaller, higher-pitched drum, traditionally on the player's left.",
      "Hembra — the larger, lower drum.",
      "Bridge — the wooden block joining them.",
      "Tuning lugs — modern bongos are hardware-tuned rather than tacked; tuned high and tight.",
    ],
    playing: [
      "Grip the drums between your knees with the macho to your left, tilted slightly away from you.",
      "Play with the fingers and the heel of the hand — bongos are a fingertip instrument, not a palm one.",
      "The martillo pattern alternates heel and fingertip on the hembra with accents on the macho; learn it slowly and it becomes automatic.",
      "Tune high. Bongos are supposed to be tight and sharp, not boomy.",
    ],
    techniques: [
      "Martillo — the fundamental bongo pattern in son and salsa.",
      "Open tone and muted tone — striking the edge and letting it ring, versus keeping a finger on the head.",
      "Glissando — pressing and dragging a thumb across the head for a rising moan.",
      "Finger rolls — rapid alternation of individual fingers for fills.",
    ],
    tips: [
      "Keep your fingers together and firm; splayed fingers give a weak, slappy sound and hurt.",
      "Because they are small and quiet compared to congas, bongos are excellent for practising at home.",
    ],
    care: "Natural skin heads respond to humidity — loosen slightly for storage in damp climates. Wipe the heads and keep the hardware from rusting.",
    inApp: [
      "Timing-only grading; either drum, any tone, counts as a hit.",
      "Their sharp, high attack is the easiest thing in the app for onset detection to catch.",
    ],
  },
};

/** Derived facts for one instrument: strings table, range, tunings, song count, app support. */
export function instrumentFacts(id) {
  const inst = INSTRUMENTS[id];
  const g = GUIDE[id] || {};
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
export function harmonicaChart() {
  return HARMONICA_BLOW.map((b, i) => ({ hole: i + 1, blow: midiToName(b).full, draw: midiToName(HARMONICA_DRAW[i]).full }));
}

// ---------- Markdown rendering (docs/INSTRUMENTS.md — regenerate with `node gen-docs.mjs`) ----------
const anchor = (s) => s.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s/g, "-");

export function buildInstrumentsMarkdown() {
  const ids = Object.keys(GUIDE);
  const L = [];
  L.push("# GuitarPicker instrument guide", "");
  L.push("Every instrument the app models: what it is, how to play it, and how GuitarPicker supports it.");
  L.push("Hard facts (tunings, ranges, hole charts, song counts) are generated from the app's own data,");
  L.push("so this guide always matches what the app actually plays. Also readable in-app under **Instruments**.");
  L.push("", "Any built-in song can be copied in the Song Editor and switched to another instrument.");
  L.push("Ranges are **sounding** pitch throughout — a microphone hears what leaves the instrument, not what is");
  L.push("written on the page, so a B♭ trumpet playing a written C registers here as B♭.", "");
  L.push("## Contents", "");
  for (const id of ids) L.push(`- [${INSTRUMENTS[id].name}](#${anchor(INSTRUMENTS[id].name)})`);
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

    const section = (title, items, ordered) => {
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
      ...(id === "voice" ? [`${builtinSongs().filter((s) => (s.lyrics || []).length).length} built-in songs carry singalong lyrics for Karaoke.`] : []),
      ...(g.inApp || []),
    ];
    section("In GuitarPicker", app);
  }
  return L.join("\n");
}
