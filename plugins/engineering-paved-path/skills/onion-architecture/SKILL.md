---
name: onion-architecture
description: "Onion (ports and adapters) architecture for TypeScript backends — typically Fastify + Drizzle/Postgres + Zod with SDK adapters. Decides which ring code belongs to (domain, application, infrastructure, http, composition root), where schemas, queries, repositories, ports, transactions, errors and config live, how dependencies are injected, and how to enforce inward-only imports with dependency-cruiser. Use when adding or moving backend modules, routes, use cases, repositories or adapters, asking where backend code should go, or reviewing a backend change for layering. The repository's own architecture docs override this skill. Not for Fastify/Drizzle/Zod API details (use fastify-best-practices, drizzle-orm-patterns, zod)."
---

# Onion Architecture (backend)

Dependencies point **inward only**. The core compiles and is testable without the
web framework, the ORM, the database driver or any SDK.

**Repository rules win.** Before applying this skill, look for the repository's own
architecture sources and follow them where they differ: `ARCHITECTURE.md`,
`docs/architecture/**`, ADRs (`docs/adr/**`, `adr/**`), `CLAUDE.md` / `AGENTS.md`,
and a dependency-cruiser or eslint-boundaries config. This skill fills the gaps.

Details: [references/fastify.md](references/fastify.md) ·
[references/drizzle.md](references/drizzle.md) ·
[references/zod-boundaries.md](references/zod-boundaries.md) ·
[references/testing.md](references/testing.md) ·
[references/examples.md](references/examples.md).
Read a reference only when the task touches that tool.

## 1. Rings

| Ring | In a module (small → grown) | Owns | May import |
|---|---|---|---|
| **domain** | `domain.ts`, `helpers.ts`, `constants.ts` → `domain/` | entities, value objects, invariants, pure rules, domain errors | domain only, `zod`, shared contract types |
| **application** | `service.ts` → `application/` | use cases, port interfaces, transaction boundary, orchestration | domain, ports, own repository **as type** |
| **infrastructure** | `repository.ts` → `infrastructure/`; shared `adapters/`, `db/` | ORM schema + queries, mappers, SDK/HTTP/filesystem adapters | domain, application ports, `db`, SDKs |
| **http** | `routes.ts` → `http/` | framework plugin, request/response schemas, DTO mapping | application, domain, web framework, `zod` |
| **composition root** | `composition.ts`, `container.ts`, `app.ts`, `server.ts`, `config.ts` | wiring: adapters → repositories → use cases → plugins | everything |

Rules:
- An outer ring may call **any** inner ring (skipping is fine); never the reverse.
- `domain` never imports the web framework, the ORM, database drivers, LLM/HTTP SDKs,
  `process.env`, `fs`, `child_process` or network modules.
- Only the composition root knows concrete classes of more than one ring.
- A file's ring is its **name** (small module) or its **folder** (grown module).
  Any other file name is treated as **application**; move it to its real ring.
- Split into folders when a ring's file passes ~300 lines or needs several files.

## 2. Where does it go?

| You have… | Ring → location |
|---|---|
| Business rule, calculation, state transition, invariant check | domain → `domain.ts` / `helpers.ts` (pure function or entity method) |
| Magic value, enum-like map, limit | domain → `constants.ts` |
| "When X, load A and B, apply rule, save C, notify D" | application → method on the use case in `service.ts` |
| Interface the use case needs from the outside world | application → port in `service.ts` / `application/ports.ts` |
| SQL / ORM query, table definition, relations | infrastructure → `repository.ts` / `db/schema/*` |
| Row ↔ domain / DTO mapping | infrastructure → mapper next to the repository |
| LLM, VCS, HTTP API, embeddings, filesystem call | infrastructure → `adapters/<kind>/` implementing a port |
| Request/response schema, params, status codes | http → `routes.ts` (module-local) or the shared contract package |
| Domain error → HTTP status | http edge → the root error handler |
| Env var | composition root → `config.ts` schema; secrets only via a secrets provider |
| New module | `modules/<name>/` + one registration line |

## 3. Per-tool rules

**Fastify (http + composition root)** — details in `references/fastify.md`
- A module is an encapsulated plugin; call `app.withTypeProvider<ZodTypeProvider>()`
  in each plugin (type providers are not inherited).
- Handler = parsed input → request context → use case → DTO. No `db`, no ORM, no
  `new XxxRepository`, no business `if`s.
- Schema-first: `params`/`querystring`/`body`/`response` on the route; never
  `Schema.parse(req.body)` in a handler.
- Errors: throw domain errors; one root error handler maps them.

**Drizzle (infrastructure)** — details in `references/drizzle.md`
- `drizzle-orm`, `db/*` and row types stay in infrastructure.
- A repository method is shaped by the use case (`listEnabledForWorkspace`) and
  returns domain objects / read models — never a query builder, `SQL` fragment or `tx`.
- Transactions: the **use case** decides the boundary via a `TransactionRunner`
  port (`run(fn)`); repositories are built from `tx ?? db`.
- Translate driver errors (unique / foreign-key violations) into domain errors
  inside the adapter.

**Zod** — details in `references/zod-boundaries.md`
- Transport schemas (http) ≠ domain types. Don't reuse a request schema as an entity.
- Parse once at the edge (route schema, config, LLM output inside its adapter);
  inner rings receive already-typed data.

**External services (infrastructure)**
- Only through ports named after needs (`LLMProvider`, `GitClient`, `Embedder`).
  SDK types never cross the port.
- Model ids and keys come from injected config / a secrets provider.

## 4. Dependency injection

- A use case receives **only the ports it uses**: `new AgentsService({ agents, llm })`
  — not the whole container.
- Construction happens in the composition root. No DI library required.
- Pragmatic CRUD: a use case may reference its own repository **as a type**
  (`import type`). Extract a port when there are real invariants, a second
  implementation or a test fake.
- Request-scoped data (`workspaceId`, `userId`) is passed as arguments, not stored
  on the service.

## 5. Proportionality

- CRUD endpoint with no rules: `routes.ts` → thin `service.ts` method → repository.
- Add a domain entity / value object when there is an invariant to protect.
- Add a port interface when there is a swap point (tests, second provider, SDK).
- Never add a ring file "for symmetry"; an empty `domain.ts` is noise.

## 6. Workflow: new module / use case

```
- [ ] 1. Read the repository's architecture docs and the spec/plan
- [ ] 2. domain: types, invariants, pure rules + unit tests (no doubles)
- [ ] 3. application: use case, ports it needs, transaction boundary
- [ ] 4. infrastructure: repository/adapter implementing the port, mapper, integration test
- [ ] 5. http: schemas, handler → use case → DTO; errors thrown, not formatted
- [ ] 6. composition root: wire and register the module
- [ ] 7. Run the layer check (section 8), typecheck and unit tests
```

## 7. Review checklist

- [ ] Layer check passes with no new violations (baseline unchanged or shrunk)
- [ ] No ORM / `db` import outside infrastructure; no SDK import outside adapters
- [ ] Routes don't query, don't `new` repositories, don't hold business rules
- [ ] New/changed use cases take ports, not the container (no service locator)
- [ ] Domain code is pure and unit-tested without mocks
- [ ] Domain throws typed errors; only the root handler knows HTTP
- [ ] `process.env` read only in config / secrets provider

## 8. Enforcement (dependency-cruiser)

If the repository has a dependency-cruiser config, run it with the repository's own
script (look in `package.json` for `arch`, `depcruise` or `lint:deps`). Typical form:

```bash
npx depcruise src --config .dependency-cruiser.cjs --ignore-known
```

- Exit 0 = no **new** violations; legacy ones live in a known-violations baseline.
- A new violation → fix the code. Never add it to the baseline.
- After fixing a legacy violation, regenerate the baseline and check the diff only
  **removes** entries.
- No config in the repository → report "layer check: not configured" instead of
  inventing one.
