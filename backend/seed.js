// Run once:  npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Setting = require('./models/Setting');

const img = (seed) => [`https://picsum.photos/seed/${seed}/800/1000`, `https://picsum.photos/seed/${seed}-b/800/1000`];

const products = [
  ['Banarasi Heritage Saree', 'Aaroham', 'Sarees', 4850, 5400, 6, true, 'A festive Banarasi-style saree with an ornate woven border, made for celebrations and special occasions.'],
  ['Printed Chiffon Saree', 'Aaroham', 'Sarees', 3200, 3750, 10, true, 'A lightweight printed chiffon saree with a soft drape and a coordinating blouse piece.'],
  ['Handloom Cotton Saree', 'Aaroham', 'Sarees', 2650, null, 8, false, 'A breathable handloom-inspired cotton saree with a classic contrast border for everyday elegance.'],
  ['Everyday Stretch Yoga Set', 'Aaroham Active', 'Yoga Dress', 1890, 2200, 12, true, 'A comfortable stretch yoga set designed for movement, with a supportive top and high-waisted leggings.'],
  ['Seamless Yoga Leggings', 'Aaroham Active', 'Yoga Dress', 1250, null, 16, false, 'Soft, flexible seamless leggings with a supportive high-rise waist for yoga and daily wear.'],
  ['Flow Yoga Top', 'Aaroham Active', 'Yoga Dress', 990, 1190, 14, false, 'A breathable, relaxed-fit yoga top that moves comfortably through your practice.'],
  ['Embroidered Festive Suit', 'Aaroham', 'Suits', 4250, 4800, 5, true, 'A festive three-piece suit set with delicate embroidery, matching trousers and a coordinating dupatta.'],
  ['Printed Cotton Suit Set', 'Aaroham', 'Suits', 2450, null, 9, false, 'A lightweight printed cotton suit set with a comfortable fit for everyday occasions.'],
  ['Straight-Cut Kurta Suit', 'Aaroham', 'Suits', 2890, 3290, 7, false, 'A versatile straight-cut kurta suit set with a refined neckline and matching bottoms.'],
  ['Silk Blend Wedding Saree', 'Aaroham', 'Sarees', 6990, 7500, 4, true, 'A richly detailed silk-blend saree with a statement border for weddings and festive gatherings.'],
  ['Active Flex Yoga Set', 'Aaroham Active', 'Yoga Dress', 2150, 2490, 7, false, 'A flexible, quick-drying yoga set made for comfortable movement during workouts and practice.'],
  ['Classic Anarkali Suit', 'Aaroham', 'Suits', 5200, 5900, 3, true, 'A flowing Anarkali-style suit set with graceful detailing for celebrations and formal occasions.'],
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
