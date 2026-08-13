const { betterAuth } = require("better-auth");

const auth = betterAuth({
  database: {
    type: "mongodb",
    uri: process.env.MONGODB_URI,
  },
  secret: process.env.BETTER_AUTH_SECRET || "change-me-in-production",
  baseURL: process.env.BACKEND_URL || "http://localhost:5000",
  basePath: "/api/auth",
  
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectURL: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/callback/google`,
    },
  },
  
  emailAndPassword: {
    enabled: true,
    autoSignUpOnSignIn: true,
    minPasswordLength: 6,
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  
  user: {
    additionalFields: {
      role: {
        type: "string",
        default: "viewer",
      },
    },
  },
  
  callbacks: {
    async onSignUpWithPassword({ user, password }) {
      console.log("✅ New user registered with email/password:", user.email);
      return user;
    },
    async onSignInWithSocialProvider({ user, provider }) {
      console.log(`✅ User signed in with ${provider}:`, user.email);
      return user;
    },
  },
});

module.exports = { auth };
