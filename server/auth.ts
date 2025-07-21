import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import bcrypt from "bcryptjs";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import type { User } from "@shared/schema";

interface AuthUser extends User {
  password?: string | null | undefined;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize/deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Local Strategy (Email/Password)
  if (process.env.ENABLE_EMAIL_AUTH !== "false") {
    passport.use(new LocalStrategy(
      { usernameField: "email" },
      async (email: string, password: string, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid credentials" });
          }

          // Check if user has a password (local auth)
          if (!user.password) {
            return done(null, false, { message: "Please sign in with your social account" });
          }

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: "Invalid credentials" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists with this Google ID
        let user = await storage.getUserByProvider("google", profile.id);
        
        if (user) {
          return done(null, user);
        }

        // Check if user exists with same email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await storage.getUserByEmail(email);
          if (user) {
            // Link Google account to existing user
            await storage.linkProvider(user.id, "google", profile.id);
            return done(null, user);
          }
        }

        // Create new user
        user = await storage.upsertUser({
          id: `google_${profile.id}`,
          email: email || null,
          firstName: profile.name?.givenName || null,
          lastName: profile.name?.familyName || null,
          profileImageUrl: profile.photos?.[0]?.value || null,
          emailVerified: true,
          providers: JSON.stringify([{
            provider: "google",
            providerId: profile.id,
            email: email
          }])
        });

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }));
  }

  // Facebook Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails", "photos"]
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await storage.getUserByProvider("facebook", profile.id);
        
        if (user) {
          return done(null, user);
        }

        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await storage.getUserByEmail(email);
          if (user) {
            await storage.linkProvider(user.id, "facebook", profile.id);
            return done(null, user);
          }
        }

        user = await storage.upsertUser({
          id: `facebook_${profile.id}`,
          email: email || null,
          firstName: profile.displayName?.split(" ")[0] || null,
          lastName: profile.displayName?.split(" ").slice(1).join(" ") || null,
          profileImageUrl: profile.photos?.[0]?.value || null,
          emailVerified: !!email,
          providers: JSON.stringify([{
            provider: "facebook",
            providerId: profile.id,
            email: email
          }])
        });

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }));
  }

  // Auth routes
  setupAuthRoutes(app);
}

function setupAuthRoutes(app: Express) {
  // Local registration
  app.post("/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password || !firstName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.upsertUser({
        id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        emailVerified: false,
        providers: JSON.stringify([{
          provider: "local",
          providerId: email,
          email: email
        }])
      });

      // Create default lists for new user
      await storage.createDefaultLists(user.id);

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login error" });
        res.json({ user: { id: user.id, firstName: user.firstName, email: user.email } });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Local login
  app.post("/auth/login", passport.authenticate("local"), (req: any, res) => {
    res.json({ 
      user: { 
        id: req.user.id, 
        firstName: req.user.firstName, 
        email: req.user.email 
      } 
    });
  });

  // Google OAuth routes
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get("/auth/google", 
      passport.authenticate("google", { scope: ["profile", "email"] })
    );

    app.get("/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/?error=auth_failed" }),
      (req, res) => {
        res.redirect("/");
      }
    );
  }

  // Facebook OAuth routes
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    app.get("/auth/facebook",
      passport.authenticate("facebook", { scope: ["email"] })
    );

    app.get("/auth/facebook/callback",
      passport.authenticate("facebook", { failureRedirect: "/?error=auth_failed" }),
      (req, res) => {
        res.redirect("/");
      }
    );
  }

  // Logout
  app.post("/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout error" });
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/auth/me", (req: any, res) => {
    if (req.isAuthenticated()) {
      res.json({
        user: {
          id: req.user.id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email,
          profileImageUrl: req.user.profileImageUrl
        }
      });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};