import fastify from 'fastify';
import { type FastifyReply, type FastifyRequest } from 'fastify';
import fastifyEnv from '@fastify/env';
import fastifyCors from '@fastify/cors';
import { createTransport } from 'nodemailer';
import { z } from 'zod';

const schema = {
  type: 'object',
  required: ['SECRET_KEY', 'PORT', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_AUTH_USER', 'SMTP_AUTH_PASSWORD'],
  properties: {
    SECRET_KEY: { type: 'string' },
    PORT: { type: 'number' },
    SMTP_HOST: { type: 'string' },
    SMTP_PORT: { type: 'number' },
    SMTP_AUTH_USER: { type: 'string' },
    SMTP_AUTH_PASSWORD: { type: 'string' },
  },
};

const SECRET_KEY = process.env.SECRET_KEY;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT as unknown as number;
const SMTP_AUTH_USER = process.env.SMTP_AUTH_USER;
const SMTP_AUTH_PASSWORD = process.env.SMTP_AUTH_PASSWORD;

const app = fastify({ logger: true });

void app.register(fastifyEnv, {
  schema,
  confKey: 'config',
  data: process.env,
  dotenv: true,
});

void app.register(fastifyCors, {
  origin: '*',
  methods: ['GET', 'POST'],
});

const bodySchema = z.object({
  to: z.string(),
  replyTo: z.string().optional(),
  from: z.string(),
  subject: z.string(),
  text: z.string(),
});

export type Body = z.infer<typeof bodySchema>;

const port = parseInt(process.env.PORT);
app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.status(200).type('text/html').send('It Works!');
});
app.post<{ Body: Body }>('/', async (request: FastifyRequest, reply: FastifyReply) => {
  // Switch header keys to lowercase.
  const headers = Object.keys(request.headers).reduce((acc, key) => {
    acc[key.toLowerCase()] = request.headers[key];
    return acc;
  }, {});
  if (!headers['secret-key']) {
    return reply.status(400).send({ error: 'Secret-Key is required' });
  }

  if (headers['secret-key'] !== SECRET_KEY) {
    return reply.status(403).send({ error: 'Secret-Key is invalid' });
  }

  let bodyParsed: Body | undefined;
  try {
    bodyParsed = bodySchema.parse(request.body);
  } catch (error) {
    console.log(error);
    return reply.status(400).send({ error: JSON.stringify(error) });
  }

  const { to, replyTo, from, subject, text } = bodyParsed;
  const transporter = createTransport({
    port: SMTP_PORT,
    host: SMTP_HOST,
    auth: {
      user: SMTP_AUTH_USER,
      pass: SMTP_AUTH_PASSWORD,
    },
  });
  const result = await transporter.sendMail({
    to,
    replyTo,
    from,
    subject,
    text,
    html: `<p>${text}</p>`,
  });

  return reply.status(200).send({ result });
});

app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'development') {
    console.log(`🚀 Server running at: http://localhost:${port}`);
  }
});

process.on('SIGTERM', () => close());
process.on('SIGINT', () => close());

function close() {
  console.log('Running close...');
  app.close(() => {
    console.log('Received kill signal, shutting down gracefully');
    process.exit(0);
  });
}
