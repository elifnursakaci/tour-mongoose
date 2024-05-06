const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const sendMailer = require("../utils/email");
const crypto = require("crypto");

const signToken = (user_id) => {
  return jwt.sign({ id: user_id }, process.env.JWT_KEY, {
    expiresIn: "90d",
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // jwt tokeni oluştur
  const token = signToken(newUser._id);

  console.log("YENİ TOKENN>>>>>", token);

  res.status(201).json({
    message: "Hesabınız başarıyla oluşturuldu",
    data: newUser,
    token: token,
  });
});

// token oluştur gönder
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  //tokeni sadece http üzerinde seyehat eden çerezler üzerinden gönder
  res.cookie("jwt", token, {
    expires: new Date(Date.now() + 90 * 24 * 60 * 1000),
    httpOnly: true,
    // secure: true,
  });
  user.password = undefined;
  res.status(statusCode).json({
    message: "oturum oluşturuldu",
    data: user,
  });
};

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) Email ve şifre düzgün mü kontrol et
  if (!email || !password) {
    return next(new AppError("Lütfen mail ve şifrenizi giriniz", 401));
  }

  //2) Gönderilen emailde kullanıcı var mı kontrol et
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(
      new AppError("Girdiğiniz mail adresine sahip bir kullanıcı yoktur", 404)
    );
  }

  //3) Şifresi doğru mu kontrol et
  // Veri tabanında saklanan hashlenmiş şifre ile kullanıcnı girdiği normal şifreyi katşılaştırır
  const isValid = await user.correctPass(password, user.password);

  if (!isValid) {
    return next(new AppError("Girdiğiniz şifre hatalı", 400));
  }

  //4) Her şey tamamsa JWT tokenini oluştur ve gönder
  const token = signToken(user._id);

  res.status(200).json({ message: "Hesaba giriş yapıldı", data: user, token });
});

//kullanıcının tokeni üzerinden token geçerliliği doğrulayıp ardından geçerliyse
// ve rolü uygunsa route erişime izin verecek aksi tak
exports.protect = async (req, res, next) => {
  // token al ve tanımlı geldiğinden emin ol
  let token = req.headers.authorization;
  if (token && token.startswith("Bearer")) {
    //tokenin bearer kelimesinden sonra kı kısmı al
    token = token.split(" ")[1];
  }
  if (!token) {
    return next(
      new AppError(
        "hizmete erişmek için tokeninizi gönderiniz,bu iş için yetkiniz yoktur",
        403
      )
    );
  }

  // tokenin  geçerliliğini doğrula
  //jwt.verify(token, process.env);

  let decoded;
  try {
    decoded = jwt.verify(token, process.JWT_SECRET);
  } catch (error) {
    // incalid signature >> üzerin de oynama yapılmış token anlamına geliyor
    // jwt expired >> süresi geçmiş bir token
    if (error.message === "jwt expired") {
      return next(
        new AppError(
          "oturumunuzun süresi doldu, Lütfen tekrar giriş yapınız",
          403
        )
      );
    } else {
      return next(new AppError("gönderdiğiniz token geçersiz", 403));
    }
  }
  console.log(decoded.id);
  // kullanıcının hesabı duruyor mu kontrol et
  const activeUser = await User.findById(decoded.id);

  if (!activeUser) {
    return next(new AppError("Kullanıcının hesabına artık erişilemiyor", 403));
  }

  // tokeni verdikten sonra şifresini değiştirdi mi kontrol et
  if (activeUser.constrolPassDate(decoded.iat)) {
    return next(
      new AppError(
        "Yakın zaman da şifrenizi değiştirdiniz. Lütfen tekrar giriş yapını",
        403
      )
    );
  }
  console.log(isValid);
  //bir sonra ki aşamaya aktif kullanıcının bilgilerini aktar
  req.user = activeUser;
  next();
};

// restrictTo("admin");
// restrictTo("user", "guide");
// restrictTo("user", "guide", "lead-guid");

// parametre olarak gelen rolde ki kullanıcıların route a erişmesini engelleyrn middleware
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // kullanıcının rolü geçerli roller arasında yok mu kontrol et , yoksa erişimi engelle

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "Bu işi yapabilmek için yetkiniz yoktur(role yetersiz)",
          403
        )
      );
    }
    console.log(roles);
    console.log("aktif kullanıcı", req.user.role);

    // kullanıcının rolü geçerli roller arasında varsa erişime izin ver
    next();
  };

// 1- kullanıcı şifresini unuttuysa
// a) epostasına şifre sıfırlama bağlantısı gönder
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1- epostaya göre kullanıcının hesabına eriş
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(
      new AppError("Girdiğiniz mail adresine sahip bir kullanıcı yoktur", 404)
    );
  }
  // 2- şifre sıfırlama tokeni oluştur
  const resetToken = user.createPasswordResetToken();

  // 3- veritabanına okenin şifrelenmiş halini sakla
  //  şifre alanını gönderdiğimiz için doğrlamaları devre dışı bıraktık
  await user.save({ validateBeforeSave: false });

  // 4- kullanıcı mailine tokeni link ile gönder

  try {
    const link = `http://${req.headers.host}/api/v1/users/reset-password/${resetToken}`;

    await sendMailer({
      email: user.email,
      subject: "şifre sıfırlama tokeni (10 dakika)",
      text: resetToken,
      html: `<h1>şifre sıfırlama linki</h1>
      <p>${user.email} hesabı için </p>
      <a href="${link}">şifre sıfırlama bağlantısı :${link} </a>
      `,
    });
  } catch (error) {
    //mail atılamazzsa vt ye kayıt edilen değerleri kaldır
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        "Şifre sıfırlama bağlantısı gönderilemedi. Lütfen tekrar deneyiniz",
        500
      )
    );
  }
  // cevap gönder
  res.status(200).json({
    message:
      "db ye tokenin şifrelenmiş hali kaydedildi ve maile Şifre sıfırlama bağlantısı gönderildi",
  });

  res.status(200).json({ message: "db ye şifrelenmiş hali kaydedildi" });
});

// b) kullanıcının yeni şifresini kaydet
exports.resetPassword = async (req, res, next) => {
  // 1- token den yola çıkarak kullanıcıyı bul
  const token = req.params.token;
  // a- elimizde mormal token var ve vt de hashlenmiş hali kayıt edildiği içi kullanıcıya erişmek için tokeni hashleriz
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // b- hashlenmiş token değerine sahipkullanıcıyı al. Son geçerlilik tariihi henüz dolmamış olmasını kontrol et
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // Token geçersiz veya süresi dolmuş ise uyarı gönder
  if (!user) {
    return next(new AppError("Token geçersiz veya süresi dolmuş", 400));
  }

  // 2- kullanıcı bulunduysa ve token tarihi geçmemişse yeni şifreyi belirle
  // 3- kullanıcının şifre değiştirme tarihini güncelle
  user.password = re.body.password;
  user.passwordConfirm = re.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return res.status(200).json({ message: "yeni şifre belirlendi" });
};

// 2- kullanıcı şifresini biliyorsa ama değiştirmek istiyorsa
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1 - kullanıcıyı al
  const user = await User.findById(req.user._id).select("+password");

  // 2 - gelen şifre doğru mu kontrol et
  if (!(await user.correctPass(req.currentPassword, user.password))) {
    return next(new AppError("Şifre yanlış", 400));
  }

  // 3 - doğru ise şifreyi güncelle
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPassword;
  await user.save();

  res.status(200).json({ message: "şifre güncellendi" });

  // 4 -  yeni jwt tokeni oluştur ve gönder // BU KISMA TEKRAR BAK
  createSendToken(user, 200, res);
});
