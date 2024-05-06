const Tour = require("../models/tourModel");
const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");

// Alias Route()
exports.aliasTopTours = (req, res, next) => {
  //get all toursun en iyi beş tanesinş vermesi için gerekli arametrelieri ekledik.
  req.query.sort = "-ratingsAvarage,price";
  req.query.limit = 5;
  req.query.fields = "name,price,ratingsAvarage,difficulty";

  //bir sonra ki adım olan getAllTours un çalışmasını söyledik
  next();
};

// istatislikleri hesaplar
exports.getTourStats = async (req, res, next) => {
  console.log("asdasd");
  try {
    //agregation pipline (raporlama adımları)

    const stats = await Tour.aggregate([
      // rating 4 ve üstü olanları al
      {
        $match: { ratingsAverage: { $gte: 3.0 } },
      },
      // zorluklarına göre grupladır ve ortalama değerlerini hesapla
      {
        $group: {
          _id: "$difficulty",

          elemanSayisi: { $sum: 1 }, // döküman sayısı kadar toplama yapar
          avgRating: { $avg: "$ratingsAverage" },
          avgPrice: { $avg: "$price" }, //fiyat ortalaması alır
          minPrice: { $min: "$price" }, // min fiyat ort
          maxPrice: { $max: "$price" }, // max fiyat ort
        },
      },
      // gruplanan veriyi fiyatlarına göre artan sırala
      {
        $sort: { avgPrice: 1 }, // artan sıralama istersek 1 yazarız azalan -1 yazılır
      },
      //fiyatı 400 den küçük olanları kaldır
      {
        $match: { minPrice: { $gte: 400 } },
      },
    ]);
    res.status(200).json({
      message: "stats",
      data: stats,
    });
  } catch (err) {
    return next(new AppError("istatistik oluşturulurken hata oluştu", 400));
  }
};

// aylık planı hesaplar
exports.GetMonthlyPlan = catchAsync(async (req, res, next) => {
  // parametre olarak gelen yılı al
  const year = Number(req.params.year);
  //console.log(year);
  //raporlama adımları

  const plan = await Tour.aggregate([
    // 1 : turların başlangıç tarihlerini böl her turun bir tarihi olsun
    { $unwind: "$startDates" },
    // 2 : belirli bir yıldan sonra başlayanları al
    {
      $match: {
        startDate: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },

    // 3: turları aylara göre gruplandırma
    {
      $group: {
        _id: { $month: "$startDates" }, //aylara göre grupla
        numTourStrats: { $sum: 1 }, // her ay başlayan tur sayısını hesapla
        tours: { $push: "$name" }, //her turun ismini diziye aktar
      },
    },
    // 4: raporda ki nesnelere ay elemanı ekle
    {
      $addFields: { month: "$_id" },
    },
    // 5 : raporda ki nesnelerden eleman çıkarma
    {
      $project: { _id: 0 },
    },
    // 6: aylara göre artan sıralama
    {
      $sort: { month: 1 },
    },
  ]);

  res.status(200).json({
    message: "Monthly Plan başarıyla oluşturuldu",
    data: plan,
  });
});

//bütün turları alır
exports.getAllTours = factory.getAll(Tour);

//yeni bir tur oluştur
exports.createTour = factory.createOne(Tour);

//sadece bir tur alır
exports.getTour = factory.getOne(Tour, "reviews");

//bir turu günceller
exports.updateTour = factory.updateOne(Tour);

//bir tur kaldırır
exports.deleteTour = factory.deleteOne(Tour);

// sınırlar içerisinde kiturları al
exports.getToursWithin = async (req, res, next) => {
  const { latlng, distance, unit } = req.params;

  // ENLEM ve BOYLAMI değişkenlere aktar
  const [lat, lng] = latlng.split(",");

  // gelen unite göre YARIÇAPI hesapla
  const radius = unit == "mi" ? distance / 3963.2 : distance / 6378.1;

  // merkez noktası gönderilmediyse hata ver
  if (!lat || !lng) return next(new AppError("Lütfen merkezi tanımlayın"));

  // sınırlar içerisndeki turları al
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lat, lng], radius] } },
  });

  // cevap gönder
  res.status(200).json({
    message: "Verilen sınırlar içersindeki turlar bulundu",
    tours,
  });
};

// uzaklıkları hesapla
exports.getDistances = async (req, res, next) => {
  // url deki paramlara eriş
  const { latlng, unit } = req.params;

  // enlem ve boylamı ayır
  const [lat, lng] = latlng.split(",");

  // enlem ve boylam var mı kontrol et
  if (!lat || !lng)
    return next(new AppError("Lütfen geçerli enlem ve boylam verin"));

  // unite göre multipleri hesapla
  const multiplier = unit == "mi" ? 0.000621371 : 0.001;

  // turların kullanıcının konumundan uzaklıklarını hesapla
  const distances = await Tour.aggregate([
    // 1- merkez noktayı verip turların o konumdan uzaklıklarını hesapla
    {
      $geoNear: {
        near: { type: "Point", coordinates: [+lng, +lat] },
        distanceField: "distance",
        distanceMultiplier: multiplier, // metre cevabını istenen formata çevirmek için çarp
      },
    },
    // 2- nerneden istediğimiz değerleri çekme
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  // cevap gönder
  res.status(200).json({
    message:
      "Verilen sınırlar içersindeki turlar bulundu ve konuma uzaklıkları hesaplandı",
    data: distances,
  });
};
