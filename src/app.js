const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')

const admin = require('./routes/admin');
const contracts = require('./routes/contracts');
const balances = require('./routes/balances');
const jobs = require('./routes/jobs');

const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

app.use('/admin', admin);
app.use('/contracts', contracts);
app.use('/balances', balances);
app.use('/jobs', jobs);

module.exports = app;
