# Apply Docker Stack (Caddy → Nginx → PHP-FPM)

This README explains how the **Apply** stack works and how to extend it
with new independent modules (e.g., `jobs`, `form-interperter-view`,
`itero`, etc.).

## 1. Directory structure

    /home/digiter/apps/apply/
    ├─ docker-compose.yml
    ├─ conf/
    │   └─ nginx.conf
    ├─ routes/
    │   ├─ 10-php.caddy
    │   ├─ 20-static.caddy
    │   └─ (optional module-specific rewrites)
    ├─ jobs/
    │   ├─ jobs.html
    │   ├─ assets/…
    │   └─ api/answer.php
    ├─ form-interperter-view/
    │   ├─ index.html
    │   ├─ assets/…
    │   └─ api/answer.php
    └─ itero/
        ├─ index.html
        └─ api/answer.php

Each module is fully self-contained under its own directory.

------------------------------------------------------------------------

## 2. Docker Compose configuration

Mount the entire `apply` directory into both Nginx and PHP so that all
modules are visible without changing the compose file.

``` yaml
services:
  php:
    image: php:8.2.29-fpm-alpine
    container_name: apply-php
    working_dir: /srv/app
    networks: [edge]
    environment:
      APP_ENV: production
    env_file:
      - /home/infra/env/apply.env
    volumes:
      - ./:/srv/app:ro
      - /home/infra/env:/secrets:ro
    restart: unless-stopped

  web:
    image: nginx:1.27.5-alpine
    container_name: apply-web
    depends_on: [php]
    networks: [edge]
    volumes:
      - ./:/srv/app:ro
      - ./conf/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    expose:
      - "80"
    restart: unless-stopped

networks:
  edge:
    external: true
```

------------------------------------------------------------------------

## 3. Nginx configuration

A single configuration file serves all modules.

`conf/nginx.conf`:

``` nginx
server {
  listen 80 default_server;
  server_name _;
  root /srv/app;
  index index.html index.htm index.php jobs.html;

  location / {
    try_files $uri $uri/ =404;
  }

  location ~ \.php$ {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    fastcgi_pass apply-php:9000;
    fastcgi_read_timeout 120;
  }

  add_header Cache-Control "no-store" always;
}
```

------------------------------------------------------------------------

## 4. Caddy configuration

Main Caddyfile entry:

``` caddy
apply.digiter.fi {
    encode zstd gzip
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "no-referrer"
    }
    import /srv/apps/apply/routes/*.caddy
}
```

### Recommended: **Relative API paths**

Use relative API URLs in your front-end code, for example:

``` js
fetch('api/answer.php', { method: 'POST', body: formData })
```

This way `/itero/api/answer.php` automatically works without extra
routing rules.

Your routes file can be minimal:

``` caddy
handle_path /* {
    reverse_proxy apply-web:80
}
```

------------------------------------------------------------------------

## 5. Adding a new module

To add a new module, e.g. `itero`:

1.  Create a folder `/home/digiter/apps/apply/itero`
2.  Place your HTML, JS, and `api/` files inside it.
3.  Use relative API calls: `fetch('api/answer.php')`
4.  No changes to Docker Compose or Nginx needed.
5.  Reload Nginx and Caddy:

``` bash
docker exec -it apply-web nginx -t && docker exec -it apply-web nginx -s reload
docker exec -it pilot-caddy caddy reload --config /etc/caddy/Caddyfile
```

------------------------------------------------------------------------

## 6. Maintenance & testing

``` bash
cd /home/digiter/apps/apply
docker compose up -d

# Logs
docker logs --tail=100 apply-web
docker logs --tail=100 apply-php
docker logs --tail=100 pilot-caddy | grep apply.digiter.fi

# Quick tests
curl -I https://apply.digiter.fi/jobs/jobs.html
curl -X POST https://apply.digiter.fi/jobs/api/answer.php -d 'ping=1'
```

------------------------------------------------------------------------

## 7. Security

-   All volumes are mounted **read-only** (`:ro`).
-   Environment secrets live under `/home/infra/env/apply.env`.
-   Caddy adds strict HTTPS and security headers.
-   Optionally enable rate limiting at Caddy or Cloudflare level.

------------------------------------------------------------------------

## 8. Summary

-   One Nginx + one PHP-FPM handles all modules.
-   Relative API paths (`api/answer.php`) are easiest and safest.
-   Each module lives in its own directory and needs no extra routing.
-   Caddy serves everything under `apply.digiter.fi`.
