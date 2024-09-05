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
  },ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false, 
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

async function checkExist(ip, agent) {
  try {
    const result = await db.query(`SELECT * FROM likes WHERE IP_ADDRESS = $1 AND userAgent = $2`,[ip, agent]);
    return result.rowCount > 0;
  } catch (err) {
    return false;
  }
}

async function checkLike(ip,agent) {
  const result = await db.query(`SELECT liked FROM likes WHERE IP_ADDRESS = $1 AND userAgent = $2 LIMIT 1`,[ip, agent]);
  return result.rows[0]?.liked;
}

async function getNumberOfLikes() {
  const result = await db.query("SELECT COUNT(*) FROM likes WHERE liked = true");
  return parseInt(result.rows[0].count, 10);
}


let isLiked;
let likes;
let exist;

app.get('/', async(req, res) => {
  const userIp = req.ip || req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'];

  likes = await getNumberOfLikes();
  exist = await checkExist(userIp,userAgent);

  if(exist){
    isLiked = await checkLike(userIp,userAgent);
  } else {
    isLiked = false;
  }

  const data = {
    isLiked: isLiked,
    likes: likes
  };

  res.render("index.ejs", data);
});



app.post('/', async (req, res) => {
  const userIp = req.ip || req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'];

  likes = await getNumberOfLikes();
  exist = await checkExist(userIp,userAgent);

  if(exist){
    isLiked = await checkLike(userIp,userAgent);
  } else {
    isLiked = false;
  }
  if (exist) {
    if(isLiked){
      isLiked = false;
      await db.query(`UPDATE likes SET liked = $1 WHERE IP_ADDRESS = $2 AND userAgent = $3 `,[isLiked,userIp,userAgent]);
    } else {
      isLiked = true;
      await db.query(`UPDATE likes SET liked = $1 WHERE IP_ADDRESS = $2 AND userAgent = $3 `,[isLiked,userIp,userAgent]);
    }
  } else {
    isLiked = true;
    await db.query(`INSERT INTO likes(IP_ADDRESS,userAgent,liked) VALUES($1,$2,$3)`,[userIp,userAgent,isLiked]);
  }

  likes = await getNumberOfLikes();
  const data = {
    isLiked: isLiked,
    likes: likes
  };

  res.json(data);
});

app.listen(port, '0.0.0.0',() => {
  console.log(`App is listening on port ${port}`);
});