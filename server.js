const express = require('express')
const app = express()
const { pool } = require("./dbConfig");
const {escapeLiteral} =require('pg');
const MailChecker=require('mailchecker')
const nodemailer = require("nodemailer");


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



///ROUTES
app.get('/', (req, res) => {
    res.render('index',{prod:isProduction})
})

app.get('/tickets', async (req,res) =>{
    try {
        const result = await pool.query(
            `SELECT count(*) as row_count FROM tickets`
        )
        const ticket_count=result.rows[0].row_count
        return res.send(ticket_count)
    } catch (error) {
        console.error('Error getting ticket count:', error);
        return res.status(500).send('An internal server error occurred.');
    }
})
////ROUTES




////END
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}` )
});

app.use((req, res) => {
    res.status(404).render('404');
});