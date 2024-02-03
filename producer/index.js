console.log('producer...')
const Kafka = require('node-rdkafka');
const eventType = require('../eventType')



// Our producer with its Kafka brokers
// This call returns a new writable stream to our topic 'test'
const stream = Kafka.Producer.createWriteStream({
    'metadata.broker.list': 'localhost:9092'
  }, {}, {
    topic: 'test'
  });

// Writes a message to the stream
function getRandomAnimal() {
    const categories = ['CAT', 'DOG']
    return categories[Math.floor(Math.random() * categories.length)]
}

function getRandomeNoise(category){
   return category === 'DOG' ? 'bark' : 'meow'

}

function queueMessage() {
    const category = getRandomAnimal()
    const noise = getRandomeNoise(category)
    const event = { category, noise}
    const queuedSuccess = stream.write(eventType.toBuffer(event));
    if (queuedSuccess) {
        console.log(`We queued our message!: ${event}`);
      } else {
        // Note that this only tells us if the stream's queue is full,
        // it does NOT tell us if the message got to Kafka!  See below...
        console.log('Too many messages in our queue already');
      }
}

// NOTE: MAKE SURE TO LISTEN TO THIS IF YOU WANT THE STREAM TO BE DURABLE
// Otherwise, any error will bubble up as an uncaught exception.
stream.on('error', (err) => {
  // Here's where we'll know if something went wrong sending to Kafka
  console.error('Error in our kafka stream');
  console.error(err);
})

setInterval(() => {
    queueMessage();
}, 3000)
