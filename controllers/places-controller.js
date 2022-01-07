const fs = require("fs");
const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const getCoordinatesForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");
const ImageKit = require("imagekit");

const getAllPlaces = async (req, res, next) => {
  let places;
  try {
    places = await Place.find().populate("creator");
  } catch (err) {
    const error = new HttpError("Could not find any place.", 404);
    return next(error);
  }

  if (!places) {
    const error = new HttpError("Could not find any place.", 404);
    return next(error);
  }

  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place.",
      500
    );
    return next(error);
  }
  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided place id.",
      404
    );
    return next(error);
  }
  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const username = req.params.username;

  let userWithPlaces;
  try {
    userWithPlaces = await User.findOne({ name: username }).populate("places");
  } catch (err) {
    const error = new HttpError(
      "Fetching places failed, please try again.",
      404
    );
    return next(error);
  }
  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError("Could not find a place with that user id.", 404)
    );
  }

  const { places, ...rest } = userWithPlaces;
  res.json({
    data: userWithPlaces.toObject({ getters: true }),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    const errorInputs = errors.errors.map((input) => input.param);
    return next(new HttpError(`Invalid input of ${errorInputs}`, 422));
  }
  const { title, description, address } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordinatesForAddress(address);
  } catch (error) {
    return next(error);
  }

  // Image upload

  const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: "https://ik.imagekit.io/places",
  });

  fs.readFile(req.file.path, (err, data) => {
    if (err) {
      console.log(err);
    }
    imagekit
      .upload({
        file: data,
        fileName: title.toLowerCase(),
        extensions: [
          {
            name: "google-auto-tagging",
            maxTags: 5,
            minConfidence: 95,
          },
        ],
      })
      .then(async (result) => {
        fs.unlink(req.file.path, (err) => {
          console.log(err);
        });

        const createdPlace = new Place({
          title,
          description,
          address: coordinates.address,
          location: coordinates,
          image: result.url,
          creator: req.userData.userId,
        });

        let user;
        try {
          user = await User.findById(req.userData.userId);
        } catch (err) {
          const error = new HttpError(
            "Could not find a user with the provided id.",
            404
          );
          return next(error);
        }

        if (!user) {
          const error = new HttpError(
            "Could not find a user with the provided id.",
            404
          );
          return next(error);
        }

        try {
          const sess = await mongoose.startSession();
          sess.startTransaction();
          await createdPlace.save({ session: sess });
          user.places.push(createdPlace);
          await user.save({ session: sess });
          await sess.commitTransaction();
        } catch (err) {
          const error = new HttpError(
            "Creating place failed, please try again.",
            500
          );
          return next(error);
        }

        res.status(201).json({ place: createdPlace });
      })
      .catch((err) => {
        const error = new HttpError(err.message, 500);
        return next(error);
      });
  });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorInputs = errors.errors.map((input) => input.param);
    return next(new HttpError(`Invalid input of ${errorInputs}`, 422));
  }
  const placeId = req.params.pid;
  const { title, description } = req.body;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Could not find a place for the provided place id.",
      500
    );
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError("You are not allowed to edit this place.", 401);
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Could not find a place for the provided id.",
      404
    );
    return next(error);
  }
  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided id.",
      404
    );
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to delete this place.",
      401
    );
    return next(error);
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Could not find a place for the provided id.",
      500
    );
    return next(error);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.json({ message: "Deleted place." });
};

exports.getAllPlaces = getAllPlaces;
exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
