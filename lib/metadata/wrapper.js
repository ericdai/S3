const BucketClientInterface = require('./bucketclient/backend');
const BucketFileInterface = require('./bucketfile/backend');
const MongoClientInterface = require('arsenal').storage
    .metadata.MongoClientInterface;
const Metadata = require('arsenal').storage.metadata.wrapper;
const inMemory = require('./in_memory/backend');
const { config } = require('../Config');
const logger = require('../utilities/logger');

let CdmiMetadata;
try {
    CdmiMetadata = require('cdmiclient').CdmiMetadata;
} catch (err) {
    CdmiMetadata = null;
}

let client;
let implName;

if (config.backends.metadata === 'mem') {
    client = inMemory;
    implName = 'memorybucket';
} else if (config.backends.metadata === 'file') {
    client = new BucketFileInterface();
    implName = 'bucketfile';
} else if (config.backends.metadata === 'scality') {
    client = new BucketClientInterface();
    implName = 'bucketclient';
} else if (config.backends.metadata === 'mongodb') {
    client = new MongoClientInterface({
        host: config.mongodb.host,
        port: config.mongodb.port,
        writeConcern: config.mongodb.writeConcern,
        replicaSet: config.mongodb.replicaSet,
        readPreference: config.mongodb.readPreference,
        database: config.mongodb.database,
        replicationGroupId: config.replicationGroupId,
        path: config.mongodb.path,
        logger,
    });
    implName = 'mongoclient';
} else if (config.backends.metadata === 'cdmi') {
    if (!CdmiMetadata) {
        throw new Error('Unauthorized backend');
    }

    client = new CdmiMetadata({
        path: config.cdmi.path,
        host: config.cdmi.host,
        port: config.cdmi.port,
        readonly: config.cdmi.readonly,
    });
    implName = 'cdmi';
}

const metadata = new Metadata(client, implName);

module.exports = metadata;
