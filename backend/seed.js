// Run once:  npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Setting = require('./models/Setting');

const img = (seed) => [`https://picsum.photos/seed/${seed}/800/1000`, `https://picsum.photos/seed/${seed}-b/800/1000`];

const products = [
  ['Meridian Automatic 40mm', 'Aurelle', 'Watches', 48500, 54000, 6, true, 'Swiss-made automatic movement with a sapphire case back and a hand-finished sunburst dial. 42-hour power reserve, 100 m water resistance.'],
  ['Calder Chronograph', 'Aurelle', 'Watches', 72000, 79500, 3, true, 'Steel chronograph with a ceramic bezel and Italian calfskin strap. Each piece is individually numbered.'],
  ['Verona Slim Dress Watch', 'Norvik', 'Watches', 31200, null, 8, false, 'A 7 mm case, a quiet silver dial and a strap that softens with wear.'],
  ['Atelier Tote, Cognac', 'Maison Dorr', 'Handbags', 38900, 42000, 5, true, 'Vegetable-tanned full-grain leather, hand-stitched seams and a suede-lined interior. Develops a deep patina over years.'],
  ['Soho Crossbody, Ink', 'Maison Dorr', 'Handbags', 24500, null, 10, false, 'Compact crossbody with a magnetic flap and brushed brass hardware.'],
  ['Portofino Weekender', 'Maison Dorr', 'Handbags', 56800, 61000, 2, true, 'Water-resistant canvas, leather trim, and a trolley sleeve. Fits a three-night trip.'],
  ['Oud Nocturne, 50 ml', 'Séraphine', 'Fragrance', 14800, null, 20, true, 'Smoked oud, saffron and cedar. Eau de parfum, 50 ml, in a hand-numbered flacon.'],
  ['Iris Blanc, 100 ml', 'Séraphine', 'Fragrance', 11200, 12500, 14, false, 'Powdery orris, white musk and a hint of bergamot. Quiet, close to the skin.'],
  ['Solitaire Pendant, 18k', 'Veldt & Co', 'Jewellery', 64000, 69900, 4, true, '18k yellow gold with a 0.30 ct certified diamond on a fine cable chain.'],
  ['Heirloom Signet Ring', 'Veldt & Co', 'Jewellery', 27500, null, 9, false, 'Solid sterling silver, 18k gold plated, with engraving on request.'],
  ['Pavé Hoop Earrings', 'Veldt & Co', 'Jewellery', 33800, 36000, 7, false, 'Lab-grown diamonds set in recycled 14k gold.'],
  ['Lucerne Aviator', 'Norvik', 'Eyewear', 18900, null, 12, false, 'Titanium frame with polarised mineral glass lenses. Under 20 g.'],
].map(([name, brand, category, price, mrp, stock, featured, description], i) => ({
  name, brand, category, price, mrp: mrp || undefined, stock, featured, description, images: img(`luxe-${i + 1}`),
}));

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const email = (process.env.ADMIN_EMAIL || 'admin@luxe.com').toLowerCase();
  if (!(await User.findOne({ email }))) {
    await User.create({ name: process.env.ADMIN_NAME || 'Store Admin', email, password: process.env.ADMIN_PASSWORD || 'Admin@12345', role: 'admin' });
    console.log('Admin created:', email);
  } else console.log('Admin already exists:', email);

  // Create sample courier user
  const courierEmail = 'courier@luxe.com';
  if (!(await User.findOne({ email: courierEmail }))) {
    await User.create({
      name: 'Raj Kumar',
      email: courierEmail,
      password: 'Courier@12345',
      role: 'courier',
      vehicleNumber: 'MH-12-AB-1234',
      vehicleType: 'Bike',
    });
    console.log('Sample courier created:', courierEmail);
  } else console.log('Courier already exists:', courierEmail);

  if ((await Product.countDocuments()) === 0) { await Product.insertMany(products); console.log(`Inserted ${products.length} sample products`); }
  await Setting.get();
  await mongoose.disconnect();
  console.log('Seed finished');
})();
