var express = require('express');
var router = express.Router();
var db = require('../firebase'); 


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
module.exports = router;
