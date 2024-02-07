# node-kafka

## Intro 

### Why use Kafka?

When dealing with data in decoupled services like with microservices architecture, we need a shared datasource. However as Sam Newman (author of 'Building Microservices') describes in his foreward to Ben Stopford's book 'Designing Event-Driven Systems' explains;

><em>"A database creates a huge coupling point in your architecture. It becomes difficult to understand what changes can be made to a schema shaed by multiple services".</em>

For example;

Also, if you are dealing with data that you need fast with a CQRS (command query responsibility segregation) pattern, 

## 1. Setup Kafka:

create a ```docker-compose.yml``` file and configure kafka and zookeeper

```.yml
version: "3"
services:
  zookeeper:
    image: 'bitnami/zookeeper:latest'
    ports:
      - '2181:2181'
    environment:
      - ALLOW_ANONYMOUS_LOGIN=yes
  kafka:
    image: 'bitnami/kafka:latest'
    container_name: 'kafka'
    ports:
      - '9092:9092'
    environment:
      - KAFKA_BROKER_ID=1
      - KAFKA_LISTENERS=PLAINTEXT://:9092
      - KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://127.0.0.1:9092
      - KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181
      - ALLOW_PLAINTEXT_LISTENER=yes
    depends_on:
      - zookeeper
```

Then in your terminal run the following to setup the kafka environment:
```
docker compose up
```
Setup the node project with npm:
```
npm init -y
```

Shell into your kafka container and create a new topic named 'test'
```
docker exec -it kafka /opt/bitnami/kafka/bin/kafka-topics.sh \
--create \
--bootstrap-server localhost:9092 \
--replication-factor 1 \
--partitions 1 \
--topic test
```


## 2. Setup producer and consumer

Producer and Consumer can be in any language. For simplicity we will use NodeJS for both

```
$: mkdir producer
$: cd producer
$: /producer touch index.js
```

```
$: mkdir consumer
$: cd consumer
$: /consumer touch index.js
```

create start scripts for producer and consumer in the package.json script

```.js
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start:producer": "node ./producer/index.js",
    "start:consumer": "node ./consumer/index.js"
  },
```
you can check that this runs successfully:
```
npm run start:producer
```
Kafka is not easy to use with JS, so we are going to use the package [node-rdkafka](https://www.npmjs.com/package/node-rdkafka) to manage kafka for us and [AVSC](https://www.npmjs.com/package/avsc) to serialise and deserialise our data (to handle object data, etc.).

You can install them both using
```
npm i node-rdkafka avsc
```
Do go through both docs especially the ```node-rdkafka```, it will come in handy later.

## 3. Create the producer


In producer/index.js

Import ```node-rdkafka```

```js
console.log('producer...')
const Kafka = require('node-rdkafka');
```

The kafka container running in docker has an API that we can connect to. Connect to the broker (the container/ Virtual Machine/ Cloud instance) and the topic. In our case, the broker would be the kafka container running on localhost:9092, and the topic we created was 'test'.

```js
const stream = Kafka.Producer.createWriteStream({
    'metadata.broker.list': 'localhost:9092'
  }, {}, {
    topic: 'test'
  });
```
and write a message to the stream, with some error handling. This part is straight from the Stream API part of the node-rdkafka docs.
```js
// Writes a message to the stream
const queuedSuccess = stream.write(Buffer.from('Awesome message'));

if (queuedSuccess) {
  console.log('We queued our message!');
} else {
  // Note that this only tells us if the stream's queue is full,
  // it does NOT tell us if the message got to Kafka!  See below...
  console.log('Too many messages in our queue already');
}

// NOTE: MAKE SURE TO LISTEN TO THIS IF YOU WANT THE STREAM TO BE DURABLE
// Otherwise, any error will bubble up as an uncaught exception.
stream.on('error', (err) => {
  // Here's where we'll know if something went wrong sending to Kafka
  console.error('Error in our kafka stream');
  console.error(err);
})

```

## 4. Create the Consumer

As before, import kafka as per the node-rdkafka docs. In this example we are going to use 'flowing mode' as in the docs.

```js
const Kafka = require('node-rdkafka');


const consumer = new Kafka.KafkaConsumer({
    'group.id': 'kafka',
    'metadata.broker.list': 'localhost:9092',
  }, {});
  // Flowing mode
consumer.connect();

```
Then create a consumer class, connect it to the appropriate topic in the ```consumer.subscribe``` method. You can connect to many topics, which is why it should be in an array. For now we will only connect to one topic, 'test'. Let's also log what we receive:

```js
const consumer = new Kafka.KafkaConsumer({
    'group.id': 'kafka',
    'metadata.broker.list': 'localhost:9092',
  }, {});
  // Flowing mode
consumer.connect();

consumer.on('ready', () => {
    console.log('consumer ready...')
    consumer.subscribe(['test']) //subscribe to topics
    consumer.consume();
}).on('data', (data) => {
    console.log(`received message: ${data.value.toString}`)
})
```

### Check it works

Check that the the consumer is receiving data from Kafka, and reading the data that is written to Kafka by the producer by starting the producer and consumer in 2 different terminals.

## 5. Event Schemas

We can now introduce an schema to our event data using the avsc module.

create a new file called ```eventType.js```

Here is a slightly modified example from the AVSC docs:

```js
const avro = require('avsc');

export default avro.Type.forSchema({
    type: 'record',
    name: 'Pet',
    fields: [
      {
        name: 'category',
        type: {type: 'enum', name: 'PetKind', symbols: ['CAT', 'DOG']}
      },
      {
        name: 'noise', type: 'string'
    }
    ]
  });
```
Import the schema to the producer

In producer/index.js

```js
const eventType = require('../eventType')
```