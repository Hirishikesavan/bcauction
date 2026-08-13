import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000',
  basePath: '/api/auth',
  secret: process.env.BETTER_AUTH_SECRET || 'fallback-secret',

  emailAndPassword: { enabled: true },

  socialProviders: {
    google: {
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
