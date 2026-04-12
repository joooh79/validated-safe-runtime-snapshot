# Target Sender Architecture

## Engines

The rebuilt sender should use these engines:

1. Contract / Intent Engine
2. State Resolution Engine
3. Write Plan Engine
4. Direct Write Engine
5. Retry / Replay Engine
6. Logging / Inspection Layer
7. API orchestration layer

## 1. Contract / Intent Engine
Responsibilities:
- parse normalized input
- extract workflow intent
- extract continuity intent
- extract patient / visit / findings context
- guard against invented schema details

## 2. State Resolution Engine
Responsibilities:
- patient resolution
- visit resolution
- same-date detection
- correction/recheck/hard-stop classification
- case continuation vs new case classification
- readiness result

## 3. Write Plan Engine
Responsibilities:
- convert resolution into explicit ordered actions
- preserve create/update/no-op distinctions
- generate preview-ready action summary
- preserve dependency graph

## 4. Direct Write Engine
Responsibilities:
- execute ordered write actions
- call provider adapter
- normalize results
- preserve duplicate-safe behavior

## 5. Retry / Replay Engine
Responsibilities:
- store failed/incomplete plans
- determine replay eligibility
- support duplicate-safe replay or retry

## 6. Logging / Inspection Layer
Responsibilities:
- resolution log
- plan log
- execution log
- replay log

## 7. API orchestration layer
Responsibilities:
- orchestrate parse -> resolve -> preview -> confirm -> execute
- keep business logic out of transport layer
