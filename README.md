# Coomers Dashboard

React dashboard generated from the workbook:

- `C:\Users\DELL_1\Desktop\Coomers Forever_.xlsx`

## Run

```bash
npm install
npm run dev
```

## Rebuild data from workbook

```bash
python scripts/build_dataset.py "C:\Users\DELL_1\Desktop\Coomers Forever_.xlsx"
```

This writes to:

- `src/data/coomersData.json`

## Deduplication policy

- Source tabs used: `2026`, `backup`, `history`
- Priority: `2026 > backup > history`
- Empty cells are treated as `0`
- Duplicate dates across sheets are merged by source priority
- Conflicts are preserved in `diagnostics.conflicts`

## GitHub Pages

- Deployment workflow: `.github/workflows/deploy-pages.yml`
- Vite base path is set to `/mdashboard/` in `vite.config.js`
- Push to `main` to trigger deployment
