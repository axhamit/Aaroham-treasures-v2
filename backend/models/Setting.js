const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: 'Aaroham treasures' },
    tagline: { type: String, default: 'Objects made to be kept' },
    announcement: { type: String, default: 'Complimentary insured shipping on orders above ₹5,000' },
    heroTitle: { type: String, default: 'Considered pieces for a considered life' },
    heroSubtitle: {
      type: String,
      default: 'Watches, leather, fragrance and fine jewellery from makers who still do things slowly.',
    },
    heroImage: { type: String, default: '' },
    primaryColor: { type: String, default: '#0F2D28' },
    accentColor: { type: String, default: '#B38B59' },
    backgroundColor: { type: String, default: '#F4F4F1' },
    freeShippingAbove: { type: Number, default: 5000 },
    shippingFee: { type: Number, default: 150 },
  },
  { timestamps: true }
);

settingSchema.statics.get = async function () {
  return (await this.findOne()) || (await this.create({}));
};

module.exports = mongoose.model('Setting', settingSchema);
