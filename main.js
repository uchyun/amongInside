const express = require('express');
const app = express();
const bodyParser = require('body-parser');
require('dotenv').config();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended : true }) )
app.set('view engine', 'ejs');
const MongoClient = require('mongodb').MongoClient;
const http = require('http').createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);

let db;
MongoClient.connect('mongodb+srv://uchyun8799:tkaqh61*@uchyun.aft1coz.mongodb.net/', (err, client) => {
    if (err) return console.log(err);
    db = client.db('aminside');
    http.listen(8080, () => {
        console.log('listening to 8080 port')
    })
})

app.get('/', (req, res) => {
    res.render(__dirname + '/views/index.ejs')
})

app.get('/gallery/:id', (req, res) => {
    db.collection('gallery').findOne( { _id : parseInt(req.params.id) }, (err, data) => {
        if (err) return console.log(err);
        res.render(__dirname + '/views/detail.ejs', { data : data });
    })
})

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized : false}));
app.use(passport.initialize());
app.use(passport.session());

app.delete('/delete', (req, res) => {
    req.body._id = parseInt(req.body._id)
    db.collection('gallery').deleteOne(req.body, (err, data) => {
        res.status(200).send({ message : '성공' });
    })
})

app.get('/write', (req, res) => {
    if (req.user) {
        res.render(__dirname + '/views/write.ejs')
    } else {
        res.redirect('/profile')
    }
})

app.get('/gallery', galleryLoginTest, (req, res) => {
    db.collection('gallery').find().toArray((err, result) => {
        db.collection('member').find().toArray((err, data) => {
            revResult = result.reverse();
            res.render(__dirname + '/views/gallery.ejs', { posts : revResult, data : data, userName : req.user.이름});
        })
    })
})

function galleryLoginTest(req, res, next) {
    if (req.user) {
        next();
    } else {
        db.collection('gallery').find().toArray((err, result) => {
            db.collection('member').find().toArray((err, data) => {
                revResult = result.reverse();
                res.render(__dirname + '/views/gallery.ejs', { posts : revResult, data : data, userName : '' });
            })
        })
    }
}

app.post('/login_process', passport.authenticate('local', {
    failureRedirect : '/profile'
}), (req, res) => {
    res.redirect('/')
})
app.get('/logout', function(req, res) {
    req.logout((err) => {
        res.redirect('/profile');
    });
  });
const url = require('url');
function loginTest(req, res, next) {
    if (req.user) {
        next()
    } else {
        if (req.originalUrl == '/profile') {
            res.render('profile.ejs')
        } else {
            res.redirect('/profile')
        }
    }
}

passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true, 
    passReqToCallback: false,
  }, function (userID, userPW, done) {
    db.collection('member').findOne({ 아이디 : userID }, function (err, data) {
      if (err) return done(err)

      if (!data) return done('', false, { message: '존재하지않는 아이디' })
      if (userPW == data.비밀번호) {
        return done('', data)
      } else {
        return done('', false, { message: '잘못된 비밀번호' })
      }
    })
  }));

passport.serializeUser(function (user, done) {
  done('', user.아이디)
});

passport.deserializeUser(function (아이디, done) {
    db.collection('member').findOne({ 아이디 : 아이디 }, (err, data) => {
        done('', data)
    })
});

app.get('/music', async (req, res) => {
    try {
      const albumData = await db.collection('album').find().toArray();
      const revAlbum = albumData.reverse();
  
      const musicData = await db.collection('music').find().sort({ view: -1 }).toArray();
  
      const albumInfoPromises = [];
      for (let i = 0; i < 5; i++) {
        albumInfoPromises.push(db.collection('album').findOne({ title: musicData[i].album }));
      }
  
      const albumInfo = await Promise.all(albumInfoPromises);
  
      res.render(__dirname + '/views/music.ejs', { album: revAlbum, top: musicData, albumInfo: albumInfo });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });

app.get('/musicing', loginTest, (req, res) => {
    db.collection('member').findOne({ 아이디 : req.user.아이디 }, (err, member) => {
        if (member.tear == 'artist') {
            db.collection('member').findOne({ 이름 : req.user.이름 }, (err, data) => {
                res.render(__dirname +'/views/musicing.ejs', { data : data })
            })
        } else {
            res.redirect('/music');
        }
    })
});
let multer = require('multer');
const { reverse } = require('dns');
let storage = multer.diskStorage({
    destination : function(req, file, cb) {
        cb('', './public/upload')
    }, 
    filename : function(req, file, cb) {
        cb('', file.originalname);
    }
});
let upload = multer({ storage : storage });

app.post('/musicing/making', upload.array('upload'), (req, res) => {
    db.collection('album_counter').findOne({ name : 'totalAlbum' }, (err, totalAlbum) => {
        db.collection('album').insertOne({ albumID : totalAlbum.totalAlbum + 1, image : req.files[0].originalname, title : req.body.title, date : req.body.date, artist : req.body.artist, songNumber : req.body.songNumber, explain : req.body.explain, url : req.body.url, type : req.body.type }, (err, data) =>{
            if (err) return console.log(err);
            async function musicSave() {
                for (let i = 0; i < req.body.songNumber; i++) {
                  try {
                    const totalMusic = await db.collection('music_counter').findOne({ name: '음악 수' });
                    if (parseInt(req.body.songNumber) == 1) {
                        if (req.body['1-title'] == 'on') {
                            await db.collection('music').insertOne({ __id: totalMusic.totalMusic + 1, album: req.body.title, title: req.body.songTitle, artist : req.body.artist, titleSong : 'true', audio : req.files[i + 1].originalname, guide: req.body['1-guide'] == 'on' ? 'true' : 'false', view : 0, lyrics: req.body.lyrics});
                        } else {
                            await db.collection('music').insertOne({ __id: totalMusic.totalMusic + 1, album: req.body.title, title: req.body.songTitle, artist : req.body.artist, titleSong : 'false', audio : req.files[i + 1].originalname, guide: req.body['1-guide'] == 'on' ? 'true' : 'false', view : 0, lyrics: req.body.lyrics});
                        }
                    } else {
                        if (req.body[`${i + 1}-title`] == 'on') {
                            await db.collection('music').insertOne({ __id: totalMusic.totalMusic + 1, album: req.body.title, title: req.body.songTitle[i], artist : req.body.artist, titleSong : 'true', audio : req.files[i + 1].originalname, guide: req.body[`${i + 1}-guide`] == 'on' ? 'true' : 'false', view : 0, lyrics: req.body.lyrics[i]});
                        } else {
                            await db.collection('music').insertOne({ __id: totalMusic.totalMusic + 1, album: req.body.title, title: req.body.songTitle[i], artist : req.body.artist, titleSong : 'false', audio : req.files[i + 1].originalname, guide: req.body[`${i + 1}-guide`] == 'on' ? 'true' : 'false', view : 0, lyrics: req.body.lyrics[i]});
                        }
                    }
                    const genre = [ '랩', '힙합', '댄스', '발라드', 'R&B', 'Soul', '애니메이션', '웹툰', 'POP', 'JPOP', '뮤직테라피' ];
                    const genreName = [ 'rap', 'hiphop', 'dance', 'ballad', 'RnB', 'Soul', 'animation', 'webtoon', 'pop', 'jpop', 'musictherapi' ];
                    let genres = '';
                    for ( let j = 0; j < genre.length; j++ ) {
                        if ( req.body[genreName[j]] == 'on' ) {
                            genres = `${genres} / ${genre[j]}`
                        }
                    };
                    await db.collection('album').updateOne({ title: req.body.title }, { $set: { genre: genres.substring(2) } });
                    await db.collection('music_counter').updateOne({ name: '음악 수' }, { $inc: { totalMusic: 1 } });
                    await db.collection('album_counter').updateOne({ name: 'totalAlbum' }, { $inc: { totalAlbum: 1 } });
                    res.redirect('/music')
                  } catch (err) {
                    console.error(err);
                  }
                }
              }
              musicSave();
        })
    })
});

app.get('/album/:id', loginTest, (req, res) => {
    db.collection('member').findOne({ 아이디 : req.user.아이디 }, (err, member) => {
        if (member.tear == 'rookie') {
            res.redirect('/music')
        } else {
            db.collection('album').findOne({ albumID : parseInt(req.params.id) }, (err, result) => {
                if (err) return console.log(err);
                db.collection('music').find({ album : result.title }).toArray((err, data) => {
                    if (err) return console.log(err);
                    db.collection('member').findOne({ 이름 : result.artist }, (err, artist) => {
                        res.render('album.ejs', { music : data, album : result, artist : artist });
                    })
                })
            })
        }
    })
})

app.get('/song/:id', loginTest, (req, res) => {
    db.collection('member').findOne({ 아이디 : req.user.아이디 }, (err, member) => {
        if (member.tear == 'rookie') {
            res.redirect('/music');
        } else {
            db.collection('music').findOne({ __id : parseInt(req.params.id) }, (err, data) => {
                db.collection('album').findOne({ title : data.album }, (err, result) => {
                    db.collection('music').find({ album : result.title }).toArray((err, songs) => {
                        db.collection('music').updateOne({ __id : parseInt(req.params.id) }, { $inc : { view : 1 } });
                        res.render('song.ejs', { music : data, album : result, songs : songs })
                    })
                })
            })
        }
    })
})
app.get('/playlisting/:id', (req, res) => {
    songId = parseInt(req.params.id)
    db.collection('music').findOne({ __id : songId }, (err, data) => {
        db.collection(req.user.아이디).find().toArray((err, result) => {
            let jungbok
            for ( let i = 0; i < result.length; i++ ) {
                if (songId == result[i].songID) {
                    jungbok = true;
                }
            }
            db.collection('album').findOne({ title : data.album }, (err, album) => {
                if (jungbok) {
                    res.redirect(`/album/${album.albumID}`)
                } else {
                    db.collection(req.user.아이디).insertOne({ order : result.length + 1, albumID : parseInt(album.albumID), songID : songId, image : album.image, title : data.title, artist : album.artist, audio : data.audio, guide : data.guide }, (err, playlist) => {
                        res.redirect(`/album/${album.albumID}`)
                })
                }
            })
        })
    })
})
app.get('/profile', loginTest, (req, res) => {
    db.collection('member').findOne({ 아이디 : req.user.아이디 }, (err, data) => {
        db.collection(req.user.아이디).find().sort({ order : 1 }).toArray((err, result) => {
            let revResult = result.reverse();
            res.render('mypage.ejs', { user : req.user, member : data, music : revResult })
        })
    })
})
app.post('/mypage/edit', upload.single('changedImage'), (req, res) => {
    db.collection('member').updateOne({ 아이디 : req.body.userID }, { $set : { image : req.file.originalname } }, (err, data) => {
        res.redirect('/profile');
    })
})
app.delete('/delete_playlist', loginTest, (req, res) => {
    req.body.songID = parseInt(req.body.songID)
    db.collection(req.user.아이디).deleteOne(req.body, (err, data) => {
        res.status(200).send({ message : '성공' });
    })
})
app.post('/incview', (req, res) => {
    req.body.__id = parseInt(req.body.__id)
    db.collection('music').updateOne(req.body, { $inc : { view : 1 } })
})
app.post('/change_list', loginTest, async (req, res) => {
    console.log(req.body)
    req.body.order = parseInt(req.body.order);
    req.body.songID = parseInt(req.body.songID);
    try {
        const base = await db.collection(req.user.아이디).find().toArray();
    
        for (let i = 0; i < base.length; i++) {
          if (base[i].order > req.body.order) {
            await db.collection(req.user.아이디).updateOne({ order: base[i].order }, { $inc: { order: -1 } });
          }
        }
    
        await db.collection(req.user.아이디).updateOne({ songID: req.body.songID }, { $set: { order: base.length } });
    
        res.status(200).send({ message: '성공' });
      } catch (error) {
        console.error('오류 발생:', error);
        res.status(500).send({ message: '오류 발생' });
      }
})
app.post('/write_process', upload.array('file', 5), (req, res) => {
        db.collection('post_counter').findOne({ name : '게시물 수' }, (err, result) => {
            if (err) return console.log(err);
            let totalPost = result.totalPost;
            if (req.body.anony == '') {
                db.collection('gallery').insertOne({ _id : totalPost + 1, 익명 : '', 이름 : req.user.이름, 제목 : req.body.title, 내용 : req.body.body }, (err, result) => {
                    if (err) return console.log(err);
                });
            } else {
                db.collection('gallery').insertOne({ _id : totalPost + 1, 익명 : '익명', 이름 : req.user.이름, 제목 : req.body.title, 내용 : req.body.body }, (err, result) => {
                    if (err) return console.log(err);
                });
            }
            db.collection('post_counter').updateOne({ name : '게시물 수' }, { $inc : { totalPost : 1 } }, (err, result) => {
                if (err) return console.log(err);
            })
        })
        res.redirect('/gallery');
})

app.get('/sign_up', (req, res) => {
    res.render(__dirname + '/views/sign.ejs')
})

app.post('/sign_process', (req, res) => {
    if (req.body.name == '' || req.body.id == '' || req.body.pw == '' || req.body.repw == '' || req.body.phone == '') {
        let message = '모든 칸을 입력해주세요'
        res.render('sign_err.ejs', { message : message })
    } else {
        if (req.body.id == req.body.pw) {
            let message = '아이디와 비밀번호는 서로 달라야해요'
            res.render('sign_err.ejs', { message : message })
        } else if (/^[a-zA-Z0-9]+$/.test(req.body.id) == false && /^[a-zA-Z0-9]+$/.test(req.body.pw) == false) {
            let message = '아이디와 비밀번호는 영어와 숫자로만 구성이 가능해요'
            res.render('sign_err.ejs', { message : message })
        } else if (req.body.pw == req.body.repw == false) {
            let message = '비밀번호와 비밀번호 확인이 일치하지 않아요'
            res.render('sign_err.ejs', { message : message })
        } else {
            db.collection('counter').findOne({ name : '회원 수' }, (err, data) => {
                db.collection('member').findOne({ 아이디 : req.body.id }, (err, member) => {
                    if (member == []) {
                        db.collection('member').insertOne( { _id : data.totalPost + 1, 이름 : req.body.name, 아이디 : req.body.id, 비밀번호 : req.body.pw, 전화번호 : req.body.phone, tear : 'rookie' }, (err, result) => {
                            if (err) return console.log(err);
                            db.collection('counter').updateOne({ name : '회원 수' }, { $inc : { totalPost : 1 } }, (err, result) => {
                                if (err) return console.log(err);
                                db.createCollection(req.body.id);
                                res.redirect('/profile');
                            })
                        })
                    } else {
                        let message = '이미 존재하는 아이디입니다'
                        res.render('sign_err.ejs', { message : message })
                    }
                })
            })
        }
    }
})