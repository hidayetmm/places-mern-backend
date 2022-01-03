const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const fileUpload = require("../middleware/file-upload");

const {
  getAllUsers,
  getUserById,
  signupUser,
  loginUser,
} = require("../controllers/users-controller");

const userInputs = { name: "name", email: "email", password: "password" };
const { name, email, password } = userInputs;

const signupUserValidations = [
  check(name).notEmpty(),
  check(email).normalizeEmail().isEmail(),
  check(password).isLength({ min: 6 }),
];

const loginUserValidations = [check(email).normalizeEmail()];

router.get("/", getAllUsers);
router.get("/:uid", getUserById);
router.post(
  "/signup",
  fileUpload.single("image"),
  signupUserValidations,
  signupUser
);
router.post("/login", loginUserValidations, loginUser);

module.exports = router;
