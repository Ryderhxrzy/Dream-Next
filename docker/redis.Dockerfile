FROM php:8.4-cli-alpine

RUN apk add --no-cache redis

EXPOSE 6379

CMD ["redis-server", "--appendonly", "yes"]
