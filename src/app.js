const express = require('express');
const routes = require('./routes');
const requestId = require('./middlewares/requestId');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(requestId); // paling atas, supaya error JSON rusak pun punya request_id
app.use(express.json());
app.use('/v1', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;