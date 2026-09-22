/**
 * Comprehensive India States and Districts Agricultural Dataset
 * Local structured dataset for offline/hackathon reliability.
 */

export interface StateDistrictMap {
  state: string;
  districts: string[];
}

export const INDIA_STATES_DISTRICTS: StateDistrictMap[] = [
  {
    state: 'Telangana',
    districts: [
      'Jogulamba Gadwal',
      'Mahabubnagar',
      'Rangareddy',
      'Nalgonda',
      'Khammam',
      'Karimnagar',
      'Nizamabad',
      'Warangal Urban',
      'Warangal Rural',
      'Sangareddy',
      'Medak',
      'Siddipet',
      'Adilabad',
      'Mancherial',
      'Bhadradri Kothagudem',
      'Suryapet',
      'Jagtial',
      'Kamareddy',
      'Nagarkurnool',
      'Wanaparthy',
      'Other / Not listed'
    ]
  },
  {
    state: 'Andhra Pradesh',
    districts: [
      'Kurnool',
      'Anantapur',
      'Guntur',
      'Krishna',
      'East Godavari',
      'West Godavari',
      'Chittoor',
      'Prakasam',
      'Nellore',
      'YSR Kadapa',
      'Visakhapatnam',
      'Vizianagaram',
      'Srikakulam',
      'Other / Not listed'
    ]
  },
  {
    state: 'Maharashtra',
    districts: [
      'Nashik',
      'Pune',
      'Ahmednagar',
      'Solapur',
      'Kolhapur',
      'Satara',
      'Sangli',
      'Jalgaon',
      'Dhule',
      'Aurangabad (Chhatrapati Sambhajinagar)',
      'Jalna',
      'Beed',
      'Latur',
      'Osmanabad (Dharashiv)',
      'Nanded',
      'Nagpur',
      'Amravati',
      'Yavatmal',
      'Buldhana',
      'Akola',
      'Wardha',
      'Other / Not listed'
    ]
  },
  {
    state: 'Karnataka',
    districts: [
      'Belagavi',
      'Dharwad',
      'Mysuru',
      'Mandya',
      'Ballari',
      'Raichur',
      'Vijayapura',
      'Bagalkote',
      'Kalaburagi',
      'Bidar',
      'Tumakuru',
      'Hassan',
      'Shivamogga',
      'Chikkamagaluru',
      'Kolar',
      'Chikkaballapur',
      'Davangere',
      'Haveri',
      'Other / Not listed'
    ]
  },
  {
    state: 'Tamil Nadu',
    districts: [
      'Coimbatore',
      'Tirupur',
      'Erode',
      'Salem',
      'Namakkal',
      'Dharmapuri',
      'Thanjavur',
      'Tiruchirappalli',
      'Madurai',
      'Dindigul',
      'Theni',
      'Virudhunagar',
      'Tirunelveli',
      'Thoothukudi',
      'Cuddalore',
      'Villupuram',
      'Tiruvannamalai',
      'Vellore',
      'Other / Not listed'
    ]
  },
  {
    state: 'Gujarat',
    districts: [
      'Rajkot',
      'Junagadh',
      'Amreli',
      'Bhavnagar',
      'Jamnagar',
      'Surat',
      'Navsari',
      'Valsad',
      'Anand',
      'Kheda',
      'Mehsana',
      'Banaskantha',
      'Sabar Kantha',
      'Patan',
      'Vadodara',
      'Bharuch',
      'Other / Not listed'
    ]
  },
  {
    state: 'Punjab',
    districts: [
      'Ludhiana',
      'Amritsar',
      'Jalandhar',
      'Bathinda',
      'Patiala',
      'Sangrur',
      'Firozpur',
      'Fazilka',
      'Hoshiarpur',
      'Gurdaspur',
      'Moga',
      'Muktsar',
      'Kapurthala',
      'Other / Not listed'
    ]
  },
  {
    state: 'Haryana',
    districts: [
      'Karnal',
      'Hisar',
      'Sirsa',
      'Ambala',
      'Kurukshetra',
      'Yamunanagar',
      'Fatehabad',
      'Jind',
      'Rohtak',
      'Sonipat',
      'Bhiwani',
      'Other / Not listed'
    ]
  },
  {
    state: 'Rajasthan',
    districts: [
      'Jaipur',
      'Jodhpur',
      'Kota',
      'Bikaner',
      'Sri Ganganagar',
      'Hanumangarh',
      'Alwar',
      'Bharatpur',
      'Udaipur',
      'Chittorgarh',
      'Ajmer',
      'Nagaur',
      'Barmer',
      'Jalore',
      'Pali',
      'Other / Not listed'
    ]
  },
  {
    state: 'Madhya Pradesh',
    districts: [
      'Indore',
      'Ujjain',
      'Bhopal',
      'Sehore',
      'Hoshangabad (Narmadapuram)',
      'Jabalpur',
      'Gwalior',
      'Dhar',
      'Khargone (West Nimar)',
      'Khandwa (East Nimar)',
      'Dewas',
      'Ratlam',
      'Mandsaur',
      'Chhindwara',
      'Other / Not listed'
    ]
  },
  {
    state: 'Uttar Pradesh',
    districts: [
      'Varanasi',
      'Prayagraj',
      'Lucknow',
      'Kanpur',
      'Agra',
      'Aligarh',
      'Meerut',
      'Bareilly',
      'Gorakhpur',
      'Ayodhya',
      'Jhansi',
      'Moradabad',
      'Muzaffarnagar',
      'Saharanpur',
      'Barabanki',
      'Sitapur',
      'Hardoi',
      'Other / Not listed'
    ]
  },
  {
    state: 'Bihar',
    districts: [
      'Patna',
      'Muzaffarpur',
      'Gaya',
      'Bhagalpur',
      'Darbhanga',
      'Purnia',
      'Samastipur',
      'Begusarai',
      'Vaishali',
      'Rohtas',
      'West Champaran',
      'East Champaran',
      'Other / Not listed'
    ]
  },
  {
    state: 'West Bengal',
    districts: [
      'Bardhaman (Purba & Paschim)',
      'Hooghly',
      'Nadia',
      'Murshidabad',
      'North 24 Parganas',
      'South 24 Parganas',
      'Malda',
      'Bankura',
      'Birbhum',
      'Jalpaiguri',
      'Other / Not listed'
    ]
  },
  {
    state: 'Kerala',
    districts: [
      'Palakkad',
      'Wayanad',
      'Idukki',
      'Thrissur',
      'Kottayam',
      'Alappuzha',
      'Kollam',
      'Malappuram',
      'Kozhikode',
      'Kannur',
      'Other / Not listed'
    ]
  },
  {
    state: 'Odisha',
    districts: [
      'Cuttack',
      'Puri',
      'Bhubaneswar (Khurda)',
      'Balasore',
      'Bhadrak',
      'Sambalpur',
      'Bargarh',
      'Ganjam',
      'Koraput',
      'Other / Not listed'
    ]
  },
  {
    state: 'Chhattisgarh',
    districts: [
      'Raipur',
      'Durg',
      'Rajnandgaon',
      'Bilaspur',
      'Janjgir-Champa',
      'Dhamtari',
      'Mahasamund',
      'Other / Not listed'
    ]
  },
  {
    state: 'Jharkhand',
    districts: [
      'Ranchi',
      'Hazaribagh',
      'Dhanbad',
      'Bokaro',
      'East Singhbhum',
      'Dumka',
      'Deoghar',
      'Other / Not listed'
    ]
  },
  {
    state: 'Assam',
    districts: [
      'Kamrup',
      'Nagaon',
      'Sonitpur',
      'Cachar',
      'Dibrugarh',
      'Jorhat',
      'Golaghat',
      'Barpeta',
      'Other / Not listed'
    ]
  },
  {
    state: 'Uttarakhand',
    districts: [
      'Dehradun',
      'Haridwar',
      'Udham Singh Nagar',
      'Nainital',
      'Tehri Garhwal',
      'Pauri Garhwal',
      'Other / Not listed'
    ]
  },
  {
    state: 'Himachal Pradesh',
    districts: [
      'Kangra',
      'Mandi',
      'Shimla',
      'Solan',
      'Sirmaur',
      'Kullu',
      'Una',
      'Other / Not listed'
    ]
  },
  {
    state: 'Jammu & Kashmir',
    districts: [
      'Jammu',
      'Srinagar',
      'Anantnag',
      'Baramulla',
      'Pulwama',
      'Kathua',
      'Udhampur',
      'Other / Not listed'
    ]
  },
  {
    state: 'Delhi (NCT)',
    districts: [
      'North Delhi',
      'South West Delhi',
      'North West Delhi',
      'Alipur Agro Zone',
      'Najafgarh Rural',
      'Other / Not listed'
    ]
  },
  {
    state: 'Other Indian State / UT',
    districts: ['Central / Main District', 'North District', 'South District', 'Other / Not listed']
  }
];

export function getAllIndianStates(): string[] {
  return INDIA_STATES_DISTRICTS.map(item => item.state);
}

export function getDistrictsByState(stateName: string): string[] {
  const match = INDIA_STATES_DISTRICTS.find(
    item => item.state.toLowerCase() === stateName.trim().toLowerCase()
  );
  if (match) {
    return match.districts;
  }
  return ['Central District', 'Rural District', 'Other / Not listed'];
}
