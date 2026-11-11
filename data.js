// Topic catalogue. Each link: [title, url, type, "paid"?]
// types: course | book | video | article | docs | interactive | tool
window.CATEGORIES = {
  computing:  { label: "Computing" },
  ai:         { label: "AI & Data" },
  math:       { label: "Mathematics" },
  science:    { label: "Science" },
  humanities: { label: "Humanities" },
  creative:   { label: "Creative" },
  meta:       { label: "Meta-learning" },
};

window.TOPICS = [
  // ───────────── Computing ─────────────
  {
    id: "computer-science", title: "Computer Science", cat: "computing",
    summary: "How computation works, from logic gates to compilers. It's the foundation that makes every other programming topic easier.",
    related: ["programming", "algorithms", "operating-systems", "networking", "mathematics"],
    sections: [
      { title: "Start here", note: "A broad, project-driven survey.", links: [
        ["CS50x: Introduction to Computer Science", "https://cs50.harvard.edu/x/", "course"],
        ["The Missing Semester of Your CS Education", "https://missing.csail.mit.edu/", "course"],
      ]},
      { title: "Build a computer from scratch", links: [
        ["Nand2Tetris", "https://www.nand2tetris.org/", "course"],
      ]},
      { title: "Plan the long road", links: [
        ["Teach Yourself Computer Science", "https://teachyourselfcs.com/", "article"],
        ["Structure and Interpretation of Computer Programs", "https://sarabander.github.io/sicp/", "book"],
      ]},
    ],
  },
  {
    id: "programming", title: "Programming", cat: "computing",
    summary: "Turning ideas into working software. Learn one language well, then pick up the habits that carry over to every language.",
    related: ["python", "javascript", "rust", "go", "git", "computer-science"],
    sections: [
      { title: "Practice daily", note: "Small exercises with feedback beat long tutorials.", links: [
        ["Exercism", "https://exercism.org/", "interactive"],
        ["Advent of Code", "https://adventofcode.com/", "interactive"],
        ["Project Euler", "https://projecteuler.net/", "interactive"],
      ]},
      { title: "Learn the craft", links: [
        ["Refactoring.Guru: design patterns & refactoring", "https://refactoring.guru/", "article"],
        ["The Pragmatic Programmer", "https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/", "book", "paid"],
      ]},
    ],
  },
  {
    id: "python", title: "Python", cat: "computing",
    summary: "A readable, general-purpose language used for scripting, the web, data science and machine learning.",
    related: ["programming", "machine-learning", "statistics"],
    sections: [
      { title: "Start here", links: [
        ["The Official Python Tutorial", "https://docs.python.org/3/tutorial/", "docs"],
        ["Automate the Boring Stuff with Python", "https://automatetheboringstuff.com/", "book"],
        ["CS50's Introduction to Programming with Python", "https://cs50.harvard.edu/python/", "course"],
      ]},
      { title: "Practice", links: [
        ["Exercism Python track", "https://exercism.org/tracks/python", "interactive"],
        ["Real Python tutorials", "https://realpython.com/", "article"],
      ]},
      { title: "Go deep", note: "Learn how Python actually works.", links: [
        ["The Python Data Model", "https://docs.python.org/3/reference/datamodel.html", "docs"],
        ["Fluent Python, 2nd Edition", "https://www.oreilly.com/library/view/fluent-python-2nd/9781492056348/", "book", "paid"],
      ]},
    ],
  },
  {
    id: "javascript", title: "JavaScript", cat: "computing",
    summary: "The language of the browser. It now also runs servers, tooling and desktop apps.",
    related: ["programming", "typescript", "web-development", "react"],
    sections: [
      { title: "Start here", links: [
        ["The Modern JavaScript Tutorial", "https://javascript.info/", "book"],
        ["MDN JavaScript Guide", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", "docs"],
      ]},
      { title: "Understand it deeply", links: [
        ["Eloquent JavaScript", "https://eloquentjavascript.net/", "book"],
        ["You Don't Know JS Yet", "https://github.com/getify/You-Dont-Know-JS", "book"],
        ["What the heck is the event loop anyway?", "https://www.youtube.com/watch?v=8aGhZQkoFbQ", "video"],
      ]},
    ],
  },
  {
    id: "typescript", title: "TypeScript", cat: "computing",
    summary: "JavaScript with a static type system. It catches bugs before they ship and makes large codebases easier to navigate.",
    related: ["javascript", "react", "web-development"],
    sections: [
      { title: "Start here", links: [
        ["The TypeScript Handbook", "https://www.typescriptlang.org/docs/handbook/intro.html", "docs"],
        ["TypeScript Playground", "https://www.typescriptlang.org/play", "tool"],
      ]},
      { title: "Level up the type system", links: [
        ["TypeScript Deep Dive", "https://basarat.gitbook.io/typescript/", "book"],
        ["Type Challenges", "https://github.com/type-challenges/type-challenges", "interactive"],
        ["Total TypeScript", "https://www.totaltypescript.com/", "course", "paid"],
      ]},
    ],
  },
  {
    id: "react", title: "React", cat: "computing",
    summary: "A library for building user interfaces from composable components and declarative state.",
    related: ["javascript", "typescript", "web-development", "ui-design"],
    sections: [
      { title: "Start here", links: [
        ["Learn React (official)", "https://react.dev/learn", "docs"],
        ["Thinking in React", "https://react.dev/learn/thinking-in-react", "article"],
      ]},
      { title: "Build real apps", links: [
        ["Full Stack Open", "https://fullstackopen.com/en/", "course"],
        ["A Complete Guide to useEffect", "https://overreacted.io/a-complete-guide-to-useeffect/", "article"],
      ]},
    ],
  },
  {
    id: "web-development", title: "Web Development", cat: "computing",
    summary: "Building sites and apps for the browser: markup, styling, scripting, servers, and how they all connect.",
    related: ["html-css", "javascript", "react", "networking", "databases"],
    sections: [
      { title: "Pick a roadmap", links: [
        ["MDN: Learn web development", "https://developer.mozilla.org/en-US/docs/Learn", "course"],
        ["The Odin Project", "https://www.theodinproject.com/", "course"],
      ]},
      { title: "Go full stack", links: [
        ["Full Stack Open", "https://fullstackopen.com/en/", "course"],
        ["web.dev Learn", "https://web.dev/learn", "course"],
      ]},
      { title: "Make it fast", links: [
        ["High Performance Browser Networking", "https://hpbn.co/", "book"],
      ]},
    ],
  },
  {
    id: "html-css", title: "HTML & CSS", cat: "computing",
    summary: "Structure and style for the web. Semantic markup, layout, responsive design and accessibility.",
    related: ["web-development", "ui-design"],
    sections: [
      { title: "Start here", links: [
        ["Learn HTML (web.dev)", "https://web.dev/learn/html", "course"],
        ["Learn CSS (web.dev)", "https://web.dev/learn/css", "course"],
      ]},
      { title: "Master layout through play", links: [
        ["Flexbox Froggy", "https://flexboxfroggy.com/", "interactive"],
        ["Grid Garden", "https://cssgridgarden.com/", "interactive"],
        ["A Complete Guide to Flexbox", "https://css-tricks.com/snippets/css/a-guide-to-flexbox/", "article"],
      ]},
      { title: "Develop intuition", links: [
        ["Josh W. Comeau's CSS articles", "https://www.joshwcomeau.com/", "article"],
      ]},
    ],
  },
  {
    id: "rust", title: "Rust", cat: "computing",
    summary: "A systems language that offers memory safety without a garbage collector, enforced by its ownership model.",
    related: ["programming", "operating-systems"],
    sections: [
      { title: "Start here", links: [
        ["The Rust Programming Language", "https://doc.rust-lang.org/book/", "book"],
        ["Rustlings", "https://github.com/rust-lang/rustlings", "interactive"],
      ]},
      { title: "Learn by example", links: [
        ["Rust by Example", "https://doc.rust-lang.org/rust-by-example/", "docs"],
        ["Learn Rust With Entirely Too Many Linked Lists", "https://rust-unofficial.github.io/too-many-lists/", "book"],
      ]},
      { title: "Unsafe & internals", links: [
        ["The Rustonomicon", "https://doc.rust-lang.org/nomicon/", "book"],
      ]},
    ],
  },
  {
    id: "go", title: "Go", cat: "computing",
    summary: "A small, fast language built for networked services, with first-class concurrency.",
    related: ["programming", "distributed-systems", "networking"],
    sections: [
      { title: "Start here", links: [
        ["A Tour of Go", "https://go.dev/tour/", "interactive"],
        ["Go by Example", "https://gobyexample.com/", "docs"],
      ]},
      { title: "Write idiomatic Go", links: [
        ["Effective Go", "https://go.dev/doc/effective_go", "docs"],
        ["Learn Go with Tests", "https://quii.gitbook.io/learn-go-with-tests", "book"],
      ]},
    ],
  },
  {
    id: "git", title: "Git", cat: "computing",
    summary: "Version control for tracking changes, collaborating, and undoing mistakes without fear.",
    related: ["programming", "linux"],
    sections: [
      { title: "Start here", links: [
        ["Learn Git Branching", "https://learngitbranching.js.org/", "interactive"],
        ["Pro Git", "https://git-scm.com/book/en/v2", "book"],
      ]},
      { title: "When things go wrong", links: [
        ["Oh Shit, Git!?!", "https://ohshitgit.com/", "article"],
        ["Git from the Bottom Up", "https://jwiegley.github.io/git-from-the-bottom-up/", "article"],
      ]},
    ],
  },
  {
    id: "linux", title: "Linux & the Shell", cat: "computing",
    summary: "The command line, the filesystem, processes and permissions. These are the everyday tools of working programmers.",
    related: ["operating-systems", "git", "computer-science", "networking"],
    sections: [
      { title: "Start here", links: [
        ["Linux Journey", "https://linuxjourney.com/", "course"],
        ["The Linux Command Line (free book)", "https://linuxcommand.org/tlcl.php", "book"],
      ]},
      { title: "Practice under pressure", links: [
        ["OverTheWire: Bandit", "https://overthewire.org/wargames/bandit/", "interactive"],
        ["The Missing Semester", "https://missing.csail.mit.edu/", "course"],
      ]},
    ],
  },
  {
    id: "algorithms", title: "Algorithms & Data Structures", cat: "computing",
    summary: "How to organize data and solve problems efficiently, and how to reason about the cost of a solution.",
    related: ["computer-science", "programming", "mathematics"],
    sections: [
      { title: "See it move", links: [
        ["VisuAlgo", "https://visualgo.net/", "interactive"],
      ]},
      { title: "Learn the canon", links: [
        ["MIT 6.006 Introduction to Algorithms", "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/", "course"],
        ["Algorithms by Jeff Erickson", "https://jeffe.cs.illinois.edu/teaching/algorithms/", "book"],
      ]},
      { title: "Drill problems", links: [
        ["NeetCode roadmap", "https://neetcode.io/", "interactive"],
        ["LeetCode", "https://leetcode.com/", "interactive"],
      ]},
    ],
  },
  {
    id: "databases", title: "Databases & SQL", cat: "computing",
    summary: "Storing, querying and reasoning about data. Covers SQL, indexes, transactions and how databases work inside.",
    related: ["web-development", "distributed-systems", "algorithms"],
    sections: [
      { title: "Learn SQL", links: [
        ["SQLBolt", "https://sqlbolt.com/", "interactive"],
        ["SQL Murder Mystery", "https://mystery.knightlab.com/", "interactive"],
        ["PostgreSQL Tutorial", "https://www.postgresql.org/docs/current/tutorial.html", "docs"],
      ]},
      { title: "Make queries fast", links: [
        ["Use The Index, Luke", "https://use-the-index-luke.com/", "book"],
      ]},
      { title: "How databases work", links: [
        ["CMU 15-445 Database Systems", "https://15445.courses.cs.cmu.edu/", "course"],
      ]},
    ],
  },
  {
    id: "operating-systems", title: "Operating Systems", cat: "computing",
    summary: "Processes, memory, concurrency and filesystems. This is the layer between your code and the hardware.",
    related: ["computer-science", "linux", "rust"],
    sections: [
      { title: "Start here", links: [
        ["Operating Systems: Three Easy Pieces", "https://pages.cs.wisc.edu/~remzi/OSTEP/", "book"],
      ]},
      { title: "Hack on a real kernel", links: [
        ["MIT 6.1810 Operating System Engineering", "https://pdos.csail.mit.edu/6.1810/", "course"],
      ]},
    ],
  },
  {
    id: "networking", title: "Computer Networking", cat: "computing",
    summary: "How bytes get from here to there: TCP/IP, DNS, HTTP, and the sockets underneath them.",
    related: ["computer-science", "web-development", "distributed-systems", "cryptography"],
    sections: [
      { title: "Start here", links: [
        ["How DNS Works (comic)", "https://howdns.works/", "article"],
        ["Computer Networking: A Top-Down Approach", "https://gaia.cs.umass.edu/kurose_ross/", "book"],
      ]},
      { title: "Get hands-on", links: [
        ["Beej's Guide to Network Programming", "https://beej.us/guide/bgnet/", "book"],
        ["High Performance Browser Networking", "https://hpbn.co/", "book"],
      ]},
    ],
  },
  {
    id: "distributed-systems", title: "Distributed Systems", cat: "computing",
    summary: "Making many machines act like one reliable system despite failures, latency and partitions.",
    related: ["databases", "networking", "go"],
    sections: [
      { title: "Start here", links: [
        ["The Secret Lives of Data: Raft", "https://thesecretlivesofdata.com/raft/", "interactive"],
        ["Designing Data-Intensive Applications", "https://dataintensive.net/", "book", "paid"],
      ]},
      { title: "Go deep", links: [
        ["MIT 6.5840 Distributed Systems", "https://pdos.csail.mit.edu/6.824/", "course"],
        ["Jepsen analyses", "https://jepsen.io/analyses", "article"],
      ]},
    ],
  },
  {
    id: "cryptography", title: "Cryptography", cat: "computing",
    summary: "The math and engineering of keeping secrets and proving identity. Also how it breaks when done wrong.",
    related: ["networking", "mathematics"],
    sections: [
      { title: "Start here", links: [
        ["Crypto 101", "https://www.crypto101.io/", "book"],
        ["Cryptography I (Dan Boneh)", "https://www.coursera.org/learn/crypto", "course"],
      ]},
      { title: "Break things", links: [
        ["The Cryptopals Crypto Challenges", "https://cryptopals.com/", "interactive"],
        ["The Joy of Cryptography", "https://joyofcryptography.com/", "book"],
      ]},
    ],
  },

  // ───────────── AI & Data ─────────────
  {
    id: "machine-learning", title: "Machine Learning", cat: "ai",
    summary: "Teaching computers to find patterns in data and make predictions, without hand-writing the rules.",
    related: ["deep-learning", "statistics", "linear-algebra", "python", "calculus"],
    sections: [
      { title: "Start here", links: [
        ["Google Machine Learning Crash Course", "https://developers.google.com/machine-learning/crash-course", "course"],
        ["Machine Learning Specialization (Andrew Ng)", "https://www.coursera.org/specializations/machine-learning-introduction", "course"],
      ]},
      { title: "Practice", links: [
        ["Kaggle Learn", "https://www.kaggle.com/learn", "interactive"],
        ["scikit-learn tutorials", "https://scikit-learn.org/stable/tutorial/index.html", "docs"],
      ]},
      { title: "Theory", links: [
        ["An Introduction to Statistical Learning", "https://www.statlearning.com/", "book"],
        ["The Elements of Statistical Learning", "https://hastie.su.domains/ElemStatLearn/", "book"],
      ]},
    ],
  },
  {
    id: "deep-learning", title: "Deep Learning", cat: "ai",
    summary: "Neural networks with many layers. They power modern vision, speech and language models.",
    related: ["machine-learning", "linear-algebra", "calculus", "neuroscience"],
    sections: [
      { title: "Build intuition", links: [
        ["3Blue1Brown: Neural Networks", "https://www.3blue1brown.com/topics/neural-networks", "video"],
        ["The Illustrated Transformer", "https://jalammar.github.io/illustrated-transformer/", "article"],
      ]},
      { title: "Build it yourself", links: [
        ["Neural Networks: Zero to Hero", "https://karpathy.ai/zero-to-hero.html", "video"],
        ["Practical Deep Learning for Coders", "https://course.fast.ai/", "course"],
        ["Dive into Deep Learning", "https://d2l.ai/", "book"],
      ]},
      { title: "Theory", links: [
        ["Deep Learning (Goodfellow, Bengio, Courville)", "https://www.deeplearningbook.org/", "book"],
      ]},
    ],
  },

  // ───────────── Mathematics ─────────────
  {
    id: "mathematics", title: "Mathematics", cat: "math",
    summary: "The language of patterns, structure and proof, and the backbone of science and computing.",
    related: ["linear-algebra", "calculus", "statistics", "algorithms", "physics"],
    sections: [
      { title: "Fill the gaps", links: [
        ["Khan Academy Math", "https://www.khanacademy.org/math", "course"],
        ["BetterExplained", "https://betterexplained.com/", "article"],
      ]},
      { title: "Learn to prove things", links: [
        ["Book of Proof", "https://richardhammack.github.io/BookOfProof/", "book"],
        ["MIT 6.042J Mathematics for Computer Science", "https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/", "course"],
      ]},
    ],
  },
  {
    id: "linear-algebra", title: "Linear Algebra", cat: "math",
    summary: "Vectors, matrices and linear maps. They are the geometry behind graphics, physics and machine learning.",
    related: ["mathematics", "machine-learning", "deep-learning", "quantum-mechanics"],
    sections: [
      { title: "See it first", links: [
        ["Essence of Linear Algebra", "https://www.3blue1brown.com/topics/linear-algebra", "video"],
        ["Immersive Linear Algebra", "https://immersivemath.com/ila/index.html", "book"],
      ]},
      { title: "Learn it properly", links: [
        ["MIT 18.06 Linear Algebra (Gilbert Strang)", "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/", "course"],
        ["Linear Algebra Done Right", "https://linear.axler.net/", "book"],
      ]},
    ],
  },
  {
    id: "calculus", title: "Calculus", cat: "math",
    summary: "The mathematics of change and accumulation: derivatives, integrals and limits.",
    related: ["mathematics", "physics", "machine-learning"],
    sections: [
      { title: "See it first", links: [
        ["Essence of Calculus", "https://www.3blue1brown.com/topics/calculus", "video"],
        ["Khan Academy Calculus 1", "https://www.khanacademy.org/math/calculus-1", "course"],
      ]},
      { title: "Learn it properly", links: [
        ["OpenStax Calculus Volume 1", "https://openstax.org/details/books/calculus-volume-1", "book"],
        ["MIT 18.01SC Single Variable Calculus", "https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/", "course"],
      ]},
    ],
  },
  {
    id: "statistics", title: "Statistics & Probability", cat: "math",
    summary: "Reasoning under uncertainty: drawing conclusions from data and judging how confident to be.",
    related: ["mathematics", "machine-learning", "economics", "python"],
    sections: [
      { title: "Build intuition", links: [
        ["Seeing Theory", "https://seeing-theory.brown.edu/", "interactive"],
        ["Khan Academy Statistics & Probability", "https://www.khanacademy.org/math/statistics-probability", "course"],
      ]},
      { title: "Go further", links: [
        ["OpenIntro Statistics", "https://www.openintro.org/book/os/", "book"],
        ["Statistical Rethinking", "https://xcelab.net/rm/", "book"],
      ]},
    ],
  },

  // ───────────── Science ─────────────
  {
    id: "physics", title: "Physics", cat: "science",
    summary: "The fundamental rules of matter, energy, space and time, from falling apples to galaxies.",
    related: ["mathematics", "calculus", "quantum-mechanics", "chemistry", "astronomy"],
    sections: [
      { title: "Start here", links: [
        ["Khan Academy Physics", "https://www.khanacademy.org/science/physics", "course"],
        ["PhET Interactive Simulations", "https://phet.colorado.edu/", "interactive"],
      ]},
      { title: "Learn it properly", links: [
        ["OpenStax University Physics", "https://openstax.org/details/books/university-physics-volume-1", "book"],
        ["The Feynman Lectures on Physics", "https://www.feynmanlectures.caltech.edu/", "book"],
      ]},
      { title: "The theoretical side", links: [
        ["The Theoretical Minimum", "https://theoreticalminimum.com/", "course"],
      ]},
    ],
  },
  {
    id: "quantum-mechanics", title: "Quantum Mechanics", cat: "science",
    summary: "The strange, precise rules of the very small. They underpin chemistry, electronics and quantum computing.",
    related: ["physics", "linear-algebra", "chemistry"],
    sections: [
      { title: "Start here", links: [
        ["Quantum Country", "https://quantum.country/", "book"],
      ]},
      { title: "Learn it properly", links: [
        ["MIT 8.04 Quantum Physics I", "https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2016/", "course"],
        ["The Theoretical Minimum: Quantum Mechanics", "https://theoreticalminimum.com/courses/quantum-mechanics/2012/winter", "video"],
      ]},
    ],
  },
  {
    id: "chemistry", title: "Chemistry", cat: "science",
    summary: "How atoms bond, react and arrange themselves into everything around us.",
    related: ["physics", "biology", "quantum-mechanics"],
    sections: [
      { title: "Start here", links: [
        ["Khan Academy Chemistry", "https://www.khanacademy.org/science/chemistry", "course"],
        ["Ptable: interactive periodic table", "https://ptable.com/", "tool"],
      ]},
      { title: "Learn it properly", links: [
        ["OpenStax Chemistry 2e", "https://openstax.org/details/books/chemistry-2e", "book"],
      ]},
    ],
  },
  {
    id: "biology", title: "Biology", cat: "science",
    summary: "The study of living things, from molecules and cells to ecosystems and evolution.",
    related: ["chemistry", "neuroscience"],
    sections: [
      { title: "Start here", links: [
        ["Khan Academy Biology", "https://www.khanacademy.org/science/biology", "course"],
        ["Learn.Genetics", "https://learn.genetics.utah.edu/", "interactive"],
      ]},
      { title: "Learn it properly", links: [
        ["OpenStax Biology 2e", "https://openstax.org/details/books/biology-2e", "book"],
        ["HHMI BioInteractive", "https://www.biointeractive.org/", "interactive"],
      ]},
    ],
  },
  {
    id: "neuroscience", title: "Neuroscience", cat: "science",
    summary: "How the nervous system produces sensation, memory, movement and thought.",
    related: ["biology", "deep-learning", "learning-how-to-learn", "philosophy"],
    sections: [
      { title: "Start here", links: [
        ["BrainFacts.org", "https://www.brainfacts.org/", "article"],
        ["Neuroscience Online (UTHealth)", "https://nba.uth.tmc.edu/neuroscience/", "book"],
      ]},
      { title: "Computational neuroscience", links: [
        ["Neuromatch Academy", "https://compneuro.neuromatch.io/", "course"],
      ]},
    ],
  },
  {
    id: "astronomy", title: "Astronomy", cat: "science",
    summary: "Stars, planets, galaxies and the history of the universe, and how we know any of it.",
    related: ["physics"],
    sections: [
      { title: "Start here", links: [
        ["OpenStax Astronomy 2e", "https://openstax.org/details/books/astronomy-2e", "book"],
        ["NASA Science", "https://science.nasa.gov/", "article"],
      ]},
      { title: "Look up", links: [
        ["Stellarium Web", "https://stellarium-web.org/", "tool"],
      ]},
    ],
  },

  // ───────────── Humanities ─────────────
  {
    id: "philosophy", title: "Philosophy", cat: "humanities",
    summary: "Careful thinking about knowledge, mind, ethics and meaning, and about how to argue well.",
    related: ["writing", "neuroscience", "economics"],
    sections: [
      { title: "Start here", links: [
        ["Philosophize This!", "https://www.philosophizethis.org/", "video"],
        ["Internet Encyclopedia of Philosophy", "https://iep.utm.edu/", "article"],
      ]},
      { title: "Go deep", links: [
        ["Stanford Encyclopedia of Philosophy", "https://plato.stanford.edu/", "article"],
      ]},
    ],
  },
  {
    id: "economics", title: "Economics", cat: "humanities",
    summary: "How people, firms and governments make choices under scarcity, and what follows from those choices.",
    related: ["statistics", "philosophy"],
    sections: [
      { title: "Start here", links: [
        ["Marginal Revolution University", "https://mru.org/", "video"],
        ["Khan Academy Economics", "https://www.khanacademy.org/economics-finance-domain", "course"],
      ]},
      { title: "Learn it properly", links: [
        ["CORE: The Economy", "https://www.core-econ.org/", "book"],
        ["Our World in Data", "https://ourworldindata.org/", "article"],
      ]},
    ],
  },
  {
    id: "writing", title: "Writing", cat: "humanities",
    summary: "Saying what you mean clearly and briefly. Clear writing comes from clear thinking.",
    related: ["philosophy", "learning-how-to-learn"],
    sections: [
      { title: "Principles", links: [
        ["Writing, Briefly (Paul Graham)", "https://paulgraham.com/writing44.html", "article"],
        ["Politics and the English Language (Orwell)", "https://www.orwellfoundation.com/the-orwell-foundation/orwell/essays-and-other-works/politics-and-the-english-language/", "article"],
        ["The Elements of Style", "https://www.gutenberg.org/ebooks/37134", "book"],
      ]},
      { title: "Reference", links: [
        ["Purdue Online Writing Lab", "https://owl.purdue.edu/owl/purdue_owl.html", "docs"],
      ]},
    ],
  },

  // ───────────── Creative ─────────────
  {
    id: "music-theory", title: "Music Theory", cat: "creative",
    summary: "Notes, scales, chords and rhythm. These are the patterns behind music you love.",
    related: ["mathematics"],
    sections: [
      { title: "Start here", links: [
        ["Learning Music (Ableton)", "https://learningmusic.ableton.com/", "interactive"],
        ["musictheory.net", "https://www.musictheory.net/", "interactive"],
      ]},
      { title: "Go further", links: [
        ["Lightnote", "https://www.lightnote.co/", "interactive"],
        ["Open Music Theory", "https://viva.pressbooks.pub/openmusictheory/", "book"],
      ]},
    ],
  },
  {
    id: "drawing", title: "Drawing", cat: "creative",
    summary: "Seeing shapes, form and light, and getting them onto the page. Drawing is a skill you build with deliberate practice.",
    related: ["ui-design"],
    sections: [
      { title: "Fundamentals", links: [
        ["Drawabox", "https://drawabox.com/", "course"],
        ["Ctrl+Paint", "https://www.ctrlpaint.com/", "video"],
      ]},
      { title: "Figure & gesture", links: [
        ["Proko", "https://www.proko.com/", "video"],
        ["Line of Action: timed gesture practice", "https://line-of-action.com/", "tool"],
      ]},
    ],
  },
  {
    id: "ui-design", title: "UI & UX Design", cat: "creative",
    summary: "Designing interfaces that are clear, usable and good to look at.",
    related: ["html-css", "react", "drawing"],
    sections: [
      { title: "Principles", links: [
        ["Laws of UX", "https://lawsofux.com/", "article"],
        ["10 Usability Heuristics (NN/g)", "https://www.nngroup.com/articles/ten-usability-heuristics/", "article"],
      ]},
      { title: "Practical craft", links: [
        ["Refactoring UI", "https://www.refactoringui.com/", "book", "paid"],
      ]},
      { title: "Design systems", links: [
        ["Apple Human Interface Guidelines", "https://developer.apple.com/design/human-interface-guidelines", "docs"],
        ["Material Design 3", "https://m3.material.io/", "docs"],
      ]},
    ],
  },

  // ───────────── Meta ─────────────
  {
    id: "learning-how-to-learn", title: "Learning How to Learn", cat: "meta",
    summary: "Spaced repetition, retrieval practice and focus: the skill that makes every other skill cheaper.",
    related: ["neuroscience", "writing", "programming"],
    sections: [
      { title: "Start here", links: [
        ["Learning How to Learn (Coursera)", "https://www.coursera.org/learn/learning-how-to-learn", "course"],
        ["How To Remember Anything Forever-ish", "https://ncase.me/remember/", "interactive"],
      ]},
      { title: "Spaced repetition", links: [
        ["Augmenting Long-term Memory (Michael Nielsen)", "https://augmentingcognition.com/ltm.html", "article"],
        ["Spaced Repetition for Efficient Learning (Gwern)", "https://gwern.net/spaced-repetition", "article"],
        ["Anki", "https://apps.ankiweb.net/", "tool"],
      ]},
    ],
  },
];
