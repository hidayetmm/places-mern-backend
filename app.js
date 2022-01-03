require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const HttpError = require("./models/http-error");
const app = express();
const mongoose = require("mongoose");

app.use(express.json());
app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

  next();
});

const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");

app.use("/api/places", placesRoutes);
app.use("/api/users", usersRoutes);

app.use(() => {
  const error = new HttpError("Could not found this route.", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occured." });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.j09ma.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    console.log("Database connection established.");
    app.listen(process.env.PORT || 7070);
  })
  .catch((error) => console.log(error));
