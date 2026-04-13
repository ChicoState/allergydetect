var express = require('express');
var router = express.Router();
var db = require('../firebase');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/* GET user allergies from Firestore
   Returns: { allergies: { low: [...], high: [...], ... } }
*/
router.get('/:userId/allergies', async (req, res) => {
  try {
    const { userId } = req.params;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const allergies = userDoc.data().allergies || {};
    res.json({ allergies });
  } catch (error) {
    console.error('Error fetching user allergies:', error);
    res.status(500).json({ error: 'Failed to fetch allergies' });
  }
});

/* POST replace the entire allergies object
   Body: { allergies: { low: ["peanuts"], high: ["dairy"] } }
*/
router.post('/:userId/allergies', async (req, res) => {
  try {
    const { userId } = req.params;
    const { allergies } = req.body;

    if (!allergies || typeof allergies !== 'object' || Array.isArray(allergies)) {
      return res.status(400).json({ error: 'allergies must be an object keyed by severity' });
    }

    for (const [severity, list] of Object.entries(allergies)) {
      if (!Array.isArray(list)) {
        return res.status(400).json({ error: `Value for severity "${severity}" must be an array` });
      }
    }

    await db.collection('users').doc(userId).set({ allergies }, { merge: true });
    res.json({ message: 'Allergies updated', allergies });
  } catch (error) {
    console.error('Error setting user allergies:', error);
    res.status(500).json({ error: 'Failed to update allergies' });
  }
});

/* POST add a single allergy under a severity level
   Body: { allergy: "peanuts", severity: "Low" }
*/
router.post('/:userId/allergies/add', async (req, res) => {
  try {
    const { userId } = req.params;
    const { allergy, severity } = req.body;

    if (!allergy || typeof allergy !== 'string') {
      return res.status(400).json({ error: 'allergy (string) is required' });
    }
    if (!severity || typeof severity !== 'string') {
      return res.status(400).json({ error: 'severity (string) is required' });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    const existing = userDoc.exists ? (userDoc.data().allergies || {}) : {};

    // Check if allergy already exists under any severity
    for (const [sev, list] of Object.entries(existing)) {
      if (list.includes(allergy)) {
        return res.status(409).json({ error: `Allergy already exists under severity "${sev}"` });
      }
    }

    const updatedList = [...(existing[severity] || []), allergy];
    const updated = { ...existing, [severity]: updatedList };

    await userRef.set({ allergies: updated }, { merge: true });
    res.json({ message: 'Allergy added', allergies: updated });
  } catch (error) {
    console.error('Error adding allergy:', error);
    res.status(500).json({ error: 'Failed to add allergy' });
  }
});

/* PUT update a single allergy (rename or change severity)
   Body: { allergy: "peanuts", oldSeverity: "low", newAllergy: "peanuts", newSeverity: "high" }
   - To rename: change newAllergy
   - To move severity: change newSeverity
   - To do both: change both
*/
router.put('/:userId/allergies', async (req, res) => {
  try {
    const { userId } = req.params;
    const { allergy, oldSeverity, newAllergy, newSeverity } = req.body;

    if (!allergy || !oldSeverity || !newAllergy || !newSeverity) {
      return res.status(400).json({ error: 'allergy, oldSeverity, newAllergy, and newSeverity are required' });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = userDoc.data().allergies || {};

    if (!existing[oldSeverity] || !existing[oldSeverity].includes(allergy)) {
      return res.status(404).json({ error: `Allergy "${allergy}" not found under severity "${oldSeverity}"` });
    }

    // Remove from old severity
    const updated = { ...existing };
    updated[oldSeverity] = updated[oldSeverity].filter(a => a !== allergy);
    if (updated[oldSeverity].length === 0) delete updated[oldSeverity];

    // Add to new severity
    updated[newSeverity] = [...(updated[newSeverity] || []), newAllergy];

    await userRef.update({ allergies: updated });
    res.json({ message: 'Allergy updated', allergies: updated });
  } catch (error) {
    console.error('Error updating allergy:', error);
    res.status(500).json({ error: 'Failed to update allergy' });
  }
});

/* DELETE remove a single allergy
   Body: { allergy: "peanuts", severity: "low" }
*/
router.delete('/:userId/allergies', async (req, res) => {
  try {
    const { userId } = req.params;
    const { allergy, severity } = req.body;

    if (!allergy || !severity) {
      return res.status(400).json({ error: 'allergy and severity are required' });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = userDoc.data().allergies || {};

    if (!existing[severity] || !existing[severity].includes(allergy)) {
      return res.status(404).json({ error: `Allergy "${allergy}" not found under severity "${severity}"` });
    }

    const updated = { ...existing };
    updated[severity] = updated[severity].filter(a => a !== allergy);
    if (updated[severity].length === 0) delete updated[severity];

    await userRef.update({ allergies: updated });
    res.json({ message: 'Allergy removed', allergies: updated });
  } catch (error) {
    console.error('Error deleting allergy:', error);
    res.status(500).json({ error: 'Failed to delete allergy' });
  }
});

module.exports = router;

/*
GET all allergies
  - Method: GET
  - URL: http://localhost:3000/users/{userId}/allergies
  - No body needed

  ---
  POST replace all allergies
  - Method: POST
  - URL: http://localhost:3000/users/{userId}/allergies
  - Body:
  {
    "allergies": {
      "low": ["peanuts", "shellfish"],
      "high": ["dairy"]
    }
  }

  ---
  POST add one allergy
  - Method: POST
  - URL: http://localhost:3000/users/{userId}/allergies/add
  - Body:
  {
    "allergy": "gluten",
    "severity": "low"
  }

  ---
  PUT update an allergy
  - Method: PUT
  - URL: http://localhost:3000/users/{userId}/allergies
  - Body:
  {
    "allergy": "peanuts",
    "oldSeverity": "low",
    "newAllergy": "peanuts",
    "newSeverity": "high"
  }

  ---
  DELETE one allergy
  - Method: DELETE
  - URL: http://localhost:3000/users/{userId}/allergies
  - Body:
  {
    "allergy": "gluten",
    "severity": "low"
  }
*/
