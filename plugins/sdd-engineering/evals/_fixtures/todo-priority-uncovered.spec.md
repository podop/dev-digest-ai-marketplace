# Todo priority

Spec: Todo priority · Status: draft · Date: 2026-10-15
Areas: [lib] · Design sources: none

## Goal
Let callers mark how important a todo is and list todos by importance level.

## Scope
In scope: a priority on each todo; filtering the list by priority.
Out of scope: sorting by priority; changing the priority of an existing todo; persistence.

## Functional requirements
- FR1 Every todo has a priority: one of `low`, `medium`, `high`.
- FR2 A todo created without a priority gets `medium`.
- FR3 Creating a todo with any other priority value is rejected with an error that names the allowed values.
- FR4 The list can be filtered by priority; the filter combines with the existing done/undone filter.

## Edge cases
- EC1 Filtering by a priority no todo has returns an empty list.

## Acceptance criteria
- AC1 Given a new todo created with priority `high`, when it is listed, then its priority is `high`. Traces: FR1 · Verify: unit
- AC2 Given a new todo created without a priority, when it is listed, then its priority is `medium`. Traces: FR2 · Verify: unit
- AC4 Given todos of mixed priority and state, when listing with priority `high` and done `false`, then only undone high-priority todos are returned. Traces: FR4 · Verify: unit
- AC5 Given no `low` todos, when listing with priority `low`, then the result is empty. Traces: EC1 · Verify: unit

## Traceability
| Requirement | Acceptance criteria |
|---|---|
| FR1 | AC1 |
| FR2 | AC2 |
| FR3 | — |
| FR4 | AC4 |
| EC1 | AC5 |

## Open questions
- none
