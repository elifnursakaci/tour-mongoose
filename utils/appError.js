// js deki yerleşik hata classının bütün özelliklerine sahip olacağız ama ekstra özelliklere ve parametrelere
// sahip olan gelişmiş versiyon oluşturulacak

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;

    // durum koduna göre status değerini belirle: 4xx şeklindeyse fail 5xx şeklindeyse error olmalı
    this.status = String(this.statusCode).startsWith("4") ? "fail" : "error";

    // hatanın detayı ve hata oluşana kadar çalışan dosyaların bilgisini al
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
