var express = require('express');
var router = express.Router();
var db = require('../firebase');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/* GET user allergies from Firestore */
router.get('/:userId/allergies', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

   const userDoc = await db.collection('users').doc(userId).get();

if (!userDoc.exists) {
  return res.status(404).json({ message: "User not found." });
}

// Access the array field named 'allergies'
const userData = userDoc.data();
const allergies = userData.allergies || []; 

res.json({ allergies });
  } catch (error) {
    console.error("Error fetching user allergies:", error);
    res.status(500).json({ error: 'Failed to fetch allergies' });
  }
});

/* POST set user allergies in Firestore */
router.post('/:userId/allergies', async (req, res) => {
  try {
    const { userId } = req.params;
    const { allergies } = req.body; // Expecting { Death: ["Peanuts"], discomfort: ["Dairy"] }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!allergies || typeof allergies !== 'object' || Array.isArray(allergies)) {
      return res.status(400).json({ error: 'Allergies must be provided as an object' });
    }

    if (allergies.Death && !Array.isArray(allergies.Death)) {
      return res.status(400).json({ error: 'Death allergies must be an array' });
    }

    if (allergies.discomfort && !Array.isArray(allergies.discomfort)) {
      return res.status(400).json({ error: 'Discomfort allergies must be an array' });
    }

    const userRef = db.collection('users').doc(userId);

    // .set with merge: true merges nested fields. 
    // Updating only 'Death' will leave an existing 'discomfort' array intact.
    await userRef.set({ 
      allergies: allergies 
    }, { merge: true });

    res.json({ message: "Allergies updated successfully", allergies });
  } catch (error) {
    console.error("Error setting user allergies:", error);
    res.status(500).json({ error: 'Failed to update allergies' });
  }
});

module.exports = router;
