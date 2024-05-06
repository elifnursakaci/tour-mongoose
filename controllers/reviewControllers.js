const Review = require("../models/reviewModel");
const factory = require("./handlerFactory");
exports.getAllReviews = factory.getAll(Review);

exports.setRefIds = async (req, res, next) => {
  // eğer ki atılan isteğin bodysinde tur id varsa bir şey yapma ama isteği body kısmında tur id si
  // gelmediyse url deki tur id sini al ve body e ekle
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

exports.createReview = factory.createOne(Review);

exports.getReview = factory.getOne(Review);

exports.updateReview = factory.updateOne(Review);

exports.deleteReview = factory.deleteOne(Review);
