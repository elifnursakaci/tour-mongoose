const fs = require("fs");
const Tour = require("../../models/tourModel");
const User = require("../../models/userModel");
const mongoose = require("mongoose");
const Review = require("../../models/reviewModel");
require("dotenv").config({ path: "./config.env" });

// mongodb veritabanı ile bağlantı sağla
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("Veritabanı ile bağlantı kuruldu"))
  .catch((err) =>
    console.log("HATA!! Veritabanına bağlanırken sorun oluştu", err)
  );

// process.argv: node'da çalışan  komut satırının argümanlarını dizi şeklinde içeren bir nesnedir

// turlar dosyasındaki verileri oku
let tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`));
let users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`));
let reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`));

// js formatına çevir

//! dosyayadan verileri alıp kollkeisyona aktarırır
const importData = async () => {
  try {
    await Tour.create(tours, { validateBeforeSave: false });
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews, { validateBeforeSave: false });
    console.log("Bütün Veriler Aktarıldı");
  } catch (err) {
    console.log("Bir hata oluştu", err);
  }

  process.exit();
};

//! kolleksiyondaki bütün verileri temizler
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log("Bütün veriler silindi");
  } catch (err) {
    console.log("Bir hata oluştu");
  }

  process.exit();
};

// çalıştırlan komuttaki argümanlara göre yaplıcak olan işlemi belirle
if (process.argv.includes("--import")) {
  importData();
} else if (process.argv.includes("--delete")) {
  deleteData();
}
