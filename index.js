const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require('jsonwebtoken');
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
        const usersCollection = client.db("doctorsPortal").collection('users');

        app.get('/appointmentOptions', async(req, res) =>{
            const date = req.query.date;
            // console.log(date)
            const query = {};
            const options = await appointmentOptionCollection.find(query).toArray();

            const bookingQuery = { appointmentDate: date };
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();

            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
                const bookedSlots = optionBooked.map(book => book.slot);
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
                option.slots = remainingSlots;
                // console.log(date, option.name, remainingSlots.length)
            })
            res.send(options)
        });

        // version api system
        app.get("/v2/appointmentOptions", async(req, res) =>{
            const date = req.query.date;
            const options = await appointmentOptionCollection.aggregate([
              {
                $lookup: {
                    from: "bookings",
                    localField: "name",
                    foreignField: "treatment",
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$appointmentDate', date]
                                }
                            }
                        }
                    ],
                    as: 'booked'
                },
              },
              {
                $project: {
                    name: 1,
                    slots: 1,
                    booked: {
                        $map: {
                            input: '$booked',
                            as: 'book',
                            in: '$$book.slot'
                        }
                    }
                }
              },
              {
                $project: {
                    name: 1,
                    slots: {
                        $setDifference: ['$slots', '$booked']
                    }
                }
              }
            ]).toArray();
            res.send(options);
        });

        // get booking
        app.get('/bookings', async(req, res) => {
            const email = req.query.email;
            const query = {email: email};
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        })

        // add booking data
        app.post('/bookings', async(req, res) => {
            const booking = req.body;
            // console.log(booking);
            const query ={
                appointmentDate: booking.appointmentDate,
                email: booking.email,
                treatment: booking.treatment
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();
            if(alreadyBooked.length){
                const message = `You already have a booking on ${booking.appointmentDate}`;
                return res.send({acknowledged: false, message})
            }

            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        // insert/create user
        app.post('/users', async(req, res) =>{
            const user = req.body;
            const result = await usersCollection.insertOne(user);
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