import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './typeDefs.js';
import { resolvers, type Context } from './resolvers.js';

const PORT = Number(process.env['PORT'] ?? 3008);

const server = new ApolloServer<Context>({ typeDefs, resolvers });
await server.start();

const app = express();
app.use(cors({ origin: process.env['CORS_ORIGIN'] ?? '*' }));

app.get('/health', (_req, res) => {
  res.json({ service: 'graphql-service', status: 'ok', timestamp: new Date().toISOString() });
});

app.use(
  '/graphql',
  bodyParser.json(),
  expressMiddleware(server, {
    context: async ({ req }) => ({
      token: (req.headers.authorization as string) ?? '',
    }),
  }),
);

app.listen(PORT, () => {
  console.log(`GraphQL service listo en http://0.0.0.0:${PORT}/graphql`);
});
