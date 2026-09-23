# Reference: Assessment Criteria & Framework

Companion document for the `code-quality-reviewer` skill. Defines the scoring criteria, thresholds, and framework referenced by SKILL.md.

## 1. Core lens: systemic complexity

Every review must answer one question first:

> Does this change increase or decrease **total system complexity**?

Complexity is assessed at system level, not file level. A change that makes one file simpler while adding a new layer, interface, or indirection elsewhere is a complexity **increase**.

### Complexity components

| Component          | Question to ask                                                        | Signal of increase                    |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------- |
| Structural         | How many modules/files does a reader touch to follow one flow?         | New layer between existing layers     |
| Cognitive          | How much must a reader hold in working memory?                         | Hidden behavior, indirect calls       |
| Change amplification | When a rule changes, how many files must be edited?                  | One rule spread across abstractions   |
| Indirection depth  | How many hops from entry point to actual logic?                        | ≥3 hops for a simple rule             |

## 2. Decision hierarchy (application rules)

Priority order (highest wins): **Correctness > Legibility > Maintainability > Simplicity > Performance > DRY > Reuse > Future extensibility**.

Application rules:

1. Conflicts are resolved **pairwise**, top-down: the higher principle wins unless it is demonstrably unaffected.
2. **Performance only outranks Simplicity when there is a measured bottleneck** — never on speculation.
3. **DRY and Reuse lose to Legibility and Simplicity by default.** Duplication is acceptable when unifying it requires indirection that a new developer must decode.
4. **Future extensibility never justifies a change on its own.** Extension points are valid only with ≥2 real consumers today or a non-trivial rule being modeled.

## 3. Red flag severity

### High severity (blocks approval unless corrected)

- Any correctness risk introduced by the change
- Abstraction with **zero real consumers** (speculative architecture)
- Flow that cannot be traced linearly during debug
- Layer added with no filtering, transformation, or validation of value

### Medium severity (blocks "✅ Aprovar", allows "⚠️ Aprovar com ressalvas")

- Interface with a single implementation and no non-trivial rule behind it
- Generic method used once with one concrete type
- Configuration surface for scenarios that do not exist
- >3 parameters in a single call chain hop

### Low severity (notes only)

- Naming that slightly obscures intent
- Minor duplication that unifying would over-couple
- Pattern applied by habit but harmless today

## 4. Verdict criteria (detailed)

| Verdict                  | Conditions (ALL must hold)                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| ✅ Aprovar               | Correct; net complexity neutral or reduced; no high/medium red flags; flow traceable in few hops                            |
| ⚠️ Aprovar com ressalvas | Correct and mergeable; complexity increased but with accepted, justified trade-off; only medium/low red flags present       |
| ❌ Rejeitar              | Correctness compromised, OR high-severity red flag, OR complexity increase without proportional, demonstrable benefit      |

Edge rules:

- Correctness issue + clean design = **Rejeitar** (hierarchy: Correctness first).
- Pure simplification with no behavior change = strong candidate for **✅ Aprovar** even if the diff is large.
- Mergeable but with a high-severity note explicitly accepted by the team = **⚠️**, never ✅.

## 5. Cognitive load assessment

Estimate load on a developer who has **never seen this code**:

- **Low:** one file read; linear call stack; names explain behavior.
- **Medium:** 2–4 files; one justified indirection; behavior inferable from names after reading.
- **High:** 5+ files to understand one flow; behavior discovered only by stepping through execution; requires prior knowledge of hidden patterns.

Reviews must state which load level the change produces and whether the change moved it.

## 6. Complexity accounting

In the "Impacto na Complexidade" section, justify each of the three lines with one concrete observation from the diff:

- **Complexidade:** cite layers, abstractions, or indirections added/removed.
- **Carga cognitiva:** cite what a reader must now hold in mind vs. before.
- **Facilidade de debug:** describe how a breakpoint walk would proceed.

Do not write these lines without a diff-grounded justification.

## 7. Anti-patterns in review output

The reviewer itself must avoid:

- Recommending extraction of a new abstraction as a fix (prefer inlining, merging, or deletion).
- Vague suggestions ("improve structure", "add tests here") — every recommendation must state **what**, **where**, and **why** in diff terms.
- Rewarding symmetry: code organized in folders-by-pattern is not simpler than code organized by flow.