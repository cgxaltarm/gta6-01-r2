# VELAMAR

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/cgxaltarm/gta6-01-r2/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/cgxaltarm/gta6-01-r2/reward.svg)](https://make.fun/bounty/gta6-01)

**VELAMAR** is an original sun-soaked coastal open-world crime game built for [make.fun gta6-01](https://make.fun/bounty/gta6-01). Roam a vibrant island city on foot and by car, follow an 8-mission story chain, evade escalating police heat, and save your progress — all in the browser with no build step.

Referral: `witty-badger-10`

## Features
- Original coastal city districts: downtown grid, coast road, beach, and harbour
- 8 story missions with objectives, beacons, waypoint guidance, timers, and cash rewards
- Third-person on-foot movement and driving with enter/exit, collisions, and damage
- Combat: fists, pistol, SMG, aiming and shooting
- Wanted system 0–5 stars with police response, chases, roadblocks, helicopter pressure, hiding, and busted flow
- Traffic vehicles and pedestrians populating the city
- HUD, minimap, radio, garage/upgrades, save/autosave and continue support
- Deterministic screenshot scenes via `?shot=start|drive|chase|mission`

## Run locally
```bash
node serve.ts
# open http://localhost:8080
```

## Package (dossier output)
```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Controls
- **WASD**: move / drive
- **Mouse**: look / aim / shoot
- **E**: enter/exit vehicle
- **Space**: handbrake
- **1/2/3**: weapon selection
- **Q**: radio
- **F**: save
- **R**: restart / context action

All names, characters, vehicles, art, and story are original. No third-party franchise assets, names, characters, or maps are used.
