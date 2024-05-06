const { Schema, model, Mongoose } = require("mongoose");
const validator = require("validator");

// şema oluşturulacak
// veri tabanına eklenecek dökümanın hangi değerlere ve hangi tipteki verilere sahip olmasını belirleriz.

const tourSchema = new Schema(
  {
    name: {
      type: String,
      unique: [true, "isim değeri benzersiz olmalı"],
      required: [true, "isim alanı zorunludur"],
      minLength: [10, " tur ismi en az 10 karakter olmalıdır"],
      maxLength: [50, "tur ismi en fazla 50 karakter olmalıdır"],
      //validator kütüphanesinde ki doğrulama fonk. kullandık
      validate: [validator.isAlpha, " isim sadece alfabetik karakter içersin"],
    },
    duration: {
      type: Number,
      required: [true, "duration zorunludur"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "maxGroupSize zorunludur"],
    },
    difficulty: {
      type: String,
      required: [true, "difficulty zorunludur"],
      enum: {
        values: ["easy", "medium", "difficulty"],
        message: "zorluk derecesi geçerli değil",
      },
    },
    raitingAverage: {
      type: Number,
      default: 0, // yeni tur oluşturulurken ratingi söylemesek de 4 olarak kayıt edilecek
    },
    raitingQuantity: {
      type: Number,
      default: 4.0, // yeni tur oluşturulurken ratingi söylemesek de 4 olarak kayıt edilecek
    },
    price: {
      type: Number,
      required: [true, "tur mutlaka fiyat değerine sahip olmalıdır"],
    },
    priceDiscount: {
      type: Number,
      // custom validator(kendi yazdığımız doğrulayıcılar)
      // indirim değeri fiyattan düşükse geçerli değilse geçersizdir.
      // validate: function (value) {
      //   return value < this.price;
      // },

      validate: {
        validator: function (value) {
          return value < this.price;
        },
        message: "indirim fiyatı asıl fiyattan yüksek olmaz",
      },
    },
    summary: {
      type: String,
      trim: true, //kayıt edilen verinin baş ve sonunda ki gereksiz boşlukları siler
      maxLength: 1000,
      required: [true, "summary zorunludur"],
    },
    description: {
      type: String,
      trim: true, //kayıt edilen verinin baş ve sonunda ki gereksiz boşlukları siler
      maxLength: 2000,
    },
    imageCover: {
      type: String,
      required: [true, "imageCover zorunludur"],
    },
    images: [String], // metinlerden oluşan bir dizi

    startDates: [Date], //tarihlerden oluşan bir dizi

    hour: Number,

    createdAt: {
      type: Date,
      default: Date.now, //varsayılan olarak bugünün tarihini ekle
    },
    // başlangıç noktası
    startLocation: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      description: String,
      coordinates: [Number],
      adress: String,
    },
    // uğradığı noktalar emmbeding yöntemi ile tanımlanacak
    // dizi olarak tanımlanmalı
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        description: String,
        day: Number,
      },
    ],
    // chid refferance
    // turun ilgili rehberleri kullanıcıların disisinde ki  id leri ile referans gösterilmeli
    guides: [
      {
        type: Schema.ObjectId, // referans tipin de tip her zaman  ObjectId
        ref: "User", // hangi koleksiyonda ki veriyi referans aldığımızı belirtiyoruz
      },
    ],
    // yorumların referansı
    reviews: [
      {
        type: Schema.ObjectId,
        ref: "Review",
      },
    ],
  },

  // şema ayarları (sanal değerleri aktif ettik)
  {
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

// INDEX
// index: yapılan değerler veritabanınında  belirlediğimiz yöne göre sıralanır ve bu değere göre filtreleme yapıldığında bongodb nin verileri zaten sıralı olduğu
// için bütün dökümanları kontrol etmesine gerek kalmaz, bulunan sayıda döküman incelenir
// turları alırken fiyat ve rating ortalamasına göre filtre yapan kullanıcılara artık çok daha hızlı cecap verilecek
tourSchema.index({ price: 1, raitingAverage: -1 });

// COĞRAFİ VERİ İÇİN İNDEXLEME
tourSchema.index({ startLocation: "2dsphere" });

// VIRTUAL PROPERTY (sanal değer)
// veri tabanın da tutmamıza değmeyecek ama client tarafından yapılan isteklerde göndermemiz gereken verileri veri tabanın da tutmayıp
// clienta gönderirken hesaplama işlemidir.
// normal function kullanmamızın sebebi this anahtar kelimesine erişim
// this aracılığı ile turların değerlerine erişebiliriz
// fonksiyon hesaplama sonucu return edilen veri eklenecek olan sanal değer olur
tourSchema.virtual("slug").get(function () {
  return this.name.toLowerCase().replace(/ /g, "-");
});

// Virtual populate
// normale yorumları parent refferance ile turlara bağlamıştı ama bu yüzden turları
//aldığımız zaman o tura ait olan yorumlara erişemiyoruz
tourSchema.virtual("virtualReviews ", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id",
});

// DOCUMENT MIDDLEWARE
//Middleware, iki olay arasında çalışan yapı
// ör: verinin alınıp vt ye kaydedilmesi sırasında
tourSchema.pre("find", async function (next) {
  this.hour = this.duration * 24; //veritabanına kaydedilmek üzere olan veriye yeni değer ekledik
  //sonra ki adıma geçiş izni
  next();
});

// fonksyonu sadece bir işlemden önce değil sonrada çalıştırabiliyoruz
tourSchema.post("aggregate", function (doc, next) {
  console.log("kayıt edilen döküman", doc);
  // ör : kullanıcı yeni bir rapor oluşturduktan hemen sonra bu ay rapor sayısı +1
  // ör: kullaıcı yeni bir hesap oluştururken hemen sonra mail göndermek isteyebiliriz
  // ör : kullanıcı şifresini güncellediğin de şifre değiştirme maili gönderilebilir

  next();
});

// QUERY MIDDLEWARE (sorgu arayazılımı)
//sorgulardan önce veya sonra devreye giren arayazılımlar
tourSchema.pre(/^find/, async function (next) {
  //find isteklerin de secret değeri true olanları aradan çıkar
  this.find({ secret: { $ne: true } });

  next();
});

// Popilate
// sorgulardan önce middleware populate i tanımlarız
tourSchema.pre(/^find/, function (next) {
  this.populate({
    // doldurulması gereken alan ismi
    path: "guides",
    // doldururken istemediğimiz alanlar
    select: "-__v -passwordResetToken -passwordResetExpires",
  });

  next();
});

// hiçbir rapora gizli olanları dahil etme
tourSchema.pre("aggregate", function (next) {
  //raporun ilk adımını belirle

  this.pipeline().push({ $match: { secret: { $ne: true } } });
  next();
});

//model oluşturma
// model şemada ki kısıtlamalara göre kolaksiyondan yeni veri ekleme çıkarma alma gibi işlemmleri yapmamıza olanak sağlar
const Tour = model("Tour", tourSchema);

module.exports = Tour;
