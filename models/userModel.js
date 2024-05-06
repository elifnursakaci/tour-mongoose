const { Schema, model } = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// kullanıcı şemasını oluştur
const userSchema = new Schema({
  name: {
    type: String,
    required: [true, "Lütfen isminizi giriniz"],
  },

  email: {
    type: String,
    required: [true, "Lütfen mail giriniz"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Lütfen geçerli bir email giriniz"],
  },

  photo: {
    type: String,
    default: "defaultpic.webp",
  },

  password: {
    type: String,
    required: [true, "Lütfen şifre giriniz"],
    minLength: [8, "Şifre en az 8 karakter içermeli"],
    validate: [validator.isStrongPassword, "Şifreniz yeteince güçlü değil"],
    select: false,
  },

  passwordConfirm: {
    type: String,
    required: [true, "Lütfen şifre onayını giriniz"],
    validate: {
      validator: function (value) {
        return value == this.password;
      },
      message: "Onay şifreniz eşleşmiyor",
    },
  },

  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },

  active: {
    type: Boolean,
    default: true,
    select: false,
  },

  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
});

userSchema.pre("save", async function (next) {
  // daha önce şifre hashlendiyse bu fonk çalışsın
  if (!this.isModified("password")) return next();

  // şifreyi hash ve saltla
  this.password = await bcrypt.hash(this.password, 12);

  // Onay şifresini kaldır
  this.passwordConfirm = undefined;
});

// todo şifre değişince tarihi güncelle
userSchema.pre("save", async function (next) {
  // eğer şifre değişmediyse veya döküman yeni oluşturulduysa bir şey yapma
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangeIt = Date.now() - 1000;
  next();
});

// kullanıcı vt alınmaya çalışıldığın da hesap inactive ise erişime engelle
userSchema.pre(/^find/, async function (next) {
  // bundan sonra ki işlemde olan sorguda active olmayanları
  this.find({ active: { $ne: false } });

  next();
});

// Hashlenmiş şifre ile normal şifreyi karşılaştırma özelliğini bir method olarak tanımla
// tanımlanan bu method sadece user belgeleri üzerinden erişilebilir
userSchema.methods.correctPass = async function (candidatePass, userPass) {
  return await bcrypt.compare(candidatePass, userPass);
};

// jwt oluşturlma tarihinden sonra şifre değiştirilimiş mi kontrol et
userSchema.methods.controlPassDate = function (JWTTime) {
  if (JWTTime) {
    // şifre değiştirme tarihini saniye formatına çevirme
    const changeTime = parseInt(this.passwordChangedAt.getTime() / 1000);

    return JWTTime < changeTime;
  }

  return false;
};

// hashlenmiş şifre ile normla şifre karşılaştırma özelliğini bir method olarak tanımlayalım
// tanımladığımız bu method sadece user belgeri tarafında erişilebilir
userSchema.methods.correctPass = async function (candidatePass, userPass) {
  return await bcrypt.compare(candidatePass, userPass);
};

// JWT oluşturulma tarihinden sonra verilen tarihten sonra şifre değiştirilmiş mi kontrol et
userSchema.methods.controlPassDate = function (JWTTime) {
  if (this.passwordChangedAt && JWTTime) {
    // şifre değiştirme tarihini saniye formatına çevirme
    const changeTime = parseInt(this.passwordChangedAt.getTime() / 1000);
    // jwt şifre sıfırlandıktan önce mi olmuş
    return JWTTime < changeTime;
  }
};

//şifre sıfırlama tokeni oluştur
// bu token daha sonra kullanıcı mailine gönderilecek ve kullanıcı şifresini
// sıfırlarken kimliğini doğrulama amaçlı bu tokeni kullanacak
//  dakika geçerlilik süresi olacak

userSchema.methods.createPasswordResetToken = function () {
  //1- 32 bytlik rastgele veri oluşturur ve onu hexadecimal bir diziye dönüştürür
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 2- tokeni hashle ve verinin içerisine kaydet
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 3- tokenin son geçerlilik tarihini kullanıcının dökümanına ekle
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // tokenin normal halini return et
  return resetToken;
};

// kullanıcı modelini oluştur
// eğer jwt verilme tarihi şifre sıfırlama tarihinden küçükse, şifre değiştirme tarihi ileri tarihlidir ve ortada sorun vardır bu yüzden true döndürür
// jwt verilme tarihi şifre sıfırlama tarihinden büyükse jwt false döndürür

const User = model("User", userSchema);

module.exports = User;
