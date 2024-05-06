const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const app = require("./app");

//mongoDB database connection

mongoose
  .connect("mongodb://localhost:27017/TourDB")

  .then(() => console.log("Veritabanı ile bağlantı kuruldu"))

  .catch((err) =>
    console.log("HATA!! Veritabanına bağlanırken sorun oluştu", err)
  );

app.listen(4003, () => {
  console.log("Server Başlatıldı");
});
