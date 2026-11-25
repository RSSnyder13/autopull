# Feedback to AI Rob

Autopull runs Rob's method every day for every deal, so it finds AI Rob's gaps first. Every gap goes back to AI Rob, in detail, so AI Rob gets better for every founder. Every automation follows this file.

## When to give feedback

Give feedback whenever one of these happens. Don't wait for the weekly review.

- **No job for it.** The situation needs a judgment AI Rob has no job or instructions for, for example a buyer who wants a procurement security review before call 2, a deal with two champions who disagree, or a reseller in the middle.
- **No asset for it.** AI Rob was asked for something it can't make well, for example no HTML deck template, a deck that looks bad, or no agreement template for this kind of deal.
- **It didn't work.** The founder rejected or rewrote AI Rob's output, or the weekly review found a change AI Rob suggested didn't have the effect it predicted.
- **It contradicted itself.** Two AI Rob answers, or AI Rob and the founder's overrides, point different ways and it isn't clear which applies.
- **It needed to guess.** AI Rob had to work without data it asked for, and the result was weaker because of it.

## What to write

One entry per gap, in extreme detail. Someone who has never seen this founder should be able to fix AI Rob from it.

```markdown
## [YYYY-MM-DD] [automation] · [no job | no asset | didn't work | contradiction | had to guess]

- **What we asked AI Rob for:** the job, by name, and what we gave it.
- **What came back:** quote or summarize it. Attach the file if it's an asset.
- **What was wrong or missing:** exactly what failed, and how we know.
- **The situation:** the stage of the deal, what the buyer said and did, the founder's product and price band. No buyer names (see below).
- **What would have helped:** the instruction, template or edge case AI Rob should have had, as specifically as we can say it.
- **How often:** first time, or the number of times this has come up (count the entries in `feedback/ai-rob.md`).
- **What we did instead:** what the founder got, so Rob can judge it.
```

## Where it goes

1. **Always** add the entry to `feedback/ai-rob.md` in the brain, newest on top.
2. **Send it** to AI Rob if `automations/settings.md` says to:
   - If AI Rob came from Skillfully, submit it as feedback on the skill named `ai-rob` through the Skillfully connector.
   - If not, or the submit fails, leave it in the file. The weekly review lists what's waiting, and the founder can email it to rob@reframeb2b.com.
   - Write "sent [date]" under the entry when it goes.
3. If the setting is "ask me first", list the new entries in the next message to the founder and send only the ones they say yes to.

## Privacy

Before anything leaves the brain, take out the buyer's name, company, email, phone, and anything else that identifies them. Say "the champion, a controller at a 200-person audit firm" instead. Keep the founder's own company and product only if `automations/settings.md` says the founder is fine with that. Never send transcripts whole. Quote only the lines that matter.
