const fs = require('fs');
const path = require('path');

const allergyFilePath = path.join(__dirname, '../allergies.json');

if (!fs.existsSync(allergyFilePath)) {
  fs.writeFileSync(allergyFilePath, JSON.stringify([]));
}

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
  .map(i => i.trim().toLowerCase());

// Load saved allergies
let savedAllergies = [];

if (fs.existsSync(allergyFilePath)) {
  savedAllergies = JSON.parse(fs.readFileSync(allergyFilePath));
}

// Compare
const matches = ingredients.filter(ingredient =>
  savedAllergies.some(allergy =>
    ingredient.includes(allergy.toLowerCase())
  )
);

res.json({
  ingredients,
  contains: matches
});

} catch (error) {
console.error('Error fetching UPC data:', error);
res.status(500).json({ error: 'Failed to fetch ingredients' });
}
});

router.post('/allergies', (req, res) => {
  const { allergies } = req.body;

  if (!Array.isArray(allergies)) {
    return res.status(400).json({ error: 'Allergies must be an array' });
  }

  fs.writeFileSync(allergyFilePath, JSON.stringify(allergies, null, 2));

  res.json({ message: 'Allergies saved' });
});


module.exports = router;
