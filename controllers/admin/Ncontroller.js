// Ncontroller.js (updated with productDetail images + video support)
const fs = require("fs");
const path = require("path");
const newModel = require(`../../models/newMobileDB`);

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
    parts.shift();
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
exports.postNaddMobile = async (req, res) => {
  try {
    const { Nname, Nprice, Ndiscount, Nmrp, Nrating } = req.body;

    const Nimage = req.files?.Nimage ? req.files.Nimage[0].filename : null;

    const detailImages = [
      req.files?.detailImage1?.[0]?.filename,
      req.files?.detailImage2?.[0]?.filename,
      req.files?.detailImage3?.[0]?.filename,
      req.files?.detailImage4?.[0]?.filename,
    ].filter(Boolean);

    const detailVideo = req.files?.detailVideo?.[0]?.filename || null;

    const nestedSpecs = nestSpecs(req.body || {});

    const Nmobile = new newModel({
      Nname,
      Nprice,
      Nimage,
      Ndiscount,
      Nmrp,
      Nrating,
      specs: nestedSpecs,
      productDetail: {
        images: detailImages,
        video: detailVideo,
      },
    });

    await Nmobile.save();
    return res.render(`admin/mobileAdded`);
  } catch (err) {
    console.error("[N ADD][POST] error", err);
    return res.status(500).send("Failed to add new mobile.");
  }
};

/** ========== DELETE ========== */
exports.postDeleteNmobile = async (req, res) => {
  const { NmobileId } = req.params;
  try {
    const deletedMobile = await newModel.findByIdAndDelete(NmobileId);
    if (!deletedMobile) throw new Error("Mobile not found");

    // delete main Nimage
    if (deletedMobile.Nimage) {
      const imagePath = path.join(__dirname, "../../public/uploads", deletedMobile.Nimage);
      fs.unlink(imagePath, (err) => {
        if (err) console.error("Failed to delete Nimage:", err);
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
    console.error("[N DELETE] error", err);
    res.status(500).send("Failed to delete mobile.");
  }
};

/** ========== EDIT: GET (prefilled form) ========== */
exports.getNeditMobile = async (req, res) => {
  const { NmobileId } = req.params;
  try {
    const mobile = await newModel.findById(NmobileId).lean();
    if (!mobile) return res.status(404).send("Mobile not found");

    const specsMap = flatten({ specs: mobile.specs || {} });

    return res.render("admin/form/addNewMobile", {
      isEdit: true,
      mobile,
      specsMap,
    });
  } catch (err) {
    console.error("[N EDIT][GET] error", err);
    return res.status(500).send("Failed to load edit page.");
  }
};

/** ========== EDIT: POST (persist changes) ========== */
exports.postNeditMobile = async (req, res) => {
  const { NmobileId } = req.params;
  try {
    const mobile = await newModel.findById(NmobileId);
    if (!mobile) return res.status(404).send("Mobile not found");

    const { Nname, Nprice, Ndiscount, Nmrp, Nrating } = req.body;
    const nestedSpecs = nestSpecs(req.body || {});

    mobile.Nname = Nname;
    mobile.Nprice = Nprice;
    mobile.Ndiscount = Ndiscount;
    mobile.Nmrp = Nmrp;
    mobile.Nrating = Nrating;
    mobile.specs = nestedSpecs;

    // Replace Nimage if uploaded
    if (req.files?.Nimage) {
      if (mobile.Nimage) {
        const oldPath = path.join(__dirname, "../../public/uploads", mobile.Nimage);
        fs.unlink(oldPath, () => {});
      }
      mobile.Nimage = req.files.Nimage[0].filename;
    }

    // Replace detail images if uploaded
    const newImages = [
      req.files?.detailImage1?.[0]?.filename,
      req.files?.detailImage2?.[0]?.filename,
      req.files?.detailImage3?.[0]?.filename,
      req.files?.detailImage4?.[0]?.filename,
    ].filter(Boolean);

    if (newImages.length > 0) {
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
    console.error("[N EDIT][POST] error", err);
    return res.status(500).send("Failed to update mobile.");
  }
};
