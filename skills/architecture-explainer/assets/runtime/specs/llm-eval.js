/**
 * SPEC: LLM Evaluation Pipeline
 *
 * One topology, many projections.
 * You author the system once, in full depth. Persona / lens / era / beat are
 * all selectors over this single graph.
 */

export const SPEC = {
  meta: {
    title: "How an LLM Evaluation Pipeline Actually Works",
    subtitle:
      "A new model candidate lands on Monday. By Friday you either ship it or you don't. This is the machinery that makes that call.",
    author: "BlockSimplified",
    updated: "July 2026",
  },

  // ── WHO IS READING ────────────────────────────────────────────────────────
  // Persona is a resolution policy, not a filter. Same system, different
  // vocabulary, different collapse depth, different facts surfaced.
  personas: [
    {
      id: "exec",
      label: "Executive",
      blurb: "What it costs, what it de-risks, who owns it.",
      depth: 1,
      facts: ["cost", "risk", "owner"],
    },
    {
      id: "architect",
      label: "Architect",
      blurb: "Component boundaries, data movement, failure surface.",
      depth: 2,
      facts: ["tech", "runtime", "owner", "risk"],
    },
    {
      id: "engineer",
      label: "Engineer",
      blurb: "The actual moving parts and what they're built from.",
      depth: 3,
      facts: ["tech", "runtime", "cost", "risk", "owner"],
    },
  ],

  // ── WHICH CONCERN ─────────────────────────────────────────────────────────
  // A lens rewires which edges exist and which fact each node advertises.
  lenses: [
    {
      id: "flow",
      label: "Data flow",
      blurb: "How an evaluation actually moves through the system.",
      fact: null,
      accent: "#7dd3fc",
    },
    {
      id: "cost",
      label: "Cost",
      blurb: "Where the money goes on every eval run.",
      fact: "cost",
      accent: "#fbbf24",
    },
    {
      id: "trust",
      label: "Data governance",
      blurb: "Where customer data enters, and what's allowed to touch it.",
      fact: "governance",
      accent: "#34d399",
    },
    {
      id: "failure",
      label: "Failure modes",
      blurb: "How this pipeline lies to you, and where.",
      fact: "risk",
      accent: "#f87171",
    },
    {
      id: "ownership",
      label: "Ownership",
      blurb: "Which team is on the hook for each piece.",
      fact: "owner",
      accent: "#c4b5fd",
    },
  ],

  // ── WHEN ──────────────────────────────────────────────────────────────────
  eras: [
    {
      id: "v0",
      label: "v0 — the spreadsheet",
      blurb:
        "Where nearly every team starts: a hand-curated question list, run by a script, scored by eyeball, pasted into a sheet. It works until it doesn't.",
    },
    {
      id: "today",
      label: "Today",
      blurb:
        "A real pipeline. Versioned datasets, automated scoring, statistical gating, a human in the loop where it counts.",
    },
    {
      id: "next",
      label: "Planned",
      blurb:
        "Where this is heading: the loop closes. Production failures mine themselves back into the eval set, and the judges get audited too.",
    },
  ],

  defaultEra: "today",

  // ── THE TOPOLOGY ──────────────────────────────────────────────────────────
  root: {
    id: "root",
    label: { default: "LLM Evaluation Pipeline" },
    children: [
      {
        id: "t_inputs",
        kind: "group",
        cols: 4,
        label: {
          default: "Inputs",
          exec: "Where the questions come from",
          architect: "Data Sources",
        },
        why: "You can only measure a model against questions you've decided are worth asking. This tier is where those questions originate — and it's the tier that most quietly determines whether your eval means anything.",
        detail: {
          exec: "Every number that comes out of this pipeline is a claim about the questions in this tier. Get the mix wrong and the whole apparatus below produces confident, well-formatted noise.",
          architect: "Four sources covering four different blind spots. Real traffic, a curated must-never-break set, generated coverage of the rare, and a deliberate adversarial corpus.",
          engineer: "Sampled prod logs, in-repo fixtures, taxonomy-seeded generation and a technique-tagged attack corpus.",
        },
        facts: {
          cost: "Cheap to run, expensive to get wrong",
          risk: "An eval set that doesn't look like production traffic gives you confident, useless numbers",
          owner: "ML Platform + Product",
        },
        children: [
          {
            id: "prod_traffic",
            kind: "source",
            eras: ["today", "next"],
            label: {
              default: "Production Traces",
              exec: "Real customer usage",
              engineer: "Sampled request/response logs",
            },
            why: "The only source that tells you what users actually ask, as opposed to what you imagined they'd ask.",
            detail: {
              exec: "A sample of real conversations, stripped of anything identifying, used to check the model against reality rather than against our assumptions.",
              architect:
                "Stratified sample from the request log, weighted toward high-volume intents and known-hard slices. Sampled continuously, snapshotted weekly.",
              engineer:
                "Kafka → S3 parquet, stratified sample job weighted by intent cluster + a boosted stratum for sessions with thumbs-down or retry signals.",
            },
            facts: {
              cost: "~$40/mo storage",
              runtime: "Continuous sample, weekly snapshot",
              tech: "Kafka → S3 (parquet)",
              owner: "Data Platform",
              risk: "Sampling bias: over-represents power users, misses first-run confusion",
              governance: "Raw PII present — never leaves this boundary unscrubbed",
            },
          },
          {
            id: "golden_set",
            kind: "source",
            eras: ["v0", "today", "next"],
            label: {
              default: "Golden Set",
              exec: "The must-never-break list",
              engineer: "Curated fixtures, human-verified",
            },
            why: "A small, hand-verified set of cases you are willing to block a release on. It's small on purpose — every item has to earn its place.",
            detail: {
              exec: "A few hundred cases we've decided the product must handle correctly, every single time. If one of these breaks, nothing ships.",
              architect:
                "~400 human-verified input/expected pairs, each tagged with the capability it guards and the incident that caused it to be added.",
              engineer:
                "YAML fixtures in-repo, reviewed like code. Every case carries a `guards:` tag and a link to the incident or PR that created it.",
            },
            facts: {
              cost: "Human time only (~2 hrs/wk curation)",
              runtime: "Runs in ~6 min",
              tech: "YAML in-repo, PR-reviewed",
              owner: "ML Platform",
              risk: "Slowly becomes a museum — cases stop reflecting the current product",
              governance: "Synthetic or consented data only, safe to keep forever",
            },
          },
          {
            id: "synth",
            kind: "source",
            eras: ["today", "next"],
            label: {
              default: "Synthetic Generation",
              exec: "Machine-written test cases",
              engineer: "LLM-generated, seeded from taxonomy",
            },
            why: "Coverage is a volume problem. Generating cases lets you probe capabilities that appear too rarely in real traffic to measure reliably.",
            detail: {
              exec: "We use a model to write test questions for us, which gets us coverage of rare situations that real traffic barely contains.",
              architect:
                "Taxonomy-seeded generation with dedup against existing sets. Generated cases are quarantined until a human accepts the batch.",
              engineer:
                "Seed taxonomy → generation prompt → embedding dedup at 0.92 cosine → quarantine queue → sampled human accept/reject on 10% of the batch.",
            },
            facts: {
              cost: "~$120 per 10k generated cases",
              runtime: "~25 min per batch",
              tech: "Generation prompt + embedding dedup",
              owner: "ML Platform",
              risk: "Model-written tests inherit the model's blind spots — it cannot imagine what it cannot do",
              governance: "No customer data involved",
            },
          },
          {
            id: "redteam",
            kind: "source",
            eras: ["today", "next"],
            label: {
              default: "Adversarial Set",
              exec: "Deliberate attempts to break it",
              engineer: "Jailbreak + injection corpus",
            },
            why: "Everything else measures the model on its good days. This measures it against someone actively trying to make it misbehave.",
            detail: {
              exec: "A collection of known attacks and manipulations, kept current, that we run before every release to check the model still refuses what it should.",
              architect:
                "Curated attack corpus plus a rotating set from public jailbreak feeds. Deliberately never fully automated — a human adds new categories.",
              engineer:
                "Versioned attack corpus, tagged by technique family. Refreshed monthly against public feeds and internal red-team findings.",
            },
            facts: {
              cost: "Human time + ~$30/run",
              runtime: "~12 min",
              tech: "Versioned corpus, technique-tagged",
              owner: "Safety",
              risk: "Only tests attacks you already know about — the tail is unbounded",
              governance: "Contains deliberately harmful prompts; access-restricted",
            },
          },
        ],
      },

      {
        id: "t_dataset",
        kind: "group",
        cols: 3,
        label: {
          default: "Dataset Layer",
          exec: "Making the data safe and stable",
          architect: "Curation & Versioning",
        },
        why: "Raw sources are unusable as-is: they contain customer data, they're unlabeled, and they change under you. This tier turns a stream into a citable, frozen, legally-clean artifact.",
        detail: {
          exec: "The tier that keeps this out of a compliance incident and makes results from six months ago still mean something today.",
          architect: "Redaction and consent filtering, human labeling for anything subjective, and immutable content-addressed versioning.",
          engineer: "Scrub \u2192 label \u2192 freeze. Runs pin a dataset hash; datasets are superseded, never edited.",
        },
        facts: {
          cost: "Dominated by human labeling",
          risk: "If eval sets aren't versioned, you cannot tell a model regression from a dataset change",
          owner: "Data Platform + ML Platform",
          governance: "This is the compliance boundary of the whole pipeline",
        },
        children: [
          {
            id: "scrub",
            kind: "process",
            eras: ["today", "next"],
            label: {
              default: "PII Scrub & Consent Filter",
              exec: "Privacy gate",
              engineer: "NER redaction + consent join",
            },
            why: "Production traffic contains real customer data. Nothing downstream is allowed to see it un-redacted — this is the boundary that keeps an eval pipeline out of a compliance incident.",
            detail: {
              exec: "Removes personal information and drops any customer who hasn't consented to their data being used this way, before anything else touches it.",
              architect:
                "Two-stage: deterministic pattern redaction, then NER-based entity redaction, then an inner join against the consent ledger. Fails closed.",
              engineer:
                "Regex pass (emails, cards, phones) → NER model for names/orgs/locations → inner join on consent ledger → sampled human audit at 1%.",
            },
            facts: {
              cost: "~$15/mo compute",
              runtime: "~8 min per snapshot",
              tech: "Regex + NER + consent-ledger join",
              owner: "Data Platform",
              risk: "Recall is not 100%. A missed entity is a data incident, not a bug",
              governance: "The boundary. Upstream is restricted, downstream is broadly readable",
            },
          },
          {
            id: "annotate",
            kind: "human",
            eras: ["v0", "today", "next"],
            label: {
              default: "Human Labeling",
              exec: "Experts marking right answers",
              engineer: "Annotation queue + adjudication",
            },
            why: "For anything subjective — tone, helpfulness, whether a refusal was correct — there is no ground truth until a human supplies it. This is the slowest and most expensive step, and skipping it is how evals become theatre.",
            detail: {
              exec: "Subject-matter experts review cases and record the correct outcome. It's the expensive part, and it's what everything else is measured against.",
              architect:
                "Every case gets 2 independent labels; disagreements route to a senior adjudicator. Inter-annotator agreement is itself tracked as a health metric.",
              engineer:
                "2 labels per case, Krippendorff's alpha tracked per rubric dimension. Alpha below 0.7 blocks the rubric from being used as a gate.",
            },
            facts: {
              cost: "~$4.50 per labeled case — the single largest line item",
              runtime: "2–5 days per batch",
              tech: "Annotation tool + adjudication queue",
              owner: "Ops + domain experts",
              risk: "Annotator drift: the same person labels differently in month 6 than month 1",
              governance: "Annotators see scrubbed data only, under NDA",
            },
          },
          {
            id: "registry",
            kind: "store",
            eras: ["v0", "today", "next"],
            label: {
              default: "Eval Set Registry",
              exec: "The versioned question bank",
              engineer: "Content-addressed dataset store",
            },
            why: "The single most under-rated component. Without immutable versions you can never answer 'did the model get worse, or did the test change?' — and that question will be asked in every post-mortem.",
            detail: {
              exec: "Every version of every test set is frozen and kept, so results from six months ago still mean something today.",
              architect:
                "Content-addressed and immutable. A run pins a dataset hash; the hash appears on every scorecard. Datasets are never edited, only superseded.",
              engineer:
                "Hash-addressed parquet in object storage + a metadata table. Slice definitions live alongside as declarative predicates, versioned together.",
            },
            facts: {
              cost: "~$60/mo",
              runtime: "Instant reads",
              tech: "Content-addressed object store + metadata DB",
              owner: "ML Platform",
              risk: "Set staleness — nobody notices the golden set stopped resembling production",
              governance: "Post-scrub only. Retention policy: 24 months",
            },
          },
        ],
      },

      {
        id: "t_exec",
        kind: "group",
        cols: 4,
        label: {
          default: "Execution",
          exec: "Running the test",
          architect: "Orchestration & Model Access",
        },
        why: "Where candidate models meet the questions. The engineering challenge here is not cleverness — it's making runs cheap, parallel, and bit-for-bit reproducible six months later.",
        detail: {
          exec: "Running the test. The cost here is real but predictable; the risk is that two runs are never quite comparable.",
          architect: "Orchestration, a declared config sweep, provider-normalised model access and a hermetic sandbox for tool use.",
          engineer: "Idempotent fan-out keyed by hash(case, model, prompt, seed), with a full manifest per run.",
        },
        facts: {
          cost: "Second-largest line item, dominated by inference",
          risk: "Non-reproducible runs make every comparison arguable",
          owner: "ML Platform",
        },
        children: [
          {
            id: "runner",
            kind: "process",
            eras: ["v0", "today", "next"],
            label: {
              default: "Eval Orchestrator",
              exec: "The conductor",
              engineer: "DAG runner, fan-out workers",
            },
            why: "Coordinates thousands of independent model calls, retries the flaky ones, and records exactly what was run against what.",
            detail: {
              exec: "Manages the whole run: fires off the test cases, handles failures, and produces a complete record of what happened.",
              architect:
                "Fan-out worker pool with per-provider rate limiting, exponential backoff, and a manifest capturing model version, dataset hash, prompt hash, and seed.",
              engineer:
                "Queue-backed workers, concurrency capped per provider, idempotency key = hash(case, model, prompt, seed). Full manifest emitted per run.",
            },
            facts: {
              cost: "~$8/run in orchestration compute",
              runtime: "40 min for a full sweep",
              tech: "Queue + worker pool, idempotent by hash",
              owner: "ML Platform",
              risk: "Silent partial runs — 3% of cases error out and the average quietly shifts",
              governance: "Handles scrubbed data only",
            },
          },
          {
            id: "matrix",
            kind: "process",
            eras: ["today", "next"],
            label: {
              default: "Prompt & Config Matrix",
              exec: "Every combination worth testing",
              engineer: "Cartesian sweep w/ pruning",
            },
            why: "A model isn't evaluated alone — it's evaluated inside a prompt, at a temperature, with a tool set. Change any of those and the numbers move. This makes the combinations explicit instead of accidental.",
            detail: {
              exec: "Tests the model across the different settings we actually use in the product, rather than one idealised configuration.",
              architect:
                "Declarative axes (prompt version × temperature × tool set × context budget) with pruning rules so the sweep stays affordable.",
              engineer:
                "YAML axis definitions, cartesian expansion, prune list for known-dead combinations. Emits one manifest row per cell.",
            },
            facts: {
              cost: "Multiplies everything downstream — the main cost lever",
              runtime: "Adds nothing itself; expands the run",
              tech: "Declarative axes + pruning rules",
              owner: "ML Platform",
              risk: "Combinatorial blowout: 4 axes becomes 200 configurations and a $9k bill",
              governance: "n/a",
            },
          },
          {
            id: "adapters",
            kind: "process",
            cols: 3,
            eras: ["v0", "today", "next"],
            label: {
              default: "Model Adapters",
              exec: "The models under test",
              engineer: "Provider-normalised clients",
            },
            why: "You are almost never evaluating one model — you're comparing a candidate against what's already live. Normalising providers behind one interface is what makes that comparison fair.",
            detail: {
              exec: "Connects to each model we're comparing, in a consistent way, so the comparison is apples to apples.",
              architect:
                "One interface per provider, normalising tokenisation, stop sequences, tool-call format and refusal shapes.",
              engineer:
                "Adapter per provider. Normalises tool-call schema, streaming, and finish reasons. Pins exact model build strings, never aliases like `-latest`.",
            },
            facts: {
              cost: "Inference: ~$180 per full sweep",
              runtime: "Dominates wall-clock",
              tech: "Per-provider adapters, pinned builds",
              owner: "ML Platform",
              risk: "Pinning to a moving alias — the 'same' model silently changes underneath you",
              governance: "Third-party data processing agreements apply here",
            },
            children: [
              {
                id: "m_candidate",
                kind: "process",
                eras: ["v0", "today", "next"],
                label: { default: "Candidate", engineer: "Candidate build (pinned)" },
                why: "The new thing asking for permission to ship.",
                detail: {
                  architect: "The model or prompt revision under evaluation.",
                  engineer: "Pinned build string + config hash, recorded in the run manifest.",
                },
                facts: { owner: "ML Platform", tech: "Pinned build string" },
              },
              {
                id: "m_baseline",
                kind: "process",
                eras: ["v0", "today", "next"],
                label: { default: "Baseline", engineer: "Current production build" },
                why: "What's live today. Every result is a delta against this, never an absolute.",
                detail: {
                  architect:
                    "Whatever is currently serving production. Re-run every time rather than cached, so provider drift shows up.",
                  engineer:
                    "Re-executed each sweep. Comparing against a cached baseline hides upstream provider drift.",
                },
                facts: {
                  owner: "ML Platform",
                  risk: "Cached baselines mask provider-side drift",
                  cost: "Doubles inference spend — worth it",
                },
              },
              {
                id: "m_reference",
                kind: "process",
                eras: ["today", "next"],
                label: { default: "Reference", engineer: "Frontier reference model" },
                why: "A stronger, more expensive model used as a ceiling — it tells you whether a failure is your prompt's fault or genuinely hard.",
                detail: {
                  architect:
                    "Not a shipping candidate. Establishes an achievable ceiling per slice so you know what's worth chasing.",
                  engineer:
                    "Run on a 10% sample only, for cost. Used to separate 'hard task' from 'bad prompt'.",
                },
                facts: { owner: "ML Platform", cost: "~$45/sweep (10% sample)", tech: "Sampled, not full" },
              },
            ],
          },
          {
            id: "sandbox",
            kind: "process",
            eras: ["today", "next"],
            label: {
              default: "Tool & Agent Sandbox",
              exec: "Safe environment for agent tests",
              engineer: "Hermetic tool mocks + trace capture",
            },
            why: "The moment your model calls tools, you're not evaluating a model — you're evaluating a trajectory. That needs a sealed environment, or your eval results depend on whether a third-party API was up that afternoon.",
            detail: {
              exec: "When the model uses tools, we run it in a sealed environment so results depend on the model, not on whether an outside service was working that day.",
              architect:
                "Hermetic mocks with recorded fixtures for external calls. Captures the full trajectory — every tool call, argument and result — not just the final answer.",
              engineer:
                "Record/replay fixtures, network egress blocked, per-case wall-clock cap. Emits full trajectory traces for step-level scoring.",
            },
            facts: {
              cost: "~$12/run",
              runtime: "Adds ~15 min",
              tech: "Hermetic mocks, egress blocked, trace capture",
              owner: "ML Platform",
              risk: "Mock drift — the sandbox stops resembling the real API and your agent scores become fiction",
              governance: "Fully isolated; no live customer systems reachable",
            },
          },
        ],
      },

      {
        id: "t_scoring",
        kind: "group",
        cols: 4,
        label: {
          default: "Scoring",
          exec: "Deciding what counts as good",
          architect: "Grading Layer",
        },
        why: "Turning outputs into numbers. This tier is where most eval pipelines quietly go wrong, because a scorer that's subtly miscalibrated produces numbers that look completely normal.",
        detail: {
          exec: "Deciding what counts as good. Cheap automatic checks first, a model grading the rest, humans checking the grader.",
          architect: "Deterministic assertions short-circuit before any model-based grading; the judge escalates low-margin cases to humans.",
          engineer: "Assertions \u2192 judge (position-swapped, self-consistent) \u2192 human queue on low margin plus a blind 5% audit sample.",
        },
        facts: {
          cost: "LLM judging + human review",
          risk: "A broken scorer is invisible — it produces plausible numbers, not errors",
          owner: "ML Platform + domain experts",
        },
        children: [
          {
            id: "deterministic",
            kind: "process",
            cols: 3,
            eras: ["v0", "today", "next"],
            label: {
              default: "Deterministic Checks",
              exec: "Objective pass/fail rules",
              engineer: "Assertion suite",
            },
            why: "Anything that can be checked with code should be, because code is free, instant, and doesn't have opinions. Run these first and never pay a judge to check whether JSON parses.",
            detail: {
              exec: "Automatic checks for things with an unambiguous right answer — did it return valid data, did it refuse when it should have.",
              architect:
                "Cheap assertions executed before any model-based grading. A deterministic failure short-circuits the expensive path.",
              engineer:
                "Runs first, short-circuits. Judge is never invoked on a case that already failed a hard assertion.",
            },
            facts: {
              cost: "Effectively free",
              runtime: "<30s for the full set",
              tech: "Assertion suite, short-circuiting",
              owner: "ML Platform",
              risk: "Over-trusted — passes every check while being unhelpful to an actual human",
            },
            children: [
              {
                id: "c_schema",
                kind: "process",
                eras: ["today", "next"],
                label: { default: "Schema Validity", engineer: "JSON schema + tool-arg validation" },
                why: "Structured output that doesn't parse is a production outage, not a quality issue.",
                detail: { engineer: "Validates response JSON and every tool call's arguments against its declared schema." },
                facts: { owner: "ML Platform", tech: "JSON Schema" },
              },
              {
                id: "c_exact",
                kind: "process",
                eras: ["v0", "today", "next"],
                label: { default: "Exact / Fuzzy Match", engineer: "Normalised string + numeric tolerance" },
                why: "For questions with one right answer, this is the whole scorer.",
                detail: { engineer: "Unicode-normalised comparison with per-case numeric tolerance." },
                facts: { owner: "ML Platform", risk: "Punishes correct answers phrased differently" },
              },
              {
                id: "c_safety",
                kind: "process",
                eras: ["today", "next"],
                label: { default: "Safety Classifier", engineer: "Policy classifier + refusal check" },
                why: "Checks both directions: that it refused what it must, and didn't refuse what it shouldn't.",
                detail: {
                  engineer:
                    "Policy classifier on output, plus over-refusal check on a benign control set. Both directions matter equally.",
                },
                facts: { owner: "Safety", risk: "Over-refusal is measured far less often than under-refusal" },
              },
            ],
          },
          {
            id: "judge",
            kind: "process",
            eras: ["today", "next"],
            label: {
              default: "LLM-as-Judge",
              exec: "A model grading the model",
              engineer: "Rubric-conditioned grader w/ CoT",
            },
            why: "Most of what matters — helpfulness, tone, whether the reasoning holds — has no assertion that can check it. A judge model scales human judgement at roughly 1/200th the cost, and inherits roughly 1/3rd of the reliability.",
            detail: {
              exec: "For qualities that can't be checked mechanically, a separate model grades the output against a written standard. Fast and cheap, but it must be audited against human graders.",
              architect:
                "Rubric-conditioned, position-swapped for pairwise comparisons, with self-consistency sampling on low-margin cases.",
              engineer:
                "Pairwise with position swap to cancel order bias, 3-sample self-consistency when margin < 0.15, abstain path routes to humans.",
            },
            facts: {
              cost: "~$0.02 per case — ~200× cheaper than a human",
              runtime: "~9 min for the full set",
              tech: "Rubric-conditioned, position-swapped, self-consistent",
              owner: "ML Platform",
              risk: "Judges prefer longer, more confident answers and reward their own family of models. Unaudited, this is the biggest lie in the pipeline",
              governance: "Sends scrubbed outputs to a third-party model provider",
            },
          },
          {
            id: "rubrics",
            kind: "store",
            eras: ["today", "next"],
            label: {
              default: "Rubric Store",
              exec: "The written standard",
              engineer: "Versioned rubric definitions",
            },
            why: "The rubric is the actual definition of quality for your product. Writing it down, versioning it, and arguing about it is more valuable than most of the tooling around it.",
            detail: {
              exec: "The explicit, written definition of what a good answer looks like — the thing everyone has to agree on before any number means anything.",
              architect:
                "Versioned per capability, with anchor examples at each score point. Rubric version is pinned into every run manifest.",
              engineer:
                "Versioned markdown + anchor examples, hash-pinned per run. Changing a rubric creates a new version rather than editing in place.",
            },
            facts: {
              cost: "Human time",
              tech: "Versioned, anchored, hash-pinned",
              owner: "Product + domain experts",
              risk: "Editing a rubric in place silently invalidates every historical comparison",
            },
          },
          {
            id: "human_review",
            kind: "human",
            eras: ["today", "next"],
            label: {
              default: "Human Review Queue",
              exec: "Expert spot-checks",
              engineer: "Stratified sample + disagreement triage",
            },
            why: "Humans don't grade everything — they grade the cases the machine is least sure about, plus a random sample used to check the machine itself. That sample is what keeps the judge honest.",
            detail: {
              exec: "Experts review the cases the automated grader was least confident about, plus a random sample used to verify the grader is still accurate.",
              architect:
                "Two streams: low-margin judge cases, and a blind random sample scored against the judge to compute agreement.",
              engineer:
                "Low-margin cases + 5% blind random. Judge-human agreement (Cohen's kappa) is tracked as a first-class release metric.",
            },
            facts: {
              cost: "~$4.50/case, capped at 5% of volume",
              runtime: "1–2 days",
              tech: "Stratified queue, blind sampling",
              owner: "Ops + domain experts",
              risk: "The blind sample gets cut first when a release is late — and that's exactly when you need it",
              governance: "Scrubbed data only, NDA'd reviewers",
            },
          },
        ],
      },

      {
        id: "t_analysis",
        kind: "group",
        cols: 4,
        label: {
          default: "Analysis",
          exec: "Turning scores into a verdict",
          architect: "Aggregation & Statistics",
        },
        why: "A raw average is almost always misleading. This tier's job is to stop you shipping on noise, and to stop you shipping a model that improved on average while collapsing for one segment of your users.",
        detail: {
          exec: "Turning thousands of scores into one defensible verdict, without shipping on noise or hiding a collapsed customer segment.",
          architect: "Append-only metrics, paired bootstrap intervals, per-slice breakdowns and a traffic-weighted regression detector.",
          engineer: "Paired bootstrap with multiplicity correction over predicate-defined slices, weighted by production volume.",
        },
        facts: {
          cost: "Negligible compute",
          risk: "Averages hide the regression that will generate the support tickets",
          owner: "ML Platform + Analytics",
        },
        children: [
          {
            id: "metrics",
            kind: "store",
            eras: ["v0", "today", "next"],
            label: {
              default: "Metrics Store",
              exec: "The results ledger",
              engineer: "Append-only run × case × scorer table",
            },
            why: "Every score from every run, kept forever and joinable. This is what lets you ask in November why the number moved in June.",
            detail: {
              exec: "Every result we've ever produced, kept permanently, so questions about the past have answers.",
              architect:
                "Append-only, keyed by (run, case, scorer, config). Nothing is ever overwritten; corrections are new rows.",
              engineer:
                "Columnar store, append-only. Run manifest hash joins results to the exact dataset, prompt and model build that produced them.",
            },
            facts: {
              cost: "~$25/mo",
              runtime: "Instant",
              tech: "Append-only columnar store",
              owner: "ML Platform",
              risk: "Schema drift across runs makes historical comparison quietly wrong",
              governance: "Scores only, no raw customer text",
            },
          },
          {
            id: "stats",
            kind: "process",
            eras: ["today", "next"],
            label: {
              default: "Significance Testing",
              exec: "Is this difference real?",
              engineer: "Bootstrap CI + paired tests",
            },
            why: "The difference between 81.2% and 82.7% is usually nothing. Without confidence intervals, teams ship noise and celebrate it — then can't explain why it didn't hold.",
            detail: {
              exec: "Checks whether an improvement is real or just random variation, so we don't celebrate a difference that would vanish if we ran it again.",
              architect:
                "Paired bootstrap over cases, since candidate and baseline see identical inputs. Reports intervals, not point estimates.",
              engineer:
                "Paired bootstrap, 10k resamples, BCa intervals. Multiple-comparison correction applied across slices.",
            },
            facts: {
              cost: "Negligible",
              runtime: "~40s",
              tech: "Paired bootstrap, BCa, multiplicity-corrected",
              owner: "Analytics",
              risk: "Testing 30 slices without correction guarantees a false winner",
            },
          },
          {
            id: "slices",
            kind: "process",
            eras: ["today", "next"],
            label: {
              default: "Slice Breakdown",
              exec: "Who got worse",
              engineer: "Predicate-defined cohort scoring",
            },
            why: "Aggregate improvement routinely hides a segment that got dramatically worse. Those users are the ones who file the tickets, and the average will never show you which segment it was.",
            detail: {
              exec: "Breaks results down by customer type, language, question category and length, so we can see who a change actually helps and who it hurts.",
              architect:
                "Slices are declarative predicates versioned alongside the dataset. Every headline metric is computed per slice as well as overall.",
              engineer:
                "Predicates in the dataset registry. Min-slice-size guard prevents drawing conclusions from a cohort of 11 cases.",
            },
            facts: {
              cost: "Negligible",
              runtime: "~1 min",
              tech: "Declarative predicates, min-size guarded",
              owner: "Analytics",
              risk: "Too many slices manufactures false alarms; too few hides real ones",
            },
          },
          {
            id: "regress",
            kind: "process",
            eras: ["today", "next"],
            label: {
              default: "Regression Detector",
              exec: "The alarm",
              engineer: "Per-slice threshold + drift comparison",
            },
            why: "Compares this run against both the baseline and the historical trend, and produces the one thing a release decision needs: a list of what got worse, ranked by how much it matters.",
            detail: {
              exec: "Automatically flags anything that got worse, ranked by how many users it affects.",
              architect:
                "Per-slice thresholds weighted by production traffic volume, so a 3% drop on a high-volume slice outranks a 10% drop on a rare one.",
              engineer:
                "Threshold per slice × traffic weight. Emits a ranked regression list with confidence intervals attached to each entry.",
            },
            facts: {
              cost: "Negligible",
              runtime: "~20s",
              tech: "Traffic-weighted per-slice thresholds",
              owner: "ML Platform",
              risk: "Alert fatigue — if it cries wolf twice, the gate gets overridden by habit",
            },
          },
        ],
      },

      {
        id: "t_decision",
        kind: "group",
        cols: 4,
        label: {
          default: "Decision & Gating",
          exec: "Ship / don't ship",
          architect: "Release Control",
        },
        why: "Everything upstream is measurement. This tier is the only part that changes an outcome — and it's where measurement either has teeth or turns into a dashboard nobody reads.",
        detail: {
          exec: "The only tier that changes an outcome. Everything above it is measurement; this is where measurement gets teeth.",
          architect: "Hard gate on golden-set and safety regressions, a metric-gated staged rollout, and an automated revert path.",
          engineer: "Required CI status check with signed overrides, flag-driven ramp, sub-two-minute revert to the pinned previous build.",
        },
        facts: {
          cost: "Cheap to run, expensive to bypass",
          risk: "A gate that can be overridden without a written reason is not a gate",
          owner: "Eng leadership + ML Platform",
        },
        children: [
          {
            id: "gate",
            kind: "gate",
            eras: ["today", "next"],
            label: {
              default: "CI Release Gate",
              exec: "The automatic block",
              engineer: "Required status check",
            },
            why: "The moment where the eval stops being informational. Golden-set regressions and safety regressions block automatically; everything else is advisory.",
            detail: {
              exec: "Blocks the release automatically if a must-never-break case fails or a safety check regresses. Overrides are possible but must be signed off and recorded.",
              architect:
                "Hard-fail on golden set and safety; soft-warn on aggregate quality. Overrides require a named approver and a written reason, both logged.",
              engineer:
                "Required status check on the release PR. Override is a signed annotation on the run, surfaced permanently in the scorecard.",
            },
            facts: {
              cost: "Free",
              runtime: "Instant",
              tech: "Required CI status check, signed overrides",
              owner: "Eng leadership",
              risk: "Override culture. Once the third override ships fine, the gate is decorative",
              governance: "Override log is auditable",
            },
          },
          {
            id: "report",
            kind: "process",
            eras: ["v0", "today", "next"],
            label: {
              default: "Scorecard",
              exec: "The one-page summary",
              engineer: "Generated report + permalink",
            },
            why: "The artifact humans actually read. Its job is to make the decision obvious in thirty seconds, and to still be interpretable a year later.",
            detail: {
              exec: "A single page: what improved, what regressed, who's affected, and what it cost — with a permanent link so the decision can be revisited.",
              architect:
                "Auto-generated per run, permalinked, and pinned to the run manifest so the exact inputs are always recoverable.",
              engineer:
                "Static artifact per run. Embeds dataset hash, model builds, rubric version and override log.",
            },
            facts: {
              cost: "Free",
              runtime: "Instant",
              tech: "Generated static artifact, permalinked",
              owner: "ML Platform",
              risk: "Nobody reads past the headline number",
            },
          },
          {
            id: "promote",
            kind: "gate",
            eras: ["today", "next"],
            label: {
              default: "Staged Rollout",
              exec: "Gradual release",
              engineer: "Canary → % ramp",
            },
            why: "Offline evaluation is a prediction, not a result. The rollout is where the prediction gets tested against reality, cheaply and reversibly.",
            detail: {
              exec: "New models go to a small slice of traffic first and ramp up only if live behaviour matches what the tests predicted.",
              architect:
                "Canary at 1% → 5% → 25% → 100%, each stage gated on live quality and latency telemetry rather than a timer.",
              engineer:
                "Flag-driven ramp, automatic hold if live metrics breach guardrails. Ramp stages are metric-gated, never purely time-based.",
            },
            facts: {
              cost: "Operational overhead",
              runtime: "2–5 days to full ramp",
              tech: "Feature-flag ramp, metric-gated stages",
              owner: "Eng",
              risk: "Canary traffic isn't representative, so the first honest signal arrives at 25%",
            },
          },
          {
            id: "rollback",
            kind: "gate",
            eras: ["today", "next"],
            label: {
              default: "Rollback Trigger",
              exec: "The undo button",
              engineer: "Automated revert on guardrail breach",
            },
            why: "The single highest-leverage component in the whole diagram. A fast, boring, well-rehearsed rollback is worth more than a great deal of additional offline evaluation.",
            detail: {
              exec: "If live metrics go wrong, the previous model comes back automatically, in under two minutes, without waiting for anyone to be paged.",
              architect:
                "Guardrail breach on live quality, safety or latency triggers automatic revert to the pinned previous build. Rehearsed monthly.",
              engineer:
                "Automated revert to previous pinned build, target <2 min. Rehearsed in a monthly game-day, because untested rollbacks don't work.",
            },
            facts: {
              cost: "Free",
              runtime: "<2 min",
              tech: "Automated revert to pinned build",
              owner: "Eng",
              risk: "Untested rollback paths fail exactly when first used",
            },
          },
        ],
      },

      {
        id: "t_feedback",
        kind: "group",
        eras: ["today", "next"],
        cols: 3,
        label: {
          default: "Feedback Loop",
          exec: "Learning from what shipped",
          architect: "Production Telemetry",
        },
        why: "The tier that decides whether your eval suite compounds or decays. Without it, every incident is a surprise twice — once in production, and again six months later when it recurs because nothing was ever added to the test set.",
        detail: {
          exec: "The tier most teams skip, and the reason their eval suite quietly stops meaning anything after a year.",
          architect: "Live telemetry attributed per model build, drift monitoring between production and eval distributions, and failure mining back into the dataset.",
          engineer: "Build-attributed online signals, embedding-space PSI against the eval set, and clustered failure proposals into the registry.",
        },
        facts: {
          cost: "Low",
          risk: "This is the tier teams skip, and it's why eval sets go stale",
          owner: "ML Platform",
        },
        children: [
          {
            id: "telemetry",
            kind: "source",
            eras: ["today", "next"],
            label: {
              default: "Production Telemetry",
              exec: "What's happening live",
              engineer: "Online quality + guardrail signals",
            },
            why: "Offline scores are a proxy. Thumbs-down, retries, escalations and abandonment are the ground truth you were approximating all along.",
            detail: {
              exec: "Live signals — negative feedback, retries, escalations to a human — that tell us whether the model is actually working for customers.",
              architect:
                "Implicit signals (retry, abandon, escalate) plus explicit feedback, correlated back to the model build serving each request.",
              engineer:
                "Per-request build attribution. Online metrics are the guardrails the staged rollout gates on.",
            },
            facts: {
              cost: "~$30/mo",
              runtime: "Streaming",
              tech: "Implicit + explicit signals, build-attributed",
              owner: "Product Eng",
              risk: "Thumbs-down is rare and biased toward the angry — absence of complaint isn't quality",
              governance: "Aggregated; raw content follows the same scrub path",
            },
          },
          {
            id: "drift",
            kind: "process",
            eras: ["today", "next"],
            label: {
              default: "Drift Monitor",
              exec: "Is reality moving?",
              engineer: "Input distribution + score divergence",
            },
            why: "Watches for the eval set and production traffic diverging. When they do, your suite is still green and increasingly meaningless.",
            detail: {
              exec: "Watches whether what customers ask is drifting away from what we test, and raises a flag before the test suite becomes decorative.",
              architect:
                "Compares production input distribution against eval-set distribution in embedding space; alerts on divergence beyond threshold.",
              engineer:
                "Embedding-space population stability index between production sample and current eval set. Alerts route to the dataset owner, not the on-call.",
            },
            facts: {
              cost: "~$20/mo",
              runtime: "Daily",
              tech: "Embedding-space divergence (PSI)",
              owner: "ML Platform",
              risk: "Alerts land with nobody who owns fixing them",
              governance: "Operates on scrubbed embeddings",
            },
          },
          {
            id: "mining",
            kind: "process",
            eras: ["next"],
            label: {
              default: "Automated Failure Mining",
              exec: "The loop closes",
              engineer: "Cluster prod failures → candidate cases",
            },
            why: "The step that turns the pipeline from a linear process into a system that improves itself. Production failures get clustered, deduplicated, and proposed as new eval cases — the suite grows from reality rather than imagination.",
            detail: {
              exec: "Planned: real failures automatically become new test cases, so the same problem cannot happen twice.",
              architect:
                "Cluster low-scoring production traces, dedup against the existing registry, and open a review queue of proposed new cases. Human accepts, never auto-merges.",
              engineer:
                "Embedding clustering over low-signal traces → dedup vs registry at 0.9 → proposal queue. Human-in-the-loop acceptance is deliberate, not a limitation.",
            },
            facts: {
              cost: "Est. ~$50/mo",
              runtime: "Weekly",
              tech: "Clustering + dedup + proposal queue",
              owner: "ML Platform",
              risk: "Auto-merging proposals would let the eval set drift toward whatever the model already fails at, which is not the same as what matters",
              governance: "Post-scrub only",
            },
          },
        ],
      },
    ],
  },

  // ── EDGES ─────────────────────────────────────────────────────────────────
  // `lenses` declares which concerns this connection belongs to.
  edges: [
    // Inputs → dataset
    { from: "prod_traffic", to: "scrub", lenses: ["flow", "trust"], label: { flow: "raw traces", trust: "PII crosses here" }, kind: "sensitive" },
    { from: "scrub", to: "annotate", lenses: ["flow", "trust", "cost"], label: { trust: "scrubbed + consented", cost: "$4.50/case" } },
    { from: "annotate", to: "registry", lenses: ["flow", "cost", "ownership"], label: { flow: "labels" } },
    { from: "golden_set", to: "registry", lenses: ["flow", "trust"], label: { flow: "fixtures" } },
    { from: "synth", to: "registry", lenses: ["flow", "cost"], label: { cost: "$120/10k" } },
    { from: "redteam", to: "registry", lenses: ["flow", "ownership"], label: { ownership: "Safety → ML Platform" } },

    // Dataset → execution
    { from: "registry", to: "runner", lenses: ["flow", "failure"], label: { flow: "pinned dataset hash", failure: "stale set = false green" } },
    { from: "matrix", to: "runner", lenses: ["flow", "cost"], label: { cost: "multiplies spend" } },
    { from: "runner", to: "adapters", lenses: ["flow", "cost"], label: { flow: "fan-out", cost: "$180/sweep" } },
    { from: "adapters", to: "sandbox", lenses: ["flow"], label: { flow: "tool calls" } },

    // Execution → scoring
    { from: "adapters", to: "deterministic", lenses: ["flow"], label: { flow: "outputs" } },
    { from: "sandbox", to: "deterministic", lenses: ["flow"], label: { flow: "trajectories" } },
    { from: "deterministic", to: "judge", lenses: ["flow", "cost"], label: { flow: "survivors only", cost: "short-circuit saves ~30%" } },
    { from: "rubrics", to: "judge", lenses: ["flow", "failure"], label: { flow: "rubric vN", failure: "edit in place = history invalid" } },
    { from: "judge", to: "human_review", lenses: ["flow", "cost", "failure"], label: { flow: "low-margin", failure: "judge bias caught here" } },

    // Scoring → analysis
    { from: "deterministic", to: "metrics", lenses: ["flow"] },
    { from: "judge", to: "metrics", lenses: ["flow", "failure"], label: { failure: "unaudited judge = confident lies" } },
    { from: "human_review", to: "metrics", lenses: ["flow", "cost"], label: { cost: "capped at 5%" } },
    { from: "metrics", to: "stats", lenses: ["flow"] },
    { from: "metrics", to: "slices", lenses: ["flow", "failure"], label: { failure: "averages hide cohorts" } },
    { from: "stats", to: "regress", lenses: ["flow"] },
    { from: "slices", to: "regress", lenses: ["flow"] },

    // Analysis → decision
    { from: "regress", to: "gate", lenses: ["flow", "failure", "ownership"], label: { flow: "ranked regressions", ownership: "ML Platform → Eng leadership" } },
    { from: "metrics", to: "report", lenses: ["flow"] },
    { from: "gate", to: "promote", lenses: ["flow", "failure"], label: { flow: "pass", failure: "override culture" } },
    { from: "promote", to: "telemetry", lenses: ["flow"], label: { flow: "live traffic" } },

    // Feedback
    { from: "telemetry", to: "rollback", lenses: ["flow", "failure"], label: { flow: "guardrail breach", failure: "<2 min revert" } },
    { from: "telemetry", to: "drift", lenses: ["flow"] },
    { from: "telemetry", to: "prod_traffic", lenses: ["flow", "trust"], label: { flow: "resample" } },
    { from: "drift", to: "mining", lenses: ["flow"], eras: ["next"] },
    { from: "mining", to: "registry", lenses: ["flow", "failure"], eras: ["next"], label: { flow: "proposed cases", failure: "the loop closes" } },
  ],

  // ── NARRATIVE ─────────────────────────────────────────────────────────────
  // Beats are narrated selector states. The same beats drive Read mode
  // (scroll) and Present mode (arrow keys).
  beats: [
    {
      id: "b_open",
      title: "The question this machine answers",
      persona: "exec",
      lens: "flow",
      era: "today",
      focus: [],
      prose:
        "A new model candidate lands. Someone has to decide whether it ships. Almost every argument you will have about that decision is really an argument about one of seven tiers — and most teams only have three of them built.\n\nStart at the altitude of the whole system. Seven tiers, one direction of travel, one loop at the end that most pipelines never close.",
    },
    {
      id: "b_inputs",
      title: "Everything downstream inherits this choice",
      persona: "exec",
      lens: "flow",
      era: "today",
      focus: ["t_inputs"],
      prose:
        "Your evaluation is only as meaningful as the questions in it. Four sources, each covering a different blind spot: real traffic tells you what users do, the golden set encodes what you refuse to break, synthetic generation buys coverage of the rare, and the adversarial set assumes someone is actively trying to break it.\n\nTeams that build only the golden set end up with a suite that passes every release and predicts nothing.",
    },
    {
      id: "b_scrub",
      title: "The compliance boundary",
      persona: "architect",
      lens: "trust",
      era: "today",
      focus: ["t_inputs", "t_dataset"],
      prose:
        "Switch to the governance lens and the shape of the risk changes completely. Only one edge carries raw customer data, and everything downstream depends on a single component holding the line.\n\nThis is why the scrub fails closed. A missed entity here isn't a bug in an eval pipeline — it's a data incident with a regulator attached.",
    },
    {
      id: "b_registry",
      title: "The most under-rated box in the diagram",
      persona: "architect",
      lens: "flow",
      era: "today",
      focus: ["t_dataset"],
      prose:
        "Immutable, versioned eval sets sound like hygiene. They're the difference between a pipeline that can answer questions and one that can't.\n\nWithout a pinned dataset hash on every run, you can never separate 'the model got worse' from 'the test changed'. That question gets asked in every single post-mortem, and if you can't answer it, the whole apparatus above becomes a matter of opinion.",
    },
    {
      id: "b_exec",
      title: "You are never evaluating one model",
      persona: "architect",
      lens: "flow",
      era: "today",
      focus: ["t_exec"],
      prose:
        "The candidate is always measured as a delta against what's already live, and the baseline gets re-run every sweep rather than cached — because otherwise a provider-side change to the current model shows up as an improvement in the new one.\n\nThe reference model isn't a shipping candidate at all. It's a ceiling, run on a 10% sample, that tells you whether a failure is your prompt's fault or genuinely hard.",
    },
    {
      id: "b_cost",
      title: "Where the money actually goes",
      persona: "exec",
      lens: "cost",
      era: "today",
      focus: [],
      prose:
        "Switch to the cost lens. The intuition is that inference dominates. It doesn't — humans do, by roughly an order of magnitude, at $4.50 a labeled case against $0.02 for a judge call.\n\nThe second surprise is the config matrix. It costs nothing itself and multiplies everything downstream. Four axes quietly becomes two hundred configurations and a five-figure bill.",
    },
    {
      id: "b_scoring",
      title: "Where evals quietly go wrong",
      persona: "engineer",
      lens: "flow",
      era: "today",
      focus: ["t_scoring"],
      prose:
        "Deterministic checks run first and short-circuit, so you never pay a judge to confirm that JSON parses. What survives goes to the judge; what the judge is unsure about goes to a human.\n\nThe critical detail is the blind 5% sample flowing to human review. That's not quality control on the model — it's quality control on the judge. Without it you have a grader with known biases toward length and confidence, grading unsupervised, forever.",
    },
    {
      id: "b_failure",
      title: "How this pipeline lies to you",
      persona: "architect",
      lens: "failure",
      era: "today",
      focus: [],
      prose:
        "The failure lens shows something uncomfortable: almost none of these failures produce an error. A stale eval set, an unaudited judge, an average that hides a collapsed cohort, a gate that's been overridden three times — all of them produce numbers that look completely normal.\n\nThat's the defining property of evaluation infrastructure. It fails silently, in the direction of optimism.",
    },
    {
      id: "b_decision",
      title: "The only tier that changes an outcome",
      persona: "exec",
      lens: "flow",
      era: "today",
      focus: ["t_decision"],
      prose:
        "Everything upstream is measurement. This is the part with teeth: a hard block on golden-set and safety regressions, a staged rollout that treats the offline result as a prediction rather than a verdict, and a rollback that's rehearsed monthly.\n\nIf you could keep only one box on this entire diagram, keep the rollback. A fast, boring, well-tested revert is worth more than a great deal of additional offline evaluation.",
    },
    {
      id: "b_v0",
      title: "Where everyone actually starts",
      persona: "exec",
      lens: "flow",
      era: "v0",
      focus: [],
      prose:
        "Rewind to v0. A curated question list, a script, an exact-match check, results in a sheet.\n\nThis is not a strawman — it's the correct first version, and it's genuinely useful for about six months. It breaks at a predictable moment: the first time someone asks whether last quarter's number is comparable to this one, and nobody can say.",
    },
    {
      id: "b_next",
      title: "Closing the loop",
      persona: "architect",
      lens: "flow",
      era: "next",
      focus: ["t_feedback", "t_dataset"],
      prose:
        "The planned work is a single edge: production failures cluster, deduplicate against the registry, and arrive as proposed new eval cases.\n\nThat edge is what converts a linear pipeline into a system that compounds. A human still accepts each proposal — deliberately, because auto-merging would let the suite drift toward whatever the model happens to fail at, which is not the same thing as what matters to the business.",
    },
    {
      id: "b_close",
      title: "Explore it yourself",
      persona: "architect",
      lens: "flow",
      era: "today",
      focus: [],
      prose:
        "Switch the persona control to change vocabulary and depth, the lens control to change which concern is drawn, and the era control to see how this got here and where it's going.\n\nEvery combination is a link. Whatever you're looking at now, the URL will reopen exactly this view for someone else.",
    },
  ],
};

export default SPEC;
