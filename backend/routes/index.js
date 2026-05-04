var express = require('express');
var router = express.Router();
var getDb = require('../firebase');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

router.get('/data', async (req, res) => {
  try {
    const db = await getDb();
    const colRef = db.collection('test_data');
    const snapshot = await colRef.get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'No documents found.' });
    }

    const allDocs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(allDocs);
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).send(error.message);
  }
});

/* GET recent scans for a user */
router.get('/users/:userId/scans', async (req, res) => {
  try {
    const db = await getDb();
    const { userId } = req.params;

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const scansSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('scans')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const scans = scansSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ scans });
  } catch (error) {
    console.error('Error fetching recent scans:', error);
    return res.status(500).json({ error: 'Failed to fetch recent scans' });
  }
});

router.get('/ingredients/:upc/:userId', async (req, res) => {
  const { upc, userId } = req.params;

  if (!upc || !userId) {
    return res.status(400).json({ error: 'UPC and userId are required' });
  }

  try {
    const db = await getDb();

    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`
    );
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: 'No item found for this UPC' });
    }

    const item = data.items[0];
    const productName = item.title || item.brand || `UPC ${upc}`;
    const rawDescription = item.description || '';

    const ingredients = rawDescription
      .split(',')
      .map(i => i.trim().toLowerCase())
      .filter(i => i.length > 0);

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data() || {};
    const allergens = (userData.allergens || []).map(a => a.toLowerCase());
    const intolerances = (userData.intolerances || []).map(i => i.toLowerCase());

    const matchesAllergens = ingredients.filter(ingredient =>
      allergens.some(allergy => ingredient.includes(allergy))
    );

    const matchesIntolerances = ingredients.filter(ingredient =>
      intolerances.some(intolerance => ingredient.includes(intolerance))
    );

    const safe = matchesAllergens.length === 0;

    const scanResult = {
      upc,
      name: productName,
      ingredients,
      allergens,
      intolerances,
      containsAllergens: matchesAllergens,
      containsIntolerances: matchesIntolerances,
      safe,
      status:
        matchesAllergens.length > 0
          ? 'allergen'
          : matchesIntolerances.length > 0
          ? 'intolerance'
          : 'safe',
      createdAt: new Date().toISOString(),
    };

    await db
      .collection('users')
      .doc(userId)
      .collection('scans')
      .add(scanResult);

    return res.json(scanResult);
  } catch (error) {
    console.error('Error fetching UPC data:', error);
    return res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

module.exports = router;
