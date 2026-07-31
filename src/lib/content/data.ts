import type {
  Article,
  Author,
  Book,
  Category,
  Conversation,
  NewsletterIssue,
  Video,
} from "./types";

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
    username: "cherokeenana",
    role: "Founding Columnist",
    photo: "",
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
    quotes: [
      { id: "nana-q1", text: "A family that argues at the table is a family that still trusts each other.", source: "The Porch Light" },
      { id: "nana-q2", text: "The news is just the neighborhood, written down." },
      { id: "nana-q3", text: "Memory is a civic resource. We ought to fund it like one." },
    ],
    readingList: [
      { id: "nana-r1", title: "The Porch Light", note: "My own collection of essays on neighborliness." },
      { id: "nana-r2", title: "What the River Remembers", note: "Victor's history of the county's waterways." },
      { id: "nana-r3", title: "The Long Table", note: "Renata's love letter to Main Street." },
    ],
    timeline: [
      { id: "nana-t1", year: "1968", label: "The Journal's earliest predecessor begins as a family mimeograph." },
      { id: "nana-t2", year: "1991", label: "Cherokee Nana writes her first Sunday column." },
      { id: "nana-t3", year: "2015", label: "The Sunday Letter newsletter launches." },
      { id: "nana-t4", year: "2026", label: "Northeastern Journal relaunches as a full civic platform." },
    ],
    videoPlaylist: "Cherokee Nana Talks",
    speaking:
      "Cherokee Nana speaks regularly at civic forums, library events, and community gatherings on family, memory, and local journalism. Placeholder booking information for the rebuild.",
    podcastUrl: "https://example.com/podcast/the-porch-light",
    showSubscriberCount: true,
    foundingRole: "Co-Founder",
    relatedTopics: ["family-perspectives", "faith", "history", "community"],
    joinedAt: "1991-03-01",
  },
  {
    slug: "miles-carter",
    name: "Miles Carter",
    username: "milescarter",
    role: "Politics Editor",
    photo: "",
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
    showSubscriberCount: true,
    relatedTopics: ["politics", "local-news", "national-news"],
    joinedAt: "2016-09-01",
  },
  {
    slug: "renata-oyelaran",
    name: "Renata Oyelaran",
    username: "renata",
    role: "Culture Writer",
    photo: "",
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
    showSubscriberCount: true,
    relatedTopics: ["culture", "events", "books"],
    joinedAt: "2019-05-15",
  },
  {
    slug: "sam-whitfield",
    name: "Sam Whitfield",
    username: "samwhitfield",
    role: "Next Generation Fellow",
    photo: "",
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
    showSubscriberCount: true,
    relatedTopics: ["books", "opinion", "community-voices"],
    joinedAt: "2024-01-08",
  },
  {
    slug: "delphine-osei",
    name: "Delphine Osei",
    username: "delphineosei",
    role: "Education Correspondent",
    photo: "",
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
    showSubscriberCount: true,
    relatedTopics: ["education", "community", "family-perspectives"],
    joinedAt: "2021-08-20",
  },
  {
    slug: "victor-lindqvist",
    name: "Victor Lindqvist",
    username: "victorl",
    role: "Faith & History Columnist",
    photo: "",
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
    showSubscriberCount: true,
    relatedTopics: ["faith", "history", "editorial"],
    joinedAt: "2018-02-11",
  },
];

/**
 * Editorial content starts empty.
 *
 * The Journal ships with no placeholder articles, books, videos,
 * conversations, or newsletter issues — everything published on the site
 * is written by the newsroom through the dashboard and lives in the
 * content store (`lib/store/articles.ts`). Sections with nothing in them
 * hide themselves rather than showing filler.
 *
 * `categories` and `authors` above are configuration, not content: they
 * define the sections available to write into and the masthead. Author
 * profiles are edited from the dashboard and merged over these seeds.
 */
export const articles: Article[] = [];

export const books: Book[] = [];

export const videos: Video[] = [];

export const conversations: Conversation[] = [];

export const newsletterIssues: NewsletterIssue[] = [];
