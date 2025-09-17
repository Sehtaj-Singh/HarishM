const mongoose = require("mongoose");

const secondHandMobileSchema = mongoose.Schema({
  SHname: { type: String, required: true },
  SHprice: { type: Number, required: true },
  SHimage: { type: String, required: true },
  condition: { type: String, required: true },
  SHdiscount: { type: Number, required: true },
  SHmrp: { type: Number, required: true },

  specs: {
    // 1. General
    general: {
      countryOfOrigin: { type: String },
      model: { type: String },
      dualSim: { type: String }, // Yes/No
      releaseDate: { type: Date },
      chargingPort: { type: String },
      simSize: { type: String },
      protection: { type: String },
      osSystem: { type: String },
      osUpdates: { type: String },
      securityUpdates: { type: String },
      merged: { type: String },
    },

    // 2. Design
    design: {
      weight: { type: String },
      color: { type: String },
      dimensions: { type: String },
      buildMaterial: { type: String },
      merged: { type: String },
    },

    // 3. Display
    display: {
      type: { type: String },
      size: { type: String },
      resolution: { type: String },
      screenToBodyRatio: { type: String },
      refreshRate: { type: String },
      peakBrightness: { type: String },
      notch: { type: String },
      merged: { type: String },
    },

    // 4. Memory
    memory: {
      ram: { type: String },
      storage: { type: String },
      merged: { type: String },
    },

    // 5. Connectivity
    connectivity: {
      network: { type: String },
      wifi: { type: String },
      bluetooth: { type: String },
      merged: { type: String },
    },

    // 6. Back Camera
    backCamera: {
      type: { type: String },
      video: { type: String },
      merged: { type: String },
    },

    // 7. Selfie Camera
    selfieCamera: {
      type: { type: String },
      video: { type: String },
      merged: { type: String },
    },

    // 8. Performance
    performance: {
      cpu: { type: String }, // chipset / processor
      merged: { type: String },
    },

    // 9. Battery
    battery: {
      capacity: { type: String },
      charging: { type: String },
      wirelessCharging: { type: String }, // Yes/No
      merged: { type: String },
    },

    // 10. Sound
    sound: {
      jack: { type: String }, // Yes/No
      stereoSpeaker: { type: String }, // Yes/No
      merged: { type: String },
    },

    // 11. Sensors
    sensors: {
      fingerprint: { type: String },
      other: { type: String },
      merged: { type: String },
    },
  },
});

module.exports = mongoose.model("secondHandMobiles", secondHandMobileSchema);
