// Evergreen scheduling guides. These anchor topical authority around the pair
// pages — the pSEO layer answers "when", these answer "how should we run this".
//
// Deliberately free of statistics: every claim here is either mechanical (how
// timezone maths works) or an explicitly-framed recommendation. No survey
// numbers, no adoption percentages, nothing that would need a citation.

export type GuideBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

export type Guide = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  blurb: string;
  body: GuideBlock[];
};

export const GUIDES: Guide[] = [
  {
    slug: "rotating-meeting-times",
    title: "How to run a fair rotating meeting across 3+ timezones — meetwhen.xyz",
    h1: "How to run a fair rotating meeting across three or more timezones",
    description:
      "With three or more timezones there is often no hour that suits everyone. Here is how to rotate the inconvenience so the same person doesn't always take the bad slot.",
    blurb:
      "Once a team spans three or more zones, a single fixed time almost always taxes the same person forever. Rotation fixes that — if you do it deliberately.",
    body: [
      {
        kind: "p",
        text: "Two timezones usually leave you a shared window, even a narrow one. Three or more frequently do not: by the time the westernmost person is awake, the easternmost person is asleep. At that point a fixed weekly slot stops being a scheduling decision and becomes a standing tax on whoever lives furthest from the centre of gravity.",
      },
      { kind: "h", text: "First, check whether you actually have no overlap" },
      {
        kind: "p",
        text: "People assume there is no shared window more often than there really isn't. Widen the definition of 'available' before you give up on it: a 08:00 start or an 18:00 finish is a mild imposition, while a 02:00 call is a different category of ask. Set each person's real hours in the planner rather than assuming 9-to-5 everywhere, and see what survives.",
      },
      {
        kind: "p",
        text: "If a genuine overlap exists, use it and stop here. Rotation is a cost — it makes the meeting harder to remember and harder to book rooms for. Only pay it when the alternative is worse.",
      },
      { kind: "h", text: "Rotate on a fixed, published cycle" },
      {
        kind: "ol",
        items: [
          "Pick two or three candidate times, each of which is comfortable for a different subset of the team. Name them — 'Americas-friendly', 'APAC-friendly' — so people can reason about them without doing timezone maths.",
          "Assign them to a repeating cycle: week A, week B, week C, repeat. Put the cycle in the calendar invite description, not just in someone's head.",
          "Send the calendar invites in UTC or as real calendar events, never as text like '9am'. A text time in a chat message is the single most common source of missed cross-timezone meetings.",
          "Review the rotation once a quarter, or whenever someone joins or relocates. A rotation tuned for a team that no longer exists is worse than no rotation.",
        ],
      },
      { kind: "h", text: "Make the unlucky slot cost less" },
      {
        kind: "p",
        text: "Rotation spreads the pain but doesn't reduce it. Reduce it separately: keep the meeting short, publish an agenda far enough ahead that someone joining at 06:00 can skip the parts that don't concern them, and always record it. If a person's only reason to attend at a hostile hour is to hear a status update, that update should have been written down instead.",
      },
      { kind: "h", text: "Give people a real exit" },
      {
        kind: "p",
        text: "A rotation only reads as fair if opting out of a bad-for-you week is genuinely acceptable — attended by proxy, or covered by the recording plus a written summary. If skipping carries a cost, the rotation is theatre and the tax is still being collected, just less visibly.",
      },
      { kind: "h", text: "Sanity-check the actual clock times" },
      {
        kind: "p",
        text: "Before committing a rotation, run each candidate time through the planner with every participant's real city and hours. The ranking will tell you who absorbs the cost in each variant, which is exactly the thing you are trying to balance. A rotation that looks even on a whiteboard often isn't, because daylight saving moves two of the three zones and not the third.",
      },
    ],
  },
  {
    slug: "no-overlapping-working-hours",
    title: "Scheduling when two timezones have no overlapping working hours — meetwhen.xyz",
    h1: "What to do when two timezones have no overlapping working hours",
    description:
      "Some city pairs have no shared 9-to-5 window at all. Here is how to choose which side moves, and how to make the compromise sustainable.",
    blurb:
      "Some pairs simply don't overlap under standard hours. The question stops being 'when' and becomes 'who moves, and how often'.",
    body: [
      {
        kind: "p",
        text: "Take any pair roughly twelve hours apart and standard working hours produce an empty intersection. There is no clever slot hiding in there. Someone is going to take a call outside their working day, and the only real decisions are who, how far outside, and how often.",
      },
      { kind: "h", text: "Quantify the compromise before you argue about it" },
      {
        kind: "p",
        text: "'Early' and 'late' are not comparable units, which is why these conversations stall. Convert to something measurable: how many hours outside their normal window each person sits, and whether that lands in the range where people are simply up earlier than usual or the range where they are being woken. An 08:00 start and a 23:00 finish are both an hour outside a 9-to-17 day, but they are not the same ask — and a 02:00 call is not on the same scale at all.",
      },
      {
        kind: "p",
        text: "The planner scores exactly this: distance outside each person's stated hours, weighted so that being far outside costs disproportionately more than being slightly outside, with an extra penalty for slots landing in the middle of the night. That is why its top suggestion is often not the mathematical midpoint — the midpoint frequently puts both people in a mildly bad place when one person taking a mild hit is objectively better.",
      },
      { kind: "h", text: "Prefer edges to middles" },
      {
        kind: "p",
        text: "When no overlap exists, the best slots almost always sit just past the edge of someone's day — the hour before they usually start, or the hour after they usually finish. These are cheap, because they're adjacent to time already committed to work. Pushing an hour deeper into the evening is much more expensive than it looks: it collides with dinner, childcare, and everything else a working day is bounded by.",
      },
      { kind: "h", text: "Alternate direction on recurring calls" },
      {
        kind: "p",
        text: "For a one-off, pick the cheapest slot and move on. For anything recurring, alternate which side absorbs the cost. Consistently loading one side breeds a quiet resentment that never shows up in a scheduling tool but does show up in attendance.",
      },
      { kind: "h", text: "Ask whether it needs to be a meeting" },
      {
        kind: "ul",
        items: [
          "Status and progress: write it down. Nobody should be awake at 23:00 to hear a status update.",
          "Decisions with clear options: circulate the options in writing, and only meet if the discussion doesn't converge.",
          "Anything ambiguous, relational, or contentious: meet. This is what the awkward hour is for.",
          "Onboarding and pairing: meet, but schedule it as a dedicated block on a day when the person taking the hit has a lighter load.",
        ],
      },
      {
        kind: "p",
        text: "Reserving the expensive hour for the conversations that genuinely need to be live is the highest-leverage thing you can do here. No scheduling tool can find an overlap that doesn't exist — but it can tell you precisely what the least-bad option costs, which is enough to decide whether the meeting is worth it.",
      },
    ],
  },
  {
    slug: "daylight-saving-and-recurring-meetings",
    title: "Why recurring cross-timezone meetings break twice a year — meetwhen.xyz",
    h1: "Why recurring cross-timezone meetings break twice a year",
    description:
      "Daylight saving transitions land on different dates in different countries, so a recurring meeting silently shifts for one side. Here is why, and how to avoid it.",
    blurb:
      "Not every country changes clocks, and those that do don't change on the same day. That gap is where recurring meetings quietly break.",
    body: [
      {
        kind: "p",
        text: "A recurring cross-timezone meeting that has worked fine for months will, on a specific week each spring and each autumn, suddenly be an hour off for half the attendees. Nothing was changed. This is the single most common way cross-timezone scheduling fails, and it is entirely predictable.",
      },
      { kind: "h", text: "The mechanism" },
      {
        kind: "p",
        text: "A recurring calendar event is anchored to a wall-clock time in one timezone — usually the organiser's. When that zone shifts for daylight saving, the event follows it, and the gap to every other zone changes by an hour. If the other zone shifts on the same date, the two cancel out and nobody notices. If it shifts on a different date, or doesn't shift at all, the meeting moves for one side and stays put for the other.",
      },
      {
        kind: "p",
        text: "The dates genuinely differ. Europe and North America don't switch on the same weekend, which leaves a stretch of weeks each year when transatlantic meetings are an hour off their usual gap. Many zones — India, Japan, most of Africa, much of South America — don't observe daylight saving at all, so they absorb the full shift every time their counterpart moves. Southern-hemisphere zones shift in the opposite direction from northern ones, which means the gap can move by two hours rather than one.",
      },
      { kind: "h", text: "What to do about it" },
      {
        kind: "ol",
        items: [
          "Always create recurring events as real calendar entries with a named timezone, never as a fixed UTC offset. 'UTC+1' is correct for part of the year; 'Europe/London' is correct always.",
          "Put transition weeks in your calendar as a reminder to re-check the meeting, rather than trusting that it will hold.",
          "When a meeting is close to the edge of someone's day, treat the shift as guaranteed breakage. A 17:00 finish that becomes 18:00 for one side is a real change, not a rounding error.",
          "For anything scheduled more than a few weeks ahead, confirm the actual local times for that specific date rather than assuming today's gap still applies.",
        ],
      },
      { kind: "h", text: "Why this tool doesn't have the problem" },
      {
        kind: "p",
        text: "Every city here carries its IANA timezone identifier rather than a fixed offset, and every calculation runs against the date you actually choose. Pick a date on the far side of a transition and the timeline redraws with the offsets that will really be in force then — including the cases where two zones have swapped their relative order. The pair pages state, for each pair, whether the gap is fixed all year or moves, and by how much.",
      },
    ],
  },
  {
    slug: "picking-working-hours-for-distributed-teams",
    title: "Setting working hours that survive a distributed team — meetwhen.xyz",
    h1: "Setting working hours that actually survive a distributed team",
    description:
      "Most cross-timezone scheduling friction comes from unstated availability, not from timezone maths. Here is how to define hours that make scheduling mechanical.",
    blurb:
      "Most scheduling pain isn't arithmetic — it's that nobody has written down when they're actually available.",
    body: [
      {
        kind: "p",
        text: "Timezone conversion is a solved problem; a tool does it in milliseconds. What isn't solved is that most teams have never stated when each person is genuinely available, so every scheduling attempt becomes a negotiation conducted one message at a time across a twelve-hour lag.",
      },
      { kind: "h", text: "State real hours, not aspirational ones" },
      {
        kind: "p",
        text: "The default assumption is 9-to-5, and for a lot of people it's wrong. Someone with a school run is unavailable in the middle of the morning. Someone who deliberately starts early to overlap with a distant colleague is done by mid-afternoon. If the stated hours don't match the real ones, every suggested slot inherits the error and people decline invitations for reasons the tool never saw.",
      },
      {
        kind: "p",
        text: "Write down the hours you will actually take a meeting in — not the hours you are nominally employed for. These are different numbers and the second one is useless for scheduling.",
      },
      { kind: "h", text: "Separate 'working' from 'available for meetings'" },
      {
        kind: "p",
        text: "A nine-hour working day rarely means nine hours of meeting availability. Protecting a focus block and declaring a narrower meeting window is more honest than declaring a wide window and then declining half of what lands in it. Narrow, accurate windows produce fewer suggestions but a much higher acceptance rate.",
      },
      { kind: "h", text: "Publish an explicit overlap expectation" },
      {
        kind: "p",
        text: "For a team spread across many zones, the useful contract is not 'be online at these hours' but 'guarantee this much overlap with these people'. That gives individuals control over their own day while keeping the collaboration property the team actually needs. It also makes the tradeoff visible when someone relocates: the question becomes whether the required overlap still exists, which is answerable, rather than whether the move is 'workable', which isn't.",
      },
      { kind: "h", text: "Re-check after every change" },
      {
        kind: "ul",
        items: [
          "Someone relocates, even by one zone.",
          "A daylight-saving transition on either side.",
          "A new person joins from a zone nobody else is in.",
          "Someone changes their hours for childcare, study, or health.",
        ],
      },
      {
        kind: "p",
        text: "Each of these invalidates whatever slot the team settled on, usually without anyone announcing it. Running the participants through the planner again takes under a minute and replaces a slow drift into a meeting that half the team resents.",
      },
    ],
  },
];

export const GUIDE_BY_SLUG: Map<string, Guide> = new Map(GUIDES.map((g) => [g.slug, g]));
