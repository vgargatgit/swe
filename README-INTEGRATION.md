# SWE CH2–CH32 integration

This overlay integrates the uploaded course content into the existing `vgargatgit/swe` static-site format.

## Included

- Full individual lesson scripts for Days 2–30.
- An updated `index.html` that loads those scripts.
- Validation results and the deterministic conversion generator.

Days 31 and 32 are already present as full individual lessons in the repository and are intentionally not duplicated or replaced.

## Explicit exclusions

- No Day 37 content.
- No Pessimistic Locking lesson.

## Apply with the companion patch

From the root of a clean `vgargatgit/swe` checkout:

```bash
git apply --check /path/to/swe-ch2-ch32.patch
git apply /path/to/swe-ch2-ch32.patch
```

Then inspect and commit the resulting 30-file change.

## Apply as an overlay

Copy this archive's `index.html` and `lessons/` directory into the repository root, preserving paths. The archive contains only the files that need to be added or replaced; it is not a complete repository checkout.

## Source fidelity

The source contains several explicit extraction-limit warnings. They are deliberately preserved as visible warning callouts rather than silently completed from outside knowledge.
