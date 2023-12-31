var express = require('express');
var router = express.Router();
var db = require('../db');
var multer = require('multer');

// 도서 이미지 업로드 함수
var upload = multer({
    storage:multer.diskStorage({
        destination:(req, file, done) => {
            done(null, './public/upload/book')
        },
        filename:(req, file, done) => {
            var fileName = Date.now() + ".jpg";
            done(null, fileName);
        }
    })
});

/* 도서검색 search.ejs */
router.get('/', function(req, res, next) {
    res.render('index', {title:'도서검색', pageName:'books/search.ejs'});
});

// 도서검색 결과저장 search.ejs (도서등록 버튼)
router.post('/search/insert', function(req, res){
    const title=req.body.title;
    const authors=req.body.authors;
    const price=req.body.price;
    const publisher=req.body.publisher;
    const image=req.body.thumbnail;
    const contents=req.body.contents;
    const isbn=req.body.isbn;
    //console.log(title, authors, price, publisher, image, contents);

    const sql1='select * from books where isbn=?';
    db.get().query(sql1, [isbn], function(err, rows){
        if(err) console.log('isbn검색:', err);
        if(rows.length > 0) { //이미도서가 등록된 경우
            res.send('1');
        }else{ //도서가 없는 경우
            const sql='insert into books(title, authors, price, publisher, image, contents, isbn) values(?, ?, ?, ?, ?, ?, ?)';
            db.get().query(sql, [title, authors, price, publisher, image, contents, isbn], function(err){
                if(err) console.log('도서저장:', err);
                res.send('0');
            });
        }
    });
});

// 도서목록 가져오기 (JSON data) book / list.ejs
router.get('/list.json', function(req, res){
    const page = req.query.page;
    const start = (parseInt(page)-1) * 5;
    const key = req.query.key;
    const query = `%${req.query.query}%`;
    const sql = `select * from books where ${key} like ? order by bid desc limit ?,5`;
    db.get().query(sql, [query, start], function(err, rows) {
        if(err) console.log('도서목록JSON:', err);
        res.send(rows);
    });
});
 
// 도서목록 페이지로 이동하기 book / list.ejs
router.get('/list', function(req, res) {
    res.render('index', {title:'도서목록', pageName:'books/list.ejs'})
});

// 데이터 갯수 book / list.ejs (검색한 개수 출력)
router.get('/count', function(req, res) {
    const key = req.query.key;
    const query = `%${req.query.query}%`;
    const sql = `select count(*) total from books where ${key} like ?`;
    db.get().query(sql, [query], function(err, rows){
        res.send(rows[0]);
    });
});

// 도서삭제 book / list.ejs (선택삭제)
router.post('/delete', function(req, res) {
    const bid = req.body.bid;
    const sql = 'delete from books where bid=?'
    db.get().query(sql, [bid], function(err) {
        if(err) console.log('도서삭제......', err);
        res.sendStatus(200);
    });
});

// 도서정보페이지 이동 (관리자)
router.get('/read', function(req, res) {
    const bid = req.query.bid;
    const sql = 'SELECT *, FORMAT(price, 0) fmtprice, DATE_FORMAT(regdate, "%Y-%m-%d") fmtdate FROM books WHERE bid = ?';
    db.get().query(sql, [bid], function(err, rows){
        res.render('index', {title:'도서정보', pageName:'books/read.ejs', book:rows[0]});
    });
});

// 도서수정 페이지 이동 book / update.ejs
router.get('/update', function(req, res) {
    const bid = req.query.bid;
    const sql = 'SELECT *, FORMAT(price, 0) fmtprice, DATE_FORMAT(regdate, "%Y-%m-%d") fmtdate FROM books WHERE bid = ?';
    db.get().query(sql, [bid], function(err, rows) {
        res.render('index', { title: '도서수정', pageName: 'books/update.ejs', book: rows[0] });
    });
});

// 도서정보 수정(submit) book / update.ejs
router.post('/update', function(req, res) {
const bid = req.body.bid;
const title = req.body.title;
const price = req.body.price;
const authors = req.body.authors;
const publisher = req.body.publisher;
const contents = req.body.contents;
//console.log(bid, title, price, authors, publisher, contents);

const sql = 'update books set title=?, price=?, authors=?, publisher=?, contents=? where bid=?';
db.get().query(sql, [title, price, authors, publisher, contents, bid], function(err) {
    if(err) console.log('수정오류///', err);
    res.redirect('/books/read?bid=' + bid);
});
});

// 이미지 업로드 (도서정보) book / read.ejs
router.post('/upload', upload.single('file'), function(req, res){
    if(req.file) {
        const bid = req.body.bid;
        //console.log('파일이름:' , req.file.filename, bid);
        const image = '/upload/book/' + req.file.filename;
        const sql = 'update books set image = ? where bid = ?';
        db.get().query(sql, [image, bid], function(err){
            if(err) console.log('이미지 업로드 오류', err);
            res.redirect('/books/read?bid=' + bid);
        });
    }
});
 
// 도서정보 페이지 이동 (사용자)
router.get('/info', function(req, res){
    const bid = req.query.bid;
    const sql = 'SELECT *, FORMAT(price, 0)fmtprice, date_format(regdate, "%Y-%m-%d") fmtdate from books where bid=?;';
    db.get().query(sql, [bid], function(err, rows){
       res.render('index', {title:'도서정보', pageName:'books/info.ejs', book:rows[0]});
    });    
});


// 좋아요 추가 (하트) - home->info
router.post('/like/insert', function(req, res){
    const uid = req.body.uid;
    const bid = req.body.bid;
    const sql = 'insert into favorite(uid,bid) values(?, ?)';
    db.get().query(sql, [uid, bid], function(err){
        res.sendStatus(200);
    });
});

// 좋아요 취소 (하트) - home->info
router.get('/like/delete', function(req, res){
    const uid = req.query.uid;
    const bid = req.query.bid; 
    const sql = 'delete from favorite where bid=? and uid=?';
    db.get().query(sql, [bid, uid], function(err){
        res.sendStatus(200);
    });
})

// 좋아요수 체크 - home->info
router.get('/like/check', function(req, res){
    const uid = req.query.uid;
    const bid = req.query.bid;
    let sql = 'select count(*) fcnt, (select count(*) from favorite where bid=? and uid=?) ucnt from favorite where bid=?'
    db.get().query(sql, [bid, uid, bid], function(err, rows){
        res.send(rows[0]);
    });
});


module.exports = router;
