var expect = require('expect');

var { generateMessage ,generateLocationMessage } = require('./message');

describe('generateMessage', () => {
    it('should generate correct message object',() => {
   var from  = 'HK';
   var text = 'some message';
   var message = generateMessage( from, text);
    
   expect(typeof message.createAt).toBe('number');
   expect(message).toMatchObject({from,text});
    //store res in value
    //assert from match
    //assert text match
    //assert createAT is number
    });
});
    describe('generateLocationMessage', () => {
        it('should generate correct location object',() => {
       var from  = 'hk';
       var latitude = '15';
       var longitude ='19';
       var url = 'http://www.google.com/maps?q=15,19'
        var message = generateLocationMessage(from,latitude,longitude);

       expect(typeof message.createAt).toBe('number');
       expect(message).toMatchObject({from,url});
        
        });
})
