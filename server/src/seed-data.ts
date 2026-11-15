import type { DisposalMethod } from './db.js';

/**
 * Sibu seed data.
 *
 * The two entries marked verified come from the project brief (Tzu-Chi and the
 * Jalan Pahlawan drop-off). Coordinates are approximate town-level positions and
 * must be confirmed on site before this is used to route anyone. Everything else
 * is a placeholder an administrator is expected to correct in the dashboard.
 */
export const seedCentres = [
  {
    name: 'Tzu-Chi Recycling Centre (Sibu)',
    address: 'Jalan Kampung Nyabor, 96000 Sibu, Sarawak',
    latitude: 2.2905,
    longitude: 111.8305,
    openingHours: 'Mon-Sat 08:00-17:00, closed Sun & public holidays',
    acceptedMaterials: ['Paper', 'Cardboard', 'Plastic bottles', 'Aluminium cans', 'Glass', 'Textiles'],
    notes: 'Volunteer-run. Sort items before drop-off. Coordinates approximate.',
    isVerified: true,
  },
  {
    name: 'SMC Recycling Drop-off - Jalan Pahlawan',
    address: 'Jalan Pahlawan, 96000 Sibu, Sarawak',
    latitude: 2.2917,
    longitude: 111.8266,
    openingHours: 'Daily 07:00-19:00',
    acceptedMaterials: ['Plastic bottles', 'Aluminium cans', 'Paper', 'Glass'],
    notes: 'Council-operated roadside collection point. Coordinates approximate.',
    isVerified: true,
  },
  {
    name: 'Trienekens Sibu Recycling Yard',
    address: 'Jalan Deshon, 96000 Sibu, Sarawak',
    latitude: 2.283,
    longitude: 111.835,
    openingHours: 'Mon-Fri 08:00-17:00',
    acceptedMaterials: ['Plastic bottles', 'Aluminium cans', 'Paper', 'Cardboard', 'Glass', 'E-waste'],
    notes: 'Concessionaire yard. Call ahead for bulk or e-waste drop-off. Coordinates approximate.',
    isVerified: false,
  },
  {
    name: 'Sibu Jaya Community Recycling Point',
    address: 'Sibu Jaya, 96000 Sibu, Sarawak',
    latitude: 2.276,
    longitude: 111.892,
    openingHours: 'Daily 24 hours (open-air bins)',
    acceptedMaterials: ['Plastic bottles', 'Aluminium cans', 'Paper'],
    notes: 'Neighbourhood bins. No staff on site. Coordinates approximate.',
    isVerified: false,
  },
];

export const seedCategories: Array<{
  name: string;
  disposalMethod: DisposalMethod;
  description: string;
  sortOrder: number;
}> = [
  {
    name: 'Vegetable scraps',
    disposalMethod: 'compost',
    description: 'Home compost bin or trench composting. Sibu has no public compost collection.',
    sortOrder: 10,
  },
  {
    name: 'Fruit peels',
    disposalMethod: 'compost',
    description: 'Home compost. Chop large peels to speed up breakdown.',
    sortOrder: 20,
  },
  {
    name: 'Cooked food leftovers',
    disposalMethod: 'general',
    description: 'Drain liquid and bag it. Do not put cooked food in home compost; no public compost bins in Sibu.',
    sortOrder: 30,
  },
  {
    name: 'Plastic bottles (PET)',
    disposalMethod: 'recycle',
    description: 'Rinse, remove cap, flatten. Accepted at Tzu-Chi and SMC drop-offs.',
    sortOrder: 40,
  },
  {
    name: 'Plastic packaging & film',
    disposalMethod: 'recycle',
    description: 'Clean and dry soft plastics only. Contaminated film goes to general waste.',
    sortOrder: 50,
  },
  {
    name: 'Aluminium cans',
    disposalMethod: 'recycle',
    description: 'Rinse and crush. Highest-value recyclable at Sibu drop-offs.',
    sortOrder: 60,
  },
  {
    name: 'Glass bottles & jars',
    disposalMethod: 'recycle',
    description: 'Rinse, remove lids. Wrap broken glass before drop-off.',
    sortOrder: 70,
  },
  {
    name: 'Paper & cardboard',
    disposalMethod: 'recycle',
    description: 'Flatten boxes and keep dry. Greasy pizza boxes go to general waste.',
    sortOrder: 80,
  },
  {
    name: 'E-waste (small appliances)',
    disposalMethod: 'special',
    description: 'Take to Trienekens yard or a scheduled council e-waste drive. Never bin it.',
    sortOrder: 90,
  },
  {
    name: 'Batteries',
    disposalMethod: 'special',
    description: 'Drop at participating shops or an e-waste drive. Leaks if landfilled.',
    sortOrder: 100,
  },
  {
    name: 'Used cooking oil',
    disposalMethod: 'special',
    description: 'Cool, bottle and hand to a collector. Never pour down the drain.',
    sortOrder: 110,
  },
  {
    name: 'Styrofoam containers',
    disposalMethod: 'general',
    description: 'Not accepted by Sibu recyclers. General waste only.',
    sortOrder: 120,
  },
  {
    name: 'Textiles & clothing',
    disposalMethod: 'recycle',
    description: 'Wearable items to charity first. Tzu-Chi accepts clean textiles.',
    sortOrder: 130,
  },
];
