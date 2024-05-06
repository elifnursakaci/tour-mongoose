const mongoose = require("mongoose");
const Tour = require("./tourModel");

const reviewSchema = new mongoose.Schema({
  review: {
    type: String,
    required: [true, "Yorum içeriği boş olamaz"],
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: "Tour",
    required: [true, "Yorumun hangi tur için atıldığını belirtin"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Yorumun hangi kullanıcı tarfından atıldığını belirtin"],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

// yapılan sorgularda tour ve user referanslarını gerçek belgelerle doldur.
reviewSchema.pre(/^find/, function (next) {
  // user alanına populate uygular
  this.populate({
    path: "user",
    select: "name photo",
  });

  next();
});

// Bir tur için rating ortalamasını hesaplayan fonksiyon
reviewSchema.statics.calcAverage = async function (tourId) {
  // aggregate ile istatistik hesaplama
  const stats = await this.aggregate([
    // 1 - gönderilen tur id'si ile eşleşen yorumları al
    { $match: { tour: tourId } },

    // 2 -  toplam yorum sayısı ve yorumların ortlama rating değerini hesapla
    {
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 }, // toplam yorum sayısı
        avgRating: { $avg: "$rating" }, // yorumların ortlama ratingi
      },
    },
  ]);

  // eğer tura atılan yorum var ise
  // hesaplanan istatistiklerin sonuçların tur belgesine kaydet
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating,
    });
  } else {
    // eğer tura atılan yorum yoksa varsayılan değerler tanımla
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4,
      ratingsQuantity: 0,
    });
  }
};

// bütün kullanıcı ve tür kombinasyonları benzersiz olmalı
//  bir kullanıcının aynı tura ikinci yorum atmasını engellemeliyiz
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Her yeni yorum atıldığında ratingi hesapla
reviewSchema.post("save", function () {
  // turun ortlamasını hesaplayan methodu çağır
  Review.calcAverage(this.tour);
});

// Yorum silindiğinde veya güncellendiğinde ratingi tekrar hesapla
reviewSchema.post(/^findOneAnd/, function (doc) {
  Review.calcAverage(doc.tour);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
