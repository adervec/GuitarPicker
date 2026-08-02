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
  L.push("", "Any built-in song can be copied in the Song Editor and switched to another instrument.", "");
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
