# Preview and Interaction Rules

## Core rule

Preview-first remains mandatory.

Normal execution order:
1. parse
2. resolve
3. plan
4. preview
5. confirm/correct/recheck as needed
6. execute

## Preview must show

Minimum blocks:
- patient action
- visit action
- case action
- snapshot actions by branch
- warnings / ambiguity
- next required step

The user must be able to tell:
- whether a new visit will be created
- whether an existing visit will be updated
- whether a case will be created or continued
- whether write is blocked
- why it is blocked if blocked

## Preview modes

- preview_confirmation
- correction_required
- recheck_required
- hard_stop
- inform_no_op

## Standard confirmation actions

Preserve these meanings:
1. send now
2. revise and preview again
3. cancel

## Correction-required rules

Use when:
- same-date conflict exists and needs explicit correction handling
- patient duplicate suspicion exists

The sender must:
- explain why write is blocked
- state what correction is required
- not silently auto-convert intent

## Recheck-required rules

Use when:
- identity lookup is insufficiently trusted for write
- patient recheck is needed

The sender must:
- preserve clinical content
- request only the required recheck input
- not require full clinical re-entry

## Hard-stop rules

Use when:
- safe progression must terminate
- user explicitly chooses a state that cannot proceed safely

The sender must:
- clearly say no write occurred
- not pretend resend is still automatically available if it is not

## No-op rules

When there is no meaningful change:
- do not fake a send
- return an explicit no-op terminal meaning

## Coupling rule

Preview must come from actual write-plan meaning.
If plan changes materially after correction/recheck, preview must be regenerated.
