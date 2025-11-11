FROM php:8.2-cli

WORKDIR /app
COPY . /app

# Linkitä assets juureen, jos ne ovat jobs/alla
RUN if [ -d jobs/assets ]; then ln -s /app/jobs/assets /app/assets; fi

ENV PORT=8080
EXPOSE 8080

# Palvele public/ jos löytyy, muuten repojuuri
CMD ["sh","-c","if [ -d public ]; then php -S 0.0.0.0:${PORT} -t public; else php -S 0.0.0.0:${PORT} -t .; fi"]
