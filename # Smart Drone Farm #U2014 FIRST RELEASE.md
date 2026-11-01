# UPDATE 30 SEPTEMBER 2026! Smart Drone Farm — v2.0.0

**Smart Drone Farm** is a farming automation game inspired by the concept of *The Farmer Was Replaced*. In this game, players write code to control drones that plant, water, grow, and harvest crops while managing resources, completing quests, and expanding their farm.

The main concept of the game combines **farming simulation, drone automation, and programming logic**.

## Features

* Guided onboarding tutorial for first-time players
* Dashboard with a Play button, lifetime stats, and an achievements panel
* Level-based progression, each with its own quest and star rating (1–3 stars based on speed)
* Drone movement and control, programmed in a Python-like scripting language
* Planting, watering, growth, and harvesting systems
* Pest system: crops can be infested and must be cleared before they resume growing
* Four crop types, each with its own growth time and value
* Coin economy, shop, and upgrades
* Farm expansion (larger plot)
* Multiple drones running the same or different code at once
* Simulation speed control
* Persistent save (progress, unlocks, stars, and code per level survive a page reload)
* Automation-based gameplay

## Gameplay

New players go through a short tutorial before reaching the dashboard. From the dashboard, Play opens the level map, where each level unlocks after the previous one is completed.

Every level has a quest — for example, harvesting a target number of crops, hitting a coin goal, or running two drones at once. Write code in the in-game editor, run it, and watch the drone carry it out on the farm. Clearing a quest awards 1 to 3 stars depending on how many ticks it took, and unlocks the next level.

Plant crops, take care of them, harvest them, and earn coins. Use your earnings to buy upgrades, unlock new crops, expand your farm, and add more drones. After the main levels are cleared, Free Mode is unlocked for open-ended play with no quest.

## Crops

The current release includes:

* Wheat
* Carrot
* Potato
* Corn

Each crop has a different growth time and coin value, making resource management and farm optimization an important part of the gameplay.

## Pests

Starting partway through the level progression, crops can become infested with pests while growing. An infested crop stops growing until the pest is cleared, so later levels require checking for and removing pests as part of the automation routine — not just planting and harvesting.

## Automation

Smart Drone Farm focuses on automation and programming concepts. Drone behavior is written in a small Python-like language supporting:

* Variables and arithmetic
* Conditionals (`if` / `elif` / `else`)
* Loops (`while`, `for ... in range(...)`)
* Functions (`def`, `return`)
* `break` / `continue`, `and` / `or` / `not`

The gameplay is designed around ideas such as:

* Algorithms
* Conditional logic
* Loops
* Automation
* Resource management
* Optimization
* Drone control
* Multi-agent coordination (running several drones at once)

## v2.0.0

Version 2.0.0 turns the original single-farm sandbox into a structured, level-based game with onboarding, progression, and additional systems on top of the v1.0.0 core.

### Included in v2.0.0

* [x] Tutorial flow for new players
* [x] Dashboard with Play button and lifetime stats
* [x] Level map with per-level quests and locking/unlocking
* [x] Star rating per level based on completion speed
* [x] Achievements panel (6 achievements tracked across all-time play)
* [x] Drone movement
* [x] Planting
* [x] Crop growth
* [x] Watering
* [x] Harvesting
* [x] Pest system (infestation, detection, clearing)
* [x] Coin system
* [x] Shop system
* [x] Four crop types (wheat, carrot, potato, corn)
* [x] Farm expansion
* [x] Multiple drones, purchasable and programmable independently
* [x] Simulation speed control
* [x] Persistent save (localStorage)

## Future Development

Planned features for future versions include:

* Additional crop types
* More automation tools
* Advanced drone programming (syntax highlighting, autocomplete)
* Improved farm management
* Additional farm layouts
* Improved UI/UX
* Sound effects and background music
* More upgrades
* Additional levels and quest types

## Technology

Smart Drone Farm is currently built using:

* JavaScript
* HTML
* CSS
* HTML Canvas

## Project Status

Smart Drone Farm is an ongoing project. Gameplay mechanics, balancing, UI, and visual elements may change as development continues.

Feedback, bug reports, suggestions, and contributions are welcome.

---

Inspired by the automation concept of *The Farmer Was Replaced*, while being developed as an independent project with its own implementation and gameplay systems.