var express = require('express');
const cors = require('cors');
var router = express.Router();
var db = require('../firebase');

router.use(cors());


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


router.get('/data', async (req, res) => {
  try {
    const colRef = db.collection('test_data');
    const snapshot = await colRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "No documents found." });
    }

    // Map through the documents to create an array of data
    const allDocs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(allDocs);
} catch (error) {
    console.error("Error fetching collection:", error);
    res.status(500).send(error.message);
}
});

router.get('/ingredients/:upc', async (req, res) => {
const upc = req.params.upc;

if (!upc) {
return res.status(400).json({ error: 'UPC code is required' });
}

try {
const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`);
const data = await response.json();

if (!data.items || data.items.length === 0) {
return res.status(404).json({ error: 'No item found for this UPC' });
}

const ingredients = data.items[0].description
.split(',')
.map(i => i.trim());

res.json({ ingredients });
} catch (error) {
console.error('Error fetching UPC data:', error);
res.status(500).json({ error: 'Failed to fetch ingredients' });
}
});


module.exports = router;
