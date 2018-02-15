const Metadata = require('arsenal').storage.metadata.Metadata;
const { config } = require('../Config');
const logger = require('../utilities/logger');
const constants = require('../../constants');

const params = {
    bucketd: {
        bootstrap: config.bucketd.bootstrap,
        log: config.bucketd.log,
    },
    https: config.https,
    metadataClient: {
        host: config.metadataClient.host,
        port: config.metadataClient.port,
    },
    replicationGroupId: config.replicationGroupId,
    noDbOpen: null,
    constants: {
        usersBucket: constants.usersBucket,
        splitter: constants.splitter,
    },
    mongodb: config.mongodb,
};

const metadata = new Metadata(config.backends.metadata, params, logger);
// call setup
metadata.setup(() => {});

module.exports = metadata;
