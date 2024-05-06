class APIFeatures {
  constructor(query, queryParams) {
    this.query = query;
    this.queryParams = queryParams;
  }

  // filtreleme
  filter() {
    //! filtreleme

    // url de alınan parametreler {duration: {gt:'14}, price:{lt:'500}}

    // mongoose un istediği format {duration: {$gt:'14}, price:{l$t:'500}}
    const queryObj = { ...this.queryParams };
    const excludeFields = ["sort", "limit", "page", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);

    let queryString = JSON.stringify(queryObj);

    queryString = queryString.replace(
      /\b(gte | gt |  lte | lt | ne )\b/g,
      (found) => `$${found}`
    );

    this.query = this.query.find(JSON.parse(queryString));

    return this;
  }

  // sıralama
  sort() {
    //! sıralama

    if (this.queryParams.sort) {
      const sortBy = this.queryParams.sort.split(",").join(" ");

      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  // alan limitleme
  limit() {
    //! alan limitleme
    if (this.queryParams.fields) {
      const fields = this.queryParams.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  // sayfalama
  paginate() {
    const page = Number(this.queryParams.page) || 1; //sayfa değeri 5
    const limit = Number(this.queryParams.limit) || 10; // limit 20
    const skip = (page - 1) * limit; // 5. sayfadakileri görmek için atlanılacak eleman sayısı

    //veritabanına yapılacak olan isteği güncelle
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
