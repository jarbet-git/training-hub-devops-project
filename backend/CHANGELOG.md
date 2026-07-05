# Changelog

## 0.9.4-dev - 2026-06-12

### Changed
- Added `Local SAP ID` next to the employee name in weekly mandatory training reminder emails when the value is available.

## 0.9.3-dev - 2026-06-12

### Fixed
- Made mandatory training date parsing more resilient for Workday CSV/XLSX exports with mixed date formats.
- Fixed importing indefinite mandatory trainings when `Start Date` contains a time part, e.g. `27.06.2017 17:00:00`, and `Expiration Date` is empty.
- Added support for common date-time variants using dots, slashes, dashes, ISO-like values and Excel serial dates in mandatory training date fields.

## 0.9.2-dev - 2026-06-12

### Added
- Added CSV support to mandatory training imports. HR/Admin can now upload Workday `.xlsx` and `.csv` files with the same expected column structure.
- Added field-level help tooltips in the request item dialog (`Dodaj pozycję` / `Add item`) for cost center, business need, training, category, headcount, employee, cost, hours, quarter, priority, contact person and notes. Tooltips are translated in Polish and English.

### Changed
- Replaced the two-button collection window control in the Admin `Okno` tab with the same on/off switch pattern used in the user profile.
- Updated mandatory training import copy and file picker hints to mention both `.xlsx` and `.csv`.

## 0.9.1-dev - 2026-06-12

### Added
- Added XLSX export for the Mandatory Trainings table for Manager, HR and Admin roles. Export respects current search text and selected status tab.
- Added support for `Local SAP ID` in mandatory training imports and display it under the employee name instead of the Workday Employee ID.
- Added `Start Date` support for mandatory training imports. Records with Start Date and without Expiration Date are imported as indefinite trainings.
- Added the new `Bezterminowe` / `Indefinite` bucket in mandatory training list, summary and admin import summary.

### Changed
- Mandatory training import no longer filters records by `Required Learning = Yes`; both `Yes` and non-`Yes` records are imported if other required data is valid.
- Mandatory training expiration date can now be empty for indefinite records.
- HR reply process is now binary: `Approved` or `Rejected`. The former `Partially approved` option is removed from the UI and rejected by the backend for new HR replies.

### Compatibility
- Historical `PARTIAL` HR decisions are still handled safely in exports, notifications and labels, but they are displayed/treated as approved for business readability.
