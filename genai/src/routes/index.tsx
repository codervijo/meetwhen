import { createFileRoute } from "@tanstack/react-router";
import TimezoneTool from "@/components/TimezoneTool";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "meetwhen.xyz — Find the best meeting time across timezones" },
      {
        name: "description",
        content:
          "meetwhen.xyz is a free timezone meeting planner. Add your team's cities, compare working hours, and instantly see the best meeting slots across timezones.",
      },
      { property: "og:title", content: "meetwhen.xyz — Timezone Meeting Finder" },
      {
        property: "og:description",
        content:
          "Add your team's cities, compare local working hours, and instantly see the best meeting slots across timezones.",
      },
      { property: "og:site_name", content: "meetwhen.xyz" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Index,
});

const STEPS = [
  {
    title: "Add people and their cities",
    body: "Add 2 to 8 participants and pick each person's city. Their IANA timezone is set automatically.",
  },
  {
    title: "Set each person's working hours",
    body: "Choose when each person is reasonably available. Defaults to 9:00–17:00 local time.",
  },
  {
    title: "See the best overlapping meeting times",
    body: "The tool ranks upcoming time slots by how many people are inside working hours.",
  },
];

const AUDIENCES = [
  { title: "Remote teams", body: "Plan standups and syncs across distributed offices without timezone math." },
  { title: "Freelancers with global clients", body: "Find a slot that works for you and a client on the other side of the world." },
  { title: "Families across countries", body: "Pick a call time that doesn't wake grandparents or keep kids up late." },
  { title: "Open source maintainers", body: "Coordinate community calls across contributors in every region." },
  { title: "Global founders", body: "Schedule investor and partner calls without a back-and-forth email thread." },
];

const FAQS = [
  {
    q: "Does this handle daylight saving time?",
    a: "Yes. Every city uses its IANA timezone, so daylight saving transitions are applied automatically for the dates you're scheduling.",
  },
  {
    q: "Are times shown in each person's local timezone?",
    a: "Yes. Every participant's timeline and suggested slot is rendered in their own local time, so you can see exactly what the meeting looks like for each person.",
  },
  {
    q: "Do I need an account?",
    a: "No. There's no sign up, no login, and no email required. Open the page and start planning.",
  },
  {
    q: "Is any data saved?",
    a: "No. Everything runs in your browser and only lives in memory while the page is open. Refresh the page and it's gone.",
  },
  {
    q: "Can I use this for remote teams?",
    a: "Yes. Add up to 8 participants with custom names, cities, and working hours, and share the suggested slot with your team.",
  },
];

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
        <header className="mb-10">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
            meetwhen.xyz
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Find the best meeting time across timezones
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Add your team's cities, compare local working hours, and instantly see the best meeting
            slots across timezones. Free, no account, runs entirely in your browser.
          </p>
        </header>

        <TimezoneTool />

        <section aria-labelledby="how-it-works" className="mt-20">
          <h2 id="how-it-works" className="text-2xl font-semibold tracking-tight mb-6">
            How it works
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-lg border border-border bg-card p-5">
                <div className="text-xs font-mono text-muted-foreground mb-2">Step {i + 1}</div>
                <h3 className="font-medium mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="who-its-for" className="mt-16">
          <h2 id="who-its-for" className="text-2xl font-semibold tracking-tight mb-6">
            Who this is for
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-medium mb-1">{a.title}</h3>
                <p className="text-sm text-muted-foreground">{a.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="faq" className="mt-16">
          <h2 id="faq" className="text-2xl font-semibold tracking-tight mb-6">
            Frequently asked questions
          </h2>
          <dl className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-lg border border-border bg-card p-5">
                <dt className="font-medium mb-1">{f.q}</dt>
                <dd className="text-sm text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="mt-16 pt-6 border-t border-border text-xs text-muted-foreground">
          Runs entirely in your browser. No accounts, no tracking, no data stored.
        </footer>
      </div>
    </main>
  );
}
