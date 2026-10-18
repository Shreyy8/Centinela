<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

---

## Multi-Agent Workstream Boundaries & Isolation Rules

When multiple agents or engineers collaborate on Centinela, all tasks are strictly divided into two mutually exclusive tracks to prevent merge conflicts and dependency blocking (see [WORKSTREAMS.md](WORKSTREAMS.md) and [IMPROVEMENTS.md](IMPROVEMENTS.md)):

- **Track 1 (Platform, Cryptography & Systems):**
  - **Owned Files:** `bayora/services/session_manager/**`, `bayora/services/audit_service/**`, `bayora/infra/**`, `docker-compose.yml`, `Dockerfile`, `Makefile`.
  - **Forbidden:** NEVER modify files under `frontend/`, `bayora/ml/`, or `bayora/datasets/`.
  - **Scope:** Message bus encryption, Kafka networking, Merkle ledger atomicity, Docker/K8s infra.

- **Track 2 (Frontend Product & ML / Data):**
  - **Owned Files:** `frontend/**`, `bayora/datasets/**`, `bayora/ml/**`, `bayora/services/auth_service/**`, `bayora/services/llm_proxy/**`, `tests/integration/test_llm_proxy.py`.
  - **Forbidden:** NEVER modify `session_manager/`, `audit_service/`, or Docker/K8s infra files.
  - **Scope:** React 19 UI, PDF export, profile API, AdvBench dataset loaders, PAIR & refusal classifiers.
  - **Runtime:** Track 2 agents MUST use `demo_server.py` for local zero-dependency testing.

