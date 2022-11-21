const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require("mongodb");
require('dotenv').config();
const port = process.env.PORT || 5000;


const app = express();

// middleware
app.use(cors());
app.use(express.json());

// mongodb user connect
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bhp2qs5.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// mongodb database connect
async function run(){
    try{
        const appointmentOptionCollection = client.db("doctorsPortal").collection('appointmentOptions');
        const bookingsCollection = client.db("doctorsPortal").collection('bookings');

        app.get('/appointmentOptions', async(req, res) =>{
            const date = req.query.date;
            // console.log(date)
            const query = {};
            const options = await appointmentOptionCollection.find(query).toArray();
            const bookingQuery = { appointmentDate: date };
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();
            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
                const bookedSlots = optionBooked.map(book => book.slot)
                console.log(date, option.name, bookedSlots)
            })
            res.send(options)
        });

        // add booking data
        app.post('/bookings', async(req, res) => {
            const booking = req.body;
            // console.log(booking);
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })
    }
    finally{

    }
}
run().catch(console.log())


app.get('/', async(req, res) =>{
    res.send('doctor portal server is running');
});

app.listen(port , () =>{
    console.log(`Doctors portal running on ${port}`);
    
})