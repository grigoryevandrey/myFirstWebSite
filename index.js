const express = require('express');
const app = express();
const {
    pool
} = require("./dbconfig");
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require("passport");


const initializePassport = require("./passportConfig");
const e = require('express');

initializePassport(passport);

const PORT = process.env.PORT || 5000;


app.set('view engine', 'ejs');
app.use(express.urlencoded({
    extended: false
}));
app.use(express.static(__dirname + '/public'));





app.use(session({
    secret: 'secret',

    resave: false,

    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.get('/', (req, res) => {
    let teachers = [];

    pool.query(`SELECT * 
    FROM teacher_rating
    WHERE average > 4`, (err, results) => {
        if (err) {
            throw err;
        }
        

        let len = results.rows.length;
        let randNums = [];

        if (len === 1) {
          randNums = [0,0,0];
        }
        else if (len === 2) {
            randNums = [0,1,0];
            
        } else {
            randNums.forEach((item, i, arr) => {
                arr[i] = getRandomInt(len);
        });
            while (randNums[1] == randNums[0]) {
                randNums[1] = getRandomInt(len);
            }
            while (randNums[2] == randNums[0] || randNums[2] == randNums[1]) {
                randNums[2] = getRandomInt(len);
            }
          
        }

        randNums.forEach((item, i, arr) => {
                arr[i] = results.rows[item].teacher_id;
        });
        
        pool.query (`SELECT *
        FROM teacher
        LEFT JOIN teacher_info ON teacher_info.id=teacher.id
        WHERE teacher.id = $1 OR teacher.id = $2 OR teacher.id = $3`, [randNums[0], randNums[1], randNums[2]], (err, results) => {
            if (err) {
                throw err;
            }

            results.rows.forEach((item, i, arr) => {
                 teachers[i] = item; 
            });
            console.log(teachers);
            res.render('index', {
                okOk: req.isAuthenticated(),
                teachersFunction: function() {
                    return 'Base64.decode("' + Buffer.from(JSON.stringify(teachers)).toString('base64') + '")';
                }
            });
              
        });
        
        
        // console.log(getRandomInt(len));

        function getRandomInt(max) {
            return Math.floor(Math.random() * Math.floor(max));
          }
          
    });

    
});

app.get('/profile', checkNotAuthenticated, (req, res) => {
    
    var userId = req.user.id;
    res.redirect('/profile/' + userId)
});



app.get('/profile/:id', function (req, res) {
    let id = req.params.id,
        name = '',
        lastName = '',
        subject = '',
        gender = '',
        achievements = '',
        additionalInfo = '',
        pricePerLesson = '',
        lengthOfLesson = '',
        yearOfBirth = '';

    let reviewResults = [];
    pool.query(
        `SELECT * 
        FROM teacher
        LEFT JOIN teacher_info ON teacher_info.id=teacher.id
        WHERE teacher.id = $1`, [id], (err, results) => {
            if (err) {
                throw (err);
            }
            if (results.rows.length > 0) {
                name = results.rows[0].first_name;
                lastName = results.rows[0].last_name;
                subject = results.rows[0].subject;
                gender = results.rows[0].gender;
                achievements = results.rows[0].achievements;
                additionalInfo = results.rows[0].additional_info;
                pricePerLesson = results.rows[0].price_per_lesson;
                lengthOfLesson = results.rows[0].length_of_lesson;
                yearOfBirth = results.rows[0].year_of_birth;

                pool.query(`SELECT * 
                FROM reviews
                WHERE teacher_id = $1`, [id], (err,results) => {
                if(err){
                    throw(err);
                }
                
                let checker = false;

                for (let i = 0; i < results.rows.length; i++) {
                    reviewResults[i] = {};
                    for (let key in results.rows[i]) {
                        reviewResults[i][key] = results.rows[i][key];
                    }
                    checker = true;
                }
                if (!checker) {
                reviewResults = [{
                    message: "Нет отзывов"
                }];
            }

                res.render('userPage', {
                    id: id,
                    name: name,
                    lastName: lastName,
                    subject: subject,
                    gender: gender,
                    achievements: achievements,
                    additionalInfo: additionalInfo,
                    pricePerLesson: pricePerLesson,
                    lengthOfLesson: lengthOfLesson,
                    yearOfBirth: yearOfBirth,
                    resultsReviewFunction: function() {
                        return 'Base64.decode("' + Buffer.from(JSON.stringify(reviewResults)).toString('base64') + '")';
                    },
                    reviewLength: reviewResults.length
                });
                });

                
            } else {
                res.redirect('/');
            }

        }
    );


});

app.get('/users/register', checkAuthenticated, (req, res) => {
    res.render('register');
});

app.get('/users/login', checkAuthenticated, (req, res) => {
    res.render('login');
});

app.get('/users/userpage', (req, res) => {
    res.render('userPage');
});

app.get('/users/logout', (req, res) => {
    req.logOut();
    req.flash('success_msg', "Вы вышли из системы");
    res.redirect('/users/login');
});

app.get('/users/register_end',checkNotAuthenticated, (req, res) => {
    const id = req.user.id;
    let gender = '',
    achievements = '',
    additionalInfo ='',
    pricePerLesson = '',
    lengthOfLesson = '',
    yearOfBirth = '',
    showMe = false;
    pool.query(
        `SELECT *
        FROM teacher_info
        WHERE id = $1`, [id], (err, results) => {
            if (err) {
                throw (err);
            }
            if(results.rows.length > 0){    
                gender = results.rows[0].gender;
                achievements = results.rows[0].achievements;
                additionalInfo = results.rows[0].additional_info;
                pricePerLesson = results.rows[0].price_per_lesson;
                lengthOfLesson = results.rows[0].length_of_lesson;
                yearOfBirth = results.rows[0].year_of_birth;   
                showMe = results.rows[0].show_me;
               res.render('register_end', {
                gender: gender,
                achievements: achievements,
                additionalInfo: additionalInfo,
                pricePerLesson: pricePerLesson,
                lengthOfLesson: lengthOfLesson,
                yearOfBirth: yearOfBirth,
                showMe: showMe
            });
            }
            else{
                res.render('register_end', {
                    gender: gender,
                    achievements: achievements,
                    additionalInfo: additionalInfo,
                    pricePerLesson: pricePerLesson,
                    lengthOfLesson: lengthOfLesson,
                    yearOfBirth: yearOfBirth,
                    showMe: showMe
                });
            }
        });
});

app.get('/search', (req, res) => {
    let resultat = [];
    let reviewResults = [[]];
    let teachId = [];
    let option = 1;
    pool.query(
        `SELECT * 
        FROM teacher
        LEFT JOIN teacher_info 
        ON teacher_info.id=teacher.id
        WHERE show_me = $1`, [true], (err, results) => {
            if (err) {
                throw (err);
            }
            for (let i = 0; i < results.rows.length;i++){
                resultat[i] = {};
                for (let key in results.rows[i]){
                    resultat[i][key] = results.rows[i][key];
                }
                teachId[i] = results.rows[i].id;
            }
            // console.log(typeof(resultat[0].first_name));
            pool.query(`SELECT * 
            FROM reviews`,async (err,resultss) => {
            if(err){
                throw(err);
            }
            
        for (let i = 0; i < teachId.length; i++) {
            let checker = false;
            for (let j = 0; j < resultss.rows.length; j++) {
                if (teachId[i] === resultss.rows[j].teacher_id) {
                if (reviewResults[i] === undefined) {
                    reviewResults[i] = [];
                    reviewResults[i][0] = resultss.rows[j];
                }
                else {
                reviewResults[i].push(resultss.rows[j]);  
                 }   
                 
            checker = true;
                }
                
            }
            
            if (!checker) {
                reviewResults[i] = [{
                    message: "Нет отзывов"
                }];
            }
        }

        res.render('search', {
            resultatF: function() {
                return 'Base64.decode("' + Buffer.from(JSON.stringify(resultat)).toString('base64') + '")';
            },
            resultsReviewFunction: function() {
                return 'Base64.decode("' + Buffer.from(JSON.stringify(reviewResults)).toString('base64') + '")';
            },
            reviewLength: reviewResults.length,
            length: resultat.length,
            option: option
        });
        });
        }
    );
});

app.post("/buy", async (req, res) => {
   
   let {
       teacherPrice,
       teacherId,
       fullName,
       phoneOfCustomer,
       numberOfLessons,
       emailOfCustomer
   } = req.body;

    let price = numberOfLessons * teacherPrice;

res.render('payment', {
    price,
    teacherId,
    fullName,
    phoneOfCustomer,
    numberOfLessons,
    emailOfCustomer
            });


});

app.post("/purchase", async (req, res) => {
    let {
        price,
        teacherId,
        fullName,
        phoneOfCustomer,
        numberOfLessons,
        emailOfCustomer
    } = req.body;
    pool.query(
    `INSERT INTO deals (teacher_id, price, number_of_lessons_bought, full_name, email_of_customer, phone_of_customer, reviewed)
    VALUES ($1, $2, $3, $4, $5, $6, $7)`, [teacherId, price, numberOfLessons, fullName, emailOfCustomer, phoneOfCustomer, false], (err, results) => {
        if (err) {
            throw err
        }

        res.render('successfullBuy', {
            price: price,
            numberOfLessons: numberOfLessons            
        });
        req.flash('success_msg', "Заказ зарегистрирован.");
    }
    
);
});

app.post("/review", async(req,res) => {
    
    let {
        teacherId,
        phoneOfCustomer,
        review
    } = req.body;
    let errors = [];
    let orderId = 0,
    fullName = '',
    emailOfCustomer = '',
    rating = 1;
    let option = req.body.rating;


    switch (option){
        case "2": 
        rating = 2;
        break;
        case "3": 
        rating = 3;
        break;
        case "4": 
        rating = 4;
        break;
        case "5": 
        rating = 5;
        break;
        default:
            rating = 1;
    }

    if(!phoneOfCustomer || !review) {
        errors.push({
            message:"Заполните все поля"
        });
    }

    pool.query(`SELECT * 
    FROM deals
    WHERE teacher_id = $1 AND phone_of_customer = $2 AND reviewed = $3`,[teacherId, phoneOfCustomer, false], (err, results) => {
        if (err) {
            throw err;
        }
        
        if(results.rows.length == 0) {
            errors.push({
            message: "Телефон указан неверно, либо вы уже оставляли отзыв"
            });
        }
        else {
            orderId = results.rows[0].id;
            fullName = results.rows[0].full_name;
            emailOfCustomer = results.rows[0].email_of_customer;
        }

        if (errors.length > 0) {
        let id = teacherId,
        name = '',
        lastName = '',
        subject = '',
        gender = '',
        achievements = '',
        additionalInfo = '',
        pricePerLesson = '',
        lengthOfLesson = '',
        yearOfBirth = '';

    let reviewResults = [];
    pool.query(
        `SELECT * 
        FROM teacher
        LEFT JOIN teacher_info ON teacher_info.id=teacher.id
        WHERE teacher.id = $1`, [id], (err, results) => {
            if (err) {
                throw (err);
            }
            if (results.rows.length > 0) {
                name = results.rows[0].first_name;
                lastName = results.rows[0].last_name;
                subject = results.rows[0].subject;
                gender = results.rows[0].gender;
                achievements = results.rows[0].achievements;
                additionalInfo = results.rows[0].additional_info;
                pricePerLesson = results.rows[0].price_per_lesson;
                lengthOfLesson = results.rows[0].length_of_lesson;
                yearOfBirth = results.rows[0].year_of_birth;

                pool.query(`SELECT * 
                FROM reviews
                WHERE teacher_id = $1`, [id], (err,results) => {
                if(err){
                    throw(err);
                }
                
                let checker = false;

                for (let i = 0; i < results.rows.length; i++) {
                    reviewResults[i] = {};
                    for (let key in results.rows[i]) {
                        reviewResults[i][key] = results.rows[i][key];
                    }
                    checker = true;
                }
                if (!checker) {
                reviewResults = [{
                    message: "Нет отзывов"
                }];
            }
                res.render('userPage', {
                    id: id,
                    name: name,
                    lastName: lastName,
                    subject: subject,
                    gender: gender,
                    achievements: achievements,
                    additionalInfo: additionalInfo,
                    pricePerLesson: pricePerLesson,
                    lengthOfLesson: lengthOfLesson,
                    yearOfBirth: yearOfBirth,
                    errors: errors,
                    resultsReviewFunction: function() {
                        return 'Base64.decode("' + Buffer.from(JSON.stringify(reviewResults)).toString('base64') + '")';
                    },
                    reviewLength: reviewResults.length
                });
                });

                
            } else {
                res.redirect('/');
            }

        }
    );
            console.log({
                errors
            });
        } else {
            pool.query(`INSERT INTO reviews (teacher_id, full_name, email_of_customer, review, rating)
            VALUES ($1, $2, $3, $4, $5)`, [teacherId, fullName, emailOfCustomer, review, rating], (err, results) => {
                if(err){
                    throw err;
                }

                switch (rating) {
                    case 1:      
                    pool.query(`UPDATE teacher_rating
                    SET one = one + 1,
                    number_of_ratings = number_of_ratings + 1
                    WHERE teacher_id = $1`, [teacherId], (err) => {
                        if (err){
                            throw err;
                        }
                    });
                    break;
                    case 2:
                    pool.query(`UPDATE teacher_rating
                    SET two = two + 1,
                    number_of_ratings = number_of_ratings + 1
                    WHERE teacher_id = $1`, [teacherId], (err) => {
                        if (err){
                            throw err;
                        }
                    });
                    break;
                    case 3:
                    pool.query(`UPDATE teacher_rating
                    SET three = three + 1,
                    number_of_ratings = number_of_ratings + 1
                    WHERE teacher_id = $1`, [teacherId], (err) => {
                        if (err){
                            throw err;
                        }
                    });
                    break;
                    case 4:
                    pool.query(`UPDATE teacher_rating
                    SET four = four + 1,
                    number_of_ratings = number_of_ratings + 1
                    WHERE teacher_id = $1`, [teacherId], (err) => {
                        if (err){
                            throw err;
                        }
                    });
                    break;
                    case 5:
                    pool.query(`UPDATE teacher_rating
                    SET five = five + 1,
                    number_of_ratings = number_of_ratings + 1
                    WHERE teacher_id = $1`, [teacherId], (err) => {
                        if (err){
                            throw err;
                        }
                    });
                    break;
                    default:
                        throw err;
                }

                pool.query (`UPDATE teacher_rating
                SET average = (one + two * 2 + three * 3 + four * 4 + five * 5) ::float / number_of_ratings
                WHERE teacher_id = $1`, [teacherId], (err) => {
                    if (err) {
                        throw err;
                    }
                });

                pool.query(`UPDATE deals
                SET reviewed = $1
                WHERE id = $2`, [true, orderId], (err) => {
                    if(err){
                        throw err;
                    }
                });

                res.render('successfulReview');
            } );
        }
    });

   


});

app.post("/user/register", async (req, res) => {
    let option = req.body.subject;
    let {
        name,
        lastName,
        email,
        password,
        password2,
        subject,
        phone,
    } = req.body;

    switch (option){
        case "1": 
        subject = "Мастерство выпивания пива";
        break;
        case "2": 
        subject = "Техника прогуливания пар";
        break;
        case "3": 
        subject = "Искусство ругательств";
        break;
        case "4": 
        subject = "Навык курения";
        break;
        case "5": 
        subject = "Рыгание";
        break;
        default:
            subject = "'Err'";
    }

    let errors = [];

    if (!name || !lastName || !email || !password || !password2 || !subject || !phone) {
        errors.push({
            message: "Пожалуйста, заполните все поля"
        });
    }

    if (password.length < 6) {
        errors.push({
            message: "Пароль должен состоять хотя бы из 6 символов"
        });
    }

    if (password != password2) {
        errors.push({
            message: "Пароли не совпадают"
        });
    }

    if (errors.length > 0) {
        res.render('register', {
            errors
        });
        console.log({
            errors
        });
    } else {

        let hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);
        let mistake = false;
        pool.query(
            `SELECT * FROM teacher
            WHERE phone = $1`, [phone], (err, results) => {
                if (err) {
                    throw err;
                }
                if (results.rows.length > 0) {
                    mistake = true;
                    errors.push({
                        message: 'Такой номер телефона уже используется'
                    });
                }
            }
        );

        pool.query(
            `SELECT * FROM teacher
            WHERE email = $1`, [email], (err, results) => {
                if (err) {
                    throw err
                }


                if (results.rows.length > 0) {
                    errors.push({
                        message: 'Аккаунт с такой почтой уже существует'
                    });
                    res.render('register', {
                        errors
                    });
                    console.log({
                        errors
                    });
                } else if (mistake === true) {
                    res.render('register', {
                        errors
                    });
                    console.log({
                        errors
                    });
                } else {
                    pool.query(
                        `INSERT INTO teacher (first_name, last_name, email, subject, password, phone)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING id, password`, [name, lastName, email, subject, hashedPassword, phone], (err, results) => {
                            if (err) {
                                throw err
                            }
                            
                            let teacherId = results.rows[0].id; 

                            pool.query(
                                `INSERT INTO teacher_rating (teacher_id, one, two, three, four, five, average, number_of_ratings)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,[teacherId, 0, 0, 0, 0, 0, 0, 0,], (err, results) => {
                                    if(err) {
                                        throw err;
                                    }
                                    
                            req.flash('success_msg', "Вы зарегистрированы! Пожалуйста, войдите в систему.");
                            res.redirect('/users/register_end');
                                }
                            );
                        }
                    );
                }
            }
        )
    }
});





app.post("/search/go", async (req, res) =>{
    let option = req.body.searchSelector;
    let resultat = [];
    let reviewResults = [[]];
    let subject = "";
    let teachId = [];
    switch (option){
        case "2": 
        subject = "Мастерство выпивания пива";
        break;
        case "3": 
        subject = "Техника прогуливания пар";
        break;
        case "4": 
        subject = "Искусство ругательств";
        break;
        case "5": 
        subject = "Навык курения";
        break;
        case "6": 
        subject = "Рыгание";
        break;
        default:
            subject = "'Err'";
    }
    if (option === "1" || subject === "'Err'"){
       res.redirect('/search');
    }
    else{
        
    pool.query(
        `SELECT * 
        FROM teacher
        LEFT JOIN teacher_info 
        ON teacher_info.id=teacher.id
        WHERE subject = $1 AND show_me = $2`,[subject, true], async (err, results) => {
            if (err) {
                throw (err);
            }
            for (let i = 0; i < results.rows.length;i++){
                resultat[i] = {};
                for (let key in results.rows[i]){
                    resultat[i][key] = results.rows[i][key];   
                }
                teachId[i] = results.rows[i].id;
            }
            
                pool.query(`SELECT * 
                FROM reviews`,async (err,resultss) => {
                if(err){
                    throw(err);
                }
                
            for (let i = 0; i < teachId.length; i++) {
                let checker = false;
                for (let j = 0; j < resultss.rows.length; j++) {
                    if (teachId[i] === resultss.rows[j].teacher_id) {
                    reviewResults[i].push(resultss.rows[j]);  
                    checker = true;
                    }
                    
                }
                
                if (!checker) {
                    reviewResults[i].push ([{
                        message: "Нет отзывов"
                    }])
                }
            }

            res.render('search', {
                resultatF: function() {
                    return 'Base64.decode("' + Buffer.from(JSON.stringify(resultat)).toString('base64') + '")';
                },
                resultsReviewFunction: function() {
                    return 'Base64.decode("' + Buffer.from(JSON.stringify(reviewResults)).toString('base64') + '")';
                },
                reviewLength: reviewResults.length,
                length: resultat.length,
                option: option
            });
            });
            
            
            
            // console.log(typeof(resultat[0].first_name));
            
            
        }
    );

}
});

app.post("/user/register_end", checkNotAuthenticated,  (req, res) => {
    let option = req.body.gender;
    let id = req.user.id;
    let {
        gender,
        yearOfBirth,
        additionalInfo,
        achievements,
        pricePerLesson,
        lengthOfLesson,
        showMe
    } = req.body;
    console.log(showMe);
    
    let showMeToDB = false;

    if (showMe){
        showMeToDB = true;
    }

    let errors = [];

    if (! yearOfBirth || !additionalInfo || !achievements || !pricePerLesson || !lengthOfLesson) {
        errors.push({
            message: "Заполните все поля"
        })
    }

    switch (option){
        case "1": 
        gender = "Мужской";
        break;
        case "2": 
        gender = "Женский";
        break;
        default:
        gender = "'Err'";
    }
// сделать проверку авторизован ли пользователь, и заносить по айдишнику юзера который это вносит 

if (errors.length > 0) {
    res.render('register_end', {
        errors
    });
    console.log({
        errors
    });
} else {
    
    pool.query(`SELECT * FROM teacher_info
    WHERE id = $1`, [id],  (err, results) =>  {
        if (err){
            throw err;
        }
        if (results.rows.length > 0) {
            pool.query(
                `UPDATE teacher_info
                SET gender = $1,
                achievements = $2,
                additional_info = $3, 
                price_per_lesson = $4, 
                length_of_lesson = $5, 
                year_of_birth = $6, 
                show_me = $7
                WHERE id = $8`, [gender, achievements, additionalInfo, pricePerLesson, lengthOfLesson, yearOfBirth, showMeToDB, id], (err, results) => {
                 if (err) {
                     throw err;
                 }
                 console.log("update");
                 req.flash('success_msg', "Данные обновлены.");
                    res.redirect('/search');
                }
            );
        }
        else {

            pool.query(
                `INSERT INTO teacher_info (gender, achievements , additional_info, price_per_lesson, length_of_lesson, year_of_birth, show_me, id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id`, [gender, achievements, additionalInfo, pricePerLesson, lengthOfLesson, yearOfBirth, showMeToDB, id], (err, results) => {
                    if (err) {
                        throw err
                    }
                    console.log("insert");
                    req.flash('success_msg', "Вы зарегистрированы! Пожалуйста, войдите в систему.");
                    res.redirect('/search');
                }
            );
        }
    });
    
}
});

app.post('/user/login', passport.authenticate('local', {
    successRedirect: "/users/register_end",
    failureRedirect: "/users/login",
    failureFlash: true
}));

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
    let id = req.user.id;
        return res.redirect('/profile/' + id);
    }
    next();
}


function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/users/login');
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});



app.use(function (req, res, next) {
    res.status(404).render('404');
});








// const http = require('http');
// const path = require('path');
// const fs = require ('fs');
// const {Client} = require('pg');
// const client = new Client({
//     user: "postgres",
//     password: "5570358735Adg",
//     host: "localhost",
//     database: "mainbase"
// })


// server.listen(PORT , () => console.log('Server running on port ' + PORT));















// const server = http.createServer((req, res) => {
//     let filePath = path.join(__dirname,
//          '',
//           req.url === '/' ? 'index.html' : req.url
//         );

//     let extname = path.extname(filePath);

//     let contentType = 'text/html';

//     switch(extname){
//         case '.js':
//             contentType = 'text/javascript';
//             break;
//         case '.css':
//             contentType = 'text/css';
//             break;
//         case '.json':
//             contentType = 'application/json';
//             break;
//         case '.png':
//             contentType = 'image/png';
//             break;
//         case '.jpg':
//             contentType = 'image/jpg';
//             break;
//     }



//     fs.readFile(filePath, (err, content) => {
//         if (err){
//             if (err.code == 'ENOENT'){
//                 fs.readFile(path.join(__dirname, '', '404.html'), (err, content) => {
//                    res.writeHead(200, { 'Content-Type': 'text/html' });
//                    res.end(content, 'utf8');
//                 });
//             }
//             else {
//                 res.writeHead(500);
//                 res.end('Server error: ' + err.code);
//             }
//         }
//         else{
//             res.writeHead(200, {'Content-Type': contentType});
//             res.end(content, 'utf8');
//             console.log(filePath, contentType);
//         }
//     });
// });

// const {Client} = require('pg');

// const client = new Client({
//     user: "postgres",
//     password: "5570358735Adg",
//     host: "localhost",
//     database: "mainbase"
// })


// async function register(){
//     var name = document.getElementById("name").value;
//     alert(name);
//     try{
//     await client.connect();

//     alert("add");
//     await client.query("insert into test value ("+name+")");
//     }
//     catch(ex){
//         console.log("Error: " + ex);
//         alert("error");
//     }
//     finally{
//         await client.end();
//         console.log("Client disconnected.");
//         alert("finally");
//     }
// }





// async function register(){
//     try{
//     await client.connect();
//     console.log("Connected succ");
//     const results = await client.query("select * from test");
//     console.table(results.rows);
//     }
//     catch (ex){
//         console.log("MISTAKE IS:" + ex);
//     }
//     finally{
//         await client.end();
//         console.log ("Disconnected");
//     }
// }

// module.exports.register = register;
