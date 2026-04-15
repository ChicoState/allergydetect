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

router.get('/ingredients/:upc/:userId', async (req, res) => {
  const { upc, userId } = req.params;

  if (!upc || !userId) {
    return res.status(400).json({ error: 'UPC and userId are required' });
  }

  try {
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`
    );
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: 'No item found for this UPC' });
    }

    const rawDescription = data.items[0].description || "";

    const ingredients = rawDescription
      .split(',')
      .map(i => i.trim().toLowerCase())
      .filter(i => i.length > 0);

    // Get allergens & intolerances from Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const allergens = (userData.allergens || []).map(a => a.toLowerCase());
    const intolerances = (userData.intolerances || []).map(i => i.toLowerCase());

    // Compare ingredients
    const matchesAllergens = ingredients.filter(ingredient =>
      allergens.some(allergy => ingredient.includes(allergy))
    );

    const matchesIntolerances = ingredients.filter(ingredient =>
      intolerances.some(intolerance => ingredient.includes(intolerance))
    );

    // Return structured response
    res.json({
      upc,
      ingredients,
      allergens,
      intolerances,
      containsAllergens: matchesAllergens,
      containsIntolerances: matchesIntolerances,
      safe: matchesAllergens.length === 0
    });

  } catch (error) {
    console.error('Error fetching UPC data:', error);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

module.exports = router;
