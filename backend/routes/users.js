var express = require('express');
var router = express.Router();
var db = require('../firebase');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/* GET user allergies/intolerances from Firestore */
router.get('/:userId/allergies', async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // NEW: separate arrays
    const allergens = userData.allergens || [];
    const intolerances = userData.intolerances || [];

    // Return both
    res.json({ allergens, intolerances });

  } catch (error) {
    console.error("Error fetching user allergies/intolerances:", error);
    res.status(500).json({ error: 'Failed to fetch allergies/intolerances' });
  }
});

/* POST set user allergies/intolerances in Firestore */
router.post('/:userId/allergies', async (req, res) => {
  try {
    const { userId } = req.params;
    const { allergens, intolerances } = req.body; // Expecting two arrays

    if (!Array.isArray(allergens) || !Array.isArray(intolerances)) {
      return res.status(400).json({ error: 'Allergens and intolerances must be arrays' });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Save both arrays, merge if doc exists
    await userRef.set({ 
      allergens,
      intolerances
    }, { merge: true });

    res.json({ message: "Allergens and intolerances updated successfully", allergens, intolerances });

  } catch (error) {
    console.error("Error setting user allergies/intolerances:", error);
    res.status(500).json({ error: 'Failed to update allergies/intolerances' });
  }
});

module.exports = router;
