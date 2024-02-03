const avro = require('avsc');

module.exports = avro.Type.forSchema({
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
