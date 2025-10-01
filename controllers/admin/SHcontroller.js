// SHcontroller.js (updated for productDetail images + video)
const fs = require("fs");
const path = require("path");
const secondHandModel = require(`../../models/secondHandMobileDB`);

/**
 * Build nested specs from dot-notation keys like "specs.general.model"
 */
function nestSpecs(flatObj) {
  const nested = {};
  for (const key in flatObj) {
    if (!Object.prototype.hasOwnProperty.call(flatObj, key)) continue;
    if (!key.startsWith("specs.")) continue;

    const val = flatObj[key];
    if (val === "") continue;

    const parts = key.split(".");
    parts.shift(); // remove "specs"
    let current = nested;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (isLast) {
        current[part] = val;
      } else {
        if (!current[part] || typeof current[part] !== "object") current[part] = {};
        current = current[part];
      }
    }
  }
  return nested;
}

function flatten(obj, prefix = "") {
  const out = {};
  function step(o, pfx) {
    if (o === undefined || o === null) return;
    Object.keys(o).forEach((k) => {
      const v = o[k];
      const key = pfx ? `${pfx}.${k}` : k;
      if (
        v !== null &&
        typeof v === "object" &&
        !Array.isArray(v) &&
        !(v instanceof Date)
      ) {
        step(v, key);
      } else {
        out[key] = v;
      }
    });
  }
  step(obj, prefix);
  return out;
}

/** ========== ADD: POST (create) ========== */
exports.postSHaddMobile = async (req, res, next) => {
  try {
    const { SHname, SHprice, condition, SHdiscount, SHmrp } = req.body;

    // Multer .fields() gives all uploads in req.files
    const SHimage = req.files?.SHimage ? req.files.SHimage[0].filename : null;

    const detailImages = [
      req.files?.detailImage1?.[0]?.filename,
      req.files?.detailImage2?.[0]?.filename,
      req.files?.detailImage3?.[0]?.filename,
      req.files?.detailImage4?.[0]?.filename,
    ].filter(Boolean);

    const detailVideo = req.files?.detailVideo?.[0]?.filename || null;

    // rebuild nested specs
    const nestedSpecs = nestSpecs(req.body || {});

    const SHmobile = new secondHandModel({
      SHname,
      SHprice,
      SHimage,
      condition,
      SHdiscount,
      SHmrp,
      specs: nestedSpecs,
      productDetail: {
        images: detailImages,
        video: detailVideo,
      },
    });

    await SHmobile.save();
    res.render(`admin/mobileAdded`);
  } catch (err) {
    console.error("===== POST ADD ERROR =====", err);
    res.status(500).send("Failed to add second-hand mobile.");
  }
};

/** ========== DELETE ========== */
exports.postDeleteSHmobile = async (req, res) => {
  const SHmobileId = req.params.SHmobileId;

  try {
    const deletedMobile = await secondHandModel.findByIdAndDelete(SHmobileId);
    if (!deletedMobile) throw new Error("Mobile not found");

    // delete main SHimage
    if (deletedMobile.SHimage) {
      const imagePath = path.join(__dirname, "../../public/uploads", deletedMobile.SHimage);
      fs.unlink(imagePath, (err) => {
        if (err) console.error("Failed to delete SHimage:", err);
      });
    }

    // delete detail images
    if (deletedMobile.productDetail?.images?.length) {
      deletedMobile.productDetail.images.forEach((img) => {
        const imgPath = path.join(__dirname, "../../public/uploads", img);
        fs.unlink(imgPath, (err) => {
          if (err) console.error("Failed to delete detail image:", err);
        });
      });
    }

    // delete video
    if (deletedMobile.productDetail?.video) {
      const videoPath = path.join(__dirname, "../../public/uploads", deletedMobile.productDetail.video);
      fs.unlink(videoPath, (err) => {
        if (err) console.error("Failed to delete video:", err);
      });
    }

    res.redirect("/Admin/mobileList");
  } catch (err) {
    console.error("Error during mobile delete:", err);
    res.status(500).send("Failed to delete mobile.");
  }
};

/** ========== EDIT: GET (prefilled form) ========== */
exports.getSHeditMobile = async (req, res) => {
  const { SHmobileId } = req.params;
  try {
    const mobile = await secondHandModel.findById(SHmobileId).lean();
    if (!mobile) return res.status(404).send("Mobile not found");

    const specsMap = flatten({ specs: mobile.specs || {} });

    return res.render("admin/form/addSecondHandMobile", {
      isEdit: true,
      mobile,
      specsMap,
    });
  } catch (err) {
    console.error("[SH EDIT][GET] error", err);
    return res.status(500).send("Failed to load edit page.");
  }
};

/** ========== EDIT: POST (persist changes) ========== */
exports.postSHeditMobile = async (req, res) => {
  const { SHmobileId } = req.params;
  try {
    const mobile = await secondHandModel.findById(SHmobileId);
    if (!mobile) return res.status(404).send("Mobile not found");

    const { SHname, SHprice, condition, SHdiscount, SHmrp } = req.body;
    const nestedSpecs = nestSpecs(req.body || {});

    mobile.SHname = SHname;
    mobile.SHprice = SHprice;
    mobile.condition = condition;
    mobile.SHdiscount = SHdiscount;
    mobile.SHmrp = SHmrp;
    mobile.specs = nestedSpecs;

    // Replace SHimage if new one uploaded
    if (req.files?.SHimage) {
      if (mobile.SHimage) {
        const oldPath = path.join(__dirname, "../../public/uploads", mobile.SHimage);
        fs.unlink(oldPath, () => {});
      }
      mobile.SHimage = req.files.SHimage[0].filename;
    }

    // Replace detail images if uploaded
    const newImages = [
      req.files?.detailImage1?.[0]?.filename,
      req.files?.detailImage2?.[0]?.filename,
      req.files?.detailImage3?.[0]?.filename,
      req.files?.detailImage4?.[0]?.filename,
    ].filter(Boolean);

    if (newImages.length > 0) {
      // delete old ones
      (mobile.productDetail?.images || []).forEach((img) => {
        const oldImgPath = path.join(__dirname, "../../public/uploads", img);
        fs.unlink(oldImgPath, () => {});
      });
      mobile.productDetail.images = newImages;
    }

    // Replace detail video if uploaded
    if (req.files?.detailVideo) {
      if (mobile.productDetail?.video) {
        const oldVidPath = path.join(__dirname, "../../public/uploads", mobile.productDetail.video);
        fs.unlink(oldVidPath, () => {});
      }
      mobile.productDetail.video = req.files.detailVideo[0].filename;
    }

    await mobile.save();
    return res.redirect("/Admin/mobileList");
  } catch (err) {
    console.error("[SH EDIT][POST] error", err);
    return res.status(500).send("Failed to update second-hand mobile.");
  }
};
