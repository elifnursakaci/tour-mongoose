const express = require("express");
var morgan = require("morgan");
const tourRouter = require("./routes/tourRouter");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const AppError = require("./utils/appError");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const xss = require("xss-clean");
const multer = require("multer");

const app = express();

app.use(helmet());

//istek detaylaını konsola yazan middleware

app.use(morgan("dev"));

// bir ip adresinden belirli süre içerisinde gelecek olan istekleri sınıtla
// rete limit uygula
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 100, // aynı ip adresinden gelecek max istek sınırı
  message: {
    statusCode: 429,
    message: "Rate limit exceeded",
  },
});

//middleware i api route ları için tanıtma
app.use(limiter);

app.use(express.json({ limit: "100kb", message: " Rate limit exceeded" }));

// verileri sterelize etme
app.use(mongoSanitize());

// html kodunun içerisin de saklanan js yi tespit eder ve bozar
app.use(xss());
//tour ve user routelarını projeye tanıtma

// parametre kirliliğini önler
app.use(hpp({ whitelist: ["duration", "ratingsQuality"] }));

app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);

// tanımlanmayan bir route istek atıldığında hata ver

app.all("*", (req, res, next) => {
  // hata detaylarını belirle
  //const erorr = new Error("tanımlanmayan bir route istek atıldı");
  //   erorr.statusCode = 404;
  //   erorr.status = "Fail";

  const erorr = new AppError("tanımlanmayan bir route istek atıldı", 404);

  next(erorr);
});

// hata old devreye giren bir middleware
// hata bilgilerini alır ve cevap olarak gönderir
app.use((err, req, res, next) => {
  console.log(err.stack);

  //eğer durum kodu veya durum değerlei gönderilmediğinde varsayılan değerler devreye girsin
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "erorr";
  err.message = err.message || "üzgünüz bir hata oluştu";

  // cevap gönder
  res.status(err.statusCode).json({
    message: err.message,
    status: err.status,
  });
});

module.exports = app;
