const { Schema, model, Types } = require("mongoose");

const placeSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: {
    url: { type: String, required: true },
    fileId: { type: String, required: true, select: false },
  },
  address: { type: String, required: true },
  location: {
    lat: { type: String, required: true },
    lng: { type: String, required: true },
  },
  creator: { type: Types.ObjectId, required: true, ref: "User" },
});

module.exports = model("Place", placeSchema);
