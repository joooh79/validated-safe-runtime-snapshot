# Migration and Cutover Plan

## Purpose

Define the staged path from the current sender+Make system to the rebuilt sender-only direct-write target.

## Stages

1. behavior capture
2. shadow stage
3. compare stage
4. limited direct-write pilot
5. expanded direct-write stage
6. Make retirement

## Behavior capture
- finish Make behavior inventory
- lock preserved meanings
- identify hidden behavior risks

## Shadow stage
- new sender resolves/plans without taking over production write
- compare behavior meaning against current baseline

## Compare stage
- compare resolution outcome
- compare preview meaning
- compare intended write targets
- compare no-op/correction/hard-stop handling

## Limited pilot
- enable safest limited route set first
- preserve rollback path

## Expanded direct-write
- expand route coverage only after golden cases and pilot stability

## Make retirement criteria
- preserved behaviors are recovered
- core golden cases pass
- retry/replay is safe enough
- partial failure handling is explicit
- direct-write behavior is operationally trusted
