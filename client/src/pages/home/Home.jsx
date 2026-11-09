import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";

/*
 * AI & DS — Infinite Space
 * Every screen: the same pannable, zoomable Infinite Space canvas.
 * Narrow screens use a compact frame arrangement and a responsive starting camera.
 * Navigation and answers are local keyword matching; no AI API or backend is used.
 */

const MOBILE_BREAKPOINT = 760;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 2;
const INITIAL_ZOOM = 0.8;
const EASE = [0.22, 0.8, 0.2, 1];

const FRAMES = [
  { id: "home", n: "01", label: "DEPARTMENT OVERVIEW", x: 0, y: 0, w: 760, h: 500 },
  { id: "academics", n: "02", label: "ACADEMIC ECOSYSTEM", x: 900, y: -340, w: 460, h: 400 },
  { id: "faculty", n: "03", label: "MEET THE FACULTY", x: 1000, y: 150, w: 440, h: 380 },
  { id: "research", n: "04", label: "RESEARCH & INNOVATION", x: 780, y: 640, w: 520, h: 380 },
  { id: "projects", n: "05", label: "STUDENT PROJECTS", x: 140, y: 640, w: 560, h: 380 },
  { id: "placements", n: "06", label: "CAREER PATHWAYS", x: -520, y: 560, w: 480, h: 380 },
  { id: "events", n: "07", label: "DEPARTMENT ACTIVITY LOG", x: -560, y: -380, w: 440, h: 360 },
  { id: "students", n: "08", label: "STUDENT LIFE", x: -650, y: 80, w: 440, h: 390 },
  { id: "admissions", n: "09", label: "ADMISSIONS", x: 1510, y: 560, w: 460, h: 360 },
  { id: "contact", n: "10", label: "CONTACT & CAMPUS", x: 1510, y: -390, w: 460, h: 360 },
  { id: "design", n: "11", label: "AI & DS — DESIGN LANGUAGE", x: 2070, y: 70, w: 440, h: 400 },
];

const FRAME_BY_ID = Object.fromEntries(FRAMES.map((frame) => [frame.id, frame]));

// On narrow screens, keep the same canvas cards and connections but arrange
// them as a compact, gently zig-zagging path that fits a portrait viewport.
// Visitors can still pan, pinch-zoom, search, and fly into any section.
const MOBILE_FRAMES = FRAMES.map((frame, index) => ({
  ...frame,
  x: index === 0 ? -30 : index % 2 === 0 ? 25 : -35,
  y: index === 0 ? 0 : 470 + (index - 1) * 410,
  w: index === 0 ? 520 : 480,
  h: index === 0 ? 410 : 360,
}));

const LINKS = [
  ["home", "academics"], ["academics", "faculty"], ["faculty", "research"],
  ["research", "projects"], ["projects", "placements"], ["events", "home"],
  ["students", "projects"], ["students", "events"], ["admissions", "academics"],
  ["contact", "home"], ["design", "home"], ["design", "academics"],
  ["design", "faculty"], ["design", "research"],
];

// A simple continuous route prevents long connector lines from crossing cards
// when the canvas is rearranged into its narrow-screen portrait composition.
const MOBILE_LINKS = MOBILE_FRAMES.slice(0, -1).map((frame, index) => [
  frame.id,
  MOBILE_FRAMES[index + 1].id,
]);

const SECTION_INFO = {
  home: {
    title: "Department overview",
    summary: "The Department of Artificial Intelligence & Data Science at Dr. D. Y. Patil Institute of Technology, Pimpri, Pune, brings together computing, data, mathematics and intelligent systems.",
    details: [
      "Interdisciplinary learning across AI and data science",
      "Programming, analytical thinking and practical development",
      "A connected space for academics, research and student work",
    ],
    answer: "The department brings together computing, mathematics, data and intelligent systems. Explore academics, students, faculty, research, projects and career pathways through the sections on this page.",
  },
  academics: {
    title: "Academic ecosystem",
    summary: "Explore the undergraduate B.E. programme, curriculum, core subjects, electives, laboratories and learning resources.",
    details: [
      "B.E. in Artificial Intelligence & Data Science",
      "Semester-wise curriculum and subject information",
      "Laboratory work, practicals and academic resources",
    ],
    answer: "The academic section covers the B.E. in Artificial Intelligence & Data Science, curriculum, semester-wise subjects, laboratories and learning resources. Connect the exact syllabus and timetable from approved academic documents.",
  },
  faculty: {
    title: "Meet the faculty",
    summary: "A faculty directory for official names, designations, qualifications, photographs, areas of expertise and research interests.",
    details: [
      "Head of Department and teaching staff profiles",
      "Qualifications and areas of expertise",
      "Research interests and official profile links",
    ],
    answer: "The faculty directory is designed for the Head of Department, professors and teaching staff. Add verified names, official photographs, designations, qualifications, areas of expertise and research interests.",
  },
  research: {
    title: "Research & innovation",
    summary: "Explore research themes across intelligent systems, machine learning, deep learning, natural language processing, computer vision and data engineering.",
    details: [
      "Artificial Intelligence and Machine Learning",
      "Deep Learning, NLP and Computer Vision",
      "Data Science, Data Engineering and applied research",
    ],
    answer: "Research themes include Artificial Intelligence, Machine Learning, Deep Learning, Natural Language Processing, Computer Vision, Data Science and Data Engineering. Add verified publications, lab projects and faculty research profiles.",
  },
  projects: {
    title: "Student projects",
    summary: "A showcase for student-built applications, prototypes, research projects and practical work, with space for repositories and live demonstrations.",
    details: [
      "Project title, abstract and category",
      "Technology stack and contributing team",
      "Live demo, GitHub repository or documentation",
    ],
    answer: "The projects gallery is for student-built applications, prototypes, research work and hackathon projects. Each entry can include its problem statement, technologies, team members, screenshots and GitHub or live-demo link. Sample cards must be replaced with verified department projects.",
  },
  placements: {
    title: "Career pathways & placements",
    summary: "A space for verified placement outcomes, internship opportunities, recruiters, career preparation and student achievements.",
    details: [
      "Placement and internship information",
      "Recruiter and organisation highlights",
      "Career preparation and student achievements",
    ],
    answer: "The placement section is organised for placement highlights, internships, recruiter information, preparation activities and student achievements. Add official placement figures, salary packages and company names only after verification.",
  },
  events: {
    title: "Department events",
    summary: "A timeline for workshops, seminars, guest lectures, technical competitions, hackathons and department announcements.",
    details: [
      "Workshops and hands-on sessions",
      "Guest lectures, seminars and expert talks",
      "Hackathons, competitions and announcements",
    ],
    answer: "The events section can display workshops, seminars, guest lectures, coding competitions, hackathons and announcements. Add the verified event title, date, description, poster and registration link for each event.",
  },
  students: {
    title: "Student life",
    summary: "A student-focused space for learning beyond lectures: collaborative projects, technical communities, competitions, activities and achievements.",
    details: [
      "Student projects and peer collaboration",
      "Technical activities, competitions and hackathons",
      "Student achievements, clubs and community activities",
    ],
    answer: "The student section highlights learning beyond the classroom: peer collaboration, practical work, projects, technical competitions, hackathons and student achievements. Add verified club names, student chapters, committee details and event photographs.",
  },
  admissions: {
    title: "Admissions",
    summary: "A starting point for prospective students to understand the programme and find official admission guidance.",
    details: [
      "B.E. Artificial Intelligence & Data Science programme overview",
      "Eligibility and admission process — connect current official rules",
      "Fees, cut-offs and important dates — verify each admission year",
    ],
    answer: "The admissions page introduces the B.E. Artificial Intelligence & Data Science programme and provides space for eligibility, application steps, fees, cut-offs and important dates. These details change, so connect current official admission notices rather than showing unverified figures.",
  },
  contact: {
    title: "Contact & campus",
    summary: "Department and institute contact information, campus location, office details and directions can be presented here.",
    details: [
      "Dr. D. Y. Patil Institute of Technology, Pimpri, Pune",
      "Department office, official email and phone — add verified details",
      "Campus directions and institute website links",
    ],
    answer: "The department is part of Dr. D. Y. Patil Institute of Technology, Pimpri, Pune. Add the verified department office location, official email address, phone number, office hours and campus directions.",
  },
  design: {
    title: "Design language",
    summary: "A reference board for the visual system used by this interactive department experience.",
    details: [
      "Colour, typography and spacing tokens",
      "Buttons, input fields and interactive states",
      "Cards, borders and reusable surfaces",
    ],
    answer: "This section documents the visual style of the website, including its colours, typography, surfaces and reusable interface elements.",
  },
};

const SEARCH_INDEX = [
  ["home", "Department overview", "DYPIT Pune artificial intelligence data science about department"],
  ["academics", "Undergraduate programme", "B.E. degree curriculum subjects course syllabus academics"],
  ["academics", "Curriculum and subjects", "semester-wise structure core elective subjects timetable"],
  ["academics", "Laboratories and resources", "labs practical learning notes academic resources"],
  ["faculty", "Faculty profiles", "teachers professors HOD designation qualification research interests"],
  ["students", "Student life and activities", "students campus clubs achievements student chapters community"],
  ["research", "Artificial Intelligence and Machine Learning", "intelligent systems models research"],
  ["research", "Deep Learning and NLP", "neural networks language processing"],
  ["research", "Computer Vision", "image video visual computing"],
  ["research", "Data Science and Engineering", "analytics data pipelines"],
  ["projects", "Student projects", "applications prototypes repositories teams github demo"],
  ["placements", "Placements and internships", "careers recruiters jobs packages internship hiring"],
  ["events", "Workshops and seminars", "guest lectures hackathons competitions"],
  ["events", "Announcements", "department news activity timeline"],
  ["admissions", "Admission process", "eligibility fees cutoffs application dates"],
  ["contact", "Contact and campus", "address phone email location directions"],
  ["design", "Colour tokens and typography", "buttons inputs surfaces visual design"],
].map(([frame, title, text]) => ({ frame, title, text }));

const SUGGESTIONS = [
  ["Explore academics", "academics"],
  ["Meet the faculty", "faculty"],
  ["Show student life", "students"],
  ["Discover research areas", "research"],
  ["Explore placements", "placements"],
  ["Check admissions", "admissions"],
];

const KEYWORD_RULES = {
  projects: ["student projects", "project showcase", "projects", "project", "github", "repository", "demo"],
  placements: ["placement cell", "campus placement", "placements", "placement", "internship", "internships", "recruiters", "recruiter", "career", "careers", "job", "jobs", "package", "salary", "hiring", "company", "companies", "recruitment"],
  faculty: ["head of department", "teaching staff", "faculty", "professor", "professors", "teacher", "teachers", "hod", "mentor", "lecturer", "staff"],
  students: ["student life", "student activities", "student clubs", "students", "student", "campus life", "clubs", "achievements", "student chapter", "sports", "cultural", "achievement"],
  academics: ["academic", "academics", "curriculum", "syllabus", "subject", "subjects", "course", "courses", "semester", "undergraduate", "programme", "program", "degree", "timetable", "study", "lab", "labs", "practical", "exam", "exams"],
  research: ["machine learning", "deep learning", "computer vision", "natural language processing", "data science", "data engineering", "research", "innovation", "artificial intelligence", "neural network", "nlp"],
  events: ["guest lecture", "guest lectures", "workshop", "workshops", "seminar", "seminars", "hackathon", "hackathons", "competition", "competitions", "events", "event", "announcement"],
  admissions: ["admission", "admissions", "eligibility", "cutoff", "cut off", "fees", "apply", "application process"],
  contact: ["contact", "email", "phone", "address", "location", "directions", "reach campus", "office hours"],
  home: ["department", "overview", "home", "about", "dypit", "welcome", "ai ds", "artificial intelligence data science"],
  design: ["design system", "design language", "typography", "colour tokens", "color tokens", "interface style"],
};

const IMAGE_ASSETS = {
  students: {
    src: "https://foothill.edu/cs/images/herobanner_computer-science_1600x900-72.jpg",
    alt: "Students collaborating at a computer science workstation",
  },
  faculty: {
    src: "https://mhcognition.com/Media/Learning/bsc-cs-with-ai-and-ds/hands-on-ai-data-labs.webp",
    alt: "An instructor guiding students during a computer lab activity",
  },
  lab: {
    src: "https://engg.jkkn.ac.in/images/courses/me-cse/ai-ml-lab%20copy.png",
    alt: "Students working with computers in an AI and machine learning lab",
  },
  placement: {
    src: "https://career.utdallas.edu/files/2024/05/crop-74-0-1846-1232-0-CL1A6324-93015a013e26c1b0.jpg",
    alt: "Students meeting recruiters at a university career fair",
  },
  event: {
    src: "https://revistaensinosuperior.com.br/wp-content/uploads/2017/05/empreendedorismo.jpg",
    alt: "A lecturer speaking to a university classroom",
  },
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function detectFrames(value) {
  const query = ` ${normalizeText(value)} `;
  if (!query.trim()) return [];
  if (/\bstudent projects?\b/.test(query)) return ["projects", "students"];
  if (/\bplacement (cell|statistics|records|report)\b/.test(query)) return ["placements"];
  if (/\bfaculty (profiles|members|details)\b/.test(query)) return ["faculty"];

  return Object.entries(KEYWORD_RULES)
    .map(([id, terms], index) => {
      const hits = terms.filter((term) => query.includes(` ${term} `));
      const score = hits.reduce((total, term) => total + 2 + term.split(" ").length, 0);
      return { id, score, index };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map((item) => item.id);
}

function localAnswer(question, forcedFrame = null) {
  const q = normalizeText(question);
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)( there)?$/.test(q)) {
    return {
      text: "Hello! Try students, faculty, placements, academics, research, projects, events, admissions or contact to open a department section.",
      frameIds: [],
    };
  }
  if (/^(help|what can you do|how to use)( please)?$/.test(q)) {
    return {
      text: "I use local keyword matching, not an external AI service. Mention a department topic such as students, faculty, placement, curriculum, research, projects, events, admission or contact. You can also use Search or select a section card.",
      frameIds: [],
    };
  }

  const frameIds = forcedFrame ? [forcedFrame] : detectFrames(question);
  if (!frameIds.length) {
    return {
      text: "I couldn't match that phrase to a department section. Try students, faculty, placements, academics, syllabus, laboratories, research, projects, events, admissions or contact.",
      frameIds: [],
    };
  }

  return { text: SECTION_INFO[frameIds[0]].answer, frameIds };
}

function edgePoint(a, b) {
  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const dx = bc.x - ac.x;
  const dy = bc.y - ac.y;
  const t = Math.min(
    (a.w / 2) / Math.max(Math.abs(dx), 0.0001),
    (a.h / 2) / Math.max(Math.abs(dy), 0.0001),
  );
  return { x: ac.x + dx * t, y: ac.y + dy * t };
}

function Icon({ name, size = 18 }) {
  const paths = {
    search: "M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4",
    plus: "M12 5v14M5 12h14",
    minus: "M5 12h14",
    fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
    reset: "M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8M3 3v5h5",
    full: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
    send: "M12 19V5M5 12l7-7 7 7",
    close: "M6 6l12 12M18 6L6 18",
    left: "M15 6l-6 6 6 6",
    arrow: "M5 12h14M13 6l6 6-6 6",
    sliders: "M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6",
    compass: "M12 21a9 9 0 100-18 9 9 0 000 18zM16 8l-2 6-6 2 2-6z",
    palette: "M12 3a9 9 0 100 18c1.1 0 1.8-.9 1.5-1.9-.3-1 .3-2.1 1.4-2.1H17a4 4 0 004-4c0-5-4-10-9-10zM7.5 11h.01M10 7.5h.01M14 7.5h.01M16.5 11h.01",
    layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
    user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
    book: "M5 4h10a4 4 0 014 4v12H9a4 4 0 01-4-4zM5 16a4 4 0 014-4h10",
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.compass} />
    </svg>
  );
}

function NeuralNet() {
  const layers = [[60, 130, 200], [40, 95, 165, 220], [70, 130, 190], [100, 160]];
  const xs = [30, 120, 210, 300];
  const nodes = layers.flatMap((ys, li) => ys.map((y) => ({ x: xs[li], y, li })));
  const lines = [];

  nodes.forEach((a, i) => {
    nodes.forEach((b, j) => {
      if (b.li === a.li + 1 && (i * 7 + j * 3) % 3 !== 0) lines.push([a, b]);
    });
  });

  return (
    <svg viewBox="0 0 330 270" className="ais-net" role="img" aria-label="Neural network illustration">
      <defs>
        <linearGradient id="ais-neural-gradient" x1="0" x2="1">
          <stop offset="0" stopColor="#8B7CFF" />
          <stop offset="1" stopColor="#6EA8FF" />
        </linearGradient>
      </defs>
      {lines.map(([a, b], index) => (
        <line
          key={index}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          className={index % 9 === 0 ? "ais-flow" : ""}
          stroke={index % 9 === 0 ? "url(#ais-neural-gradient)" : "#3a3d52"}
          strokeWidth="0.8"
        />
      ))}
      {nodes.map((node, index) => (
        <circle
          key={index}
          cx={node.x}
          cy={node.y}
          r={index % 4 === 0 ? 5 : 3.5}
          fill={index % 4 === 0 ? "url(#ais-neural-gradient)" : "#2B2E3C"}
          stroke="#8B7CFF"
          strokeOpacity=".6"
        />
      ))}
    </svg>
  );
}

function Placeholder() {
  return <span className="ais-ph">SAMPLE CONTENT</span>;
}

function ImageFeature({ image, eyebrow, title, description }) {
  const asset = IMAGE_ASSETS[image];
  if (!asset) return null;

  return (
    <article className="ais-feature">
      <div className="ais-feature-image">
        <img
          src={asset.src}
          alt={asset.alt}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
        <span>Illustrative university image</span>
      </div>
      <div className="ais-feature-copy">
        {eyebrow && <small className="ais-feature-eyebrow">{eyebrow}</small>}
        <b>{title}</b>
        <p>{description}</p>
      </div>
    </article>
  );
}

function FrameBody({ id, onExplore }) {
  switch (id) {
    case "home":
      return (
        <div className="ais-home">
          <div className="ais-home-copy">
            <p className="ais-eyebrow">DEPARTMENT OF ARTIFICIAL INTELLIGENCE &amp; DATA SCIENCE</p>
            <h2 className="ais-h1">
              Exploring Intelligence.<br />
              <span className="ais-grad">Engineering Tomorrow.</span>
            </h2>
            <p className="ais-body">
              An interconnected ecosystem of learning, research, experimentation and technological innovation.
            </p>
            <p className="ais-muted">Dr. D. Y. Patil Institute of Technology, Pimpri, Pune</p>
            <div className="ais-row">
              <button className="ais-btn primary" onClick={() => onExplore("academics")}>
                Explore the department <Icon name="arrow" size={14} />
              </button>
              <button className="ais-btn" onClick={() => onExplore("students")}>Student life</button>
            </div>
          </div>
          <NeuralNet />
        </div>
      );

    case "academics":
      return (
        <div className="ais-content-stack">
          <div className="ais-rich-grid two">
            <ImageFeature image="lab" eyebrow="LEARN BY DOING" title="Laboratory learning" description="Showcase practical sessions, computing facilities and hands-on subject work." />
            <ImageFeature image="students" eyebrow="ACADEMIC JOURNEY" title="Undergraduate programme" description="B.E. in Artificial Intelligence & Data Science, with curriculum and semester information." />
          </div>
          <ContentList items={["Semester-wise curriculum", "Core and elective subjects", "Laboratory practicals", "Academic calendar and resources"]} />
        </div>
      );

    case "faculty":
      return (
        <div className="ais-content-stack">
          <ImageFeature image="faculty" eyebrow="PEOPLE BEHIND THE LEARNING" title="Faculty & mentors" description="Use this directory for official faculty portraits, designations, qualifications and research interests." />
          <div className="ais-profile-grid">
            {["Head of Department", "Faculty profile", "Faculty profile"].map((role, index) => (
              <article className="ais-profile" key={`${role}-${index}`}>
                <span className="ais-avatar"><Icon name="user" size={18} /></span>
                <b>{role}</b>
                <small>Official name and designation to be added</small>
                <Placeholder />
              </article>
            ))}
          </div>
          <p className="ais-muted">Replace sample profile cards with verified department information. The photograph above is illustrative, not a DYPIT faculty photograph.</p>
        </div>
      );

    case "research": {
      const areas = ["Artificial Intelligence", "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "Data Science", "Data Engineering"];
      const points = [[260, 40], [120, 80], [400, 90], [60, 190], [260, 170], [440, 200], [260, 290]];
      const edges = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 4], [2, 5], [4, 6], [3, 6], [5, 6], [4, 5]];

      return (
        <div className="ais-content-stack">
          <ImageFeature image="lab" eyebrow="EXPERIMENT · BUILD · DISCOVER" title="Research & innovation" description="Connect research themes with faculty interests, student work, publications and laboratory projects." />
          <svg viewBox="0 0 520 330" className="ais-rnet" role="img" aria-label="Connected AI and data science research areas">
            {edges.map(([a, b], index) => (
              <line key={index} x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} stroke="#3a3d52" strokeWidth="1" />
            ))}
            {points.map(([x, y], index) => (
              <g key={index}>
                <circle cx={x} cy={y} r="6" fill={index === 0 ? "#8B7CFF" : "#2B2E3C"} stroke="#8B7CFF" strokeOpacity=".7" />
                <text x={x} y={y + 22} textAnchor="middle" fill="#B0B2C0" fontSize="12">{areas[index]}</text>
              </g>
            ))}
          </svg>
        </div>
      );
    }

    case "projects":
      return (
        <div className="ais-content-stack">
          <ImageFeature image="students" eyebrow="MADE BY STUDENTS" title="Ideas into working projects" description="Showcase applications, prototypes, research demonstrations and hackathon builds." />
          <div className="ais-rich-grid three">
            {["Project showcase", "Research prototypes", "Hackathon builds"].map((title) => (
              <article className="ais-project-card" key={title}>
                <span className="ais-tag">PROJECT ENTRY</span>
                <b>{title}</b>
                <p>Add the real project description, team, stack, screenshots and repository or demo URL.</p>
                <Placeholder />
              </article>
            ))}
          </div>
          <p className="ais-muted">These are content templates, not fabricated student project records.</p>
        </div>
      );

    case "placements":
      return (
        <div className="ais-content-stack">
          <ImageFeature image="placement" eyebrow="CAREER PATHWAYS" title="Prepare for what comes next" description="A place for internship stories, recruiter sessions, career guidance and verified placement outcomes." />
          <div className="ais-stats">
            {["Placement rate", "Highest package", "Recruiters", "Internships"].map((label) => (
              <div className="ais-stat" key={label}><strong>—</strong><small>{label}</small></div>
            ))}
          </div>
          <ContentList items={["Placement preparation", "Internship opportunities", "Recruiter interactions"]} />
          <p className="ais-muted">No placement figures or recruiter names are assumed. Add verified data before publishing.</p>
        </div>
      );

    case "events":
      return (
        <div className="ais-content-stack">
          <ImageFeature image="event" eyebrow="WHAT'S HAPPENING" title="Department events & activities" description="Workshops, seminars, guest lectures, technical competitions and student-led events." />
          <div className="ais-timeline">
            {["Workshop", "Seminar", "Guest lecture", "Hackathon", "Announcement"].map((category) => (
              <div className="ais-tl" key={category}>
                <i />
                <div><small>DATE TO BE ADDED · {category.toUpperCase()}</small><b>Event title to be added</b></div>
                <Placeholder />
              </div>
            ))}
          </div>
        </div>
      );

    case "students":
      return (
        <div className="ais-content-stack">
          <ImageFeature image="students" eyebrow="CAMPUS · COMMUNITY · CURIOSITY" title="A student experience beyond lectures" description="A space to tell the story of student projects, peer learning, clubs, competitions and achievements." />
          <div className="ais-rich-grid three">
            <InfoCard tag="COLLABORATION" title="Learn together" text="Team-based learning, peer support and collaborative problem-solving." />
            <InfoCard tag="COMMUNITY" title="Clubs & chapters" text="Add official technical clubs, student chapters and committee activities." />
            <InfoCard tag="ACHIEVEMENTS" title="Student highlights" text="Celebrate verified competition results, publications, awards and projects." />
          </div>
          <p className="ais-muted">Add authentic photographs and verified club, event and achievement information.</p>
        </div>
      );

    case "admissions":
      return (
        <div className="ais-content-stack">
          <ImageFeature image="faculty" eyebrow="START YOUR JOURNEY" title="Artificial Intelligence & Data Science" description="An admissions information page for prospective students and families." />
          <ContentList items={["Programme overview", "Eligibility criteria", "Application process", "Fees and important dates"]} />
          <p className="ais-muted">Eligibility, cut-offs, fees and dates change. Confirm all information against official institute and admission-authority notices.</p>
        </div>
      );

    case "contact":
      return (
        <div className="ais-contact-panel">
          <span className="ais-contact-mark"><Icon name="book" size={28} /></span>
          <p className="ais-eyebrow">DR. D. Y. PATIL INSTITUTE OF TECHNOLOGY</p>
          <h3 className="ais-h2">Pimpri, Pune</h3>
          <p className="ais-body">Department of Artificial Intelligence &amp; Data Science</p>
          <ContentList items={["Official department email", "Department office phone", "Campus directions", "Institute website"]} />
        </div>
      );

    default:
      return (
        <div className="ais-design">
          <div className="ais-swatches">
            {[["#111218", "Canvas"], ["#1C1E29", "Card"], ["#2B2E3C", "Interactive"], ["#8B7CFF", "Violet"], ["#7367E8", "Indigo"], ["#6EA8FF", "Blue"], ["#B6ACFF", "Lavender"], ["#303241", "Border"]].map(([colour, label]) => (
              <div key={colour}><i style={{ background: colour }} /><small>{label}<br />{colour}</small></div>
            ))}
          </div>
          <h3 className="ais-h2">A connected design system</h3>
          <p className="ais-body">Consistent typography, clear hierarchy and reusable interface components.</p>
          <p className="ais-muted">Canvas · Cards · Inputs · Actions · Navigation</p>
          <div className="ais-row">
            <button className="ais-btn primary">Primary action</button>
            <button className="ais-btn">Secondary action</button>
            <span className="ais-iconbox"><Icon name="palette" /></span>
            <span className="ais-iconbox"><Icon name="layers" /></span>
          </div>
        </div>
      );
  }
}

function ContentList({ items }) {
  return (
    <div className="ais-list">
      {items.map((title, index) => (
        <div className="ais-item" key={title}>
          <span className="ais-idx">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <b>{title}</b>
            <small>Connect verified department information here.</small>
          </div>
          <Placeholder />
        </div>
      ))}
    </div>
  );
}

function InfoCard({ tag, title, text }) {
  return (
    <article className="ais-project-card">
      <span className="ais-tag">{tag}</span>
      <b>{title}</b>
      <p>{text}</p>
    </article>
  );
}

function ToolButton({ icon, label, onClick, pressed }) {
  return (
    <motion.button
      type="button"
      className="ais-icon-button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
    >
      <Icon name={icon} />
    </motion.button>
  );
}

const CSS = `
.ais{--bg:#111218;--bg2:#151720;--bg3:#191b25;--card:#1c1e29;--elev:#242633;--int:#2b2e3c;--bd:#303241;--bds:#292b37;--t1:#f4f4f7;--t2:#b0b2c0;--t3:#85899a;--vio:#8b7cff;--ind:#7367e8;--blu:#6ea8ff;--lav:#b6acff;position:fixed;inset:0;width:100%;height:100vh;height:100dvh;overflow:hidden;background-color:var(--bg);background-image:radial-gradient(circle,rgba(176,178,192,.22) 1px,transparent 1.2px);background-size:19px 19px;color:var(--t1);font-family:"Google Sans","Inter","Roboto",sans-serif;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;overscroll-behavior:none;z-index:1;-webkit-text-size-adjust:100%;text-size-adjust:100%}
.ais *{box-sizing:border-box}.ais button{font:inherit;color:inherit;cursor:pointer}.ais button:disabled{opacity:.45;cursor:not-allowed}.ais.is-panning{cursor:grabbing}
.ais-layer{position:absolute;inset:0 auto auto 0;width:0;height:0;transform-origin:0 0;will-change:transform;opacity:0;transition:opacity .7s ease}.ais.is-ready .ais-layer{opacity:1}.ais-lines{position:absolute;left:-700px;top:-500px;overflow:visible;pointer-events:none}.ais-path{transition:opacity .35s ease}
.ais-frame{position:absolute;display:flex;flex-direction:column;overflow:hidden;background:var(--card);border:1px solid var(--bd);border-radius:18px;cursor:pointer;outline:none;opacity:0;transform:translateY(18px) scale(.985);box-shadow:0 12px 32px rgba(0,0,0,.32);transition:opacity .55s ease,transform .6s cubic-bezier(.22,.8,.2,1),border-color .25s,box-shadow .25s;transition-delay:calc(var(--index)*55ms),calc(var(--index)*55ms),0s,0s;will-change:transform,opacity;backface-visibility:hidden}.ais.is-ready .ais-frame{opacity:1;transform:none}.ais-frame:hover{border-color:#484b62;box-shadow:0 18px 42px rgba(0,0,0,.4)}.ais-frame:focus-visible{border-color:var(--blu);box-shadow:0 0 0 2px rgba(110,168,255,.4)}.ais-frame.active{border-color:var(--vio);box-shadow:0 0 0 1px var(--vio),0 18px 48px rgba(0,0,0,.45);animation:ais-frame-focus 1.8s ease-in-out infinite alternate}@keyframes ais-frame-focus{from{box-shadow:0 0 0 1px rgba(139,124,255,.6),0 16px 44px rgba(0,0,0,.4)}to{box-shadow:0 0 0 2px rgba(139,124,255,.95),0 22px 64px rgba(91,78,220,.22)}}
.ais-frame-head{height:45px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 18px;background:var(--bg3);border-bottom:1px solid var(--bds);font-size:10.5px;letter-spacing:.14em;color:var(--t3);font-weight:650}.ais-frame-head i{width:7px;height:7px;border-radius:50%;background:var(--vio);box-shadow:0 0 12px rgba(139,124,255,.45)}.ais-frame-body{padding:20px;flex:1;min-height:0;overflow:hidden}
.ais-eyebrow{font-size:10px;letter-spacing:.15em;color:var(--lav);font-weight:650;margin:0 0 14px}.ais-h1{font-size:42px;line-height:1.08;letter-spacing:-.035em;margin:0 0 16px;font-weight:620}.ais-h2{font-size:22px;margin:14px 0 5px;font-weight:600}.ais-grad{background:linear-gradient(90deg,var(--vio),var(--blu));background-clip:text;-webkit-background-clip:text;color:transparent}.ais-body{color:var(--t2);font-size:14px;line-height:1.6;margin:0 0 10px}.ais-muted{color:var(--t3);font-size:11.5px;line-height:1.5;margin:9px 0}.ais-home{display:grid;grid-template-columns:1.2fr .9fr;gap:14px;height:100%;align-items:center}.ais-home-copy{min-width:0}.ais-net{width:100%;height:auto;max-height:270px;overflow:visible}.ais-flow{stroke-dasharray:4 10;animation:ais-flow 2.4s linear infinite}@keyframes ais-flow{to{stroke-dashoffset:-56}}
.ais-row{display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin-top:14px}.ais-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--bd);border-radius:999px;background:var(--int);padding:9px 15px;font-size:12px;font-weight:550;transition:background .2s,border-color .2s,transform .2s}.ais-btn:hover{background:#36394a;border-color:#555970;transform:translateY(-1px)}.ais-btn.primary{color:white;background:linear-gradient(100deg,var(--ind),var(--vio));border-color:transparent}.ais-btn.primary:hover{filter:brightness(1.1)}
.ais-list{display:flex;flex-direction:column;gap:8px}.ais-item{display:flex;align-items:center;gap:11px;padding:10px 11px;min-height:48px;border:1px solid var(--bds);border-radius:11px;background:var(--elev)}.ais-item>div{flex:1;min-width:0}.ais-item b{display:block;font-size:12.5px;font-weight:550}.ais-item small{display:block;color:var(--t3);font-size:10.5px;margin-top:2px}.ais-idx{font-size:10px;color:var(--vio);font-weight:700}.ais-avatar{width:34px;height:34px;flex:none;display:grid;place-items:center;border-radius:50%;background:var(--int);color:var(--t3)}.ais-ph{display:inline-block;flex:none;padding:3px 6px;border:1px dashed var(--bd);border-radius:5px;color:var(--t3);font-size:8px;letter-spacing:.08em}.ais-rnet{width:100%;height:100%;min-height:240px}.ais-rnet text{font-family:inherit}.ais-tag{padding:3px 7px;border-radius:5px;background:rgba(139,124,255,.12);color:var(--lav);font-size:9px}.ais-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.ais-stat{padding:10px;background:var(--elev);border:1px solid var(--bds);border-radius:10px}.ais-stat strong{display:block;color:var(--lav);font-size:23px}.ais-stat small{font-size:10px;color:var(--t3)}.ais-timeline{display:flex;flex-direction:column;gap:13px}.ais-tl{display:flex;gap:11px;align-items:center}.ais-tl>i{width:9px;height:9px;flex:none;border:2px solid var(--vio);border-radius:50%;background:var(--card)}.ais-tl>div{flex:1}.ais-tl small{display:block;color:var(--t3);font-size:9px}.ais-tl b{font-size:12px;font-weight:550}.ais-swatches{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.ais-swatches i{display:block;height:34px;border:1px solid var(--bd);border-radius:8px;margin-bottom:4px}.ais-swatches small{font-size:9px;line-height:1.3;color:var(--t3)}.ais-iconbox{width:36px;height:36px;border:1px solid var(--bd);border-radius:10px;display:grid;place-items:center;background:var(--int);color:var(--lav)}
.ais-icon-button{width:35px;height:35px;flex:none;display:grid;place-items:center;border:0;border-radius:9px;background:transparent;color:var(--t2);transition:background .2s,color .2s}.ais-icon-button:hover{background:var(--int);color:var(--t1)}.ais-icon-button:focus-visible,.ais button:focus-visible,.ais input:focus-visible,.ais textarea:focus-visible{outline:2px solid var(--blu);outline-offset:2px}.ais-icon-button.small{width:28px;height:28px}
.ais-toolbar{position:fixed;top:15px;right:15px;z-index:30;display:flex;align-items:center;gap:5px;padding:5px;background:rgba(25,27,37,.9);border:1px solid var(--bd);border-radius:13px;backdrop-filter:blur(16px);font-size:12px;cursor:default;opacity:0;transform:translateY(-9px);transition:opacity .45s .25s,transform .45s .25s}.ais.is-ready .ais-toolbar{opacity:1;transform:none}.ais-toolbar-divider{height:17px;width:1px;flex:none;background:var(--bd);margin:0 3px}.ais-zoom{min-width:39px;text-align:center;color:var(--t2);font-size:11px;font-variant-numeric:tabular-nums}.ais-tools{display:flex;align-items:center;gap:5px;overflow:hidden;white-space:nowrap;padding:2px 0}.ais-tool-toggle{color:var(--lav);background:rgba(139,124,255,.1)}.ais-tool-toggle:hover{background:rgba(139,124,255,.2);color:var(--t1)}.ais-toolbar.open .ais-tool-toggle{background:var(--int);color:var(--t1)}
.ais textarea{flex:1;min-width:0;max-height:104px;resize:none;padding:8px 6px;border:0;background:transparent;color:var(--t1);font:inherit;font-size:12px;line-height:1.45;outline:none!important;user-select:text;-webkit-user-select:text;touch-action:pan-y}.ais-composer{display:flex;align-items:center;gap:6px;background:var(--bg3);border:1px solid var(--bd);transition:border-color .2s,box-shadow .2s}.ais-composer:focus-within{border-color:var(--vio);box-shadow:0 0 0 3px rgba(139,124,255,.15)}.ais-composer-wrap{position:fixed;z-index:40;left:50%;bottom:calc(17px + env(safe-area-inset-bottom));width:min(720px,calc(100vw - 32px));display:flex;flex-direction:column;align-items:stretch;gap:10px;transform:translateX(-50%);pointer-events:none;cursor:default;transition:opacity .3s ease,transform .45s cubic-bezier(.22,.8,.2,1)}.ais-composer-wrap>*{pointer-events:auto}.ais-composer-wrap.hidden{opacity:0;transform:translate(-50%,28px) scale(.97);pointer-events:none}.ais-composer{width:100%;min-height:54px;padding:7px 9px;border-radius:25px;background:rgba(28,30,41,.96);backdrop-filter:blur(16px)}.ais-composer textarea{width:100%;font-size:13px;padding:9px 7px}.ais-input-wrap{position:relative;flex:1;min-width:0;display:flex;align-items:center}.ais-ph-anim{position:absolute;inset:0;display:flex;align-items:center;gap:6px;padding:0 7px;overflow:hidden;white-space:nowrap;color:var(--t3);font-size:13px;pointer-events:none}.ais-ph-lead{flex:none}.ais-ph-word{pointer-events:auto;display:inline-block;padding:2px 0;border:0;background:transparent;color:var(--lav);font-size:13px;font-weight:550;text-align:left;cursor:text;overflow:hidden;text-overflow:ellipsis}.ais-ph-hint{flex:none;margin-left:auto;padding:2px 6px;border:1px solid var(--bd);border-radius:5px;color:var(--t3);font:inherit;font-size:9px;letter-spacing:.06em}.ais-context{flex:none;align-self:center;padding:5px 8px;border-radius:999px;background:rgba(139,124,255,.12);color:var(--lav);font-size:9px;letter-spacing:.08em}.ais-send{width:34px;height:34px;flex:none;display:grid;place-items:center;border:0;border-radius:50%;background:linear-gradient(135deg,var(--ind),var(--vio));color:#fff;transition:transform .2s,filter .2s}.ais-send:hover:not(:disabled){transform:scale(1.06);filter:brightness(1.12)}
.ais-reply{display:flex;align-items:flex-start;gap:10px;padding:12px 10px 12px 14px;border:1px solid rgba(139,124,255,.38);border-radius:16px;background:rgba(25,27,37,.97);backdrop-filter:blur(16px);box-shadow:0 14px 40px rgba(0,0,0,.35);color:var(--t2);font-size:12px;line-height:1.55}.ais-reply p{flex:1;min-width:0;margin:2px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;user-select:text;-webkit-user-select:text}.ais-reply-icon{flex:none;width:26px;height:26px;display:grid;place-items:center;border-radius:8px;background:rgba(139,124,255,.12);color:var(--lav)}
.ais-page-layer{position:fixed!important;inset:0!important;z-index:60!important;display:block!important;overflow:hidden!important;padding:0!important;background:rgba(10,11,17,.98);backdrop-filter:blur(22px);cursor:default;user-select:text;-webkit-user-select:text}.ais-page-card{position:relative!important;display:flex!important;flex-direction:column!important;width:100%!important;height:100vh!important;height:100dvh!important;max-height:none!important;overflow:hidden!important;border:0!important;border-radius:0!important;background:radial-gradient(ellipse at 78% 0%,rgba(115,103,232,.13),transparent 38%),linear-gradient(145deg,#191b26 0%,#111218 68%)!important;box-shadow:none!important}.ais-page-head{position:relative;z-index:2;flex:none;min-height:88px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:calc(17px + env(safe-area-inset-top,0px)) clamp(18px,5vw,76px) 17px;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(17,18,24,.78);backdrop-filter:blur(18px)}.ais-page-brand{display:flex;align-items:center;gap:13px;min-width:0}.ais-mark{width:31px;height:31px;flex:none;display:grid;place-items:center;border-radius:9px;background:linear-gradient(135deg,var(--ind),var(--blu));font-size:11px;font-weight:800}.ais-page-head-copy{display:flex;flex-direction:column;min-width:0}.ais-page-head .ais-eyebrow{margin:0 0 5px;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ais-page-head h2{margin:0;color:var(--t1);font-size:clamp(20px,2.5vw,30px);line-height:1.12;letter-spacing:-.035em}.ais-return-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;flex:none;min-height:42px;padding:9px 15px;border:1px solid rgba(182,172,255,.33);border-radius:999px;background:rgba(139,124,255,.12);color:var(--t1);font-size:11px;font-weight:600;transition:background .22s,border-color .22s,transform .22s;cursor:pointer}.ais-return-btn:hover{transform:translateY(-2px);border-color:var(--vio);background:rgba(139,124,255,.22)}.ais-return-btn kbd{padding:2px 5px;border:1px solid rgba(255,255,255,.13);border-radius:5px;color:var(--t3);font:inherit;font-size:8px}.ais-return-short{display:none}
.ais-page-content{flex:1;min-height:0;width:100%;overflow:auto;padding:clamp(22px,4vw,54px) clamp(18px,7vw,110px) 50px;scrollbar-width:thin;scrollbar-color:var(--int) transparent;touch-action:pan-y;user-select:text;-webkit-user-select:text}.ais-page-content-inner{width:100%;max-width:1320px;margin:0 auto}.ais-page-summary{max-width:900px;margin:0 0 28px;font-size:clamp(14px,1.25vw,17px);line-height:1.75;color:var(--t2)}.ais-page-inner{padding:0;border:0;border-radius:0;background:transparent}.ais-page-inner .ais-content-stack{gap:22px}.ais-page-inner .ais-feature{border-radius:17px;background:rgba(36,38,51,.75)}.ais-page-inner .ais-feature-image{height:clamp(170px,24vw,310px)}.ais-page-inner .ais-feature-copy{padding:18px 20px}.ais-page-inner .ais-feature-copy>b{font-size:clamp(15px,1.35vw,19px)}.ais-page-inner .ais-feature-copy>p{font-size:clamp(11px,1vw,13px);max-width:760px}.ais-page-inner .ais-rich-grid{gap:14px}.ais-page-inner .ais-project-card,.ais-page-inner .ais-profile{padding:18px;border-radius:14px;background:rgba(36,38,51,.72)}.ais-page-inner .ais-project-card>b,.ais-page-inner .ais-profile>b{font-size:14px}.ais-page-inner .ais-project-card>p,.ais-page-inner .ais-profile>small{font-size:11px}.ais-page-inner .ais-item{padding:14px 16px;border-radius:13px}.ais-page-inner .ais-item b{font-size:14px}.ais-page-inner .ais-item small{font-size:11px}.ais-page-inner .ais-stats{gap:12px}.ais-page-inner .ais-stat{padding:17px;border-radius:13px}.ais-page-inner .ais-stat strong{font-size:30px}.ais-page-inner .ais-stat small{font-size:11px}.ais-page-footer{position:relative;z-index:2;flex:none;min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:15px;padding:10px clamp(18px,5vw,76px) calc(10px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(255,255,255,.07);background:rgba(17,18,24,.78);backdrop-filter:blur(18px);color:var(--t3);font-size:9px;letter-spacing:.12em}.ais-return-btn.subtle{min-height:34px;padding:7px 12px;background:transparent;border-color:var(--bd);font-size:10px}.ais-page-content::-webkit-scrollbar{width:7px}.ais-page-content::-webkit-scrollbar-thumb{background:#34374a;border-radius:9px}
.ais-search{position:fixed;z-index:45;top:max(69px,calc(env(safe-area-inset-top,0px) + 54px));right:max(15px,env(safe-area-inset-right,0px));width:min(380px,calc(100vw - 30px));overflow:hidden;border:1px solid var(--bd);border-radius:15px;background:rgba(25,27,37,.98);backdrop-filter:blur(16px);opacity:0;pointer-events:none;transform:translateY(-8px) scale(.985);transition:opacity .2s,transform .2s;cursor:default}.ais-search.open{opacity:1;pointer-events:auto;transform:none}.ais-search-box{display:flex;align-items:center;gap:8px;padding:7px 9px 7px 13px;color:var(--t3)}.ais-search-box input{flex:1;min-width:0;padding:8px 0;border:0;outline:none;background:transparent;color:var(--t1);font:inherit;font-size:13px;user-select:text;-webkit-user-select:text}.ais-search ul{list-style:none;margin:0;padding:6px;border-top:1px solid var(--bds);max-height:calc(100dvh - 190px);overflow-y:auto}.ais-search li button{width:100%;display:flex;flex-direction:column;gap:3px;padding:9px 10px;text-align:left;border:0;border-radius:9px;background:transparent}.ais-search li button:hover{background:var(--int)}.ais-search li b{font-size:12px;font-weight:550}.ais-search li small{font-size:10px;color:var(--t3)}.ais-no-results{padding:12px;color:var(--t3);font-size:11px}
.ais-content-stack{display:flex;flex-direction:column;gap:13px;min-width:0}.ais-rich-grid{display:grid;gap:10px;min-width:0}.ais-rich-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.ais-rich-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.ais-feature{min-width:0;overflow:hidden;border:1px solid var(--bds);border-radius:13px;background:var(--elev)}.ais-feature-image{position:relative;height:150px;overflow:hidden;background:linear-gradient(135deg,#292b3c,#171923)}.ais-feature-image img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .5s cubic-bezier(.2,.8,.2,1)}.ais-feature:hover .ais-feature-image img{transform:scale(1.035)}.ais-feature-image>span{position:absolute;right:7px;bottom:7px;padding:3px 6px;border-radius:5px;background:rgba(8,9,14,.72);color:#d0d0dc;font-size:8px;letter-spacing:.03em}.ais-feature-copy{padding:11px 12px}.ais-feature-eyebrow{display:block;margin-bottom:5px;color:var(--lav);font-size:8px;letter-spacing:.13em;font-weight:700}.ais-feature-copy>b{display:block;color:var(--t1);font-size:13px}.ais-feature-copy>p{margin:5px 0 0;color:var(--t3);font-size:10.5px;line-height:1.5}.ais-profile-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.ais-profile{display:flex;flex-direction:column;align-items:flex-start;gap:7px;padding:12px;border:1px solid var(--bds);border-radius:11px;background:var(--elev)}.ais-profile>b{font-size:11px}.ais-profile>small{color:var(--t3);font-size:9.5px;line-height:1.4}.ais-project-card{display:flex;flex-direction:column;align-items:flex-start;gap:8px;min-width:0;padding:12px;border:1px solid var(--bds);border-radius:11px;background:var(--elev)}.ais-project-card>b{font-size:12px}.ais-project-card>p{margin:0;color:var(--t3);font-size:10px;line-height:1.5}.ais-contact-panel{display:flex;flex-direction:column;align-items:flex-start;gap:7px}.ais-contact-mark{width:58px;height:58px;display:grid;place-items:center;margin-bottom:8px;border:1px solid var(--bd);border-radius:16px;background:var(--elev);color:var(--lav)}.ais-page-inner .ais-home{min-height:300px}.ais-page-inner .ais-rnet{max-height:380px}.ais-page-inner .ais-list{max-width:760px}.ais-page-related{display:flex;flex-direction:column;gap:10px;margin-top:26px}.ais-page-related>span{color:var(--t3);font-size:11px;letter-spacing:.04em}.ais-related-links{display:flex;flex-wrap:wrap;gap:7px}.ais-related-link{display:inline-flex;align-items:center;gap:5px;padding:8px 13px;border:1px solid var(--bd);border-radius:999px;background:rgba(139,124,255,.1);color:var(--lav);font-size:11px;cursor:pointer;transition:border-color .2s,background .2s}.ais-related-link:hover{border-color:var(--vio);background:rgba(139,124,255,.18)}
.ais-travel-indicator{position:fixed;z-index:34;top:76px;left:50%;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 30px);padding:10px 15px;transform:translateX(-50%);border:1px solid rgba(139,124,255,.42);border-radius:999px;background:rgba(22,23,33,.92);backdrop-filter:blur(18px);color:var(--t3);font-size:9px;letter-spacing:.13em;white-space:nowrap;box-shadow:0 12px 36px rgba(0,0,0,.25)}.ais-travel-indicator b{color:var(--lav);font-weight:700}.ais-travel-orbit{width:13px;height:13px;display:grid;place-items:center;border:1px solid rgba(139,124,255,.5);border-radius:50%;animation:ais-orbit 1s linear infinite}.ais-travel-orbit i{width:4px;height:4px;border-radius:50%;background:var(--blu);box-shadow:0 0 8px var(--blu)}.ais-travel-progress{position:absolute;left:16px;right:16px;bottom:3px;height:1px;overflow:hidden;background:rgba(139,124,255,.12)}.ais-travel-progress i{display:block;width:28%;height:100%;background:linear-gradient(90deg,var(--ind),var(--blu));animation:ais-travel-line 1s ease-in-out infinite}@keyframes ais-orbit{to{transform:rotate(360deg)}}@keyframes ais-travel-line{from{transform:translateX(-120%)}to{transform:translateX(420%)}}
/* Responsive controls and full-screen section pages. */
@media(max-width:900px){
  .ais-composer-wrap{width:min(680px,calc(100vw - 32px))}
  .ais-page-inner .ais-rich-grid.three{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:760px){
  .ais-toolbar{top:max(10px,env(safe-area-inset-top,0px));right:max(10px,env(safe-area-inset-right,0px));max-width:calc(100vw - 20px)}
  .ais-tools{flex:0 1 auto;min-width:0;max-width:calc(100vw - 72px);overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch;touch-action:pan-x}
  .ais-tools::-webkit-scrollbar{display:none}
  .ais-toolbar .ais-icon-button{width:34px;height:34px}
  .ais-search{top:max(58px,calc(env(safe-area-inset-top,0px) + 50px));right:max(10px,env(safe-area-inset-right,0px));width:calc(100vw - 20px);max-width:440px}
  .ais-search-box input{font-size:16px}
  .ais-composer-wrap{bottom:calc(12px + env(safe-area-inset-bottom,0px));width:calc(100vw - 24px)}
  .ais-composer{min-height:51px}
  .ais-context,.ais-ph-hint{display:none}
  .ais textarea,.ais-ph-anim,.ais-ph-word{font-size:16px}
  .ais-travel-indicator{top:max(64px,calc(env(safe-area-inset-top,0px) + 54px));font-size:8.5px;max-width:calc(100vw - 20px);padding:9px 12px}
  .ais-page-head{min-height:76px;gap:10px;padding-top:calc(12px + env(safe-area-inset-top,0px));padding-bottom:12px}
  .ais-page-brand{gap:9px}
  .ais-page-head .ais-mark{width:25px;height:25px}
  .ais-page-head h2{font-size:clamp(17px,5vw,22px)}
  .ais-page-head .ais-eyebrow{font-size:8px;letter-spacing:.1em}
  .ais-return-btn{min-height:38px;gap:6px;padding:7px 12px;font-size:11px}
  .ais-return-btn kbd{display:none}
  .ais-page-content{padding-top:22px!important;padding-bottom:34px!important}
  .ais-page-summary{font-size:13.5px;margin-bottom:20px}
  .ais-page-inner .ais-content-stack{gap:16px}
  .ais-page-inner .ais-feature-image{height:clamp(150px,42vw,220px)}
  .ais-page-inner .ais-feature-copy{padding:13px}
  .ais-page-inner .ais-rich-grid.two,.ais-page-inner .ais-rich-grid.three,.ais-page-inner .ais-profile-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .ais-page-inner .ais-project-card,.ais-page-inner .ais-profile{padding:13px}
  .ais-page-inner .ais-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .ais-page-inner .ais-home{grid-template-columns:1fr;min-height:0;gap:18px}
  .ais-page-inner .ais-home .ais-net{max-width:280px;max-height:210px;margin:0 auto}
  .ais-page-inner .ais-h1{font-size:clamp(28px,8vw,39px)}
  .ais-page-inner .ais-rnet{min-height:0;height:auto}
  .ais-page-inner .ais-rnet text{font-size:15px}
  .ais-page-footer{min-height:50px}
  .ais-page-footer>span{font-size:8px}
}
@media(max-width:560px){.ais-return-full{display:none}.ais-return-short{display:inline}}
@media(max-width:480px){
  .ais-page-head .ais-mark{display:none}
  .ais-page-inner .ais-rich-grid.two,.ais-page-inner .ais-rich-grid.three,.ais-page-inner .ais-profile-grid{grid-template-columns:1fr}
  .ais-page-inner .ais-swatches{grid-template-columns:repeat(2,minmax(0,1fr))}
  .ais-page-inner .ais-item{padding:11px 12px;gap:9px}
  .ais-page-content{padding-left:max(14px,env(safe-area-inset-left,0px))!important;padding-right:max(14px,env(safe-area-inset-right,0px))!important}
  .ais-page-head{padding-left:max(14px,env(safe-area-inset-left,0px));padding-right:max(14px,env(safe-area-inset-right,0px))}
  .ais-page-footer{justify-content:flex-end;padding-left:max(14px,env(safe-area-inset-left,0px))!important;padding-right:max(14px,env(safe-area-inset-right,0px))!important}
  .ais-page-footer>span{display:none}
}
@media(max-width:360px){.ais-page-head h2{font-size:16px}.ais-page-inner .ais-h1{font-size:26px}}
@media(max-height:520px){
  .ais-page-head{min-height:52px;padding-top:calc(7px + env(safe-area-inset-top,0px));padding-bottom:7px}
  .ais-page-head h2{font-size:18px}
  .ais-page-head .ais-eyebrow{display:none}
  .ais-return-btn{min-height:34px}
  .ais-page-footer{display:none}
  .ais-page-content{padding-top:16px!important;padding-bottom:20px!important}
  .ais-page-inner .ais-feature-image{height:clamp(120px,30vh,200px)}
  .ais-composer{min-height:46px}
  .ais-composer-wrap{bottom:calc(8px + env(safe-area-inset-bottom,0px));gap:8px}
  .ais-reply{max-height:30dvh}
  .ais-travel-indicator{top:58px}
  .ais-search{top:max(54px,calc(env(safe-area-inset-top,0px) + 48px))}
  .ais-search ul{max-height:calc(100dvh - 130px)}
}

@media(pointer:coarse){.ais-return-btn kbd,.ais-ph-hint{display:none}.ais-icon-button{width:38px;height:38px}.ais-icon-button.small{width:32px;height:32px}.ais-toolbar .ais-icon-button{width:36px;height:36px}.ais-frame:hover:not(.active){border-color:var(--bd);box-shadow:0 12px 32px rgba(0,0,0,.32)}.ais-feature:hover .ais-feature-image img{transform:none}}
@media(prefers-reduced-motion:reduce){.ais *, .ais *::before,.ais *::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}

/* Shared Infinite Space canvas on phones: compact frames, same interactions. */
@media(max-width:640px){
  .ais{background-size:18px 18px}
  .ais-toolbar{top:max(9px,env(safe-area-inset-top,0px));right:max(9px,env(safe-area-inset-right,0px));max-width:calc(100vw - 18px)}
  .ais-tools{max-width:calc(100vw - 72px);overflow-x:auto;scrollbar-width:none;touch-action:pan-x}
  .ais-tools::-webkit-scrollbar{display:none}
  .ais-toolbar .ais-icon-button{width:34px;height:34px}
  .ais-frame{border-radius:15px}
  .ais-frame-head{height:38px;padding:0 13px;font-size:9px}
  .ais-frame-body{padding:14px}
  .ais-composer-wrap{bottom:calc(10px + env(safe-area-inset-bottom,0px));width:calc(100vw - 20px)}
  .ais-composer{min-height:50px}
  .ais-context,.ais-ph-hint{display:none}
  .ais textarea,.ais-ph-anim,.ais-ph-word{font-size:16px}
  .ais-travel-indicator{top:max(58px,calc(env(safe-area-inset-top,0px) + 50px));max-width:calc(100vw - 20px);font-size:8px}
  .ais-search{top:max(56px,calc(env(safe-area-inset-top,0px) + 48px));right:max(9px,env(safe-area-inset-right,0px));width:calc(100vw - 18px)}
  .ais-search-box input{font-size:16px}
}
`;

export default function Home() {
  const workspaceRef = useRef(null);
  const layerRef = useRef(null);
  const composerInputRef = useRef(null);
  const viewRef = useRef({ x: 0, y: 0, z: INITIAL_ZOOM });
  const savedViewRef = useRef(null);
  const dragRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const closeTimerRef = useRef(null);
  const replyTimerRef = useRef(null);
  const cameraTweenRef = useRef(null);
  const navigationTokenRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches,
  );
  const canvasFrames = useMemo(() => (isMobile ? MOBILE_FRAMES : FRAMES), [isMobile]);
  const canvasFrameById = useMemo(
    () => Object.fromEntries(canvasFrames.map((frame) => [frame.id, frame])),
    [canvasFrames],
  );
  const [zoomPercent, setZoomPercent] = useState(80);
  const [active, setActive] = useState(null);
  const [page, setPage] = useState(null);
  const [travelTarget, setTravelTarget] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [prompt, setPrompt] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [reply, setReply] = useState(null);
  const [related, setRelated] = useState([]);
  const [fullScreen, setFullScreen] = useState(false);

  const reducedMotion = useCallback(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const applyView = useCallback(() => {
    const workspace = workspaceRef.current;
    const layer = layerRef.current;
    if (!workspace || !layer) return;
    const { x, y, z } = viewRef.current;
    layer.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${z})`;
    workspace.style.backgroundSize = `${24 * z}px ${24 * z}px`;
    workspace.style.backgroundPosition = `${x}px ${y}px`;
    setZoomPercent(Math.round(z * 100));
  }, []);

  const animateView = useCallback((next, options = {}) => {
    const workspace = workspaceRef.current;
    if (!workspace || !layerRef.current) return Promise.resolve();

    cameraTweenRef.current?.kill();
    if (reducedMotion()) {
      viewRef.current = { ...next };
      applyView();
      workspace.classList.remove("is-moving");
      return Promise.resolve();
    }

    workspace.classList.add("is-moving");
    const camera = { ...viewRef.current };
    const duration = options.duration ?? 1.35;
    const ease = options.ease ?? "power3.inOut";

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        workspace.classList.remove("is-moving");
        cameraTweenRef.current = null;
        resolve();
      };

      cameraTweenRef.current = gsap.to(camera, {
        x: next.x,
        y: next.y,
        z: next.z,
        duration,
        ease,
        onUpdate: () => {
          viewRef.current = { x: camera.x, y: camera.y, z: camera.z };
          applyView();
        },
        onComplete: () => {
          viewRef.current = { ...next };
          applyView();
          finish();
        },
        onInterrupt: finish,
      });
    });
  }, [applyView, reducedMotion]);

  const getViewport = useCallback(() => {
    const workspace = workspaceRef.current;
    return {
      width: workspace?.clientWidth || window.innerWidth,
      height: workspace?.clientHeight || window.innerHeight,
    };
  }, []);

  const getInitialZoom = useCallback(() => {
    const { width, height } = getViewport();
    const scale = Math.min(width / 1440, height / 900);
    return Math.min(1.3, Math.max(INITIAL_ZOOM, INITIAL_ZOOM * scale));
  }, [getViewport]);

  const centerOn = useCallback((rectangles, maxZoom = 1.1) => {
    const { width, height } = getViewport();
    const minX = Math.min(...rectangles.map((r) => r.x));
    const minY = Math.min(...rectangles.map((r) => r.y));
    const maxX = Math.max(...rectangles.map((r) => r.x + r.w));
    const maxY = Math.max(...rectangles.map((r) => r.y + r.h));
    const availableWidth = Math.max(200, width - (width < 640 ? 32 : 72));
    const availableHeight = Math.max(160, height - (height < 520 ? 130 : 230));
    const zoom = Math.max(MIN_ZOOM, Math.min(maxZoom, availableWidth / (maxX - minX), availableHeight / (maxY - minY)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    return { x: width / 2 - centerX * zoom, y: height / 2 - 12 - centerY * zoom, z: zoom };
  }, [getViewport]);

  const resetCanvas = useCallback(() => {
    setActive(null);

    if (isMobile) {
      const { width } = getViewport();
      const homeFrame = canvasFrameById.home;
      const zoom = Math.min(0.98, Math.max(0.48, (width - 24) / homeFrame.w));
      const topOffset = 82;

      void animateView({
        x: width / 2 - (homeFrame.x + homeFrame.w / 2) * zoom,
        y: topOffset - homeFrame.y * zoom,
        z: zoom,
      }, { duration: 0.95, ease: "power3.out" });
      return;
    }

    void animateView(centerOn([canvasFrameById.home], getInitialZoom()));
  }, [animateView, canvasFrameById, centerOn, getInitialZoom, getViewport, isMobile]);

  const fitAll = useCallback(() => {
    if (travelTarget) {
      navigationTokenRef.current += 1;
      setTravelTarget(null);
    }
    setActive(null);
    void animateView(centerOn(canvasFrames, MAX_ZOOM));
  }, [animateView, canvasFrames, centerOn, travelTarget]);

  const openPage = useCallback(async (id) => {
    const frame = canvasFrameById[id];
    if (!frame) return;

    window.clearTimeout(closeTimerRef.current);
    const token = ++navigationTokenRef.current;
    setActive(id);
    setSearchOpen(false);
    setSearchQuery("");
    setToolsOpen(false);

    // Switching from one full-screen desktop section to another.
    if (page) {
      setTravelTarget(null);
      setPage(id);
      return;
    }

    if (!travelTarget) savedViewRef.current = { ...viewRef.current };
    setTravelTarget(id);

    const destination = centerOn([frame], isMobile ? 0.98 : 1.24);
    await animateView(destination, { duration: 1.65, ease: "power3.inOut" });

    if (navigationTokenRef.current !== token) return;
    setTravelTarget(null);
    setPage(id);
  }, [animateView, canvasFrameById, centerOn, isMobile, page, travelTarget]);

  const closePage = useCallback(() => {
    if (!page) return;

    navigationTokenRef.current += 1;
    const previousView = savedViewRef.current;
    savedViewRef.current = null;
    setPage(null);
    setRelated([]);
    setTravelTarget(null);
    setActive(null);
    window.clearTimeout(closeTimerRef.current);

    if (!previousView) return;

    closeTimerRef.current = window.setTimeout(() => {
      void animateView(previousView, { duration: 1.35, ease: "power3.inOut" });
    }, reducedMotion() ? 0 : 170);
  }, [animateView, page, reducedMotion]);

  useLayoutEffect(() => {
    resetCanvas();
  }, [isMobile, resetCanvas]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(replyTimerRef.current);
    cameraTweenRef.current?.kill();
  }, []);

  // Keep desktop camera position sensible across resize and device rotation.
  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const syncMode = () => {
      const nextMobile = media.matches;
      setIsMobile((current) => {
        if (current === nextMobile) return current;
        cameraTweenRef.current?.kill();
        navigationTokenRef.current += 1;
        savedViewRef.current = null;
        return nextMobile;
      });
      setTravelTarget(null);
    };
    syncMode();
    window.addEventListener("resize", syncMode);
    window.addEventListener("orientationchange", syncMode);
    return () => {
      window.removeEventListener("resize", syncMode);
      window.removeEventListener("orientationchange", syncMode);
    };
  }, []);

  // Re-centre the compact frame layout if a phone changes width or orientation.
  useEffect(() => {
    let previousWidth = workspaceRef.current?.clientWidth || window.innerWidth;
    let resizeFrame = null;

    const handleResize = () => {
      const nextWidth = workspaceRef.current?.clientWidth || window.innerWidth;
      if (nextWidth === previousWidth) return;
      previousWidth = nextWidth;

      if (isMobile && !page) {
        if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
        resizeFrame = window.requestAnimationFrame(() => resetCanvas());
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    };
  }, [isMobile, page, resetCanvas]);

  useEffect(() => {
    if (prompt) return undefined;
    const timer = window.setInterval(() => {
      setPlaceholderIndex((index) => (index + 1) % SUGGESTIONS.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [prompt]);

  // Wheel zoom is available on desktop, tablets, and mobile trackpads.
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return undefined;

    const onWheel = (event) => {
      if (event.target.closest("[data-nopan]")) return;
      event.preventDefault();
      if (page) return;

      if (travelTarget) {
        navigationTokenRef.current += 1;
        setTravelTarget(null);
      }

      cameraTweenRef.current?.kill();
      workspace.classList.remove("is-moving");
      const bounds = workspace.getBoundingClientRect();
      const px = event.clientX - bounds.left;
      const py = event.clientY - bounds.top;
      const { x, y, z } = viewRef.current;
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0016))));
      const ratio = nextZoom / z;
      viewRef.current = { x: px - (px - x) * ratio, y: py - (py - y) * ratio, z: nextZoom };
      applyView();
    };

    workspace.addEventListener("wheel", onWheel, { passive: false });
    return () => workspace.removeEventListener("wheel", onWheel);
  }, [applyView, page, travelTarget]);

  const zoomBy = useCallback((factor) => {
    if (travelTarget) {
      navigationTokenRef.current += 1;
      setTravelTarget(null);
    }
    const { width, height } = getViewport();
    const { x, y, z } = viewRef.current;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
    const ratio = nextZoom / z;
    const cx = width / 2;
    const cy = height / 2;
    void animateView({ x: cx - (cx - x) * ratio, y: cy - (cy - y) * ratio, z: nextZoom });
  }, [animateView, getViewport, travelTarget]);

  const onPointerDown = (event) => {
    if (page || event.button > 0 || event.target.closest("button,a,input,textarea,[data-nopan]")) return;
    if (travelTarget) {
      navigationTokenRef.current += 1;
      setTravelTarget(null);
    }
    cameraTweenRef.current?.kill();
    workspaceRef.current?.classList.remove("is-moving");
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: viewRef.current.z };
      dragRef.current = null;
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewRef.current.x,
      originY: viewRef.current.y,
      moved: false,
      frameId: event.target.closest("[data-frame]")?.dataset.frame || null,
    };
  };

  const onPointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId) || page) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()];
      const bounds = workspaceRef.current.getBoundingClientRect();
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinchRef.current.distance));
      const px = (a.x + b.x) / 2 - bounds.left;
      const py = (a.y + b.y) / 2 - bounds.top;
      const { x, y, z } = viewRef.current;
      const ratio = nextZoom / z;
      viewRef.current = { x: px - (px - x) * ratio, y: py - (py - y) * ratio, z: nextZoom };
      applyView();
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const threshold = event.pointerType === "touch" ? 8 : 5;

    if (!drag.moved && Math.hypot(dx, dy) > threshold) {
      drag.moved = true;
      workspaceRef.current?.classList.add("is-panning");
      try { workspaceRef.current?.setPointerCapture(event.pointerId); } catch { /* Pointer capture may be unavailable. */ }
    }

    if (drag.moved) {
      viewRef.current = { ...viewRef.current, x: drag.originX + dx, y: drag.originY + dy };
      applyView();
    }
  };

  const onPointerUp = (event) => {
    const drag = dragRef.current;
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    workspaceRef.current?.classList.remove("is-panning");
    try { workspaceRef.current?.releasePointerCapture(event.pointerId); } catch { /* It may not have been captured. */ }

    if (drag && drag.pointerId === event.pointerId && !drag.moved && !page) {
      if (drag.frameId) openPage(drag.frameId);
      else setActive(null);
    }
    if (drag?.pointerId === event.pointerId) dragRef.current = null;
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (searchOpen) {
        setSearchOpen(false);
        setSearchQuery("");
      } else if (page) closePage();
      else if (toolsOpen) setToolsOpen(false);
      else setReply(null);
    };

    const onFullscreenChange = () => setFullScreen(Boolean(document.fullscreenElement));
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [closePage, page, searchOpen, toolsOpen]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      console.warn("Fullscreen is not available in this browser.", error);
    }
  };

  const ask = useCallback((rawText) => {
    const question = String(rawText || "").trim();
    if (!question) return;

    const response = localAnswer(question);
    window.clearTimeout(replyTimerRef.current);

    const targetFrame = response.frameIds[0];
    if (targetFrame) {
      setReply(null);
      setRelated(response.frameIds.slice(1));
      openPage(targetFrame);
      return;
    }

    setReply({ id: Date.now(), text: response.text });
    replyTimerRef.current = window.setTimeout(() => setReply(null), 9000);
  }, [openPage]);

  const onComposerKeyDown = (event) => {
    if (event.key === "Tab" && !prompt && !event.shiftKey) {
      event.preventDefault();
      setPrompt(SUGGESTIONS[placeholderIndex][0]);
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!prompt.trim()) return;
      ask(prompt);
      setPrompt("");
    }
  };

  const useSuggestion = () => {
    setPrompt(SUGGESTIONS[placeholderIndex][0]);
    composerInputRef.current?.focus();
  };

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return SEARCH_INDEX
      .filter((item) => `${item.title} ${item.text} ${FRAME_BY_ID[item.frame].label}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [searchQuery]);

  const connectionPaths = useMemo(() => (isMobile ? MOBILE_LINKS : LINKS).map(([from, to]) => {
    const start = edgePoint(canvasFrameById[from], canvasFrameById[to]);
    const end = edgePoint(canvasFrameById[to], canvasFrameById[from]);
    const midX = (start.x + end.x) / 2;
    return {
      from,
      to,
      start,
      end,
      path: `M${start.x},${start.y} C${midX},${start.y} ${midX},${end.y} ${end.x},${end.y}`,
      dashed: from === "design",
    };
  }), [canvasFrameById, isMobile]);

  const relatedForPage = page ? related.filter((id) => id !== page) : [];
  const canFullscreen = typeof document !== "undefined" && Boolean(document.fullscreenEnabled);

  return (
    <main
      ref={workspaceRef}
      className={`ais ${ready ? "is-ready" : ""} ${page ? "has-page" : ""} ${travelTarget ? "is-travelling" : ""} ${isMobile ? "is-mobile" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <style>{CSS}</style>

      <div ref={layerRef} className="ais-layer">
        <svg
          className="ais-lines"
          viewBox={isMobile ? "-100 -100 700 4800" : "-700 -500 3300 1700"}
          width={isMobile ? "700" : "3300"}
          height={isMobile ? "4800" : "1700"}
          style={isMobile ? { left: -100, top: -100 } : undefined}
          aria-hidden="true"
        >
          {connectionPaths.map((connection) => {
            const highlighted = active && (connection.from === active || connection.to === active);
            const dimmed = active && !highlighted;
            return (
              <g
                key={`${connection.from}-${connection.to}`}
                className="ais-path"
                style={{ opacity: dimmed ? 0.13 : highlighted ? 1 : 0.5 }}
              >
                <path
                  d={connection.path}
                  fill="none"
                  stroke={highlighted ? "#8B7CFF" : "#4a4d66"}
                  strokeWidth={highlighted ? 2 : 1.2}
                  strokeDasharray={connection.dashed ? "6 8" : undefined}
                />
                <circle cx={connection.start.x} cy={connection.start.y} r={highlighted ? 6 : 4} fill={highlighted ? "#8B7CFF" : "#2B2E3C"} stroke="#8B7CFF" strokeOpacity=".6" />
                <circle cx={connection.end.x} cy={connection.end.y} r={highlighted ? 6 : 4} fill={highlighted ? "#8B7CFF" : "#2B2E3C"} stroke="#8B7CFF" strokeOpacity=".6" />
              </g>
            );
          })}
        </svg>

        {canvasFrames.map((frame, index) => (
          <article
            key={frame.id}
            data-frame={frame.id}
            tabIndex={0}
            aria-label={`${frame.n} ${frame.label}`}
            className={`ais-frame ${active === frame.id ? "active" : ""}`}
            style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h, "--index": index }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && event.target === event.currentTarget) openPage(frame.id);
            }}
          >
            <header className="ais-frame-head"><span>{frame.n} / {frame.label}</span><i /></header>
            <div className="ais-frame-body"><FrameBody id={frame.id} onExplore={openPage} /></div>
          </article>
        ))}
      </div>

      <nav className={`ais-toolbar ${toolsOpen ? "open" : ""}`} data-nopan aria-label="Canvas controls">
        <AnimatePresence initial={false}>
          {toolsOpen && (
            <motion.div
              key="tools"
              id="ais-tools"
              className="ais-tools"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <ToolButton icon="search" label="Search" onClick={() => setSearchOpen(true)} />
              <span className="ais-toolbar-divider" />
              <ToolButton icon="minus" label="Zoom out" onClick={() => zoomBy(1 / 1.25)} />
              <span className="ais-zoom" aria-live="polite">{zoomPercent}%</span>
              <ToolButton icon="plus" label="Zoom in" onClick={() => zoomBy(1.25)} />
              <span className="ais-toolbar-divider" />
              <ToolButton icon="fit" label="Fit all frames" onClick={fitAll} />
              <ToolButton icon="reset" label="Reset canvas" onClick={resetCanvas} />
              {canFullscreen && <ToolButton icon="full" label={fullScreen ? "Exit fullscreen" : "Enter fullscreen"} onClick={toggleFullscreen} pressed={fullScreen} />}
              <span className="ais-toolbar-divider" />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          type="button"
          className="ais-icon-button ais-tool-toggle"
          aria-expanded={toolsOpen}
          aria-controls="ais-tools"
          aria-label={toolsOpen ? "Collapse canvas controls" : "Expand canvas controls"}
          title={toolsOpen ? "Collapse controls" : "Canvas controls"}
          whileTap={{ scale: 0.9 }}
          onClick={() => setToolsOpen((value) => !value)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={toolsOpen ? "close" : "open"}
              style={{ display: "grid" }}
              initial={{ rotate: toolsOpen ? -90 : 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: toolsOpen ? 90 : -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18 }}
            >
              <Icon name={toolsOpen ? "close" : "sliders"} />
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </nav>

      <AnimatePresence>
        {travelTarget && !page && (
          <motion.div
            className="ais-travel-indicator"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            data-nopan
          >
            <span className="ais-travel-orbit"><i /></span>
            <span>TRAVELLING TO <b>{FRAME_BY_ID[travelTarget].label}</b></span>
            <span className="ais-travel-progress"><i /></span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {page && (
          <motion.div
            key={page}
            className="ais-page-layer"
            data-nopan
            role="dialog"
            aria-modal="true"
            aria-labelledby="ais-page-title"
            initial={{ opacity: 0, clipPath: "inset(8% 4% 8% 4% round 24px)" }}
            animate={{ opacity: 1, clipPath: "inset(0% 0% 0% 0% round 0px)" }}
            exit={{ opacity: 0, clipPath: "inset(5% 3% 5% 3% round 22px)" }}
            transition={{ duration: reducedMotion() ? 0.01 : 0.48, ease: EASE }}
          >
            <motion.section
              className="ais-page-card"
              initial={{ y: 28, scale: 0.985, filter: "blur(8px)" }}
              animate={{ y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ y: 18, scale: 0.99, filter: "blur(6px)" }}
              transition={{ duration: reducedMotion() ? 0.01 : 0.52, ease: EASE }}
            >
              <header className="ais-page-head">
                <div className="ais-page-brand">
                  <span className="ais-mark">AI</span>
                  <span className="ais-page-head-copy">
                    <span className="ais-eyebrow">{FRAME_BY_ID[page].n} / {FRAME_BY_ID[page].label}</span>
                    <h2 id="ais-page-title">{SECTION_INFO[page].title}</h2>
                  </span>
                </div>
                <button className="ais-return-btn" onClick={closePage} aria-label="Back to Infinite Space">
                  <Icon name="left" size={16} />
                  <span className="ais-return-full">Back to Infinite Space</span>
                  <span className="ais-return-short">Back</span>
                  <kbd>ESC</kbd>
                </button>
              </header>

              <div className="ais-page-content" key={`content-${page}`}>
                <motion.div
                  className="ais-page-content-inner"
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: reducedMotion() ? 0.01 : 0.48, ease: "easeOut" }}
                >
                  <p className="ais-page-summary">{SECTION_INFO[page].summary}</p>
                  <div className="ais-page-inner"><FrameBody id={page} onExplore={openPage} /></div>

                  {relatedForPage.length > 0 && (
                    <div className="ais-page-related">
                      <span>Related sections</span>
                      <div className="ais-related-links">
                        {relatedForPage.map((frameId) => (
                          <button key={frameId} className="ais-related-link" onClick={() => openPage(frameId)}>
                            {SECTION_INFO[frameId].title} <Icon name="arrow" size={12} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              <footer className="ais-page-footer">
                <span>AI &amp; DS · DYPIT PIMPRI, PUNE</span>
                <button className="ais-return-btn subtle" onClick={closePage}>
                  <Icon name="left" size={14} /> Return to Infinite Space
                </button>
              </footer>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`ais-composer-wrap ${page ? "hidden" : ""}`} data-nopan>
        <AnimatePresence>
          {reply && (
            <motion.div
              key={reply.id}
              className="ais-reply"
              role="status"
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.26, ease: EASE }}
            >
              <span className="ais-reply-icon"><Icon name="compass" size={16} /></span>
              <p>{reply.text}</p>
              <button className="ais-icon-button small" aria-label="Dismiss reply" onClick={() => setReply(null)}>
                <Icon name="close" size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="ais-composer">
          <button className="ais-icon-button" aria-label="Open search" title="Search sections" onClick={() => setSearchOpen(true)}>
            <Icon name="search" />
          </button>
          <div className="ais-input-wrap">
            <textarea
              ref={composerInputRef}
              rows={1}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={onComposerKeyDown}
              aria-label={`Ask the department guide. For example: ${SUGGESTIONS[placeholderIndex][0]}`}
            />
            {!prompt && (
              <div className="ais-ph-anim" aria-hidden="false">
                <span className="ais-ph-lead">Ask or try</span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.button
                    key={SUGGESTIONS[placeholderIndex][0]}
                    type="button"
                    className="ais-ph-word"
                    tabIndex={-1}
                    onClick={useSuggestion}
                    initial={{ y: 14, opacity: 0, filter: "blur(4px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: -14, opacity: 0, filter: "blur(4px)" }}
                    transition={{ duration: reducedMotion() ? 0.01 : 0.34, ease: EASE }}
                  >
                    {SUGGESTIONS[placeholderIndex][0]}
                  </motion.button>
                </AnimatePresence>
                <kbd className="ais-ph-hint">Tab</kbd>
              </div>
            )}
          </div>
          <span className="ais-context" title="Current canvas context">{active ? FRAME_BY_ID[active].label.split(" ")[0] : "ALL"}</span>
          <button
            className="ais-send"
            aria-label="Submit prompt"
            disabled={!prompt.trim()}
            onClick={() => { ask(prompt); setPrompt(""); }}
          >
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>

      <div
        className={`ais-search ${searchOpen ? "open" : ""}`}
        data-nopan
        role="dialog"
        aria-label="Search the department"
        aria-hidden={!searchOpen}
      >
        <div className="ais-search-box">
          <Icon name="search" />
          <input
            autoFocus={searchOpen}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search academics, faculty, research…"
            aria-label="Search sections"
            tabIndex={searchOpen ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchResults[0]) {
                setSearchOpen(false);
                setSearchQuery("");
                openPage(searchResults[0].frame);
              }
            }}
          />
          <button
            className="ais-icon-button small"
            aria-label="Close search"
            onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
            tabIndex={searchOpen ? 0 : -1}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        {searchQuery.trim() && (
          <ul>
            {searchResults.length === 0 && <li className="ais-no-results">No matching sections found.</li>}
            {searchResults.map((result) => (
              <li key={`${result.frame}-${result.title}`}>
                <button onClick={() => { setSearchOpen(false); setSearchQuery(""); openPage(result.frame); }}>
                  <b>{result.title}</b>
                  <small>{FRAME_BY_ID[result.frame].n} · {FRAME_BY_ID[result.frame].label}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
