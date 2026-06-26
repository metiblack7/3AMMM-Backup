require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Song = require('./models/Song');
const Setlist = require('./models/Setlist');
const { Notification } = require('./models/Favorite');

const SONGS = [
  {
    title: 'How Great Is Our God', key: 'C', tempo: 'Medium',
    singerName: 'David Kebede', category: 'Praise',
    lyrics: [
      { s: 'Verse 1', t: 'The splendor of the King\nClothed in majesty\nLet all the earth rejoice' },
      { s: 'Chorus', t: 'How great is our God\nSing with me\nHow great is our God\nAnd all will see how great' },
      { s: 'Verse 2', t: 'Age to age He stands\nAnd time is in His hands\nBeginning and the End' },
    ],
  },
  {
    title: 'Oceans', key: 'Bb', tempo: 'Slow',
    singerName: 'Sara Haile', category: 'Worship',
    lyrics: [
      { s: 'Verse 1', t: 'You call me out upon the waters\nThe great unknown where feet may fail' },
      { s: 'Chorus', t: 'Spirit lead me where my trust is without borders\nLet me walk upon the waters' },
      { s: 'Bridge', t: 'I will call upon Your name\nAnd keep my eyes above the waves' },
    ],
  },
  {
    title: 'Mighty to Save', key: 'A', tempo: 'Medium-up',
    singerName: 'David Kebede', category: 'Praise',
    lyrics: [
      { s: 'Verse 1', t: 'Everyone needs compassion\nA love that never failing\nLet mercy fall on me' },
      { s: 'Chorus', t: 'Savior He can move the mountains\nMy God is mighty to save\nHe is mighty to save' },
    ],
  },
  {
    title: '10,000 Reasons', key: 'G', tempo: 'Medium',
    singerName: 'Liya Tesfaye', category: 'Hymn',
    lyrics: [
      { s: 'Chorus', t: 'Bless the Lord O my soul\nO my soul, worship His holy name' },
      { s: 'Verse 1', t: 'The sun comes up its a new day dawning\nIts time to sing Your song again' },
    ],
  },
  {
    title: 'Good Good Father', key: 'C', tempo: 'Medium',
    singerName: 'Sara Haile', category: 'Worship',
    lyrics: [
      { s: 'Verse 1', t: 'I have heard a thousand stories\nOf what they think You are like' },
      { s: 'Chorus', t: 'You are a good good Father\nIt is who You are\nAnd I am loved by You' },
    ],
  },
  {
    title: 'Cornerstone', key: 'E', tempo: 'Slow',
    singerName: 'Liya Tesfaye', category: 'Hymn',
    lyrics: [
      { s: 'Verse 1', t: 'My hope is built on nothing less\nThan Jesus blood and righteousness' },
      { s: 'Chorus', t: 'Christ alone cornerstone\nWeak made strong in the Saviors love\nThrough the storm He is Lord' },
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB...');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Song.deleteMany({}),
    Setlist.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log('Cleared existing data.');

  // Create admin
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@3ammm.com',
    password: 'admin123',
    singerName: 'Admin',
    role: 'admin',
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // Create songs
  const songs = await Song.insertMany(SONGS.map(s => ({ ...s, createdBy: admin._id })));
  console.log(`✅ ${songs.length} songs created`);

  // Create setlists
  await Setlist.insertMany([
    { title: 'Morning of Praise', date: 'Sat, May 3', songIds: [songs[0]._id, songs[2]._id, songs[3]._id], createdBy: admin._id },
    { title: 'Spirit & Truth', date: 'Sat, May 10', songIds: [songs[1]._id, songs[4]._id, songs[5]._id], createdBy: admin._id },
    { title: 'Mighty God', date: 'Sat, May 17', songIds: [songs[2]._id, songs[0]._id, songs[4]._id], createdBy: admin._id },
  ]);
  console.log('✅ 3 setlists created');

  // Notifications
  await Notification.insertMany([
    { title: 'New setlist posted', body: 'Saturday May 10 — Spirit & Truth setlist is ready!', type: 'setlist' },
    { title: 'Song added', body: 'Cornerstone has been added to the song library.', type: 'song' },
    { title: 'Setlist updated', body: 'The May 3 setlist has been updated.', type: 'setlist' },
  ]);
  console.log('✅ Notifications created');

  console.log('\n🎉 Seed complete!');
  console.log('Admin login: admin@3ammm.com / admin123');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
