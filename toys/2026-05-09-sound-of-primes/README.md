# Sound of Primes

A sibling to Sound of Sorting. Eight number-theoretic sequences made audible through Web Audio — pentatonic C major scale, C3 to A5.

## Modes

### Primes
The sequence 2, 3, 5, 7, 11, 13, ... Each prime triggers a sine tone. Pitch maps to `prime mod 15` on the pentatonic scale. Primes thin out as N grows — the silences get longer.

### Composites
The complement: 4, 6, 8, 9, 10, 12, ... Uses a square wave oscillator (sharper, more mechanical). Dense and crowded, which is arithmetically appropriate — most integers are composite.

### Twin Primes
Prime pairs (p, p+2) where both members are prime: (3,5), (5,7), (11,13), (17,19), ... Each pair plays as a two-note chord with a 60ms delay between the two voices. There are 35 twin primes below 1000. Whether infinitely many exist is one of the oldest open problems in mathematics (Brun's theorem shows their reciprocals sum to a finite constant).

### Prime Gaps
The gap g_n = p_{n+1} - p_n between consecutive primes. Most gaps are 2 (twin primes). Pitch maps to gap size; large gaps sound high and isolated. Bertrand's postulate guarantees a prime in every (n, 2n), bounding gap growth.

### Goldbach Pairs
Goldbach's conjecture (1742, still unproven): every even integer > 2 equals the sum of two primes. For each even n, the smallest representation n = p + q is found and played as p then q in quick succession. The two tones converge as p and q balance toward n/2.

### Sieve of Eratosthenes
The ancient algorithm (c. 240 BCE): start from 2, mark all multiples as composite, advance to the next unmarked number, repeat. Crossing-out composites plays a dry noise burst; surviving primes ring a sine tone. The canvas visualizes each number as crossed or confirmed.

### Mersenne Primes
Primes of the form 2^p - 1: 3, 7, 31, 127, 8191, 131071, 524287, 2147483647 (M_31). They are extraordinarily rare — only 51 are known as of 2024, and finding a new one requires months of distributed computation (GIMPS). This mode plays the first eight known Mersenne primes as deep, sustained bass tones. Each one feels like a slow bell.

### Collatz (3n+1)
From any seed n > 1, repeatedly apply: if even, n/2; if odd, 3n+1. The conjecture states every trajectory reaches 1. The seed 27 takes 111 steps and reaches a peak of 9232 before descending. The trajectory from seed 27 is a good demo; try other seeds for different shapes.

## Math facts

- There are exactly 168 primes below 1000 (verified by the toy's internal sieve check).
- There are exactly 35 twin primes below 1000 (verified internally).
- The 8th Mersenne prime, M_31 = 2,147,483,647, was proved prime by Euler in 1772.
- The largest known prime as of 2024 is a Mersenne prime: 2^136279841 - 1 (41 million digits).
- Goldbach's conjecture has been verified computationally up to 4 × 10^18.
- The Collatz conjecture has been verified for all n < 2^68.

## Audio

- Pentatonic scale: C D E G A across three octaves (C3–A5), 15 notes.
- Primes: sine wave, soft pluck envelope.
- Composites: square wave, shorter envelope.
- Twin primes: two sine plucks 60ms apart.
- Mersenne primes: sine + triangle sub-oscillator, 1-second sustain.
- Sieve crossings: white noise burst (percussive click).

## Running locally

```bash
./serve.sh        # serves on http://localhost:8094/
./serve.sh 8080   # custom port
```

Web Audio requires an HTTP origin on some browsers. The toy works on `file://` in Firefox; Chrome may require `localhost`.
