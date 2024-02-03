console.log('consumer...')
const Kafka = require('node-rdkafka');
const eventType = require('../eventType')


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
    console.log(`received message: ${eventType.fromBuffer(data.value)}`)
})
