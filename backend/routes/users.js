var express = require('express');
var router = express.Router();
var admin = require('firebase-admin');
var getDb = require('../firebase');

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

/* GET users listing. */
router.get('/', function(req, res) {
  res.send('respond with a resource');
});

/* GET user allergies/intolerances from Firestore */
router.get('/:userId/allergies', async (req, res) => {
  try {
    const db = await getDb();
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data() || {};
    const allergens = userData.allergens || [];
    const intolerances = userData.intolerances || [];

    return res.json({ allergens, intolerances });
  } catch (error) {
    console.error('Error fetching user allergies/intolerances:', error);
    return res.status(500).json({ error: 'Failed to fetch allergies/intolerances' });
  }
});

/* POST replace full user allergies/intolerances in Firestore */
router.post('/:userId/allergies', async (req, res) => {
  try {
    const db = await getDb();
    const { userId } = req.params;
    const { allergens, intolerances } = req.body;

    if (!Array.isArray(allergens) || !Array.isArray(intolerances)) {
      return res.status(400).json({ error: 'Allergens and intolerances must be arrays' });
    }

    const normalizedAllergens = allergens
      .map(normalizeName)
      .filter(Boolean);

    const normalizedIntolerances = intolerances
      .map(normalizeName)
      .filter(Boolean);

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.set(
      {
        allergens: normalizedAllergens,
        intolerances: normalizedIntolerances,
      },
      { merge: true }
    );

    return res.json({
      message: 'Allergens and intolerances updated successfully',
      allergens: normalizedAllergens,
      intolerances: normalizedIntolerances,
    });
  } catch (error) {
    console.error('Error setting user allergies/intolerances:', error);
    return res.status(500).json({ error: 'Failed to update allergies/intolerances' });
  }
});

/* POST add one allergen */
router.post('/:userId/allergens', async (req, res) => {
  try {
    const db = await getDb();
    const { userId } = req.params;
    const normalizedName = normalizeName(req.body?.name);

    if (!normalizedName) {
      return res.status(400).json({ error: 'Allergen name is required' });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.set(
      {
        allergens: admin.firestore.FieldValue.arrayUnion(normalizedName),
      },
      { merge: true }
    );

    const updatedDoc = await userRef.get();
    const data = updatedDoc.data() || {};

    return res.json({
      message: 'Allergen added successfully',
      allergens: data.allergens || [],
      intolerances: data.intolerances || [],
    });
  } catch (error) {
    console.error('Error adding allergen:', error);
    return res.status(500).json({ error: 'Failed to add allergen' });
  }
});

/* DELETE remove one allergen */
router.delete('/:userId/allergens/:name', async (req, res) => {
  try {
    const db = await getDb();
    const { userId } = req.params;
    const normalizedName = normalizeName(req.params.name);

    if (!normalizedName) {
      return res.status(400).json({ error: 'Allergen name is required' });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.set(
      {
        allergens: admin.firestore.FieldValue.arrayRemove(normalizedName),
      },
      { merge: true }
    );

    const updatedDoc = await userRef.get();
    const data = updatedDoc.data() || {};

    return res.json({
      message: 'Allergen removed successfully',
      allergens: data.allergens || [],
      intolerances: data.intolerances || [],
    });
  } catch (error) {
    console.error('Error removing allergen:', error);
    return res.status(500).json({ error: 'Failed to remove allergen' });
  }
});

/* POST add one intolerance */
router.post('/:userId/intolerances', async (req, res) => {
  try {
    const db = await getDb();
    const { userId } = req.params;
    const normalizedName = normalizeName(req.body?.name);

    if (!normalizedName) {
      return res.status(400).json({ error: 'Intolerance name is required' });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.set(
      {
        intolerances: admin.firestore.FieldValue.arrayUnion(normalizedName),
      },
      { merge: true }
    );

    const updatedDoc = await userRef.get();
    const data = updatedDoc.data() || {};

    return res.json({
      message: 'Intolerance added successfully',
      allergens: data.allergens || [],
      intolerances: data.intolerances || [],
    });
  } catch (error) {
    console.error('Error adding intolerance:', error);
    return res.status(500).json({ error: 'Failed to add intolerance' });
  }
});

/* DELETE remove one intolerance */
router.delete('/:userId/intolerances/:name', async (req, res) => {
  try {
    const db = await getDb();
    const { userId } = req.params;
    const normalizedName = normalizeName(req.params.name);

    if (!normalizedName) {
      return res.status(400).json({ error: 'Intolerance name is required' });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.set(
      {
        intolerances: admin.firestore.FieldValue.arrayRemove(normalizedName),
      },
      { merge: true }
    );

    const updatedDoc = await userRef.get();
    const data = updatedDoc.data() || {};

    return res.json({
      message: 'Intolerance removed successfully',
      allergens: data.allergens || [],
      intolerances: data.intolerances || [],
    });
  } catch (error) {
    console.error('Error removing intolerance:', error);
    return res.status(500).json({ error: 'Failed to remove intolerance' });
  }
});

module.exports = router;
