const fs = require('fs');
const path = require('path');
const secondHandModel = require(`../../models/secondHandMobileDB`);

exports.postSHaddMobile = (req, res, next) => {
  // SH controller
    const {SHname,SHprice,condition,SHdiscount,SHmrp} = req.body ;
    const SHimage = req.file ? req.file.filename : null; // ✅ multer से आने वाला image filename
    const SHmobile = new secondHandModel({SHname,SHprice,SHimage,condition,SHdiscount,SHmrp});
    SHmobile.save().then(() => {
    })
    res.render(`admin/mobileAdded`);
};





exports.postDeleteSHmobile = (req, res, next) => {
  const SHmobileId = req.params.SHmobileId;

  secondHandModel.findByIdAndDelete(SHmobileId)
    .then(deletedMobile => {
      if (!deletedMobile) {
        throw new Error('Mobile not found');
      }

      // Delete the associated image
      const imagePath = path.join(__dirname, '../../public/uploads', deletedMobile.SHimage);
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

