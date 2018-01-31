Using Public Clouds as Data Backends
====================================

Introduction
------------

As stated in our `GETTING STARTED guide <../GETTING_STARTED/#location-configuration>`__,
new data backends can be added by creating a region (also called location
constraint) with the right endpoint and credentials.
This section shows you how to set up the public cloud backends Scality currently
supports:

* `Amazon S3 <#aws-s3-as-a-data-backend>`__ 
* `Microsoft Azure <#microsoft-azure-as-a-data-backend>`__ 

For each public cloud backend, you must edit your CloudServer
:code:`locationConfig.json` and perform a few setup steps.

AWS S3 as a Data Backend
------------------------

From the AWS S3 Console (or any AWS S3 CLI tool)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Create a bucket to host data for this new location constraint.
This bucket must have versioning enabled. You can activate this option at
step 2 of bucket creation in the Console.

From the AWS CLI, use :code:`put-bucket-versioning` from the :code:`s3api` commands 
on your bucket of choice

From any other tool, see that tool's documentation.

In the present example, the bucket is named ``zenkobucket`` and versioning is
enabled.

From the CloudServer Repository
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

locationConfig.json
^^^^^^^^^^^^^^^^^^^

Edit this file to add a new location constraint. This location constraint must
contain the information for the AWS S3 bucket to which you will write your
data when you create a CloudServer bucket in this location.

Configurable options:

* :code:`type`: Set to :code:`aws_s3` to indicate this location constraint is writing data to AWS S3.
* :code:`legacyAwsBehavior`: Set to :code:`true` to make this region behave like AWS S3.
* :code:`us-east-1`: Set to :code:`false` to make this region behave like any other AWS S3 region.
* :code:`bucketName`: Set to an *existing bucket* in your AWS S3 account. This
  is the bucket in which data will be stored for this location constraint.
* :code:`awsEndpoint`: Set to your bucket's endpoint, usually :code:`s3.amazonaws.com`.
* :code:`bucketMatch`: Set to :code:`true` for object names to be the same in both the local and AWS S3 buckets. Set to :code:`false` for object names to take the form :code:`{{localBucketName}}/{{objectname}}` in the AWS S3-hosted bucket.
* :code:`credentialsProfile` and :code:`credentials` are two ways to provide AWS S3 credentials for a bucket. *Use only one.*
    * :code:`credentialsProfile`: Set to the profile name to allow access to the AWS S3 bucket from the :code:`~/.aws/credentials` file.
    * :code:`credentials`: Set the two fields inside the object (:code:`accessKey` and :code:`secretKey`) to their respective values from your AWS credentials.

.. code:: json

    (...)
    "aws-test": {
        "type": "aws_s3",
        "legacyAwsBehavior": true,
        "details": {
            "awsEndpoint": "s3.amazonaws.com",
            "bucketName": "zenkobucket",
            "bucketMatch": true,
            "credentialsProfile": "zenko"
        }
    },
    (...)

.. code:: json

    (...)
    "aws-test": {
        "type": "aws_s3",
        "legacyAwsBehavior": true,
        "details": {
            "awsEndpoint": "s3.amazonaws.com",
            "bucketName": "zenkobucket",
            "bucketMatch": true,
            "credentials": {
                "accessKey": "WHDBFKILOSDDVF78NPMQ",
                "secretKey": "87hdfGCvDS+YYzefKLnjjZEYstOIuIjs/2X72eET"
            }
        }
    },
    (...)

*WARNING*
   If you set :code:`bucketMatch` to :code:`true`, you must maintain only one
   local bucket per AWS S3 location. If :code:`bucketMatch` is set :code:`true`,
   object names in the AWS S3 bucket are not prefixed with a CloudServer
   bucket name. When an object is put to the :code:`zenko1` CloudServer bucket
   and a different object with the same name is put to the :code:`zenko2`
   CloudServer bucket, both :code:`zenko1` and :code:`zenko2` point to the
   same AWS bucket, and the second object overwrites the first.

~/.aws/credentials
^^^^^^^^^^^^^^^^^^

*TIP*
   If you have explicitly set :code:`accessKey` and :code:`secretKey`
   in your :code:`aws_s3` location's :code:`credentials` object
   (:code:`locationConfig.json`), skip this section.

Make sure :code:`~/.aws/credentials` has a profile that matches the one defined
in :code:`locationConfig.json`. Following the previous example:

.. code:: shell

    [zenko]
    aws_access_key_id=WHDBFKILOSDDVF78NPMQ
    aws_secret_access_key=87hdfGCvDS+YYzefKLnjjZEYstOIuIjs/2X72eET

Start the Server with the Ability to Write to AWS S3
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Once all files in the repository are edited, start the server and begin
writing data to AWS S3 through CloudServer.

.. code:: shell

   # Start the server locally
   $> S3DATA=multiple npm start

Run the Server as a Docker Container that Can Write to AWS S3
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

*TIP*
   If you set the :code:`credentials` object in :code:`locationConfig.json`
   file, there is no need to mount :code:`.aws/credentials`.

Mount all files that have been edited to override defaults and do a
standard Docker run. Then you can start writing data to AWS S3 through
CloudServer.

.. code:: shell

   # Start the server in a Docker container
   $> sudo docker run -d --name CloudServer \
   -v $(pwd)/data:/usr/src/app/localData \
   -v $(pwd)/metadata:/usr/src/app/localMetadata \
   -v $(pwd)/locationConfig.json:/usr/src/app/locationConfig.json \
   -v $(pwd)/conf/authdata.json:/usr/src/app/conf/authdata.json \
   -v ~/.aws/credentials:/root/.aws/credentials \
   -e S3DATA=multiple -e ENDPOINT=http://localhost -p 8000:8000
   -d scality/s3server

Testing: Put an Object to AWS S3 Using CloudServer
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To test pushing to AWS S3, create a local bucket in the AWS S3
location constraint. This local bucket only stores the metadata locally,
while both the data and any user metadata (:code:`x-amz-meta` headers
sent with a PUT object and tags) are stored on AWS S3.

The following example builds on the previous steps.

.. code:: shell

   # Create a local bucket storing data in AWS S3
   $> s3cmd --host=127.0.0.1:8000 mb s3://zenkobucket --region=aws-test
   # Put an object to AWS S3, and store the metadata locally
   $> s3cmd --host=127.0.0.1:8000 put /etc/hosts s3://zenkobucket/testput
    upload: '/etc/hosts' -> 's3://zenkobucket/testput'  [1 of 1]
     330 of 330   100% in    0s   380.87 B/s  done
   # List locally to check you have the metadata
   $> s3cmd --host=127.0.0.1:8000 ls s3://zenkobucket
    2017-10-23 10:26       330   s3://zenkobucket/testput

Accessing the bucket from the AWS console exposes the newly uploaded object:

.. figure:: ../res/aws-console-successful-put.png
   :alt: AWS S3 Console upload example

Troubleshooting
~~~~~~~~~~~~~~~

Ensure the :code:`~/.s3cfg` file has credentials that match your local
CloudServer credentials, defined in :code:`conf/authdata.json`. By default, the
access key is :code:`accessKey1` and the secret key is :code:`verySecretKey1`.
For more informations, see our template `~/.s3cfg <./CLIENTS/#s3cmd>`__.

CloudServer cannot access pre-existing objects in your AWS S3 hosted bucket.

Make sure versioning is enabled in your remote AWS S3-hosted bucket. Using the
AWS Console, check by clicking your bucket name, and then "Properties" at the
top. You should see something like:

.. figure:: ../res/aws-console-versioning-enabled.png
   :alt: AWS Console showing versioning enabled

Microsoft Azure as a Data Backend
---------------------------------

From the MS Azure Console
~~~~~~~~~~~~~~~~~~~~~~~~~

From your storage account dashboard, create a container to host data for the
new location constraint.

You must provide one of your storage access keys to CloudServer.
This can be found from your Storage Account dashboard, under "Settings," then
"Access keys."

In this example, our container, named ``zenkontainer``, belongs to the
``zenkomeetups`` storage account.

From the CloudServer Repository
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

locationConfig.json
^^^^^^^^^^^^^^^^^^^

Edit this file to add a new location constraint, containing the information for
the MS Azure container to which you will write your data whenever you create a
CloudServer bucket in this location.

Configurable options include:

* :code:`type`: Set to :code:`azure` to write data to MS Azure.
* :code:`legacyAwsBehavior`: Set to :code:`true` to make this location behave as 
  if in the AWS S3 :code:`us-east-1` region. Set to :code:`false` to make 
  this region behave as if in any other AWS S3 region (in the case of MS Azure-
  hosted data, this is mostly relevant for error formatting).
* :code:`azureStorageEndpoint`: Set to your storage account's endpoint, usually
  :code:`https://{{storageAccountName}}.blob.core.windows.name`.
* :code:`azureContainerName`: Set to an *existing container* in your MS Azure
  storage account. This is the container in which your data shll be stored for
  this location.
* :code:`bucketMatch`: Set to :code:`true` for the object name to be the same in
  the local bucket and the MS Azure container. Set to :code:`false` for the object
  name to take the form :code:`{{localBucketName}}/{{objectname}}` in the MS Azure container.
* :code:`azureStorageAccountName`: Set to the MS Azure storage account to which your
  container belongs.
* :code:`azureStorageAccessKey`: One of the access keys associated with the
  above-defined MS Azure storage account.

.. code:: json

    (...)
    "azure-test": {
	"type": "azure",
        "legacyAwsBehavior": false,
        "details": {
          "azureStorageEndpoint": "https://zenkomeetups.blob.core.windows.net/",
	  "bucketMatch": true,
          "azureContainerName": "zenkontainer",
	  "azureStorageAccountName": "zenkomeetups",
	  "azureStorageAccessKey": "auhyDo8izbuU4aZGdhxnWh0ODKFP3IWjsN1UfFaoqFbnYzPj9bxeCVAzTIcgzdgqomDKx6QS+8ov8PYCON0Nxw=="
	}
    },
    (...)

*WARNING*
   If you set :code:`bucketMatch` to :code:`true`, you must maintain only one
   local bucket per AWS S3 location. If :code:`bucketMatch` is set :code:`true`,
   object names in the AWS S3 bucket are not prefixed with a CloudServer
   bucket name. When an object is put to the :code:`zenko1` CloudServer bucket
   and a different object with the same name is put to the :code:`zenko2`
   CloudServer bucket, both :code:`zenko1` and :code:`zenko2` point to the
   same AWS bucket, and the second object overwrites the first.

*TIP*
   You can export environment variables to override some of your
   :code:`locationConfig.json` variables. The syntax for these is
   :code:`{{region-name}}_{{ENV_VAR_NAME}}`. Currently available variables
   are shown below, with the values used in the present example:

.. code:: shell

      $> export azure-test_AZURE_STORAGE_ACCOUNT_NAME="zenkomeetups"
      $> export azure-test_AZURE_STORAGE_ACCESS_KEY="auhyDo8izbuU4aZGdhxnWh0ODKFP3IWjsN1UfFaoqFbnYzPj9bxeCVAzTIcgzdgqomDKx6QS+8ov8PYCON0Nxw=="
      $> export azure-test_AZURE_STORAGE_ENDPOINT="https://zenkomeetups.blob.core.windows.net/"

Start the Server With the Ability to Write to MS Azure
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Inside the repository, once all files have been edited, start
the server and begin writing data to MS Azure through CloudServer.

.. code:: shell

   # Start the server locally
   $> S3DATA=multiple npm start

Run the Server as a Docker Container that Can Write to MS Azure
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Mount all edited files to override defaults and do a standard Docker run.
Then start writing data to MS Azure through CloudServer.

.. code:: shell

   # Start the server in a Docker container
   $> sudo docker run -d --name CloudServer \
   -v $(pwd)/data:/usr/src/app/localData \
   -v $(pwd)/metadata:/usr/src/app/localMetadata \
   -v $(pwd)/locationConfig.json:/usr/src/app/locationConfig.json \
   -v $(pwd)/conf/authdata.json:/usr/src/app/conf/authdata.json \
   -e S3DATA=multiple -e ENDPOINT=http://localhost -p 8000:8000
   -d scality/s3server

Testing: Put an Object to MS Azure Using CloudServer
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To test pushing to MS Azure, create a local bucket in the MS Azure region.
This local bucket only stores metadata locally, while both the data and any
user metadata (:code:`x-amz-meta` headers sent with a PUT object and tags)
are stored on MS Azure. This example is based on the previous steps.

.. code:: shell

   # Create a local bucket storing data in MS Azure
   $> s3cmd --host=127.0.0.1:8000 mb s3://zenkontainer --region=azure-test
   # Put an object to MS Azure, and store the metadata locally
   $> s3cmd --host=127.0.0.1:8000 put /etc/hosts s3://zenkontainer/testput
    upload: '/etc/hosts' -> 's3://zenkontainer/testput'  [1 of 1]
     330 of 330   100% in    0s   380.87 B/s  done
   # List locally to check you have the metadata
   $> s3cmd --host=127.0.0.1:8000 ls s3://zenkobucket
    2017-10-24 14:38       330   s3://zenkontainer/testput

From the MS Azure console, go into the container to see the newly uploaded
object:

.. figure:: ../res/azure-console-successful-put.png
   :alt: MS Azure Console upload example

Troubleshooting
~~~~~~~~~~~~~~~

Make sure the :code:`~/.s3cfg` file's credentials match the local
CloudServer credentials defined in :code:`conf/authdata.json`. The default
access key is :code:`accessKey1` and the default secret key is
:code:`verySecretKey1`. See the `~/.s3cfg <./CLIENTS/#s3cmd>`__  template
for details.

CloudServer cannot access pre-existing objects in your MS Azure container.

Google Cloud Storage as a Data Backend
--------------------------------------

From the Google Cloud Console
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Create the necessary buckets to use Google Cloud Storage as a data backend:

* A main bucket set to storage class :code:`multi-regional`
* A multipart upload bucket set to storage class :code:`regional`
* An overflow bucket set to storage class :code:`multi-regional`

*NOTE*
  The main and overflow buckets of storage class :code:`multi-regional` must be
  set to the same location.

The buckets must have versioning enabled:

- This can be set using the cloud shell with command :code:`gsutil versioning on gs://${bucketname}`;
- With AWS CLI set to the google endpoint and credentials, use
  :code:`put-bucket-versioning` from the :code:`s3api` commands on your bucket of choice;

If using other tools, see those tools' documentation.

From the CloudServer Respository
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

locationConfig.json
^^^^^^^^^^^^^^^^^^^

Edit this file to add a new location constraint. This location constraint contains 
information for the Google Cloud Storage bucket to which you will write data whenever
you create a CloudServer bucket in this location. This file contains a few configurable
options:

- :code:`type`: Set to :code:`gcp` to write data to Google Cloud Storage.
- :code:`legacyAwsBehavior`: Set this constraint to :code:`true` to make this region
  behave like the AWS S3 :code:`us-east-1` region. Set it to :code:`false` to make 
  this region behave like any other AWS S3 region.
- :code:`bucketName`: Set to an *existing bucket different from mpuBucketName*
  *and overflowBucketName* in your Google Cloud account. This is the bucket in which
  data will be stored.
- :code:`mpuBucketName`: Set to an *existing bucket different from bucketName*
  *and overflowBucketName* in your Google Cloud Account. This is the bucket in which
  GCP multipart upload temporary objects will be stored;
- :code:`overflowBucketName`: Set to an *existing bucket different from bucketName*
  *and mpuBucketName* in your Google Cloud account. This is the bucket GCP multipart
  upload will use to perform the final compose operation.
- :code:`gcpEndpoint`: Set to your bucket's endpoint, usually :code:`storage.googleapis.com`;
- :code:`bucketMatch`: Set to :code:`true` for object names to be identical
  in the local and GCP buckets. Set to :code:`false` for object names to take the form
  :code:`{{localBucketName}}/{{objectname}}` in the GCP-hosted bucket.
- :code:`credentialsProfile` and :code:`credentials` are two ways to provide
  GCP credentials for the buckets. *Use only one!*
  	- :code:`credentialsProfile`: Set to the profile name allowing you to access your GCP bucket from your :code:`~/.aws/credentials` file.
  	- :code:`credentials`: Set the two fields inside the object (:code:`accessKey` and :code:`secretKey`) to their respective values from your GCP interopation credentials.
- :code:`serviceCredentials`: Set the fields inside the object (:code:`scopes`,
  :code:`keyFilename`, and/or both :code:`serviceEmail` and :code:`serviceKey`)
	- :code:`scopes`: Set to one of the following service scopes:
  (https://developers.google.com/identity/protocols/googlescopes#storagev1)
	- :code:`keyFilename`: Set to the full path of the GCP service keyfile.
	- :code:`serviceEmail`: Set to the service email in the GCP service keyfile.
	- :code:`serviceKey`: Set to the private key in the GCP service keyfile.

In this example, buckets are named :code:`zenkobucket`,
:code:`zenkobucketmpu`, :code:`zenkobucketoverflow` and versioning is enabled.

.. code:: json

    (...)
    "gcp-test": {
        "type": "gcp",
        "legacyAwsBehavior": true,
        "details": {
            "gcpEndpoint": "storage.googleapis.com",
            "bucketName": "zenkobucket",
            "mpuBucketName": "zenkobucketmpu",
            "overflowBucketName": "zenkobucketoverflow",
            "bucketMatch": true,
            "credentialsProfile": "zenko",
            "serviceCredentials": {
                "scopes": "google cloud service scope",
                "keyFilename": "/full/path/to/service/key",
                "serviceEmail": "serviceaccount@email",
                "serviceKey": "privateKey"
            }
        }
    },
    (...)

.. code:: json

    (...)
    "gcp-test": {
        "type": "gcp",
        "legacyAwsBehavior": true,
        "details": {
            "gcpEndpoint": "storage.googleapis.com",
            "bucketName": "zenkobucket",
            "mpuBucketName": "zenkobucketmpu",
            "overflowBucketName": "zenkobucketoverflow",
            "bucketMatch": true,
            "credentials": {
                "accessKey": "WHDBFKILOSDDVF78NPMQ",
                "secretKey": "87hdfGCvDS+YYzefKLnjjZEYstOIuIjs/2X72eET"
            },
            "serviceCredentials": {
                "scopes": "google cloud service scope",
                "keyFilename": "/full/path/to/service/key",
                "serviceEmail": "serviceaccount@email",
                "serviceKey": "privateKey"
            }
        }
    },
    (...)

*WARNING*
   If you set :code:`bucketMatch` to :code:`true`, maintain only one local
   bucket per GCP location. If :code:`bucketMatch` is set :code:`true`,
   object names in the GCP bucket are not prefixed with a CloudServer
   bucket name. When an object is put to the :code:`zenko1` CloudServer bucket
   and a different object with the same name is put to the :code:`zenko2`
   CloudServer bucket, both :code:`zenko1` and :code:`zenko2` point to the
   same AWS bucket, and the second object overwrites the first.

For Any Data Backend
--------------------

From the CloudServer Repository
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

config.json
^^^^^^^^^^^

.. IMPORTANT::
   Only follow this section to define a given location as the default for
   a specific endpoint.

Edit the :code:`restEndpoint` section of the :code:`config.json` file to add an
endpoint definition that matches your desired default endpoint location.

In this example, :code:`custom-location` is the default location for the
endpoint :code:`zenkotos3.com`:

.. code:: json

    (...)
    "restEndpoints": {
        "localhost": "us-east-1",
        "127.0.0.1": "us-east-1",
        "cloudserver-front": "us-east-1",
        "s3.docker.test": "us-east-1",
        "127.0.0.2": "us-east-1",
        "zenkotos3.com": "custom-location"
    },
    (...)
