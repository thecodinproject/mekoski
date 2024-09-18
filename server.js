const express = require('express')
const app = express()


const isProduction = process.env.NODE_ENV === "production";


//MIDDLEWARE
app.set("view engine", "ejs");
app.use(express.urlencoded({extended: false}));
app.set('trust proxy', 1)



// app.use(passport.initialize());
// app.use(passport.session());

// app.use(flash());
app.use(express.json());

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname));/////////PUT ALL JS OTHER THAN SERVER.JS INTO PUBLIC FOLDER

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
    res.render('index')
})




app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}` )
});

app.use((req, res) => {
    res.status(404).render('404');
});