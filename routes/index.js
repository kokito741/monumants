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

router.post('/monuments', (req, res) => {
  const sortBy = req.body.sortBy || 'name';
  const sortOrder = req.body.sortOrder || 'asc';
  const validSortColumns = ['name', 'rating', 'year_built', 'reviews'];

  if (!validSortColumns.includes(sortBy)) {
    return res.status(400).send('Invalid sort column');
  }

  const query = `
    SELECT h.*, COUNT(r.id) AS total_reviews
    FROM hramove h
    LEFT JOIN reviews r ON h.id = r.hramove_id
    GROUP BY h.id
    ORDER BY ${sortBy} ${sortOrder}
  `;
  connection.query(query, (error, results) => {
    if (error) throw error;
    res.render('index', { monuments: results });
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