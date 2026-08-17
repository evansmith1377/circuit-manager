import { GraphQLClient } from 'graphql-request';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'http://hasura:8080/v1/graphql';
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || 'circuit_admin_secret';

// Admin client for server-side operations (bypasses row-level security)
export const adminClient = new GraphQLClient(HASURA_URL, {
  headers: {
    'x-hasura-admin-secret': ADMIN_SECRET,
  },
});

// User client factory - creates a client with user JWT
export function userClient(token: string): GraphQLClient {
  return new GraphQLClient(HASURA_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export type { GraphQLClient };
