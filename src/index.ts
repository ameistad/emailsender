import fastify from 'fastify';
import { type FastifyReply, type FastifyRequest } from 'fastify';
import fastifyEnv from '@fastify/env';
import fastifyCors from '@fastify/cors';
import { z } from 'zod';
import { createTransport } from 'nodemailer';

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
  methods: ['POST'],
});

const bodySchema = z.object({
  to: z.string(),
  replyTo: z.string().optional(),
  from: z.string(),
  subject: z.string(),
  text: z.string(),
});

const headersSchema = z.object({
  secretKey: z.string(),
});
export type Body = z.infer<typeof bodySchema>;

const port = (process.env.PORT as unknown as number) ?? 3002;
app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.status(200).type('text/html').send('It Works!');
});
app.post<{ Body: Body }>('/', async (request: FastifyRequest, reply: FastifyReply) => {
  const secretKey = request.headers['secret-key'];
  if (!secretKey) {
    return reply.status(400).send({ error: 'secretKey is required' });
  }

  if (secretKey !== SECRET_KEY) {
    return reply.status(403).send({ error: 'secretKey is invalid' });
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
    replyTo: replyTo ?? to,
    from,
    subject,
    text,
    html: `<p>${text}</p>`,
  });

  return reply.status(200).send({ result });
  // return reply.status(200).type('text/html').send(JSON.stringify(result));
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

process.on('SIGINT', () => {
  console.log('Caught interrupt signal, exiting...');
  process.exit();
});
