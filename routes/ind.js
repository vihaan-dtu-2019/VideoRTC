const express = require('express');
const router = express.Router();

const speech = require('@google-cloud/speech');
const fs = require('fs');
var lexrank = require('lexrank');


// Creates a client


const client = new speech.SpeechClient({
    projectId: 'leafy-antonym-231214',
    keyFile:'./routes/keys.json'

});

// The name of the audio file to transcribe
const fileName = './public/uploads/geeks.wav';

// Reads a local audio file and converts it to base64
const file = fs.readFileSync(fileName);
const audioBytes = file.toString('base64');

// The audio file's encoding, sample rate in hertz, and BCP-47 language code
const audio = {
  content: audioBytes,
};
const config = {
  encoding: 'LINEAR16',
  languageCode: 'en-US',
  
};
const request = {
  audio: audio,
  config: config,
};

// Detects speech in the audio file
var transcription;
 client
  .recognize(request)
  .then(data => {
    const response = data[0];
     transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    console.log(`Transcription: ${transcription}`);
   //writing file to article
    fs.appendFileSync('article.txt',transcription);
    //reading it from article
    fs.readFile('article.txt', (err,result) =>{
        if(err)
        {
            console.log(err);
        }
    var originalText = result.toString();
    var topLines = lexrank.summarize(originalText, 3, function (err, toplines, text) {
        if (err) {
          console.log(err);
        }
        console.log(toplines);
        for(var i =0; i < toplines.length; i++)
        {
        fs.appendFileSync('./public/notes.txt',toplines[i].text.toString());
        }
      });
      
    });
  })
  .catch(err => {
    console.error('ERROR:', err);
  });

router.get('/getnotes', (req,res) => {

})