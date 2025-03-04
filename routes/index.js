const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const bcrypt = require('bcrypt');

const connection = mysql.createConnection({
  host: 'database.kokito741.xyz',
  user: 'website',
  password: 'Afd3zi&aM4v7GX,',
  database: 'ux'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to the database as id ' + connection.threadId);
});

router.get('/', (req, res) => {
  res.redirect('/monuments');
});

const getMonumentsQuery = (sortBy, sortOrder) => `
  SELECT h.*, COUNT(r.id) AS total_reviews, AVG(r.rating) AS avg_rating
  FROM hramove h
  LEFT JOIN reviews r ON h.hramove_id = r.hramove_id
  GROUP BY h.hramove_id
  ORDER BY ${sortBy} ${sortOrder}
`;

router.get('/monuments', (req, res) => {
  const sortBy = req.query.sortBy || 'hramove_name';
  const sortOrder = req.query.sortOrder || 'asc';
  const validSortColumns = ['hramove_name', 'year_build', 'total_reviews', 'avg_rating'];

  if (!validSortColumns.includes(sortBy)) {
    return res.status(400).send('Invalid sort column');
  }

  const query = getMonumentsQuery(sortBy, sortOrder);
  connection.query(query, (error, results) => {
    if (error) throw error;
    res.render('index', { monuments: results });
  });
});

router.post('/monuments', (req, res) => {
  const sortBy = req.body.sortBy || 'hramove_name';
  const sortOrder = req.body.sortOrder || 'asc';
  const validSortColumns = ['hramove_name', 'year_build', 'total_reviews', 'avg_rating'];

  if (!validSortColumns.includes(sortBy)) {
    return res.status(400).send('Invalid sort column');
  }

  const query = getMonumentsQuery(sortBy, sortOrder);
  connection.query(query, (error, results) => {
    if (error) throw error;
    res.render('index', { monuments: results });
  });
});

router.get('/monument/:id', (req, res) => {
  const monumentId = req.params.id;
  const monumentQuery = `
    SELECT h.*, AVG(r.rating) AS avg_rating
    FROM hramove h
    LEFT JOIN reviews r ON h.hramove_id = r.hramove_id
    WHERE h.hramove_id = ?
    GROUP BY h.hramove_id
  `;
  const reviewsQuery = 'SELECT * FROM reviews WHERE hramove_id = ? ORDER BY created_at DESC';

  connection.query(monumentQuery, [monumentId], (error, monumentResults) => {
    if (error) throw error;
    if (monumentResults.length > 0) {
      connection.query(reviewsQuery, [monumentId], (error, reviewsResults) => {
        if (error) throw error;
        res.render('monument', { monument: monumentResults[0], reviews: reviewsResults });
      });
    } else {
      res.status(404).send('Monument not found');
    }
  });
});

router.post('/monument/:id/review', (req, res) => {
  const monumentId = req.params.id;
  const { username, rating, review } = req.body;
  const insertReviewQuery = 'INSERT INTO reviews (hramove_id, username, rating, review) VALUES (?, ?, ?, ?)';

  connection.query(insertReviewQuery, [monumentId, username, rating, review], (error, results) => {
    if (error) throw error;
    res.redirect(`/monument/${monumentId}`);
  });
});

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM users WHERE username = ?';

  connection.query(query, [username], (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      const user = results[0];
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) throw err;

        if (isMatch) {
          req.session.user = user; // Set the session user
          res.redirect('/monuments');
        } else {
          res.render('login', { error: 'Invalid credentials' });
        }
      });
    } else {
      res.render('login', { error: 'Invalid credentials' });
    }
  });
});

router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  const checkQuery = 'SELECT * FROM users WHERE username = ? OR email = ?';

  connection.query(checkQuery, [username, email], (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      res.render('register', { error: 'The account already exists' });
    } else {
      const insertQuery = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';

      bcrypt.hash(password, 10, (err, hash) => {
        if (err) throw err;

        connection.query(insertQuery, [username, email, hash], (error, results) => {
          if (error) throw error;
          req.session.user = { username, email }; // Set the session user
          res.redirect('/monuments');
        });
      });
    }
  });
});

module.exports = router;