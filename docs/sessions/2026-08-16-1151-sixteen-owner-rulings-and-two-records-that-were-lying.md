## 2026-08-16 11:51 UTC — sixteen owner rulings, and two records that were lying

The owner asked for every gated theme to be put to him, and it was. Sixteen
rulings in one sitting. Three reversed my recommendation, two corrected me
outright, and one only came out right because the homework got done.

### The ratings thread, which was two threads pretending to be one

I put "ratify the curated household rating" to him as *the* ratings gate. He
answered: *"It was never supposed to be curated ratings… What I asked for was
using publicly available review/ratings/feedback services/websites like yelp,
Google etc that aggregate feedback."* The curated rating is **withdrawn** —
retire the dormant `rating: 1..3` field rather than fill it.

**The record caused this, not a misreading of the room.** Theme 5 carried two
separate ratings items, and the 2026-07-08 owner-calls line welded them: *"show
the live number when online… ; dish ratings curated"*. One sentence, two
decisions, and the second half was never his. Marked superseded, because
unmarked it would have re-proposed itself to him a fourth time.

Then he chose **"cache aggressively into the repo"** for the aggregates — from
an option whose own text said the terms hadn't been read. So they were read:
**Google permits no caching of ratings at all** (place ids indefinitely, coords
30 days); **Yelp permits nothing beyond 24 hours** and can demand destruction.
This repo is public, so a committed rating is a permanent, visible breach that
cannot be un-published. Re-put with the numbers, he ruled **link-out only** —
no key, no edge function, no bill, no ToS surface, works offline. The whole
ratings thread now closes without a backend.

**The lesson is not "check the terms".** It is that the informed-confirmation
floor is worth real work: an approval given on a briefing that says "I haven't
checked" is not yet a decision, and going back with facts got a *better* answer
than the one I'd have built.

### Trends: asked and answered, three times

*"The trends data will never be shown in the faves app as I've told you a
couple of times before in other sessions."* Recorded as a hard never, and — more
usefully — **why it keeps being re-asked**: Theme 13 read as a sequencing gate
("not enough data yet") with a 1-venue-of-31 coverage stat that invites
"revisit when it grows". Read cold, it looks like it is waiting. A roadmap entry
that reads as an invitation will be accepted. Also saved to memory, since the
cost of this one is his patience, not a build.

### Overruled, correctly, on timers

Two sessions independently built the cautious version — estimates as text, only
stated times driving countdowns — on the food-safety argument. Put to him with
that argument and a split-on-risk middle option in front of him, he ruled
**estimates drive timers too, clearly marked**. The sibling had explicitly asked
to be corrected rather than have its caution become policy by default, and that
is the right instinct: a rule nobody ruled on, arrived at because two agents
were careful and neither spoke, is the worst kind of policy.

The marker goes on the **timer face**, not the step text. A countdown that looks
identical whether the number was read or guessed is not marked.

### Concurrency, the expensive kind

`git pull --rebase` in the shared checkout began replaying **seven commits that
were not mine** and hit a conflict. Aborted rather than resolved — never absorb
another session's work — and it turned out to be a transient race. The peer had
been landing small claims directly in `/Users/mike/.pets/faves` on the reasoning
that a claim line is a sanctioned touch in a shared tree. It is; a *run of
commits* while others pull is not. They stopped. Worth writing down because the
reasoning was almost right, which is what made it survive.

