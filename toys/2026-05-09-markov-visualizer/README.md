# Markov Chain Visualizer

An interactive, browser-only tool for exploring finite discrete-time Markov chains.
Three coupled views — state graph, transition matrix, sample walk — plus a statistics
panel with stationary distribution, mean recurrence times, and chain property flags.

---

## What is a Markov chain?

A **Markov chain** is a stochastic process (X_n) over a finite state space S such that

    P(X_{n+1} = j | X_n = i, X_{n-1}, ..., X_0) = P(X_{n+1} = j | X_n = i)

That is, the future depends only on the *present* state, not the past. This
"memoryless" property is the **Markov property** (Norris, Ch. 1; Bartle, connections
in measure-theoretic probability).

The transition probabilities form an n×n matrix **P** with:
- P_{ij} >= 0 for all i, j
- Sum_j P_{ij} = 1 for each row i  (row-stochastic)

---

## The three views

**State graph.** Each state is a node; directed edges are weighted by transition
probability. Thickness and color intensity encode the weight. The current state during
a sample walk is highlighted in amber.

**Transition matrix (heatmap).** Cream = 0, rich amber = 1. Click any cell to edit
the value; the corresponding row re-normalizes automatically so P stays row-stochastic.

**Sample walk.** A horizontal tape of visited states. Controls: step, step 100, play,
pause, reset, speed slider. Empirical visit frequencies are compared against the
theoretical stationary distribution in the stats rail.

---

## Statistics panel

### Stationary distribution

The stationary distribution pi satisfies:
    pi = pi P  (left-eigenvector for eigenvalue 1)

Computed here via **power iteration**: start from pi_0 = (1/n, ..., 1/n), iterate
pi_{k+1} = pi_k * P until ||pi_{k+1} - pi_k||_1 < 1e-9, or 500 steps.

### Irreducibility, aperiodicity, ergodicity

- **Irreducible**: every state is reachable from every other state (checked via BFS
  on the transition graph). Non-irreducible chains may have non-unique stationary
  distributions.
- **Aperiodic**: the GCD of return times to every state is 1. Detected by finding
  odd-length cycle parity during BFS.
- **Ergodic**: irreducible + aperiodic. For ergodic chains, pi is unique and the
  time-average converges to pi regardless of starting state (ergodic theorem for
  Markov chains — the connection to Bartle's ergodic theorem in measure theory).

### Mean recurrence time

For an irreducible chain, the mean return time to state i is m_i = 1/pi_i.
This follows from the renewal-reward theorem (Norris Theorem 1.7.7).

---

## Pre-loaded examples

| Name | States | Notes |
|------|--------|-------|
| Two-state switch | A, B | Textbook intro; ergodic |
| Weather | Sunny/Cloudy/Rainy | Classic 3-state; ergodic |
| Snakes & Ladders | 0..100 | State 100 is absorbing; not irreducible |
| Random walk {-5..5} | -5..5 | Reflecting boundaries; ergodic |
| Birth-death chain | 0..6 | State 0 absorbing; not irreducible |
| Cat and mouse | 4 states | "Neither" is absorbing; not irreducible |
| Blank (3 states) | S1 S2 S3 | Edit freely |

Non-irreducible chains are flagged with a banner. Power iteration still runs from
the uniform start and is shown, but the result is labelled as potentially non-unique.

---

## Connection to measure theory (Bartle Chapter 9 and beyond)

Markov chains sit at the intersection of probability theory and measure-theoretic
analysis:

- The **Chapman-Kolmogorov equations** P^{m+n} = P^m * P^n are equivalent to the
  semigroup property of conditional expectations in the L^1 (mu) framework
  (Bartle 9.x).
- **Ergodicity** for Markov chains is a discrete-time instance of the ergodic theorem
  for measure-preserving transformations. The Cesaro averages of empirical frequencies
  converge a.s. to pi (under the stationary measure) — a finitary analogue of the
  maximal ergodic lemma in Bartle's treatment.
- The stationary measure pi is a *probability measure* that is invariant under the
  induced shift map on path space (the Kolmogorov extension theorem, Bartle).

This toy is a useful companion when studying Chapter 9 of Bartle's *Introduction to
Real Analysis* and the measure-theoretic foundations of probability.

---

## Files

```
index.html      Self-contained browser app (no build step, no CDN)
examples.json   Pre-loaded chains (also inlined in index.html for offline use)
serve.sh        Optional local server: ./serve.sh [port]
README.md       This file
```

---

## Math references

- Norris, J.R. (1997). *Markov Chains*. Cambridge University Press.
- Bartle, R.G. & Sherbert, D.R. *Introduction to Real Analysis*, Chapter 9.
- Levin, Peres, Wilmer (2017). *Markov Chains and Mixing Times*, 2nd ed.
