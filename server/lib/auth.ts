import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";

export const auth = betterAuth({
  database: mongodbAdapter(mongoose.connection),
  secret: process.env.BETTER_AUTH_SECRET || "change-me-in-production",
  baseURL: process.env.BACKEND_URL || "http://localhost:5000",
  basePath: "/api/auth",
  
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  
  emailAndPassword: {
    enabled: true,
    autoSignUpOnSignIn: true,
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update every day
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
});

export type Session = typeof auth.$Infer.Session;
