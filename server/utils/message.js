const moment = require('moment');

const  generateMessage = (from , text ) => {
  return {
      from,
      text,
      createAt: moment().valueOf()
  };
};
const generateLocationMessage = (from,latitude, longitude) => {
  return {
    from,
    url:`http://www.google.com/maps?q=${latitude},${longitude}`,
    createAt: moment().valueOf()
  };
};
module.exports = {generateMessage,generateLocationMessage}; 
