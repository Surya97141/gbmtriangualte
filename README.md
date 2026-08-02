<div align="center">

<br>

```
 ██████╗ ██████╗ ███╗   ███╗████████╗██████╗ ██╗ █████╗ ███╗   ██╗ ██████╗ ██╗   ██╗██╗      █████╗ ████████╗███████╗
██╔════╝ ██╔══██╗████╗ ████║╚══██╔══╝██╔══██╗██║██╔══██╗████╗  ██║██╔════╝ ██║   ██║██║     ██╔══██╗╚══██╔══╝██╔════╝
██║  ███╗██████╔╝██╔████╔██║   ██║   ██████╔╝██║███████║██╔██╗ ██║██║  ███╗██║   ██║██║     ███████║   ██║   █████╗
██║   ██║██╔══██╗██║╚██╔╝██║   ██║   ██╔══██╗██║██╔══██║██║╚██╗██║██║   ██║██║   ██║██║     ██╔══██║   ██║   ██╔══╝
╚██████╔╝██████╔╝██║ ╚═╝ ██║   ██║   ██║  ██║██║██║  ██║██║ ╚████║╚██████╔╝╚██████╔╝███████╗██║  ██║   ██║   ███████╗
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
```

<h3>DSA Problem-Solving Scaffold</h3>
<p><em>Not a pattern matcher. A thinking tool. It asks the questions you forgot to ask.</em></p>
<br>

[![Live](https://img.shields.io/badge/LIVE%20NOW-gbmtriangulate.vercel.app-2563eb?style=for-the-badge&labelColor=0d0d18)](https://gbmtriangulate.vercel.app)

<br>

![Stages](https://img.shields.io/badge/Stages-11-2563eb?style=flat-square&labelColor=13131f)
![Verifiers](https://img.shields.io/badge/Verifiers-5-059669?style=flat-square&labelColor=13131f)
![Edge%20Cases](https://img.shields.io/badge/Edge%20Case%20Categories-7-d97706?style=flat-square&labelColor=13131f)
![No%20AI](https://img.shields.io/badge/No%20AI-Pure%20Logic-dc2626?style=flat-square&labelColor=13131f)
![License](https://img.shields.io/badge/License-MIT-7c3aed?style=flat-square&labelColor=13131f)

</div>

---

<br>

## The problem with how most people approach DSA

You read a problem. A pattern fires in your brain. You start coding.

Sometimes that's right. Often it isn't. And when it isn't, you've already spent 40 minutes going down the wrong path before you realise the structure of the problem was telling you something you never asked it.

GBMtriangulate is a guided structural analysis scaffold. It forces you to interrogate a problem's anatomy before touching an algorithm. Seven binary questions about structure. Edge case generation based on your actual input type. A confidence score built from what you did and didn't verify.

**This is not a keyword → template matcher.** It doesn't see "subarray" and suggest sliding window. It asks whether your subproblem overlap is direct, indirect, or absent — and from that, the direction emerges.

<br>

## The 11 stages

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  Stage 0   Complexity Budget       What is feasible at your N?                  │
│  Stage 1   Input Anatomy           What kind of structure are you working with?  │
│  Stage 2   Output Anatomy          What does a valid solution look like?         │
│  Stage 2.5 Problem Decomposition   Can this be split into independent parts?     │
│  Stage 3   Structural Properties   Seven binary questions → candidate directions │
│  Stage 3.5 Reframing Check         Is this problem disguised as something else?  │
│  Stage 4   Constraint Interactions How do N, Q, K combine? Hidden structures?   │
│  Stage 4.5 Approach Variant        Which specific variant? Complexity at your N? │
│  Stage 5   Verification Challenges Greedy test. Monotonicity. DP state check.   │
│  Stage 6   Edge Case Generator     Personalized checklist for your input type.   │
│  Stage 6.5 Confidence Score        0–100 score. Gated progression.              │
│  Stage 7   Final Output            Direction. Failure conditions. First actions. │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Each stage has a live side panel that updates as you answer. Every interaction is saved to state — go back, change an answer, the downstream stages update.

<br>

## Stage 3 — the core

Seven structural properties. Every answer is Yes / No / Unsure. The combination of answers determines candidate directions.

| Property | Question | If yes → suggests |
|---|---|---|
| **Order Sensitivity** | Does the order of elements matter to the answer? | Two Pointer, Sliding Window |
| **Subproblem Overlap** | Can the problem be broken into overlapping subproblems? | Dynamic Programming |
| **Feasibility Boundary** | Is there a threshold X where feasible(X) flips from false to true? | Binary Search on Answer |
| **Local Optimality** | Does the locally optimal choice at each step lead to a global optimum? | Greedy |
| **State Space** | Can every configuration be represented as a node with transitions? | BFS / DFS / Graph |
| **Dependency Structure** | Do later elements depend on earlier ones in a specific order? | Topological Sort, DP |
| **Search Space** | Is there a large space of candidates that can be pruned? | Backtracking, B&B |

No single property determines the direction. The interaction between properties does. A problem with both subproblem overlap and feasibility boundary is different from one with just subproblem overlap — and the scaffold surfaces that difference.

<br>

## Stage 3.5 — reframing

The most dangerous DSA problems are the ones that *look* like one thing but *are* another.

Stage 3.5 runs disguise checks:

```
Looks like complex interval logic  →  Actually: Sort + Greedy
Looks like array DP                →  Actually: Hidden graph (BFS)
Looks like direct optimization     →  Actually: Binary Search on Answer
Looks like count valid directly    →  Actually: Complement counting
Looks like 2D DP on strings        →  Actually: LCS / Edit Distance canonical
```

For each disguise, it shows a test you can apply. If you confirm a disguise, it warns you that your Stage 3 direction may need revision before you continue.

It also asks six forced perspective questions — "Can you binary search on the answer instead of computing it directly?", "Does sorting reveal a simpler structure?", "Can each element be a node?" — and if you answer yes, it surfaces a transformation card with before/after, what the transformation opens, and watch-outs.

<br>

## Stage 4 — constraint interactions

N alone doesn't determine complexity. N × Q does. N × K does. N × W does.

```
N + Q queries →  O(n) per query = O(n²) total. Prefix sum or BIT needed.
N + K window  →  Sliding Window if K fixed. DP[n][k] if K is the depth.
N + W weight  →  Knapsack only viable if W ≤ 10⁴. W up to 10⁹ → must reframe.
V + E graph   →  E ≈ V² (dense) → Floyd-Warshall. E ≈ V (sparse) → Dijkstra.
```

Stage 4 also checks six hidden structures — Prefix Sum, Two Pointer, Monotonic Stack, Sliding Window, Binary Search, BIT/Segment Tree — that replace O(n²) approaches with O(n) or O(n log n). You mark each as "applies" or "does not apply". The side panel shows your progress and any found structures.

<br>

## Stage 4.5 — variant and complexity recheck

Choosing "Dynamic Programming" is not enough. *Which* DP?

Stage 4.5 narrows to the specific variant and does a live complexity check at your actual N:

```
Variant selected:  2D DP (quadratic)
Complexity:        O(n²)
Your N:            100,000
At your N:         10¹⁰ operations  →  ✗ TLE
```

If the variant TLEs at your N, you cannot proceed. If it's borderline, you get an override option with a warning. The stage only unlocks Stage 5 when complexity is confirmed safe — or you've explicitly accepted the risk.

<br>

## Stage 5 — verification challenges

Four verifiers, each triggered by your Stage 3 directions:

**Greedy verifier** — You state your greedy rule in one sentence. The framework walks you through testing it on adversarial input of n=3, then n=4, then the exchange argument. Verdict: counter-example found (→ use DP) or no counter-example (→ greedy holds).

**Monotonicity verifier** — Before writing binary search, confirm `isFeasible(X)` is monotone. Framework: define the feasibility function, check that feasible(X) implies feasible(X+1), identify whether you're minimizing or maximizing. If monotone: correct binary search template opens automatically.

**DP state verifier** — Four checks: state completeness (does it capture all future-relevant info?), non-redundancy (are any dimensions derivable from others?), transition validity (no forward dependencies?), base case coverage. Each check has a pass/fail button with an example of the right and wrong state definition.

**Graph property verifier** — Weighted/unweighted, directed/undirected, negative/non-negative weights. Each selection triggers an implication card. When all three are answered, the recommended algorithm is derived automatically: Dijkstra, Bellman-Ford, BFS, or Floyd-Warshall.

**Keyword cross-check** — Paste key phrases from the problem statement. The tool scans for signal keywords and flags mismatches between the language and your chosen approach.

<br>

## Stage 6 — edge case generator

Not a generic checklist. Personalized to your input type.

You identified your input type in Stage 1. Stage 6 uses that to generate only the edge cases relevant to your specific problem structure:

| Input type | Modules loaded |
|---|---|
| Single / Two arrays | Universal + Array cases |
| String(s) | Universal + String cases |
| Matrix / Grid | Universal + Array + Graph cases |
| Graph (edge list / adjacency) | Universal + Graph cases |
| Tree | Universal + Tree cases |
| Intervals | Universal + Interval cases |
| Numbers | Universal + Numeric cases |

Each case card shows: why it matters, the specific check question, the most common failure mode, the test input, and the expected output. A collapsible hint/fix section. A "Mark as reviewed" button.

Cases are prioritized: **Critical** (most likely to cause wrong answer) → **High** → **Medium**. The stage gates on all critical cases reviewed OR half of all cases reviewed.

You can also add custom edge cases for problem-specific scenarios the generic categories miss.

<br>

## Stage 6.5 — confidence score

A 0–100 score computed from everything you've done across all previous stages.

```
Stage 0   Complexity budget computed        +5
          Infeasible classes eliminated     +4
          Memory check done                 +3

Stage 3   Each property answered (not unsure) +4 each (max +28)
          Each unsure answer                  −3 each

Stage 5   Greedy counter-example tested     +4  (or −4 if skipped)
          Monotonicity verified             +4
          DP state verified                 +4  (or −4 if skipped)
          Keyword crosscheck done           +3

Stage 6   Universal cases reviewed         +4
          Type-specific cases reviewed     +4
          Edge cases skipped entirely      −5
```

Three bands:

```
85–100  High Confidence    →  Proceed to Stage 7
65–84   Moderate           →  Proceed with override, or improve
0–64    Low Confidence      →  Return. Gaps are too large to proceed safely.
```

The side panel shows per-stage mini progress bars, the top three quick wins to boost your score, and the weakest stage if the score is low.

<br>

## Stage 7 — final output

Four tabs.

**Directions** — Each candidate direction as a card: the algorithm family, why this structure implies it, what to verify before coding, a collapsible code shape showing the skeleton you'll fill in, implementation/WA/TLE risk meta-badges. A "Select this direction" button that persists through the session.

**Failure conditions** — The specific ways this approach fails silently. Not "check your edge cases" — the *exact* failure: "Off-by-one in loop bounds → wrong answer on last element → test: n=1, n=2 explicitly."

**First actions** — Three ordered steps to take when you open your editor. Step 1 is always the same: write and manually verify your test cases before touching the algorithm.

**Tradeoffs** — If multiple directions were identified, a side-by-side table comparing complexity, implementation difficulty, WA risk, and TLE risk. A recommendation badge for the lowest-risk option.

<br>

## State persistence

Every answer you give is saved to `State`. Every stage loads from `State` on mount. You can:
- Navigate backwards to any stage without losing answers
- Change an answer in Stage 1 — downstream stages that depend on it update
- Reload the page — progress is restored (localStorage-backed)
- Export your full analysis as a JSON snapshot

<br>

## Tech

```
Pure HTML + CSS + Vanilla JavaScript
Single-page architecture, hash-based routing, zero dependencies
```

| Layer | Detail |
|---|---|
| Routing | Hash router — `#stage0`, `#stage3`, etc. |
| State | Flat `State` object, serialized to localStorage |
| Stage contract | Every stage module exports `render(state)`, `onMount(state)`, `cleanup()` |
| Styling | Self-contained `<style>` per stage — cream `#f7f4ef` bg, white cards, blue `#2563eb` accent |
| Fonts | Space Mono (mono labels) + DM Sans (prose) |
| Deployment | Vercel from `gbmtriangulate` repo root |

<br>

## Stage module contract

Every stage file exports exactly this:

```javascript
const StageN = (() => {

  // render() is called once when the stage is entered.
  // It receives the full state object and returns a DOM element.
  function render(state) { ... }

  // onMount() is called after the element is in the DOM.
  // Used to restore UI state and re-enable the Next button if already complete.
  function onMount(state) { ... }

  // cleanup() is called when leaving the stage.
  // Clears module-level variables to prevent stale state on re-entry.
  function cleanup() { ... }

  return { render, onMount, cleanup };
})();
```

The engine calls `render` → inserts the DOM → calls `onMount`. That's the entire lifecycle. No framework, no virtual DOM, no hooks.

<br>

## Run locally

```bash
git clone https://github.com/yourusername/gbmtriangulate.git
cd gbmtriangulate
open index.html
```

No `npm install`. No build step. Open the file.

<br>

## Repo structure

```
gbmtriangulate/
│
├── index.html                        ← Shell: nav, progress bar, stage container
│
├── stages/
│   ├── stage0/stage0.js              ← Complexity Budget
│   ├── stage1/stage1.js              ← Input Anatomy
│   ├── stage2/stage2.js              ← Output Anatomy
│   ├── stage2-5/stage2-5.js          ← Problem Decomposition
│   ├── stage3/stage3.js              ← Structural Properties (the core)
│   ├── stage3-5/stage3-5.js          ← Reframing Check
│   ├── stage4/stage4.js              ← Constraint Interactions
│   ├── stage4-5/stage4-5.js          ← Approach Variant
│   ├── stage5/stage5.js              ← Verification Challenges
│   ├── stage6/stage6.js              ← Edge Case Generator
│   ├── stage6-5/stage6-5.js          ← Confidence Score
│   └── stage7/stage7.js              ← Final Output
│
├── engine/
│   ├── Engine.js                     ← Stage lifecycle manager
│   ├── State.js                      ← Flat state store + localStorage
│   └── Router.js                     ← Hash-based navigation
│
├── data/
│   ├── DisguiseChecks.js             ← Stage 3.5 disguise library
│   ├── ReframeQuestions.js           ← Stage 3.5 perspective questions
│   ├── TransformationList.js         ← Transformation catalog
│   ├── ConstraintInteractions.js     ← Stage 4 interaction patterns
│   ├── GreedyVerifier.js             ← Stage 5 greedy framework
│   ├── MonotonicityVerifier.js       ← Stage 5 monotonicity framework
│   ├── DPStateVerifier.js            ← Stage 5 DP state checks
│   ├── GraphVerifier.js              ← Stage 5 graph property checks
│   ├── KeywordCrosscheck.js          ← Stage 5 keyword scanner
│   ├── EdgeCases/                    ← Stage 6 case modules
│   │   ├── UniversalCases.js
│   │   ├── ArrayCases.js
│   │   ├── StringCases.js
│   │   ├── TreeCases.js
│   │   ├── GraphCases.js
│   │   ├── IntervalCases.js
│   │   └── NumericCases.js
│   ├── ConfidenceScorer.js           ← Stage 6.5 scoring engine
│   ├── DirectionBuilder.js           ← Stage 7 direction resolution
│   ├── FailureConditions.js          ← Stage 7 failure library
│   └── SummaryBuilder.js             ← Stage 7 summary strip
│
└── assets/css/
    ├── theme.css
    ├── base.css
    ├── layout.css
    ├── components.css
    └── stages.css
```

<br>

## Design

Cream background `#f7f4ef`. White cards. Blue `#2563eb` accent. No dark mode currently — the light theme is intentional for focus and readability during problem analysis.

Every stage follows the same split layout: left main content + right sticky panel (268px) that updates live as you answer. The panel is the "at a glance" view of where you are. The main content is where you do the work.

```
┌────────────────────────────────────┬──────────────────┐
│                                    │                  │
│  Main content                      │  Live side panel │
│  (questions, selections,           │  (progress,      │
│   verifiers, checkboxes)           │   answers so far,│
│                                    │   completion gate)│
│                                    │                  │
│                                    │  268px · sticky  │
└────────────────────────────────────┴──────────────────┘
```

<br>

## The companion

GBMtriangulate tells you *which* algorithm to use.  
**[GBMvisuAL](https://gbmvisual.vercel.app)** shows you how that algorithm works.

Use them together: triangulate the approach → visualize it → code it.

<br>

## License

MIT — take it, fork it, build on it.

---

<div align="center">

**[gbmtriangulate.vercel.app](https://gbmtriangulate.vercel.app)**

*Think structurally. Verify before coding. Ship correct solutions.*

</div>
