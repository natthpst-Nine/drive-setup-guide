# Drive Setup Guide · TG Control

Web app for ABB drive support by phone: parameter settings by task, fault codes with Thai notes,
parameter cross-reference between drive families, and control panel simulators
(ACS580, ACH580, ACS180).

Works on phone and desktop; can be installed to the home screen and used offline.

## Data and copyright

- Parameter numbers, names, defaults, ranges, value codes and page numbers are facts taken from the
  ABB firmware manuals listed in each parameter (document number + revision).
- Thai notes, setting procedures and cross-reference tables are written by TG Control.
- Description paragraphs and fault cause/action texts of the ABB manuals are **not** reproduced;
  every parameter and fault links to ABB's own manual at the page instead.
- ABB, ACS and ACH are trademarks of ABB. This site is not an official ABB site.

## Access

The data files (`data/*.txt`) are encrypted with the team password (AES-256 + HMAC-SHA256, key from PBKDF2-SHA256).
Without the password the site shows only the sign-in page.

## Release

Change `APP_VERSION` in `index.html` on every release so phones fetch the new files.
