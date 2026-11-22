const express = require('express');
const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());
app.use('/api/v1', routes); // versi API di URL
app.use(notFound);
app.use(errorHandler); // harus paling terakhir

module.exports = app;