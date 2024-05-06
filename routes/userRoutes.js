const express = require("express");
const userController = require("../controllers/userControllers");
const authController = require("../controllers/authControllers");
const router = express.Router();

// kullanıcıların kayıt olması için
router.post("/signup", authController.signup);

// kullanıcıların var olan hesaba giriş yapması için
router.post("/login", authController.login);

// kullanıcı şifreesini unuttuysa
router.post("/forgot-password", authController.forgotPassword);

//bu satırdan sonra ki ...
router.use(authController.protect);

// şifreyi güncellemek isitoyrsa
router.patch(
  "/update-password",

  authController.updatePassword
);

// epostasına gönderilen linke istek atınca
router.patch("/reset-password/:token", authController.resetPassword);

// hesabını güncellemek isteyince
router.patch(
  "/update-me",
  userController.uploadUserPhoto,
  userController.resize,
  userController.updateMe
);

// hesabını silmek isteyince
router.delete("/delete-me", userController.deleteMe);

//genellikle adminlerin kullandığı
router
  .route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUser)
  .put(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
