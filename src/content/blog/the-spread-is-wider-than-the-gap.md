---
title: The spread is wider than the gap
excerpt: One 27B checkpoint passed four acceptance checks on a task, then two, then two. The other went two, two, four. Whatever separates the two models is smaller than the spread inside one of them, which is why the next twenty-two hours went into measuring the spread.
publishDate: 'Nov 12 2026'
tags:
  - Benchmarks
  - Local AI
  - GPU
  - Statistics
seo:
  pageType: article
  title: The spread is wider than the gap
  description: "Two 2-bit quantizations of a 27B model scored identically across 24 repeated runs. The spread inside one model was larger than the gap between them."
  image:
    src: '../../assets/images/og/the-spread-is-wider-than-the-gap.jpg'
    alt: The spread is wider than the gap
---

On task 920 the shipped model passed all four of the repository's acceptance checks, then two, then two. Three runs, identical weights, identical settings, same machine. The challenger went two, two, four on the same task, and whatever separates the two checkpoints is smaller than the spread between two runs of one of them.

That is awkward for a benchmark post, because a leaderboard is built from exactly one of those runs. So I ran twenty-four cells and wrote down what would count as a difference before any of the numbers existed.

Both models are the same 27B checkpoint compressed to about two bits per weight, which is how a 27B fits in a 12 GB card. The one already in production, the shipped model, is a single 8.7 GB file with its speculative head built in. The challenger is 7.6 GB, plus a separate 1.4 GB draft file from a different toolchain.

The bench is four issues from a real TypeScript codebase. Each issue carries a rubric of acceptance checks: behaviours the patch has to demonstrate, and tests it has to fail before the fix and pass after it. Issue 920 has four checks, 928 has three, 940 and 966 four each, fifteen in total.

A cell is one model on one issue for one draw. Two arms, four issues, three draws: twenty-four cells, each allowed an hour on one RTX 4070 SUPER.

Nothing about the setup changed between those runs, because the model samples. The bench sends each step at temperature 1.0 with top_p 0.95, so the next token comes from a distribution instead of being taken as the most likely one. Drawing a different token early is enough to change which file the model decides to open.

Sampling is the smaller part of it. A cell is not one answer but sixty or seventy of them, chained: the model calls a tool, the tool returns a stack trace or a diff, and the next step is conditioned on what came back. Two runs that diverge at step four do not meet again at step sixty. The runs I logged took between 40 and 90 steps and a median of about forty-seven minutes before they stopped or hit the hour.

Running longer did not mean scoring higher. The eight draws that used the whole hour scored anywhere from two checks to four, and the fastest run in the study, at 21 minutes, met every check on its issue. On 920 every draw spent the full hour, and the scores still split two and four. Whatever was separating those runs, it was not the effort in them.

![When each draw stopped, by issue: all six 920 draws sit on the 60-minute limit with scores from two to four, while the other issues mostly finish earlier and mostly meet every check](/k3/elapsed.svg)

## The result

All twenty-four cells produced a score, and none had to be thrown out. The table keeps the three draws separate, because the draws are the finding.

| issue | checks | shipped, draws 1 to 3 | challenger, draws 1 to 3 |
|---|---|---|---|
| 920 | 4 | 4, 2, 2 | 2, 2, 4 |
| 928 | 3 | 3, 3, 3 | 3, 3, 3 |
| 940 | 4 | 4, 3, 4 | 4, 4, 4 |
| 966 | 4 | 4, 4, 4 | 4, 3, 4 |
| total | 15 | 13.33 | 13.33 |

Two issues moved, one draw each, in opposite directions. The totals are 13.33 of 15 for each arm, averaged over the four per-issue means, which is the number the pre-registered rule compares. Summed raw it is 40 of 45 apiece, the same proportion.

## The rule

The rule was written on 11 November, before the first cell ran, and it has two halves. A gap under two checks, with overlapping intervals, is a tie, and a tie keeps the shipped model. A swap needs at least two checks in the challenger's favour, and the challenger at least as good on two of the four issues.

The two-check floor came from the design's power estimate. The design assumed a per-cell spread of 0.58 checks and, with three draws per cell, a standard error of 0.95 for the difference between the arms. On that estimate a two-check gap is the smallest the study could resolve, so a one-check gap is printed as unresolved rather than as a result.

The measured difference was 0.00 checks. The shipped model stays. The challenger was not shown to be better, and it was not shown to be worse.

## The noise floor was optimistic

The 0.58 was measured on four earlier draws of the noisy issue, which scored 4, 3, 4, 3: a spread of 0.577 checks. Four draws is a small sample to estimate a variance from. The three draws in this study came back 4, 2 and 2, for 1.155.

Run the same calculation on what the study produced and the standard error of the difference is 1.249 checks, not 0.95. The power estimate was 30 percent optimistic, which moves the smallest resolvable gap from two checks to about two and a half and leaves a 95 percent interval of plus or minus 1.86 checks on the difference. A two-check gap is now marginal, and a one-check gap was never going to be visible.

The other three issues were stable. 928 returned 3, 3, 3 for both arms. 940 and 966 moved once each, in opposite directions, and neither moved far enough to matter on its own. All of the excess noise sits in 920, on both models.

## Four runs that produced nothing

Four of the twenty-eight attempts produced no score, and each one failed differently. Twice a model spent the full hour without editing a file: once with the shipped weights on 920, once with the challenger on 920. Both were retried under a fresh tag, and both retries scored 2 of 4.

Once, on 940, the model committed its work to git. The cell prompt tells it to leave changes in the working tree and not to commit or push, and the harness reads the working tree, so the commit made a finished run invisible. That is an instruction-following failure rather than a harness fault, and it is the only one of the twenty-eight attempts where an explicit rule was broken.

Once the challenger spent its whole output budget on a single thinking turn: 16,384 tokens, no edit, dead at step three. Raising the budget from 8,192 to 16,384 earlier in the project had reduced this failure without removing it. That cell was re-run by hand under a third tag and scored 4 of 4.

None of the four was scored as zero. Each became a missing draw and was replaced, because entering an absent run as zero would penalise whichever model happened to fail more often.

## What the rubric misses

Passing the rubric is not the same as leaving the repository working. Every cell also runs the surrounding test suites, and 6 of the 24 draws broke something there: all three 920 draws for the shipped model, one 928 draw, and two 920 draws for the challenger.

The earlier single-draw runs had no regressions in the eight that carry a summary. What changed here is the output budget: it went from 8,192 tokens to 16,384 before this study, the diffs reached 11 files, and a patch that spans eleven files is more likely to break something nearby.

## What this settles, and what it does not

The shipped quantization stays. The arms were indistinguishable on quality, and the shipped one is the simpler deployment: a single 8.7 GB file against 7.6 GB plus a 1.4 GB draft.

The number I will reuse is the noise floor. On this bench, with these four issues, the standard error of a difference between two models is 1.25 checks rather than the 0.95 the design assumed, so any future comparison should budget for a gap of about two and a half. On issue 920 a single run is worth somewhere between 2 and 4 checks.

Nothing here speaks to a one-check gap, which is the size most quantization comparisons claim, or to anything outside these four issues. It also says nothing about higher precision: a 4-bit or 6-bit build of the same model does not fit in 12 GB, so the comparison is confined to the two lowest-bit options that do.

The shipped model also ran without the speculative-decoding flags its production configuration uses. That changes how fast tokens come out rather than which checks pass, and the two arms were not identical in that respect.

## How to check any of this

Every number here comes from a report tool that reads the run artifacts and does not score a missing draw as zero. It carries a self-test of 67 assertions, and a second analyser recomputes the totals under two alternative scoring policies: one that counts a weakly-evidenced check as failed, and one that discards every run which ended at the time limit. Both give the same verdict as the primary reading.

The harness, the logs and the policy documents are in a private repository for now. If you want to run this design against a model of your own, or argue with the statistics, [open an issue](https://github.com/barateza/barateza-blog/issues).
