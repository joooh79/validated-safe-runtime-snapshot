# Golden Case Suite

## Purpose

These are the minimum validation cases the rebuilt sender must pass before meaningful cutover.

## Required cases

1. new patient first visit simple
2. existing patient new visit simple
3. same-date correction
4. patient duplicate correction
5. multi-tooth visit
6. same-tooth multi-visit continuation
7. deferred-result follow-up
8. revised diagnosis later
9. revised plan later
10. same tooth but new episode
11. complication/correction case
12. no-op / duplicate submit

## Validation expectations

Each golden case should define:
- input summary
- expected resolution
- expected write-plan shape
- expected preview meaning
- expected execution result
- forbidden regression
