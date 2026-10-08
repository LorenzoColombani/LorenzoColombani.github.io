# Websites inside the Garage

These are owned static runtime snapshots. The ten Garage cards launch their
original live pages in the shared holographic website-preview screen, loaded
only on request and unloaded on return. Lorenzo rejected the native-instrument
experiment and restored this presentation on 30 September 2026. Source projects
were not modified.

## Imported snapshots

| Folder | Source | Import adaptations |
| --- | --- | --- |
| `ai-applied` | Local Astro build | Rebased assets, case/contributor routes, hydrated card paths and attachment URLs |
| `data-vault-foundations` | Local static project | Runtime files copied unchanged; chapters, systems and sound assets included |
| `exam-pacer` | Local standalone app | Unchanged HTML and MIT license |
| `star-wars-decluttering-app` | Owned GitHub repository | Unchanged HTML and MIT license |
| `text-readability-guide` | Owned GitHub repository | Unchanged HTML and MIT license |
| `easy-local-llm-guide` | Owned GitHub repository | Unchanged HTML and MIT license |
| `ios-assistant-for-senior-citizens` | Owned GitHub repository | Removed registration of a nonexistent service worker and an unused icon stylesheet returning 404 |
| `can-you-understand-an-email` | Local Tone Illusion Vite build | Rebased two asset URLs |
| `multicultural-job-applicants-guide` | Existing public build of owned project | Rebased two assets; deployed build commit could not be confirmed |
| `gamification-helper-tool` | Owned Octalysis GitHub repository | Runtime unchanged; original CDN dependencies retained |

Each app's `SOURCE.json` records provenance, source revision where verifiable,
file hashes, adaptations and external dependencies. Keep available upstream
licenses with the copied app. These are snapshots, not an automatic sync: compare
the source before replacing them and rerun the navigation/asset checks afterward.

Some apps still use external fonts/libraries. The imports do not claim universal
offline support. Native alert/confirm dialogs are enabled for these owned copies
because existing mission/tutorial controls need them. Remote embeds retain their
previous sandbox policy.

## Hosted sites and exclusions

Active Listening's overview, What it Feels Like, the Policy & Regulation portfolio,
Process Automation Workflows, and ThinkH+ are hosted embeds. The original seaside
Workshop card was removed from the Garage portfolio at Lorenzo's request; its
website remains untouched.
Active Listening's actual GPT opens separately on ChatGPT. Its overview is not an
in-Garage chat implementation.

One Thing Today's hosted wheel currently reports a database connection error;
its card retains an external project link with an availability note. Privacy
Eraser's Gemini share blocks framing and retains its original external route.
Bridge/Loki, native apps, media and portfolio-only cards were not converted.

## Packaging and checks

`workshop/package-preview.py` explicitly allows runtime routes/assets and
licenses. It excludes SOURCE.json, this README, private state, source maps, and
build configuration. Local package creation does not deploy anything.

Validation on 30 September 2026: all ten imports rendered in the Garage preview;
interactive examples were exercised, including AI search/case navigation and
Data Vault chapter navigation. The full Garage suite passed 124 tests. This is
not exhaustive testing of each source app, hosted service, or physical mobile
device. The project handoff contains detailed evidence and remaining limits.
