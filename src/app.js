const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model');
const balanceRoute = require('./route/balance');
const contractsRoute = require('./route/contracts');
const jobsRoute = require('./route/jobs');
const adminRoute = require('./route/admin');

const app = express();

app.use(bodyParser.json());

app.set('sequelize', sequelize);
app.set('models', sequelize.models);

app.use('/contracts', contractsRoute);
app.use('/balance', balanceRoute);
app.use('/jobs', jobsRoute);
app.use('/admin', adminRoute);

module.exports = app;
