import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

env.config(); 

const app = express();
const port = process.env.PORT || 3000; 


const db = new pg.Client({
  connectionString: process.env.DATABASE_URL || {
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  },
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false, 
});


db.connect(err => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Connected to the database');
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

async function getNumberOfLikes() {
  const result = await db.query("SELECT numberoflikes FROM likes");
  return result.rows[0].numberoflikes;
}

let isLiked = false;
let likes = await getNumberOfLikes();

app.get('/', async (req, res) => {
  res.render("index.ejs"); 
});

app.post('/like', async (req, res) => {
  if (!isLiked) {
    isLiked = true;
    likes++;
    await db.query(`UPDATE likes SET numberoflikes = $1`, [likes]);
    console.log(likes);
    res.render("index.ejs", { likes: likes });
  } else {
    isLiked = false;
    likes--;
    console.log(likes);
    await db.query(`UPDATE likes SET numberoflikes = $1`, [likes]);
    res.redirect("/");
  }
});

app.listen(port, '0.0.0.0',() => {
  console.log(`App is listening on port ${port}`);
});
