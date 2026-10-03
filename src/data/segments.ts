export type Segment = {
  name: string;
  code: string;
  short: string;
  description: string;
  whatWeDo?: string[];
};

export const segments: Segment[] = [
  {
    name: "App Development",
    code: "APP",
    short: "Bring useful ideas to life.",
    description:
      "The App Development segment of NITER Computer Club (NCC) is a platform where passionate student developers bring their ideas to life through mobile and web applications. This segment nurtures hands-on problem-solving skills by encouraging participants to design, build, and present functional apps that address real-world challenges. Whether it's Android development, cross-platform solutions, or innovative UI/UX design, this segment pushes students beyond the classroom and into the world of practical software creation. It stands as a space where creativity meets code — and where the next big idea from NITER takes its first step.",
  },
  {
    name: "Web Development",
    code: "WEB",
    short: "Build for the open web.",
    description:
      "The Web Development segment of NITER Computer Club (NCC) is where students turn ideas into fully functional websites and web applications. From crafting clean, responsive front-end interfaces to building powerful back-end systems, this segment covers the full spectrum of modern web development. It serves as a hands-on learning ground where students explore real-world technologies, collaborate on projects, and sharpen the skills needed to thrive in today's tech-driven world — one line of code at a time.",
  },
  {
    name: "Cybersecurity",
    code: "SEC",
    short: "Learn to think defensively.",
    description:
      "The Cyber Security segment of NITER Computer Club (NCC) is a platform where curious minds transform into security enthusiasts who protect, defend, and ethically hack. This segment nurtures hands-on defensive and offensive skills by encouraging participants to set up hacking labs, solve real-world security challenges, and compete in capture-the-flag (CTF) events. Whether it's thinking like an attacker, learning digital forensics, building a secure mindset from zero experience, or participating in internal CTF showdowns, this segment pushes students beyond textbooks and into the real battlefield of cyber threats. It stands as a space where curiosity meets security — and where the next generation of cybersecurity defenders from NITER takes their first step.",
  },
  {
    name: "Robotics",
    code: "ROB",
    short: "Turn code into motion.",
    description:
      "NCC Robotics is one of the specialized segments of the NITER Computer Club (NCC), focused on robotics engineering, automation, embedded systems, and hands-on project development. The segment brings together students passionate about building and programming robots, exploring the intersection of hardware and software to create innovative robotic solutions.",
    whatWeDo: [
      "Robotics Engineering: Design, build, and program robots using cutting-edge technologies.",
      "Automation & Embedded Systems: Work with microcontrollers, sensors, and actuators to create automated systems.",
      "Hands-on Project Development: Collaborate on real-world robotics projects from concept to prototype.",
      "Sponsored Workshops & Events: Organize technical events like X-Tech Studio 3.0 with industry sponsors such as Axvero Automation and Aloron Projukti.",
      "Skill Development: Learn robotics fundamentals, programming, and hardware integration through practical projects.",
    ],
  },
  {
    name: "Competitive Programming",
    code: "CP",
    short: "Solve. Optimize. Compete.",
    description:
      "NCC Competitive Programming is one of the specialized segments of the NITER Computer Club (NCC), focused on algorithmic problem solving, coding contests, and practice sessions for competitive programming platforms. The segment helps students sharpen their logical thinking, master data structures and algorithms, and compete in national and international programming contests.",
  },
  {
    name: "Graphics Design",
    code: "GFX",
    short: "Make ideas visible.",
    description:
      "The Graphics Design segment of NITER Computer Club (NCC) is a creative hub where visual storytelling meets digital artistry. This segment focuses on visual design, UI/UX, branding, digital illustration, and creative visual communication — empowering students to express ideas through compelling imagery and design.",
  },
  {
    name: "Gaming",
    code: "PLAY",
    short: "Compete. Connect. Play.",
    description:
      "The Gaming segment of NITER Computer Club (NCC) is where gaming enthusiasm meets organized competition. This segment brings together gamers and esports enthusiasts to participate in structured gaming tournaments, from FIFA and Call of Duty to Valorant and other popular titles. The segment organizes flagship events like Bijoy NITER Gaming Fest, providing a platform for students to showcase their skills, compete for prizes, and build a vibrant gaming community at NITER.",
  },
];

export const departments = [
  { code: "CSE", name: "Computer Science and Engineering" },
  { code: "EEE", name: "Electrical and Electronic Engineering" },
  { code: "Textile Engineering", name: "Textile Engineering" },
  { code: "IPE", name: "Industrial and Production Engineering" },
  { code: "FDAE", name: "Fashion Design and Apparel Engineering" },
];
