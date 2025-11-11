# Dockerfile (PHP, Cloud Run)
FROM php:8.2-cli
WORKDIR /app
COPY . /app

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "if [ -d public ]; then php -S 0.0.0.0:${PORT} -t public; else php -S 0.0.0.0:${PORT} -t .; fi"]
