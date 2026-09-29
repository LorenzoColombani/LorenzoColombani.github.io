# Workshop deployment targets

Lorenzo's explicit rule (2026-09-24): version **1.0**, the seaside website, stays
untouched. Version **2.0**, the current garage, receives normal updates.

- 1.0: https://the-workshop-lorenzo-preview.netlify.app/workshop/
  Site ID `79938f7e-eb20-4296-a544-6ccaaf702a08`. Do not publish to this site.
- 2.0: https://the-workshop-garage-lorenzo.netlify.app/workshop/
  Site ID `47dd72b3-ac20-4adb-b750-55c81f3a1574`. This is the default target for “deploy”.

Build with `python3 workshop/package-preview.py`. After the relevant checks,
publish the resulting private-file-free directory to 2.0:

```sh
netlify deploy --site 47dd72b3-ac20-4adb-b750-55c81f3a1574 --dir /private/tmp/the-field-netlify-preview --no-build --prod
```

The temporary package directory's historical “field” name does not identify the
Netlify target. Always pass the explicit **2.0 site ID** above. The old hash-based
garage draft URLs belong to the 1.0 Netlify project and are historical snapshots;
do not keep treating the current garage as a draft of the seaside site.

Machine-readable identities: `.claude/workshop-sites.json`.
Current 2.0 deployment receipt: `.claude/netlify-workshop2.json` (after publish).
No changes to the independent Claude checkout are implied by a deployment here.
