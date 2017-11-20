var express = require('express');
var app = express.Router();

/* 接口 start*/
/* 登录检查用户是否存在 checkuser*/
app.post('/checkuser', (req, res, next) => {
  var username = req.body.username
  var password = req.body.password
  console.log('login', password)
  model.userModel.find({ username: username, password: password }, (err, docs) => {
    if (err) {
      console.log('查询失败')
      throw err
    }
    if (docs.length > 0) {
      return res.status(200).json({ errno: 0, msg: "用户名密码匹配正确" })
    }
    return res.status(200).json({ errno: 1, msg: "用户名或者密码错误" })
  })
})

app.get('/checkmobile', (req, res, next) => {
  //失去焦点的时候检查用户是不是在数据库中存在，避免重复注册
  var mobile = req.query.mobile
  model.userModel.find({ username: mobile }, (err, docs) => {
    if (err) {
      console.log('查询失败')
      throw err
    }
    if (docs.length > 0) {
      return res.status(200).json({ errno: 0, result: docs[0], msg: '该手机已被注册' })
    }
    return res.status(200).json({ errno: 1, msg: '该手机未被注册' })
  })
})

app.post('/register', (req, res, next) => {
  var mobile = req.body.mobile
  var password = req.body.password
  console.log(mobile, password)
  //注册提交时候查询用户名是不是已经被注册
  model.userModel.find({ username: mobile }, (err, docs) => {
    if (err) throw err
    if (docs.length > 0) {
      return res.status(200).json({ errno: 1, msg: '请勿重复提交，该账户已经注册' })
    } else {
      model.userModel.create({ username: mobile, password: password }, (err, result) => {
        return res.status(200).json({ errno: 0, msg: '注册成功', result: result[0] })
      })
    }
  })
})

/* 获取搜索商品 */
app.get('/search', (req, res, next) => {
  var key = req.query.key
  var arr = []
  //查找搜索关键词中包含id或者相关词汇的，则返回数组
  model.productModel.find({}, (err, docs) => {
    for (let i = 0; i < docs.length; i++) {
      if (docs[i].id.includes(key) || docs[i].goods.name.includes(key)) {
        arr.push(docs[i])
      }
    }
    console.log(docs)
    return res.status(200).json({ errno: 0, result: arr })
  })
})

/* 获取首页广告列表 */
app.get('/advList', (req, res, next) => {
  model.advModel.find({}, (err, docs) => {
    return res.status(200).json({ errno: 0, result: docs, msg: '获取广告列表成功' })
  })
})

/* 获取产品列表 */
app.get('/productList', (req, res, next) => {
  //获取当前商品类
  var category = req.query.category
  var key = req.query.key
  //获取当前页码
  var currentPage = req.query.currentPage
  var limitNum = 6
  var skipNum = (currentPage - 1) * limitNum
  var totalPage = null
  //计算该商品类的总页数
  model.productModel.find({ category: category }).count((err, num) => {
    if (err) throw err
    totalPage = Math.ceil(num / limitNum)
    model.productModel.find({ category: category }).limit(limitNum).skip(skipNum).exec((err, docs) => {
      if (err) throw err
      if (docs.length > 0) {
        return res.status(200).json({ errno: 0, result: docs, msg: '获取产品列表成功', totalPage: totalPage })
      }
      return res.status(200).json({ errno: 1, msg: '获取产品列表失败', totalPage: totalPage })
    })
  })
})

/* 获取详情 */
// db.test.find({_id:id, list: {'$elemMatch': {'aa': 1}}},{"list.$":1}).pretty()
app.get('/detail', (req, res, next) => {
  var id = req.query.id
  var type = req.query.type
  model.detailModel.find({ id: id }, (err, docs) => {
    if (err) throw err
    if (docs.length > 0) {
      return res.status(200).json({ errno: 0, result: docs[0], msg: '获取商品详情成功' })
    }
    return res.status(200).json({ errno: 1, msg: '该商品详情不存在' })
  })
})
/* 获取商品单品 */
app.get('/product', (req, res, next) => {
  var id = req.query.id
  var result = null
  model.productModel.find({ id: id }, (err, docs) => {
    //在商品列表中查询
    if (err) throw err
    result = docs[0]
    // res.status(200).json({errno:0,result:docs[0]})
    //在详情列表中查询
    model.detailModel.find({ id: id }, (err, detail) => {
      if (err) throw err
      return res.status(200).json({ errno: 0, result: result, detail: detail[0] })
    })
  })
})

/* 添加至购物车 */
app.post('/cart', (req, res, next) => {
  //查询购物车商品id，如果有则改变商品数目，如果没有，则添加至购物车
  var params = req.body
  console.log('params', params)
  var id = params.id
  console.log(id)
  model.cartModel.find({ id: id }, (err, docs) => {
    console.log('docs', docs)
    if (docs.length > 0) {
      //商品存在，则改变购物车中商品的数量 数量=前台传入值+后台查询原有数量
      var number = params.number
      console.log('数量更新', number)
      model.cartModel.update({ id: id }, { $set: { number: number } }, (err, docs) => {
        console.log(docs)
        if (err) throw err
        res.status(200).json({ errno: 0, result: docs })
      })
    } else {
      //商品不存在，则将该商品信息写入订单表
      model.cartModel.create(params, (err, docs) => {
        console.log('商品不存在，存入数据库')
        if (err) throw err
        res.status(200).json({ errno: 0, result: docs })
      })
    }
  })
})

/* 商品删除 */
app.post('/delete', (req, res, next) => {
  var id = req.body.id
  model.cartModel.remove({ id: id }, (err, docs) => {
    if (err) throw err
    res.status(200).json({ errno: 0, result: docs })
  })
})

/* 获取购物车表 */
app.get('/cart', (req, res, next) => {
  model.cartModel.find({}, (err, docs) => {
    if (err) throw err
    return res.status(200).json({ errno: 0, result: docs })
  })
})

/* 接口 end*/

module.exports = app;
