import cors from "cors";

// Allow the Vite dev server (default 5173). Add common local dev origins
// in case the user changes the port via VITE_PORT.
export const corsMiddleware = cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});
