const fs = require('fs');
const path = require('path');
const accessoryModel = require(`../../models/accessoryDB`);

exports.postAaddMobile = (req, res, next) => {
  // A controller
    const {Aname,Aprice,Adiscount, _id,Amrp} = req.body ;
    const Aimage = req.file ? req.file.filename : null; // ✅ multer से आने वाला image filename
    const accessory = new accessoryModel({Aname,Aprice,Aimage,Adiscount,Amrp});
    accessory.save().then(() => {
    })
    res.render(`admin/mobileAdded`);
};



exports.postDeleteAmobile = (req, res, next) => {
  const accessoryId = req.params.accessoryId;
  

  accessoryModel.findByIdAndDelete(accessoryId)
     .then(deletedMobile => {
       if (!deletedMobile) {
         console.log("Accessory not found in DB.");
         throw new Error('Mobile not found');
       }

       const imagePath = path.join(__dirname, '../../public/uploads', deletedMobile.Aimage);
       fs.unlink(imagePath, err => {
         if (err) {
           console.error('Failed to delete image file:', err);
         }
       });

       res.redirect('/Admin/mobileList');
     })
     .catch(err => {
       console.error('Error during mobile delete:', err);
       res.status(500).send('Failed to delete mobile.');
     });
};
