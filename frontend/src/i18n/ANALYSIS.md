# Frontend i18n Notes

Last updated: 2026-02-15

## Files

- `frontend/src/i18n/LanguageContext.tsx`
- `frontend/src/i18n/en.json`
- `frontend/src/i18n/zh.json`

## Behavior

- Locale is stored in `localStorage` under `raven_lang`.
- `t(key)` returns translated string or the key itself as fallback.
- `toggleLocale()` switches between `en` and `zh`.

