// filtrelenecek nesneyi ve nesnede izin verdiğimiz alanları gönderiyoruzs
// bu method ise nesneden sadece verdiğimiz alanları alarak yeni bir nesne oluşturuyoruz
const filterObj = (obj, ...allowedField) => {
  const newObj = {};

  Object.keys(obj).forEach((el) => {
    if (allowedField.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

module.exports = filterObj;
