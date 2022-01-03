const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const fileUpload = require("../middleware/file-upload");
const {
  getAllPlaces,
  getPlaceById,
  getPlacesByUserId,
  createPlace,
  updatePlace,
  deletePlace,
} = require("../controllers/places-controller");
const checkAuth = require("../middleware/check-auth");

const placeInputs = {
  title: "title",
  description: "description",
  address: "address",
};
const { title, description, address } = placeInputs;

const createPlaceValidations = [
  check(title).notEmpty(),
  check(description).isLength({ min: 5 }),
  check(address).notEmpty(),
];

const updatePlaceValidations = [
  check(placeInputs.title).notEmpty(),
  check(placeInputs.description).isLength({ min: 5 }),
];

router.get("/", getAllPlaces);
router.get("/:pid", getPlaceById);
router.get("/user/:username", getPlacesByUserId);

router.use(checkAuth);

router.post(
  "/",
  fileUpload.single("image"),
  createPlaceValidations,
  createPlace
);
router.patch("/:pid", updatePlaceValidations, updatePlace);
router.delete("/:pid", deletePlace);

module.exports = router;
