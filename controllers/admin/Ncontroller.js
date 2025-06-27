const fs = require('fs');
const path = require('path');
const newModel = require(`../../models/newMobileDB`);

exports.postNaddMobile = (req, res, next) => {
  // N controller
    const {Nname,Nprice,Ndiscount,Nmrp} = req.body ;
    const Nimage = req.file ? req.file.filename : null; // ✅ multer से आने वाला image filename
    const Nmobile = new newModel({Nname,Nprice,Nimage,Ndiscount, Nmrp});
    Nmobile.save().then(() => {
    })
    res.render(`admin/mobileAdded`);
};



exports.postDeleteNmobile = (req, res, next) => {
  const NmobileId = req.params.NmobileId;

  
  newModel.findByIdAndDelete(NmobileId)
      .then(deletedMobile => {
        if (!deletedMobile) {
          throw new Error('Mobile not found');
        }
  
        // Delete the associated image
        const imagePath = path.join(__dirname, '../../public/uploads', deletedMobile.Nimage);
        fs.unlink(imagePath, err => {
          if (err) {
            console.error('Failed to delete image file:', err);
            // Not fatal, we proceed
          }
        });
  
        res.redirect('/Admin/mobileList');
      })
      .catch(err => {
        console.error('Error during mobile delete:', err);
        res.status(500).send('Failed to delete mobile.');
      });
};

