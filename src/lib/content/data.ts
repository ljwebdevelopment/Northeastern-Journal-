import type {
  Article,
  Author,
  Book,
  Category,
  Conversation,
  NewsletterIssue,
  Video,
} from "./types";

const img = (seed: string, w = 1200, h = 800) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const categories: Category[] = [
  { slug: "politics", name: "Politics", description: "Civic power, policy, and the people it affects." },
  { slug: "community", name: "Community", description: "The people and institutions shaping daily life." },
  { slug: "education", name: "Education", description: "Schools, learning, and the future of our classrooms." },
  { slug: "faith", name: "Faith", description: "Belief, congregation, and moral life in the region." },
  { slug: "culture", name: "Culture", description: "Art, tradition, and the stories we tell each other." },
  { slug: "history", name: "History", description: "The long memory of a place and its people." },
  { slug: "opinion", name: "Opinion", description: "Argued perspectives from our contributors." },
  { slug: "editorial", name: "Editorial", description: "The Journal's institutional voice." },
  { slug: "family-perspectives", name: "Family Perspectives", description: "Generational viewpoints from the Journal family." },
  { slug: "interviews", name: "Interviews", description: "Conversations with the people making news." },
  { slug: "books", name: "Books", description: "Reviews, excerpts, and reading recommendations." },
  { slug: "local-news", name: "Local News", description: "Reporting from our home communities." },
  { slug: "national-news", name: "National News", description: "The stories shaping the country." },
  { slug: "world-news", name: "World News", description: "Dispatches beyond our borders." },
  { slug: "events", name: "Events", description: "Gatherings, forums, and civic calendars." },
  { slug: "community-voices", name: "Community Voices", description: "Reader-submitted letters and essays." },
];

export const authors: Author[] = [
  {
    slug: "cherokee-nana",
    name: "Cherokee Nana",
    role: "Founding Columnist",
    photo: img("cherokee-nana", 800, 800),
    bio: "The Journal's founding voice, writing on family, faith, and civic life for three generations of readers.",
    longBio:
      "Cherokee Nana has written for the Journal since its earliest days, chronicling the life of the community through decades of change. Her column blends personal memory with civic observation, and her Sunday letters remain the publication's most-read feature. This biography is placeholder text prepared for the rebuild and does not reproduce any existing published material.",
    location: "Northeastern Region",
    email: "nana@northeasternjournal.com",
    website: "https://northeasternjournal.com/cherokee-nana",
    featuredQuote:
      "Listening is the first civic duty. Everything I've ever written started with sitting still long enough to hear someone else's version of the truth.",
    social: {
      substack: "https://substack.com/@example",
      youtube: "https://youtube.com/@example",
      x: "https://x.com/example",
      facebook: "https://facebook.com/example",
      instagram: "https://instagram.com/example",
    },
    professionalLinks: [
      {
        id: "nana-syn-1",
        kind: "syndicated",
        title: "The Porch Light Letters",
        outlet: "Regional Wire Syndicate",
        url: "https://example.com/syndicated/porch-light",
        year: "2024",
        description:
          "Placeholder entry for a nationally syndicated column, prepared for the rebuild.",
      },
      {
        id: "nana-pub-1",
        kind: "publication",
        title: "What a Small Town Owes Its Elders",
        outlet: "The Civic Review",
        url: "https://example.com/publications/small-town-elders",
        year: "2023",
      },
      {
        id: "nana-award-1",
        kind: "award",
        title: "Community Voice of the Year",
        outlet: "Northeastern Press Association",
        year: "2022",
      },
      {
        id: "nana-press-1",
        kind: "press",
        title: "On Family, Memory, and the Sunday Letter",
        outlet: "Public Radio Hour",
        url: "https://example.com/press/sunday-letter-interview",
        year: "2024",
      },
      {
        id: "nana-portfolio-1",
        kind: "portfolio",
        title: "Selected Essays, 1991–Present",
        url: "https://example.com/portfolio/cherokee-nana",
      },
    ],
    relatedTopics: ["family-perspectives", "faith", "history", "community"],
    joinedAt: "1991-03-01",
  },
  {
    slug: "miles-carter",
    name: "Miles Carter",
    role: "Politics Editor",
    photo: img("miles-carter", 800, 800),
    bio: "Covers statehouse politics and civic institutions with an eye toward accountability.",
    longBio:
      "Miles Carter joined the Journal after a decade covering local government. He focuses on how policy decisions ripple through everyday life. Placeholder biography for the rebuild.",
    location: "State Capitol Bureau",
    website: "https://example.com/miles-carter",
    featuredQuote:
      "Accountability reporting is just patience with a deadline attached.",
    social: {
      x: "https://x.com/example",
      substack: "https://substack.com/@example",
      linkedin: "https://linkedin.com/in/example",
    },
    professionalLinks: [
      {
        id: "miles-pub-1",
        kind: "publication",
        title: "The Budget Nobody Read",
        outlet: "National Policy Monthly",
        url: "https://example.com/publications/budget-nobody-read",
        year: "2024",
      },
      {
        id: "miles-award-1",
        kind: "award",
        title: "Statehouse Reporting Citation",
        outlet: "Regional Editors Guild",
        year: "2023",
      },
    ],
    relatedTopics: ["politics", "local-news", "national-news"],
    joinedAt: "2016-09-01",
  },
  {
    slug: "renata-oyelaran",
    name: "Renata Oyelaran",
    role: "Culture Writer",
    photo: img("renata-oyelaran", 800, 800),
    bio: "Writes on art, tradition, and the region's cultural institutions.",
    longBio:
      "Renata Oyelaran covers gallery openings, community theater, and the small cultural moments that define neighborhoods. Placeholder biography for the rebuild.",
    location: "Main Street Arts District",
    featuredQuote:
      "Culture is what a place keeps doing when nobody is reporting on it.",
    social: {
      instagram: "https://instagram.com/example",
      youtube: "https://youtube.com/@example",
      tiktok: "https://tiktok.com/@example",
    },
    professionalLinks: [
      {
        id: "renata-pub-1",
        kind: "publication",
        title: "The Long Table: Notes on a Main Street",
        outlet: "Arts Quarterly",
        url: "https://example.com/publications/long-table",
        year: "2023",
      },
      {
        id: "renata-portfolio-1",
        kind: "portfolio",
        title: "Photo & Essay Portfolio",
        url: "https://example.com/portfolio/renata",
      },
    ],
    relatedTopics: ["culture", "events", "books"],
    joinedAt: "2019-05-15",
  },
  {
    slug: "sam-whitfield",
    name: "Sam Whitfield",
    role: "Next Generation Fellow",
    photo: img("sam-whitfield", 800, 800),
    bio: "A rising voice in the Journal's Next Generation program, writing on youth perspectives and books.",
    longBio:
      "Sam Whitfield is part of the Journal's Next Generation fellowship, a program supporting younger writers as they develop civic and literary voices. Placeholder biography for the rebuild.",
    location: "Next Generation Fellowship",
    featuredQuote:
      "My generation didn't stop reading. We just started arguing in the margins.",
    social: {
      substack: "https://substack.com/@example",
      tiktok: "https://tiktok.com/@example",
    },
    professionalLinks: [
      {
        id: "sam-press-1",
        kind: "press",
        title: "Young Writers and the Civic Beat",
        outlet: "Campus Media Review",
        url: "https://example.com/press/young-writers",
        year: "2025",
      },
    ],
    relatedTopics: ["books", "opinion", "community-voices"],
    joinedAt: "2024-01-08",
  },
  {
    slug: "delphine-osei",
    name: "Delphine Osei",
    role: "Education Correspondent",
    photo: img("delphine-osei", 800, 800),
    bio: "Reports on schools, universities, and the policy debates that shape them.",
    longBio:
      "Delphine Osei has covered education for regional outlets for eight years before joining the Journal. Placeholder biography for the rebuild.",
    location: "County Schools Bureau",
    social: {
      x: "https://x.com/example",
      linkedin: "https://linkedin.com/in/example",
    },
    professionalLinks: [
      {
        id: "delphine-syn-1",
        kind: "syndicated",
        title: "Classroom Dispatches",
        outlet: "Education Newswire",
        url: "https://example.com/syndicated/classroom-dispatches",
        year: "2025",
      },
    ],
    relatedTopics: ["education", "community", "family-perspectives"],
    joinedAt: "2021-08-20",
  },
  {
    slug: "victor-lindqvist",
    name: "Victor Lindqvist",
    role: "Faith & History Columnist",
    photo: img("victor-lindqvist", 800, 800),
    bio: "Writes at the intersection of local faith communities and regional history.",
    longBio:
      "Victor Lindqvist studies the historical roots of the region's congregations and civic organizations. Placeholder biography for the rebuild.",
    location: "River Valley",
    featuredQuote:
      "History is the neighbor who remembers what the rest of us agreed to forget.",
    social: {
      youtube: "https://youtube.com/@example",
      substack: "https://substack.com/@example",
    },
    professionalLinks: [
      {
        id: "victor-pub-1",
        kind: "publication",
        title: "What the River Remembers",
        outlet: "Heritage Press",
        url: "https://example.com/publications/what-the-river-remembers",
        year: "2022",
      },
      {
        id: "victor-award-1",
        kind: "award",
        title: "Local History Fellowship",
        outlet: "State Humanities Council",
        year: "2021",
      },
    ],
    relatedTopics: ["faith", "history", "editorial"],
    joinedAt: "2018-02-11",
  },
];

const paragraphs = (n: number, seed: string) =>
  Array.from({ length: n }, (_, i) =>
    `This is original placeholder body copy (paragraph ${i + 1}) generated for the Northeastern Journal rebuild, seed "${seed}". It stands in for reported, edited journalism and will be replaced with real content once the publication's editorial team populates the CMS.`
  );

type Seed = {
  slug: string;
  title: string;
  excerpt: string;
  category: Article["category"];
  authorSlug: string;
  daysAgo: number;
  tags: string[];
  region?: Article["region"];
  featured?: boolean;
  trending?: boolean;
  mostRead?: boolean;
  breaking?: boolean;
};

const seeds: Seed[] = [
  { slug: "civic-budget-forum-draws-record-turnout", title: "Civic Budget Forum Draws Record Turnout Downtown", excerpt: "Residents packed the town hall to weigh in on next year's municipal budget priorities.", category: "politics", authorSlug: "miles-carter", daysAgo: 0, tags: ["budget", "town-hall"], region: "local", featured: true, breaking: true },
  { slug: "school-board-debates-literacy-curriculum", title: "School Board Debates New Literacy Curriculum", excerpt: "A proposed reading program sparks a wider conversation about early education standards.", category: "education", authorSlug: "delphine-osei", daysAgo: 1, tags: ["schools", "curriculum"], region: "local", trending: true },
  { slug: "congregations-open-doors-for-winter-shelter", title: "Congregations Open Doors for Winter Shelter Program", excerpt: "A coalition of local churches is expanding overnight shelter capacity ahead of the cold season.", category: "faith", authorSlug: "victor-lindqvist", daysAgo: 2, tags: ["shelter", "congregations"], region: "local" },
  { slug: "gallery-walk-revives-historic-main-street", title: "Gallery Walk Revives Historic Main Street", excerpt: "A monthly art walk is bringing new foot traffic to a stretch of storefronts once left vacant.", category: "culture", authorSlug: "renata-oyelaran", daysAgo: 2, tags: ["arts", "downtown"], region: "local", trending: true },
  { slug: "mill-town-centennial-oral-histories", title: "Mill Town Centennial: Oral Histories Collected", excerpt: "A community archive project is recording the memories of longtime residents before they're lost.", category: "history", authorSlug: "cherokee-nana", daysAgo: 3, tags: ["archive", "oral-history"], region: "local", mostRead: true },
  { slug: "why-local-elections-deserve-more-attention", title: "Why Local Elections Deserve More of Our Attention", excerpt: "An argument for why municipal races shape daily life more than most national headlines.", category: "opinion", authorSlug: "miles-carter", daysAgo: 4, tags: ["elections", "civics"], featured: true },
  { slug: "editorial-a-newspapers-obligation-to-its-readers", title: "A Newspaper's Obligation to Its Readers", excerpt: "The Journal's editorial board on what it owes the community it serves.", category: "editorial", authorSlug: "cherokee-nana", daysAgo: 5, tags: ["editorial-board"] },
  { slug: "three-generations-under-one-roof", title: "Three Generations, One Roof: A Family Perspective", excerpt: "A reflection on multigenerational households and what they teach about patience.", category: "family-perspectives", authorSlug: "cherokee-nana", daysAgo: 6, tags: ["family", "generations"], featured: true, mostRead: true },
  { slug: "interview-with-the-new-fire-chief", title: "An Interview with the Region's New Fire Chief", excerpt: "The department's first female chief discusses staffing, safety, and community trust.", category: "interviews", authorSlug: "miles-carter", daysAgo: 6, tags: ["public-safety"], region: "local" },
  { slug: "reading-the-room-a-review", title: "Reading the Room: A Review of the Season's Debut Novel", excerpt: "A quiet, generous first novel about a family bookstore finds its footing.", category: "books", authorSlug: "sam-whitfield", daysAgo: 7, tags: ["book-review"] },
  { slug: "harbor-road-bridge-repairs-begin", title: "Harbor Road Bridge Repairs Begin Next Month", excerpt: "The long-awaited infrastructure project will close one lane through the spring.", category: "local-news", authorSlug: "miles-carter", daysAgo: 7, tags: ["infrastructure"], region: "local", trending: true },
  { slug: "congress-returns-to-budget-standoff", title: "Congress Returns to a Familiar Budget Standoff", excerpt: "Lawmakers face another deadline with little sign of compromise.", category: "national-news", authorSlug: "miles-carter", daysAgo: 8, tags: ["congress"], region: "national", mostRead: true },
  { slug: "coastal-nations-meet-on-shared-fisheries", title: "Coastal Nations Meet on Shared Fisheries Policy", excerpt: "Delegates gather to renegotiate quotas amid shifting migration patterns.", category: "world-news", authorSlug: "renata-oyelaran", daysAgo: 9, tags: ["diplomacy"], region: "world" },
  { slug: "spring-civic-forum-calendar-announced", title: "Spring Civic Forum Calendar Announced", excerpt: "A season of town halls, author talks, and community roundtables begins next month.", category: "events", authorSlug: "delphine-osei", daysAgo: 9, tags: ["calendar"], region: "local" },
  { slug: "letters-what-neighbors-are-saying", title: "Letters: What Our Neighbors Are Saying This Week", excerpt: "A selection of reader letters on the school budget and the new library hours.", category: "community-voices", authorSlug: "cherokee-nana", daysAgo: 10, tags: ["letters"] },
  { slug: "youth-council-proposes-transit-pilot", title: "Youth Council Proposes Free Transit Pilot", excerpt: "Student organizers pitch a fare-free bus program to the city council.", category: "community", authorSlug: "sam-whitfield", daysAgo: 10, tags: ["transit", "youth"], region: "local", trending: true },
  { slug: "the-quiet-work-of-precinct-volunteers", title: "The Quiet Work of Precinct Volunteers", excerpt: "Behind every election are the residents who staff the polls for a stipend and a sandwich.", category: "politics", authorSlug: "miles-carter", daysAgo: 11, tags: ["elections"], region: "local" },
  { slug: "what-my-grandmother-taught-me-about-listening", title: "What My Grandmother Taught Me About Listening", excerpt: "A columnist reflects on the civic value of simply paying attention.", category: "family-perspectives", authorSlug: "cherokee-nana", daysAgo: 12, tags: ["memoir"], featured: true },
  { slug: "faith-leaders-convene-on-housing-crisis", title: "Faith Leaders Convene on the Regional Housing Crisis", excerpt: "An interfaith coalition proposes a joint land-use initiative.", category: "faith", authorSlug: "victor-lindqvist", daysAgo: 13, tags: ["housing"], region: "local" },
  { slug: "next-gen-essay-what-we-owe-each-other", title: "What We Owe Each Other: A Next Generation Essay", excerpt: "A young contributor argues for a renewed civic contract between generations.", category: "opinion", authorSlug: "sam-whitfield", daysAgo: 14, tags: ["essay", "next-generation"], trending: true },
  { slug: "historic-schoolhouse-added-to-register", title: "Historic Schoolhouse Added to the National Register", excerpt: "The one-room building will be preserved as a teaching site.", category: "history", authorSlug: "victor-lindqvist", daysAgo: 15, tags: ["preservation"], region: "local" },
  { slug: "national-service-programs-see-renewed-interest", title: "National Service Programs See Renewed Interest", excerpt: "Enrollment is climbing in civic service programs aimed at young adults.", category: "national-news", authorSlug: "delphine-osei", daysAgo: 16, tags: ["service"], region: "national" },
  { slug: "world-briefing-trade-talks-resume", title: "World Briefing: Regional Trade Talks Resume", excerpt: "A roundup of this week's international developments relevant to local industry.", category: "world-news", authorSlug: "miles-carter", daysAgo: 17, tags: ["trade"], region: "world" },
  { slug: "editorial-on-civility-in-public-meetings", title: "On Civility in Public Meetings", excerpt: "The editorial board calls for a return to basic decorum at council sessions.", category: "editorial", authorSlug: "cherokee-nana", daysAgo: 18, tags: ["civility"] },
];

const dateFromDaysAgo = (n: number) => {
  const d = new Date("2026-07-01T09:00:00Z");
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

export const articles: Article[] = seeds.map((s) => ({
  slug: s.slug,
  title: s.title,
  excerpt: s.excerpt,
  body: paragraphs(7, s.slug),
  category: s.category,
  authorSlug: s.authorSlug,
  publishedAt: dateFromDaysAgo(s.daysAgo),
  image: img(s.slug),
  imageAlt: `Editorial illustration for "${s.title}"`,
  tags: s.tags,
  featured: s.featured,
  trending: s.trending,
  mostRead: s.mostRead,
  breaking: s.breaking,
  region: s.region,
  isDemo: true,
}));

export const books: Book[] = [
  {
    slug: "the-porch-light",
    title: "The Porch Light",
    authorSlug: "cherokee-nana",
    cover: img("book-porch-light", 700, 1000),
    synopsis: "A collected-essays memoir tracing one family's civic life across three generations. Placeholder synopsis for the rebuild.",
    reviewExcerpt: "A generous, unhurried meditation on neighborliness. Placeholder review excerpt.",
    buyUrl: "https://example.com/buy/the-porch-light",
    publishedAt: dateFromDaysAgo(40),
    readingGuideUrl: "https://example.com/guides/the-porch-light",
  },
  {
    slug: "what-the-river-remembers",
    title: "What the River Remembers",
    authorSlug: "victor-lindqvist",
    cover: img("book-river-remembers", 700, 1000),
    synopsis: "A regional history of the waterways that shaped the county's industry and faith communities.",
    reviewExcerpt: "Meticulously researched and quietly moving. Placeholder review excerpt.",
    buyUrl: "https://example.com/buy/what-the-river-remembers",
    publishedAt: dateFromDaysAgo(70),
  },
  {
    slug: "letters-to-the-next-council",
    title: "Letters to the Next Council",
    authorSlug: "sam-whitfield",
    cover: img("book-letters-council", 700, 1000),
    synopsis: "A young essayist's open letters on what civic leadership should look like for the next decade.",
    reviewExcerpt: "Sharp, hopeful, and unafraid of hard questions. Placeholder review excerpt.",
    buyUrl: "https://example.com/buy/letters-to-the-next-council",
    publishedAt: dateFromDaysAgo(20),
    readingGuideUrl: "https://example.com/guides/letters-to-the-next-council",
  },
  {
    slug: "the-long-table",
    title: "The Long Table",
    authorSlug: "renata-oyelaran",
    cover: img("book-long-table", 700, 1000),
    synopsis: "Essays on the cultural life of a small downtown, told through its restaurants, galleries, and stages.",
    reviewExcerpt: "A love letter to Main Street. Placeholder review excerpt.",
    buyUrl: "https://example.com/buy/the-long-table",
    publishedAt: dateFromDaysAgo(95),
  },
];

export const videos: Video[] = [
  { slug: "cherokee-nana-on-listening", title: "Cherokee Nana on the Civic Value of Listening", description: "A short conversation on why attention is a civic skill. Placeholder description.", youtubeId: "dQw4w9WgXcQ", thumbnail: img("video-listening"), category: "family-perspectives", publishedAt: dateFromDaysAgo(5), playlist: "Cherokee Nana Talks" },
  { slug: "inside-the-budget-forum", title: "Inside the Civic Budget Forum", description: "Highlights from this week's packed town hall. Placeholder description.", youtubeId: "dQw4w9WgXcQ", thumbnail: img("video-forum"), category: "politics", publishedAt: dateFromDaysAgo(1), playlist: "Local Politics" },
  { slug: "next-gen-roundtable-civic-contract", title: "Next Generation Roundtable: The Civic Contract", description: "Young contributors debate what generations owe each other. Placeholder description.", youtubeId: "dQw4w9WgXcQ", thumbnail: img("video-roundtable"), category: "opinion", publishedAt: dateFromDaysAgo(14), playlist: "Next Generation" },
  { slug: "gallery-walk-mainstreet", title: "A Walk Through the Gallery District", description: "A visual tour of the revived Main Street art scene. Placeholder description.", youtubeId: "dQw4w9WgXcQ", thumbnail: img("video-gallery"), category: "culture", publishedAt: dateFromDaysAgo(2), playlist: "Culture Desk" },
  { slug: "faith-leaders-housing-panel", title: "Faith Leaders on the Housing Crisis", description: "An interfaith panel discussion, recorded live. Placeholder description.", youtubeId: "dQw4w9WgXcQ", thumbnail: img("video-panel"), category: "faith", publishedAt: dateFromDaysAgo(13), playlist: "Faith & History" },
  { slug: "oral-history-mill-town", title: "Mill Town Oral Histories: Episode 1", description: "The first in a series preserving longtime residents' memories. Placeholder description.", youtubeId: "dQw4w9WgXcQ", thumbnail: img("video-oral-history"), category: "history", publishedAt: dateFromDaysAgo(3), playlist: "History Project" },
];

export const conversations: Conversation[] = [
  {
    slug: "should-local-elections-be-nonpartisan",
    title: "Should Local Elections Be Nonpartisan?",
    format: "point-counterpoint",
    participants: ["miles-carter", "sam-whitfield"],
    excerpt: "Our politics editor and a Next Generation fellow debate party labels in municipal races.",
    body: [
      { speaker: "miles-carter", text: "Placeholder argument in favor of retaining party labels for clarity and accountability." },
      { speaker: "sam-whitfield", text: "Placeholder counterargument that nonpartisan ballots better reflect local priorities." },
      { speaker: "miles-carter", text: "Placeholder rebuttal continuing the point/counterpoint format." },
      { speaker: "sam-whitfield", text: "Placeholder closing response." },
    ],
    publishedAt: dateFromDaysAgo(4),
    image: img("conversation-nonpartisan"),
  },
  {
    slug: "nana-and-grandson-on-technology",
    title: "Cherokee Nana and Her Grandson on Technology's Place at the Table",
    format: "dialogue",
    participants: ["cherokee-nana", "sam-whitfield"],
    excerpt: "A grandmother and grandson talk through screens, attention, and family dinners.",
    body: [
      { speaker: "cherokee-nana", text: "Placeholder reflection on family meals before smartphones." },
      { speaker: "sam-whitfield", text: "Placeholder response about balancing connection and distraction." },
      { speaker: "cherokee-nana", text: "Placeholder follow-up on generational compromise." },
    ],
    publishedAt: dateFromDaysAgo(9),
    image: img("conversation-technology"),
  },
  {
    slug: "interview-fire-chief-roundtable",
    title: "Roundtable: Public Safety and Public Trust",
    format: "roundtable",
    participants: ["miles-carter", "delphine-osei", "victor-lindqvist"],
    excerpt: "Three Journal writers discuss what community trust in institutions requires today.",
    body: [
      { speaker: "miles-carter", text: "Placeholder opening remarks on public safety funding." },
      { speaker: "delphine-osei", text: "Placeholder perspective connecting trust to school partnerships." },
      { speaker: "victor-lindqvist", text: "Placeholder historical framing of community-institution relationships." },
    ],
    publishedAt: dateFromDaysAgo(17),
    image: img("conversation-roundtable"),
  },
  {
    slug: "essay-exchange-what-we-owe",
    title: "An Essay Exchange: What Do Generations Owe Each Other?",
    format: "interview",
    participants: ["cherokee-nana", "sam-whitfield"],
    excerpt: "A structured exchange of essays between the Journal's founding columnist and a Next Generation fellow.",
    body: [
      { speaker: "cherokee-nana", text: "Placeholder essay excerpt on stewardship and memory." },
      { speaker: "sam-whitfield", text: "Placeholder essay excerpt on inheritance and responsibility." },
    ],
    publishedAt: dateFromDaysAgo(21),
    image: img("conversation-essay-exchange"),
  },
];

export const newsletterIssues: NewsletterIssue[] = [
  { slug: "issue-12", title: "Issue No. 12: The Budget Season Begins", summary: "This week: the civic budget forum, a Next Generation essay, and Cherokee Nana on listening.", publishedAt: dateFromDaysAgo(0), issueNumber: 12 },
  { slug: "issue-11", title: "Issue No. 11: Main Street's Second Act", summary: "The gallery walk revival, a faith coalition on housing, and our books desk's spring picks.", publishedAt: dateFromDaysAgo(7), issueNumber: 11 },
  { slug: "issue-10", title: "Issue No. 10: What the River Remembers", summary: "A history feature, a new interview series, and reader letters on the library hours debate.", publishedAt: dateFromDaysAgo(14), issueNumber: 10 },
  { slug: "issue-9", title: "Issue No. 9: Youth Council Takes the Floor", summary: "Transit pilots, a fire chief interview, and a family perspectives column on multigenerational homes.", publishedAt: dateFromDaysAgo(21), issueNumber: 9 },
  { slug: "issue-8", title: "Issue No. 8: The Civic Contract", summary: "A Next Generation roundtable, world briefing, and the editorial board on civility.", publishedAt: dateFromDaysAgo(28), issueNumber: 8 },
];
