const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const filterObj = require("../utils/filterObj");
const factory = require("./handlerFactory");
const multer = require("multer");
const sharp = require("sharp");

// medyayı sunucuya yüklemek için ayarları yap
// const multerStorage = multer.diskStorage({
//   // yüklenecek klasör belirlendi
//   destination: function (req, file, cb) {
//     cb(null, "public/img/user");
//   },
//   // dosya ismi belirlendi
//   filename: function (req, res, cb) {
//     const ext = file.mimetype.split("/")[1]; // jpg
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

// medyayı buffer veri tipinde memoryde tutan storage oluşturalım
const multerStorage = multer.memoryStorage();

// kullanıcı profil fotoğrafı olarak sadece resim tipinde medyaları kabul edecek filtre tanımlama
const multerFilter = (req, file, cb) => {
  // eğer ki dosya tipi "image" kelimesi ile başlıyorsa
  if (file.mimetype.startsWith("image")) {
    // yüklemeye izin ver
    cb(null, true);
  } else {
    cb(
      new AppError("Sadece resim tipinde dosya yükleyebilirsiniz", 400),
      false
    );
  }
};

// multer methoduna hedef klasörü verip tanımlarız
// bu da geriye belirlenen klasöre medya yüklemeye yarayan method döndürür
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// dosya yükler
exports.uploadUserPhoto = upload.single("photo");

// kullanıcı 4k 30mb bir fotoğrfı profile fotoğrafı yapmaya çalışabilir.
// projeler içserinsnde profil fotoğrafları genelde 40x40 veya 80x80 boyutlarda kullanılır ama kullanıcı fotoğraf seçerken 2500x1080 gibi yüksek kalite bir
// fotoğrafı seçebilir ve  herhangi bir işlemden geçirmeden sunucuya bu fotoyu kaydetmek gereksiz alan kaplar. Bu yüzden yüklenecek olan bütün profil
//fotoğrafların çözünürlüğü projede kullanılacak max boyuta indireceğiz. Bu da ort her foto için 3-10mb > 30-50kb indermek anlamına gelecek.
exports.resize = (req, res, next) => {
  // eğer dosya yoksa yeniden boyutlandırma yapma sonraki adıma geç
  if (!req.file) return next();

  // diske kaydedilecek dosya ismini oluştur
  const filename = `/user-${req.user.id}-${Date.now()}.jpeg`;

  // işlemden geçir
  sharp(req.file.buffer)
    .resize(500, 500) // boyutu belirlirle
    .toFormat("jpeg") // veri formatını belirle
    .jpeg({ quality: 30 }) // kaltiyei belirle
    .toFile(`public/img/users/${filename}`); // dosyanın kaydedileceği adresi tanımla

  // sonraki adıma geç
  next();
};

// kullanıcının keni hesabını güncellemesini sağlar
exports.updateMe = async (req, res, next) => {
  // 1 şifreyi güncellemeye çalışırsa hata ver
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError("şifre bu route ile günceleyemzsiniz", 400));
  }

  //2  isteğin body kısmında güncellemesine izin verilen değerleri al
  const filterBody = filterObj(req.body, "name", "mail");

  // eğer ki fotoğrafsa varsa kayıt edilecek veriler arasına ekle
  if (req.file) filterBody.photo = req.file.filename;

  const updateUser = await User.findByIdAndUpdate(req.user.id, filterBody, {
    new: true,
  });

  // 3 kullanıcının belirli bilgilerini güncelle
  res
    .status(200)
    .json({ message: "kullanıcı başarıyla güncellendi", user: updateUser });
};

//kullanıcının kendi hesabını kapatması  // TEKRAR BAK
exports.deleteMe = async (req, res, next) => {
  // kullanıcının active değerini false çek
  User.findOneAndUpdate(req.user.id, { active: false });

  res.status(200).json({ message: "hesap devre dışı bırakıldı" });
};

// admin yapabilir, bütün kullanıcıları al
exports.getAllUsers = factory.getAll(User);

// admin yapabilir yeni kullanıcı oluştur
exports.createUser = factory.createOne(User);

// kullanıcının hesap bilgilerini al
exports.getUser = factory.getOne(User);

// adminin kullanıcıyı güncellemesi için
exports.updateUser = factory.updateOne(User);

// adminin kullanıcı tamamen kaldırması için bir toute
exports.deleteUser = factory.deleteOne(User);
