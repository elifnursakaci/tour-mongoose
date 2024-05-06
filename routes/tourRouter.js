const express = require("express");
const {
  getAllTours,
  createTour,
  getTour,
  deleteTour,
  updateTour,
  getTourStats,
  aliasTopTours,
  GetMonthlyPlan,
  getToursWithin,
  getDistances,
} = require("../controllers/tourControllers");
const { protect, restrictTo } = require("../controllers/authControllers");
const reviewController = require("../controllers/reviewControllers");
const reviewRoutes = require("../routes/reviewRoutes");

const router = express.Router();

// en iyi 5 f/p taneyi veren route
router
  .route("/top-five-best")
  .get(protect, restrictTo("admin"), aliasTopTours, getAllTours);

//turların istatistiklerini almak için route
router.route("/tour-stats").get(protect, restrictTo("admin"), getTourStats);

// gerçek senaryo: belirli bir yıl için her ay başlayacak olan turları al

router
  .route("/monthly-plan/:year")
  .get(protect, restrictTo("admin"), GetMonthlyPlan);

// belirli bir alan içerisinde ki turları al
router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(getToursWithin);

// turların kullanıcının konumundan ne kadar uzak olduklarını hesapla
router.route("/distances/:latlng/unit/:unit").get(getDistances);

//router için yolları tanımlama
router
  .route("/")
  .get(getAllTours)
  .post(protect, restrictTo("admin", "lead-guide"), createTour);

router.route("/:id").get(getTour).delete(deleteTour).patch(updateTour);

// nested  route tanımlama
// POST / tours / ddfndgd4s5/reviews > yeni tur ekle
// GET / tours / 213dfdf / reviews > bir tura ait yorumları ver
// GET / tours / 213dfdf / reviews/ 1261dfg > bir yorumun bilgilerini al

router.use("/:tourId/reviews", reviewRoutes);

module.exports = router;
