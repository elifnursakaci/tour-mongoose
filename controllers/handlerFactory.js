const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// delete işlemini proje içerisin de sadece modelismi değiştirerek gereksiz kod tekrarı engellendi
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  });

// Güncelleme işlemi için ortak olarak kullanılacak method
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // new parametresi ile döndürlecek olan değerin dökümanın eski değil yeni değerleri olmasını istedik
    const updated = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res
      .status(200)
      .json({ message: "Belge başarıyla güncellendi", data: updated });
  });

// oluşturma işlemi için ortak olarak kullanılacak method
exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.create(req.body);

    res
      .status(200)
      .json({ message: "Belge başarıyla oluşturuldu", data: document });
  });

exports.getOne = (Model, popOptionts) =>
  catchAsync(async (req, res, next) => {
    // bir sorgu oluştur
    let query = Model.findById(req.params.id);
    // eğer populate ayarları varsa sorguya ekle
    if (popOptionts) query = query.populate(popOptionts);
    // sorguyu çalıştır
    const found = await query;
    // cevabı gönder
    res.status(200).json({ message: "Belge bulundu", data: found });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // /reviews > bütün yorumları getir
    // /tours/tur_id/reviews > bir tura atılan yorumları getir
    let filter = {};

    // eğer url de turid parametresi varsa yapılacak sorguyu bir tura ait yorumları alacak şekilde güncelle
    if (req.params.tourId) filter = { tour: req.params.tourId };

    // apiFeatures class ından örnek oluşturduk ve içerisndeki istediğimiz api özelliklerini çağırdık
    const features = new APIFeatures(Model.find(), req.query)
      .filter()
      .sort()
      .limit()
      .paginate();
    const docs = await features.query.explain();

    res.status(200).json({
      message: "Belgeler başarıyla alındı",
      results: docs.length,
      data: docs,
    });
  });
