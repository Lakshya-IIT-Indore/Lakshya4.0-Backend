import express from "express";
import cors from "cors";

import { ApiError } from "./utils/ApiError.js";
import eventsRoutes from "./routes/events.js";



const app = express();
app.use((req, res, next) => {
  console.log("Global Check:", req.method, req.url);
  next();
});

app.use(cors({
  origin: '*',
}));
// app.options("*", cors());
app.use(express.json());


app.use("/api/events", eventsRoutes);

// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      statusCode: err.statusCode,
      data: err.data,
      success: err.success,
      errors: err.errors?.length ? err.errors : [err.message],
      message: err.message,
    });
  }

 res.status(500).json({
    success: false,
    message: err.message, // Change this to show the real error in Postman
    stack: err.stack      // This will tell you exactly which line failed
  });
});

export { app };
