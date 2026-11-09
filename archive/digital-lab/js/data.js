/* ==========================================================================
   RICHMOND / DIGITAL LAB — content
   Everything on the site is driven from this file. Edit freely.

   Adding real media to a project:
     media: { type: 'video', src: 'assets/arm.mp4', poster: 'assets/arm.jpg' }
     media: { type: 'image', src: 'assets/vr.jpg' }
   If `media` is missing, the project shows its live generative sketch (`vis`).

   gallery: [{ src: 'assets/arm-1.jpg', caption: 'First test rig' }, ...]
   ========================================================================== */

const DATA = {
  person: {
    name: 'Richmond Agyenim-Boateng',
    email: 'ra4150@nyu.edu',
    github: 'https://github.com/iam-agyenim',
    linkedin: 'https://www.linkedin.com/in/richmond-agyenim-boateng-651949284',
    cv: 'assets/Richmond-Agyenim-Boateng-CV.pdf',
    location: 'Abu Dhabi, UAE',
    timezone: 'Asia/Dubai',
  },

  disciplines: ['Interactive Media', 'Computer Science', 'AI', 'Creative Technology'],

  categories: [
    { id: 'all', label: 'ALL' },
    { id: 'software', label: 'SOFTWARE' },
    { id: 'ai', label: 'AI' },
    { id: 'interactive', label: 'INTERACTIVE' },
    { id: 'hardware', label: 'HARDWARE' },
    { id: 'experiments', label: 'EXPERIMENTS' },
  ],

  /* ---------------------------------------------------------------- WORK */
  projects: [
    {
      slug: 'gesture-arm',
      tags: ['computer vision','hand tracking','gesture','robotics','python','opencv','mediapipe','hci','physical computing','real-time'],
      challenges: 'Webcam landmarks are noisy and two-dimensional. Turning them into smooth, safe three-dimensional motion meant filtering across frames and bounding every mapped target to the arm’s limits.',
      title: 'Gesture-Controlled Robotic Arm',
      short: 'Gesture Arm',
      cats: ['ai', 'hardware'],
      discipline: 'Computer Vision / Robotics',
      year: '2026',
      role: 'Design & engineering',
      stack: ['Python', 'OpenCV', 'MediaPipe', 'xArmAPI'],
      vis: 'arm', hue: 28,
      pos: { x: 39, y: 0 },
      github: 'https://github.com/iam-agyenim/Hand-Gesture---Controlled-Robotic-Arm',
      question: 'Can hand movement become physical movement?',
      summary: 'A webcam watches a hand. A robotic arm follows it. No controller, no joystick: just the gesture.',
      idea: [
        'I wanted to explore whether human hand movement could directly control a physical robotic system, with no controller, buttons or joystick in between.',
        'The interesting part isn’t the arm. It’s the translation layer: how you turn noisy, 2D landmark data from a webcam into movement that feels intentional in 3D space.',
      ],
      process: [
        { t: 'Detect', d: 'MediaPipe finds 21 hand landmarks in each webcam frame through OpenCV.' },
        { t: 'Track', d: 'Landmarks are smoothed across frames so a shaky hand doesn’t become a shaky arm.' },
        { t: 'Map', d: 'Hand position, depth and pinch distance are mapped into the arm’s coordinate space and joint limits.' },
        { t: 'Control', d: 'Target positions are streamed to the arm through xArmAPI, with safety bounds on every move.' },
      ],
      system: `  WEBCAM ──▶ OpenCV frame ──▶ MediaPipe Hands
                                   │  21 landmarks
                                   ▼
                          smoothing / filtering
                                   │
                                   ▼
             gesture ──▶ mapping (x, y, z, grip)
                                   │  bounded targets
                                   ▼
                         xArmAPI ──▶ ROBOTIC ARM`,
      result: 'A working pipeline from gesture to motion. The arm follows hand position in real time and responds to a pinch gesture to open and close the gripper.',
      next: 'Better depth estimation, gesture vocabularies beyond position, and latency measurements from frame to motor.',
    },
    {
      slug: 'campus-explorer-vr',
      tags: ['vr','xr','virtual reality','immersive','unity','c#','meta quest','360','photography','spatial','interaction design'],
      challenges: 'Keeping movement comfortable inside a headset, and keeping people oriented when they jump between 360° scenes.',
      title: 'Campus Explorer VR',
      short: 'VR Campus Tour',
      cats: ['interactive'],
      discipline: 'Immersive Experience / Unity',
      year: '2025',
      role: 'Capture, development',
      stack: ['Unity', 'C#', 'Meta Quest', '360° Photography'],
      vis: 'vr', hue: 250,
      pos: { x: 4, y: 190 },
      github: null,
      question: 'Can you visit a place before you arrive?',
      summary: 'A virtual tour of campus built from 360° photography and navigable on a Meta Quest headset.',
      idea: [
        'For many students, the first time they see campus is the day they arrive. I wanted to build a way to stand inside the place before getting there.',
        'The tour is built from 360° photographs of real locations, stitched into a navigable experience in Unity and deployed to Meta Quest.',
      ],
      process: [
        { t: 'Capture', d: 'Shot 360° photographs at key locations around campus.' },
        { t: 'Build', d: 'Mapped each photo onto a sphere in Unity and linked locations with interactive hotspots.' },
        { t: 'Navigate', d: 'Wrote C# interaction logic for moving between scenes with Quest controllers.' },
        { t: 'Deploy', d: 'Built and tested on-device for comfort, performance and orientation.' },
      ],
      system: `  360° PHOTOS ──▶ Unity skybox / sphere
                           │
                           ▼
              scene graph of locations
                           │  hotspots (C#)
                           ▼
          Meta Quest input ──▶ scene transitions`,
      result: 'A walkable, headset-native tour of campus locations.',
      next: 'Spatial audio, guided narration and a lighter WebXR version that runs in a browser.',
    },
    {
      slug: 'learnai',
      tags: ['generative ai','llm','openai','gpt','education','typescript','react','frontend','full-stack','prompt engineering','video','json'],
      challenges: 'Reliability, not generation. Every stage has to emit structured JSON that the next stage can trust, or the pipeline breaks downstream.',
      title: 'LearnAI',
      short: 'LearnAI',
      cats: ['ai', 'software'],
      discipline: 'Generative AI / Education',
      year: '2025',
      role: 'Full-stack',
      stack: ['OpenAI GPT-4o-mini', 'TypeScript', 'shadcn/ui'],
      vis: 'learnai', hue: 150,
      pos: { x: 71, y: 150 },
      github: 'https://github.com/iam-agyenim/Learnai',
      question: 'What if a course could be generated from a single sentence?',
      summary: 'A prompt-to-course engine that turns one sentence into a structured syllabus, lessons and narrated video slides.',
      idea: [
        'You type what you want to learn. LearnAI returns a course: a structured syllabus of 6–8 lessons, long-form lesson content, and a narrated slide-based video for each one.',
        'The hard part was structure, not generation. Every stage emits strict JSON so the next stage can build on it reliably.',
      ],
      process: [
        { t: 'Prompt', d: 'A natural-language request becomes a structured course brief.' },
        { t: 'Syllabus', d: 'GPT-4o-mini produces a 6–8 lesson syllabus as validated JSON.' },
        { t: 'Lessons', d: 'Each lesson is expanded into long-form educational content.' },
        { t: 'Slides', d: 'Content becomes interactive slides with narration scripts and animation metadata.' },
      ],
      system: `  "teach me computer vision"
            │
            ▼
   GPT-4o-mini ──▶ syllabus.json (6–8 lessons)
            │
            ▼
   lesson generator ──▶ lesson.json
            │
            ▼
   slide pipeline ──▶ slides + narration + animation
            │
            ▼
      React / shadcn-ui player`,
      result: 'A working pipeline from prompt to narrated, slide-based lessons with a styled UI.',
      next: 'Source-grounded lessons, quizzes generated from the same structure, and real voice synthesis.',
    },
    {
      slug: 'news-intelligence',
      tags: ['nlp','machine learning','ml','python','semantic search','search','embeddings','sentiment','ner','topic modeling','summarization','data','backend','full-stack'],
      challenges: 'Combining several NLP stages into one pipeline, and making the output searchable by meaning rather than keywords.',
      title: 'AI News Intelligence Platform',
      short: 'News Intelligence',
      cats: ['ai', 'software'],
      discipline: 'NLP / Machine Learning',
      year: '2025',
      role: 'Full-stack, ML',
      stack: ['Python', 'NLP', 'Machine Learning'],
      vis: 'news', hue: 200,
      pos: { x: 26, y: 470 },
      github: 'https://github.com/iam-agyenim/AI-News-Intelligence-Platform',
      question: 'Can a pile of articles become something you can ask questions of?',
      summary: 'A full-stack platform that turns large collections of news into structured, searchable information.',
      idea: [
        'News is unstructured by design. This project applies a stack of NLP techniques to turn a large collection of articles into something you can search, filter and reason about.',
      ],
      process: [
        { t: 'Ingest', d: 'Collect and clean articles through a text preprocessing pipeline.' },
        { t: 'Analyze', d: 'Sentiment analysis and Named Entity Recognition on every article.' },
        { t: 'Organize', d: 'Topic modeling groups articles into themes, and summarization condenses them.' },
        { t: 'Search', d: 'Semantic search retrieves by meaning, not just keywords.' },
      ],
      system: `  articles ──▶ preprocessing
                    │
        ┌───────────┼────────────┬──────────────┐
        ▼           ▼            ▼              ▼
    sentiment      NER      topic model    summarizer
        └───────────┴─────┬──────┴──────────────┘
                          ▼
                  embeddings index
                          │
                          ▼
                   semantic search`,
      result: 'A searchable view over a news collection, with entities, sentiment, topics and summaries available for every article.',
      next: 'Timelines of how entities and topics shift over time.',
    },
    {
      slug: 'voice-car',
      tags: ['arduino','speech recognition','voice','p5.js','javascript','physical computing','embedded','serial','sensors','ultrasonic','robotics','hardware'],
      challenges: 'Making the link between a browser and an embedded system reliable, and debugging the full hardware–software interaction.',
      title: 'Voice-Controlled Robotic Car',
      short: 'Voice Car',
      cats: ['hardware', 'interactive'],
      discipline: 'Robotics / Physical Computing',
      year: '2025',
      role: 'Hardware & software',
      stack: ['Arduino', 'p5.js', 'Ultrasonic sensors', 'Motor drivers'],
      vis: 'car', hue: 48,
      pos: { x: 62, y: 590 },
      github: 'https://github.com/iam-agyenim/Voice-controlled-robotic-car',
      question: 'How little does a machine need to understand to obey?',
      summary: 'Speak in the browser; a car moves in the room. Voice becomes a single character on a serial line.',
      idea: [
        'Speech recognition runs in the browser with p5.js. Each recognized command is reduced to a single character and sent to an Arduino, which drives the motors in real time.',
        'Ultrasonic sensors give the car some awareness of its surroundings, so a spoken command never overrides a wall.',
      ],
      process: [
        { t: 'Listen', d: 'p5.js speech recognition captures spoken commands in the browser.' },
        { t: 'Encode', d: 'Commands are reduced to single-character signals: F, B, L, R, S.' },
        { t: 'Transmit', d: 'Signals travel over serial to the Arduino.' },
        { t: 'Act', d: 'Motor drivers move the car while ultrasonic sensors watch for obstacles.' },
      ],
      system: `  "forward" ──▶ p5.js speech ──▶ 'F'
                                   │ serial
                                   ▼
                               ARDUINO
                             ┌────┴────┐
                             ▼         ▼
                       motor driver  ultrasonic
                             │         │
                             ▼         │ obstacle?
                           WHEELS ◀────┘`,
      result: 'Reliable voice control from the browser to an embedded system, with obstacle awareness on the car.',
      next: 'Replacing fixed commands with intent parsing, so “go around it” means something.',
    },
  ],

  /* ----------------------------------------------------------------- LAB */
  lab: [
    {
      slug: 'finger',
      tags: ['robotics','capstone','tendon','servo','mechanical','hardware','prosthetics','unfinished'],
      title: 'The Finger',
      status: 'in progress',
      type: 'prototypes',
      cats: ['hardware', 'experiments'],
      discipline: 'Robotics / Capstone',
      stack: ['Servos', 'Tendons', 'Arduino'],
      vis: 'finger', hue: 12,
      pos: { x: 36, y: 930 },
      question: 'Did we need the robot at all?',
      notes: 'Our capstone started as a humanoid robot. Then we built a single tendon-driven finger, and it changed the question we were asking.',
    },
    {
      slug: 'air-harp',
      tags: ['music','sound','instrument','sensors','ultrasonic','arduino','ableton','weird','physical computing','unfinished'],
      title: 'Air Harp',
      status: 'prototype',
      type: 'prototypes',
      cats: ['hardware', 'experiments'],
      discipline: 'Physical Computing / Sound',
      stack: ['Arduino', 'Ultrasonic sensors', 'Ableton Live'],
      vis: 'harp', hue: 320,
      pos: { x: 3, y: 690 },
      question: 'Can ultrasonic sensors become an invisible musical instrument?',
      notes: 'Distance sensors read the position of a hand in the air. Crossing an invisible string plays a note.',
    },
    {
      slug: 'mirror-of-expectation',
      tags: ['hci','installation','identity','camera','art','design','computer vision','reflection','weird','unfinished'],
      title: 'Mirror of Expectation',
      status: 'concept',
      type: 'ideas',
      cats: ['interactive', 'experiments'],
      discipline: 'HCI / Interactive Installation',
      stack: ['Camera', 'p5.js', 'Computer vision'],
      vis: 'mirror', hue: 190,
      pos: { x: 78, y: 900 },
      question: 'Can an interface make someone see themselves differently?',
      notes: 'A mirror that shows two reflections: who you are, and who you are expected to be. It’s an installation about the distance between them.',
    },
    {
      slug: 'holographic-mirror',
      tags: ['display','optics','hologram','spatial','pepper’s ghost','weird','unfinished'],
      title: 'Holographic Mirror',
      status: 'experiment',
      type: 'experiments',
      cats: ['interactive', 'experiments'],
      discipline: 'Spatial Display / Interaction',
      stack: ['Pepper’s ghost', 'Display', 'Interaction'],
      vis: 'holo', hue: 170,
      pos: { x: 54, y: 1180 },
      question: 'Can a reflection hold information without becoming a screen?',
      notes: 'Experiments with Pepper’s-ghost style projection, making objects appear to float in space instead of on glass.',
    },
    {
      slug: 'digital-diet',
      tags: ['attention','wellbeing','screen time','data visualization','interaction design','web','design','frontend','unfinished'],
      title: 'Digital Diet',
      status: 'prototype',
      type: 'prototypes',
      cats: ['software', 'interactive', 'experiments'],
      discipline: 'Interaction Design / Web',
      stack: ['JavaScript', 'Web', 'Data visualization'],
      vis: 'diet', hue: 95,
      pos: { x: 12, y: 1130 },
      question: 'What would a nutrition label for screen time look like?',
      notes: 'An interface that treats attention like food: portions, ingredients and what you’re actually consuming.',
    },
  ],

  /* ------------------------------------------------------------- WRITING */
  writing: [
    {
      slug: 'why-i-stopped-building-the-robot',
      title: 'Why I stopped building the robot',
      date: '09.2026',
      tag: 'process',
      status: 'draft',
      excerpt: [
        'We started our capstone thinking we needed a humanoid robot.',
        'Then we built a finger.',
        'And asked a more important question: did we need the robot at all?',
      ],
    },
    {
      slug: 'your-hand-is-already-an-interface',
      title: 'Your hand is already an interface',
      date: '2026',
      tag: 'technology',
      status: 'soon',
      excerpt: [
        'Twenty-one points. That is all a camera needs to understand a hand.',
        'Notes from building a robotic arm that follows gestures, and what gets lost between a landmark and a motor.',
      ],
    },
    {
      slug: 'structure-before-generation',
      title: 'Structure before generation',
      date: '2026',
      tag: 'ai',
      status: 'soon',
      excerpt: [
        'Building LearnAI taught me that the model was the easy part.',
        'The hard part was designing the shape of the output so the next step could trust it.',
      ],
    },
  ],
  writingTags: [
    { id: 'all', label: 'ALL' },
    { id: 'technology', label: 'TECHNOLOGY' },
    { id: 'process', label: 'PROCESS' },
    { id: 'ai', label: 'AI' },
    { id: 'reflections', label: 'REFLECTIONS' },
  ],

  /* --------------------------------------------------------------- ABOUT */
  about: {
    statement: 'I work somewhere between software, interaction, and physical computing.',
    studying: ['Interactive Media', 'Computer Science (minor)', 'New York University Abu Dhabi, Class of 2027'],
    interests: ['AI', 'Creative Technology', 'Computer Vision', 'HCI', 'Robotics', 'Interactive Systems'],
    tools: ['Python', 'JavaScript', 'TypeScript', 'C++', 'C#', 'React', 'Next.js', 'Node', 'Express', 'Unity', 'OpenCV', 'MediaPipe', 'OpenAI API', 'Arduino', 'p5.js', 'Tailwind', 'Django', 'PostgreSQL', 'Git', 'Photoshop', 'Premiere Pro', 'Ableton Live'],
    currently: [
      ['Building', 'Interactive AI'],
      ['Learning', 'Computer Vision'],
      ['Exploring', 'Creative Technology'],
      ['Writing', 'How things are made'],
    ],
    experience: [
      { when: 'Sep ’26 — now', org: 'NYU Abu Dhabi', role: 'Communication Assistant, Athletics', d: 'Photo, video and campaign content for athletics; engagement analytics.' },
      { when: 'Sep ’26 — now', org: 'NYU Abu Dhabi', role: 'Social Media Ambassador', d: 'Concept, script, film and edit Reels, Stories and student features.' },
      { when: 'Aug — Dec ’25', org: 'NYU Abu Dhabi', role: 'Web Developer', d: 'Django + Wagtail CMS site; PostgreSQL, Nginx and Gunicorn deployment.' },
      { when: 'Jun — Aug ’25', org: 'Techtopia Ghana', role: 'Software Engineer Intern', d: 'React front-ends, Node/Express REST APIs, MongoDB, and dashboards.' },
      { when: 'Jun — Aug ’24', org: 'Young Achievers Foundation', role: 'IT Intern', d: 'Website audit and redesign; taught Python and Scratch to 20+ students.' },
      { when: 'Aug ’23 — now', org: 'HackAD', role: 'Member', d: 'Hackathons, workshops and cross-disciplinary prototypes.' },
    ],
  },
};

if (typeof module === 'object' && module.exports) module.exports = DATA;
else window.DATA = DATA;
