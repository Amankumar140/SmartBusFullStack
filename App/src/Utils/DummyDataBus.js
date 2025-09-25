// src/data/dummyBusData.js

import Bus1 from '../Assets/Bus/Bus1.png';
import Bus2 from '../Assets/Bus/Bus2.png';
import Bus3 from '../Assets/Bus/Bus3.png';
 
export const buses = [
  {
    id: '1',
    busId: 'PB20AB1234',
    eta: '10 mins',
    type: 'available',
    imageUrl: Bus1,
    coordinate: { latitude: 31.633980, longitude: 74.872261 }, // Amritsar
  },
  {
    id: '2',
    busId: 'PB11AB7894',
    eta: '25 mins',
    type: 'available',
    imageUrl: Bus2,
    coordinate: { latitude: 30.733315, longitude: 76.779419 }, // Chandigarh
  },
  {
    id: '3',
    busId: 'PB19AB1564',
    eta: '45 mins',
    type: 'alternate',
    changeInfo: 'Change at Amritsar stop',
    imageUrl: Bus1,
    coordinate: { latitude: 30.900965, longitude: 75.857277 }, // Ludhiana
  },
  {
    id: '4',
    busId: 'PB15AB1234',
    eta: '35 mins',
    type: 'alternate',
    changeInfo: 'Change at Ludhiana stop',
    imageUrl: Bus3,
    coordinate: { latitude: 31.326015, longitude: 75.576180 }, // Jalandhar
  },
  {
    id: '5',
    busId: 'PB10CD5678',
    eta: '5 mins',
    type: 'available',
    imageUrl: Bus2,
    coordinate: { latitude: 30.339803, longitude: 76.386879 }, // Patiala
  },
  {
    id: '6',
    busId: 'PB21EF9012',
    eta: '15 mins',
    type: 'available',
    imageUrl: Bus1,
    coordinate: { latitude: 30.210999, longitude: 74.945473 }, // Bathinda
  },
  {
    id: '7',
    busId: 'PB08GH3456',
    eta: '50 mins',
    type: 'alternate',
    changeInfo: 'Change at Jalandhar stop',
    imageUrl: Bus2,
    coordinate: { latitude: 31.4721, longitude: 75.3432 }, // Near Kapurthala
  },
  {
    id: '8',
    busId: 'PB65IJ7890',
    eta: '1 hr 5 mins',
    type: 'alternate',
    changeInfo: 'Change at Pathankot stop',
    imageUrl: Bus3,
    coordinate: { latitude: 32.2651, longitude: 75.6495 }, // Pathankot
  },
];