# Gravity Sandbox

An N-body gravitational simulator in the browser. Place bodies by click-dragging, tune gravity, watch orbits decay into chaos or settle into choreography.

## Physics

### Force law

Newtonian gravity with a softening term to prevent singularities at close approach:

```
F = G * m1 * m2 / (r^2 + eps^2)
```

`eps` (softening length) is tunable via the sidebar. A small softening lets orbits get very tight; a larger value keeps distant encounters smooth. The softening is physically equivalent to treating each body as a Plummer sphere of radius `eps` rather than a point mass.

### Integrator: Velocity Verlet

The simulation uses the **Velocity Verlet** (leapfrog) scheme, a second-order symplectic integrator:

```
v(t + dt/2) = v(t) + a(t) * dt/2      # half-kick
x(t + dt)   = x(t) + v(t + dt/2) * dt # drift
a(t + dt)   = F(x(t + dt)) / m         # recompute forces
v(t + dt)   = v(t + dt/2) + a(t+dt)*dt/2  # half-kick
```

Symplectic integrators conserve a shadow Hamiltonian close to the true one, so energy drift is bounded over long integrations — unlike RK4 which can drift unboundedly. For an interactive sandbox this is the right trade-off: simple, fast, and orbit-preserving.

Time complexity per step: O(N^2) pairwise forces. Practical limit is ~100–200 bodies at 60 fps on a modern laptop.

### Collision model

Optional momentum-conserving merge. When two bodies' radii overlap, they combine into a single body with:

```
m_new = m_a + m_b
v_new = (m_a * v_a + m_b * v_b) / m_new
```

Kinetic energy is not conserved (inelastic collision), which mimics accretion.

### Escape detection

A body is removed when it exits a margin two screen-widths beyond the canvas and its speed exceeds a threshold. This prevents the O(N^2) cost growing unboundedly from escaped bodies.

---

## Presets

### Sun–Earth–Moon
A scaled neighbourhood. The Sun anchors; Earth orbits; the Moon hitches a ride. The Moon's orbital radius is exaggerated for visibility — at true scale it would be a sub-pixel offset.

### Figure-8 (Chenciner–Montgomery)
Three equal masses chase each other on a stable figure-8 choreography. This solution was found numerically by **Cris Moore (1993)** and its stability was proved analytically by **Alain Chenciner and Richard Montgomery (2000)** using variational methods — minimising the action functional over loop space.

Reference: Chenciner, A. & Montgomery, R. (2000). *A remarkable periodic solution of the three-body problem in the case of equal masses.* Annals of Mathematics, 152(3), 881–901.

### Trojan Asteroids
Jupiter-analogues with two test-particle clouds at the L4 and L5 Lagrange points (60 degrees ahead and behind the planet). The Lagrange points are saddle points of the co-rotating potential; L4/L5 are stable for mass ratios below the Routh criterion (~1/25).

### Random N-body Cloud
Twenty bodies in a disc with random low velocities. Typical outcomes: sub-cluster formation, tidal streams, ejections, or slow dispersal. Each run is different.

### Three-Body Chaos
Three unequal masses with near-symmetric placement. A canonical demonstration that the general three-body problem has no closed-form solution (Bruns, 1887; Poincare, 1890). Tiny perturbations in initial conditions lead to exponentially divergent trajectories — the first studied example of deterministic chaos.

---

## Controls

| Action | Description |
|---|---|
| Click + drag | Place a body; drag length/direction sets initial velocity |
| Shift-click (body) | Increase that body's mass by 50% |
| Shift-click (empty) | Increase pending mass by 50% |
| Scroll wheel (body) | Scale body's mass up/down |
| Scroll wheel (empty) | Scale pending mass |
| Right-click | Delete nearest body |

---

## Running locally

```bash
./serve.sh        # http://localhost:8099/
./serve.sh 3000   # custom port
```

ES modules and `fetch('./presets.json')` require an HTTP server. Opening `index.html` directly via `file://` will fail silently.

---

## Literature

- Moore, C. (1993). Braids in classical dynamics. *Physical Review Letters*, 70(24), 3675.
- Chenciner, A. & Montgomery, R. (2000). A remarkable periodic solution of the three-body problem in the case of equal masses. *Annals of Mathematics*, 152(3), 881–901.
- Heggie, D. & Hut, P. (2003). *The Gravitational Million-Body Problem.* Cambridge University Press.
- Poincare, H. (1890). Sur le probleme des trois corps et les equations de la dynamique. *Acta Mathematica*, 13, 1–270.
- Aarseth, S.J. (2003). *Gravitational N-Body Simulations.* Cambridge University Press.
