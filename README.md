# emailsender

Transactional emails endpoint with fastify and nodemailer

## Development

**1. Build image**

```sh
docker build -f Dockerfile-dev -t emailsender-dev .
```

**2. Set environment variables**

Copy .env.example to .env and set your environment variables

**3. Start a container**

```sh
docker run -v $(pwd):/app -p 3000:3000 --env-file .env emailsender-dev
```

## Deployment examples

### Fly.io

**1. Set secrets**

```sh
fly secrets set SECRET_KEY=secret-key PORT=3000 SMTP_HOST= SMTP_PORT= SMTP_AUTH_USER=you@example.com SMTP_AUTH_PASSWORD=smtp-password
```

**2. Deploy**

```sh
fly deploy
```

## Usage

### Send with curl

```sh
curl "http://localhost:3000" \
 -X POST \
 -H "Accept: application/json" \
 -H "Content-Type: application/json" \
 -H "secret-key: notverysecret" \
 -d '{
"from": "Your Name <you@example.com>",
"to": "user@example.com",
"replyTo": "you@example.com",
"subject": "It works!",
"text": "Hello from emailsender."
}'
```
