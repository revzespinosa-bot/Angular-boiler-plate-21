const express = require('express');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const path = require('path');

const router = express.Router();
const swaggerDocument = yaml.load(path.join(__dirname, '..', 'swagger.yaml'));

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

module.exports = router;
