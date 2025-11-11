# Dockerfile (PHP, Cloud Run)
FROM php:8.2-cli
WORKDIR /app
COPY . /app
# Jos assets on jobs/alla, linkitä se juureen /assets
RUN [ -d jobs/assets ] && ln -s /app/jobs/assets /app/assets || true
# (tarvittaessa muitakin: ln -s /app/jobs/i18n /app/i18n)
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "if [ -d public ]; then php -S 0.0.0.0:${PORT} -t public; else php -S 0.0.0.0:${PORT} -t .; fi"]
