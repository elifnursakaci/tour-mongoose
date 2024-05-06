// bir fonk parametre olarak alır
// fonksiyonu çalıştırır
// hata oluşursa hata middleware ine yönlendirir
// bütün asnyc fonksiyonlarını bu fonksiyon ile sarmalayacağız

module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
