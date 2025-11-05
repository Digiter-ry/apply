# Jobs UI (no backend)

This folder contains the public UI for the Apply – Jobs Assistant.
No backend, no API keys, no secrets.

## Run locally (XAMPP)
1. Copy this folder to `C:\xampp\htdocs\apply\jobs` (Windows) or `/opt/lampp/htdocs/apply/jobs` (Linux).
2. Start Apache (XAMPP Control Panel).
3. Open: http://localhost/apply/jobs/

## Notes
- This is UI-only; API endpoints are disabled/placeholder.
- Do not store .env or keys here.
- For production, backend lives in a separate service.